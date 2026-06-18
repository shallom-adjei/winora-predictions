import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// ---------- TheSportsDB live score / finished score ----------
async function getScoreFromTheSportsDB(teamA: string, teamB: string, matchDate: string) {
  try {
    const res = await fetch(
      `https://www.thesportsdb.com/api/v1/json/3/searchevents.php?e=${encodeURIComponent(teamA + " vs " + teamB)}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    const events = data.event || [];

    // Find an event on the same date that is either in play or finished
    const target = events.find((e: any) => {
      const eventDate = e.dateEvent;
      if (eventDate !== matchDate) return false;
    return e.strStatus === "Match Finished" || e.strStatus === "FT" || e.strStatus === "1st Half" || e.strStatus === "2nd Half" || e.strStatus === "Half Time" || e.strStatus === "1H" || e.strStatus === "2H";
    });

    if (!target) return null;

    const homeScore = parseInt(target.intHomeScore) || 0;
    const awayScore = parseInt(target.intAwayScore) || 0;
    const status =
      target.strStatus === "Match Finished"
        ? "FINISHED"
        : "LIVE";   // in-play states mapped to LIVE

    return { homeScore, awayScore, status };
  } catch {
    return null;
  }
}

// ---------- Main cron handler ----------
export async function GET() {
  const FOOTBALL_DATA_KEY = process.env.FOOTBALL_DATA_API_KEY;
  if (!FOOTBALL_DATA_KEY) {
    return NextResponse.json({ error: "Missing API key" }, { status: 500 });
  }

  const { supabase } = await import("@/lib/supabase");

  // Fetch matches that are not finished, ordered by soonest kickoff
  const { data: matches } = await supabase
    .from("predictions")
    .select("id, fixture_id, main_pick, team_a, team_b, kickoff_time, match_status")
    .not("fixture_id", "is", null)
    .neq("match_status", "FINISHED")
    .order("kickoff_time", { ascending: true })
    .limit(20);

  if (!matches?.length) {
    return NextResponse.json({ updated: 0, message: "No live/pending matches" });
  }

  let updated = 0;
  const now = new Date();

  for (const match of matches) {
    try {
      let homeScore: number | null = null;
      let awayScore: number | null = null;
      let newStatus = match.match_status;

      // 1) Try football-data.org first (mostly for non-World Cup leagues)
      const fdRes = await fetch(
        `https://api.football-data.org/v4/matches/${match.fixture_id}`,
        { headers: { "X-Auth-Token": FOOTBALL_DATA_KEY } }
      );

      if (fdRes.ok) {
        const fixture = await fdRes.json();
        const rawStatus = fixture.status;

        if (rawStatus === "FINISHED") {
          homeScore = fixture.score?.fullTime?.home;
          awayScore = fixture.score?.fullTime?.away;
          newStatus = "FINISHED";
        } else if (["IN_PLAY", "PAUSED", "LIVE"].includes(rawStatus)) {
          homeScore = fixture.score?.fullTime?.home;
          awayScore = fixture.score?.fullTime?.away;
          newStatus = "LIVE";
        }
      }

            // 2) If football-data.org didn't give us a live/finished score,
      //    and the match has already started, try TheSportsDB.
      if (homeScore == null && match.kickoff_time) {
        const kickoff = new Date(match.kickoff_time);
        const hoursSinceKickoff = (now.getTime() - kickoff.getTime()) / (1000 * 60 * 60);
        // Only check TheSportsDB if the match has already kicked off (past or within the first few hours)
        if (hoursSinceKickoff >= 0) {
          const matchDate = kickoff.toISOString().split("T")[0]; // e.g., "2026-06-17"
          const tsdbResult = await getScoreFromTheSportsDB(match.team_a, match.team_b, matchDate);
          if (tsdbResult) {
            homeScore = tsdbResult.homeScore;
            awayScore = tsdbResult.awayScore;
            newStatus = tsdbResult.status;
          }
        }
      }

      // 3) Update the database if anything changed
      if (newStatus !== match.match_status || homeScore != null || awayScore != null) {
        const updateData: any = { match_status: newStatus };
        if (homeScore != null) updateData.actual_home_score = homeScore;
        if (awayScore != null) updateData.actual_away_score = awayScore;

        // Compute legacy result when finished
        if (newStatus === "FINISHED" && homeScore != null && awayScore != null) {
          const actualOutcome =
            homeScore > awayScore ? "Home Win" : homeScore === awayScore ? "Draw" : "Away Win";
          updateData.result = match.main_pick === actualOutcome ? "Win" : "Loss";
        }

        await supabase.from("predictions").update(updateData).eq("id", match.id);
        updated++;
      }
    } catch (err) {
      console.error("Failed to update fixture", match.fixture_id, err);
    }
    await new Promise(r => setTimeout(r, 1000)); // gentle delay
  }

  return NextResponse.json({ updated });
}