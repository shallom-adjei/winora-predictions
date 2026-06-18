import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// ---------- TheSportsDB live score / finished score ----------
async function getScoreFromTheSportsDB(teamA: string, teamB: string, matchDate: string) {
  const queries = [`${teamA} vs ${teamB}`, `${teamB} vs ${teamA}`];

  for (const q of queries) {
    try {
      const res = await fetch(
        `https://www.thesportsdb.com/api/v1/json/3/searchevents.php?e=${encodeURIComponent(q)}`
      );
      if (!res.ok) continue;
      const data = await res.json();
      const events = data.event || [];

      const target = events.find((e: any) => {
        const eventDate = e.dateEvent;
        if (eventDate !== matchDate) return false;
        return (
          e.strStatus === "Match Finished" ||
          e.strStatus === "FT" ||
          e.strStatus === "1st Half" ||
          e.strStatus === "2nd Half" ||
          e.strStatus === "Half Time" ||
          e.strStatus === "1H" ||
          e.strStatus === "2H"
        );
      });

      if (target) {
        const homeScore = parseInt(target.intHomeScore) || 0;
        const awayScore = parseInt(target.intAwayScore) || 0;
        const status =
          target.strStatus === "Match Finished" || target.strStatus === "FT"
            ? "FINISHED"
            : "LIVE";
        return { homeScore, awayScore, status };
      }
    } catch {
      // try next query
    }
  }
  return null;
}

// ---------- football-data.org (fallback) ----------
async function getScoreFromFootballData(fixtureId: number) {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch(
      `https://api.football-data.org/v4/matches/${fixtureId}`,
      { headers: { "X-Auth-Token": apiKey } }
    );
    if (!res.ok) return null;
    const fixture = await res.json();
    const rawStatus = fixture.status;
    if (rawStatus === "FINISHED" || ["IN_PLAY", "PAUSED", "LIVE"].includes(rawStatus)) {
      return {
        homeScore: fixture.score?.fullTime?.home ?? null,
        awayScore: fixture.score?.fullTime?.away ?? null,
        status: rawStatus === "FINISHED" ? "FINISHED" : "LIVE",
      };
    }
  } catch {
    // network error – just skip
  }
  return null;
}

// ---------- Main cron handler ----------
export async function GET() {
  const { supabase } = await import("@/lib/supabase");

  const now = new Date();
  const nowISO = now.toISOString();

  const { data: matches } = await supabase
    .from("predictions")
    .select("id, fixture_id, main_pick, team_a, team_b, kickoff_time, match_status")
    .not("fixture_id", "is", null)
    .neq("match_status", "FINISHED")
    .lte("kickoff_time", nowISO)              // only already started matches
    .order("kickoff_time", { ascending: true })
    .limit(30);

  if (!matches || matches.length === 0) {
    return NextResponse.json({ updated: 0, message: "No live/pending matches" });
  }

  let updated = 0;

  for (const match of matches) {
    try {
      let homeScore: number | null = null;
      let awayScore: number | null = null;
      let newStatus = match.match_status;

      // 1) Try TheSportsDB first (reliable for World Cup)
      if (match.kickoff_time) {
        const kickoff = new Date(match.kickoff_time);
        const matchDate = kickoff.toISOString().split("T")[0];
        const tsdb = await getScoreFromTheSportsDB(match.team_a, match.team_b, matchDate);
        if (tsdb) {
          homeScore = tsdb.homeScore;
          awayScore = tsdb.awayScore;
          newStatus = tsdb.status;
        }
      }

      // 2) If no score yet, try football-data.org
      if (homeScore == null) {
        const fd = await getScoreFromFootballData(match.fixture_id);
        if (fd) {
          homeScore = fd.homeScore;
          awayScore = fd.awayScore;
          newStatus = fd.status;
        }
      }

      // 3) Update database if something changed
      if (newStatus !== match.match_status || homeScore != null || awayScore != null) {
        const updateData: any = { match_status: newStatus };
        if (homeScore != null) updateData.actual_home_score = homeScore;
        if (awayScore != null) updateData.actual_away_score = awayScore;

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
    await new Promise(r => setTimeout(r, 1000));   // gentle delay
  }

  console.log(`[cron] updated ${updated} matches`);
  return NextResponse.json({ updated });
}