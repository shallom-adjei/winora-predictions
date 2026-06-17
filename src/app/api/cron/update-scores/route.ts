import { NextResponse } from "next/server";

export const dynamic = "force-dynamic"; // prevent caching

export async function GET() {
  const FOOTBALL_DATA_KEY = process.env.FOOTBALL_DATA_API_KEY;
  if (!FOOTBALL_DATA_KEY) {
    return NextResponse.json({ error: "Missing API key" }, { status: 500 });
  }

  const { supabase } = await import("@/lib/supabase");

  // Fetch up to 10 matches that have a fixture_id and are not finished
  const { data: matches } = await supabase
    .from("predictions")
    .select("id, fixture_id, main_pick")
    .not("fixture_id", "is", null)
    .neq("match_status", "FINISHED")
    .limit(10);

  if (!matches?.length) {
    return NextResponse.json({ updated: 0, message: "No live/pending matches" });
  }

  let updated = 0;
  for (const match of matches) {
    try {
      const res = await fetch(
        `https://api.football-data.org/v4/matches/${match.fixture_id}`,
        { headers: { "X-Auth-Token": FOOTBALL_DATA_KEY } }
      );
      if (!res.ok) continue;
      const fixture = await res.json();

      const newStatus = fixture.status;          // SCHEDULED, LIVE, FINISHED
      const homeScore = fixture.score?.fullTime?.home;
      const awayScore = fixture.score?.fullTime?.away;

      const updateData: any = { match_status: newStatus };

      // If the match has finished and scores are available, save them
      if (newStatus === "FINISHED" && homeScore != null && awayScore != null) {
        updateData.actual_home_score = homeScore;
        updateData.actual_away_score = awayScore;

        // Compute legacy result based on main pick
        const actualOutcome = homeScore > awayScore
          ? "Home Win"
          : homeScore === awayScore
          ? "Draw"
          : "Away Win";
        updateData.result = match.main_pick === actualOutcome ? "Win" : "Loss";
      }

      await supabase.from("predictions").update(updateData).eq("id", match.id);
      updated++;
    } catch (err) {
      console.error("Failed to update fixture", match.fixture_id, err);
    }
    // Small delay to respect football-data.org rate limits
    await new Promise(r => setTimeout(r, 1000));
  }

  return NextResponse.json({ updated });
}