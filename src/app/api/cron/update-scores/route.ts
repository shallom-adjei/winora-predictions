import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function getScoreFromFootballData(fixtureId: number) {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `https://api.football-data.org/v4/matches/${fixtureId}`,
      {
        headers: { "X-Auth-Token": apiKey },
        cache: "no-store",
      }
    );

    if (!res.ok) return null;
    const fixture = await res.json();

    const rawStatus = fixture.status;   // SCHEDULED, TIMED, IN_PLAY, PAUSED, FINISHED
    const homeScore = fixture.score?.fullTime?.home ?? null;
    const awayScore = fixture.score?.fullTime?.away ?? null;

    // Map to our simplified statuses
    let newStatus = rawStatus;
    if (rawStatus === "IN_PLAY" || rawStatus === "PAUSED") newStatus = "LIVE";
    else if (rawStatus === "FINISHED") newStatus = "FINISHED";
    // otherwise keep TIMED / SCHEDULED

    return { homeScore, awayScore, newStatus };
  } catch {
    return null;   // network error → silently skip
  }
}

export async function GET() {
  const { supabase } = await import("@/lib/supabase");

  // Fetch all non-finished matches that have a fixture_id, ordered by soonest kickoff
  const { data: matches } = await supabase
    .from("predictions")
    .select("id, fixture_id, main_pick, team_a, team_b, kickoff_time, match_status, actual_home_score, actual_away_score")
    .not("fixture_id", "is", null)
    .neq("match_status", "FINISHED")
    .order("kickoff_time", { ascending: true })
   .limit(10);   // was 50

await new Promise(r => setTimeout(r, 6000));  // was 2000, now 6 seconds

  if (!matches || matches.length === 0) {
    return NextResponse.json({ updated: 0, message: "No live/pending matches" });
  }

  let updated = 0;

  for (const match of matches) {
    try {
      const fd = await getScoreFromFootballData(match.fixture_id);
      if (!fd) continue;   // skip if API failed

      const { homeScore, awayScore, newStatus } = fd;

      // Only update if something changed
      if (newStatus !== match.match_status || homeScore !== match.actual_home_score || awayScore !== match.actual_away_score) {
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
    // Small delay to respect rate limits (10 req/min on free plan)
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log(`[cron] updated ${updated} matches`);
  return NextResponse.json({ updated });
}