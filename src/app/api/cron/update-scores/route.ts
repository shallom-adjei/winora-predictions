import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const FOOTBALL_DATA_KEY = process.env.FOOTBALL_DATA_API_KEY;
  if (!FOOTBALL_DATA_KEY) {
    return NextResponse.json({ error: "Missing API key" }, { status: 500 });
  }

  const { supabase } = await import("@/lib/supabase");

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

      const rawStatus = fixture.status;                        // e.g. IN_PLAY, PAUSED, FINISHED
      const homeScore = fixture.score?.fullTime?.home;        // current live score
      const awayScore = fixture.score?.fullTime?.away;

      // Map football-data.org statuses to our simplified statuses
      const liveStatuses = ["IN_PLAY", "PAUSED", "LIVE"];
      const newStatus = rawStatus === "FINISHED" ? "FINISHED" : liveStatuses.includes(rawStatus) ? "LIVE" : rawStatus;

      const updateData: any = { match_status: newStatus };

      // Update scores if they exist (live matches have them)
      if (homeScore != null && awayScore != null) {
        updateData.actual_home_score = homeScore;
        updateData.actual_away_score = awayScore;
      }

      // Compute legacy result only when match is finished
      if (rawStatus === "FINISHED" && homeScore != null && awayScore != null) {
        const actualOutcome = homeScore > awayScore ? "Home Win" : homeScore === awayScore ? "Draw" : "Away Win";
        updateData.result = match.main_pick === actualOutcome ? "Win" : "Loss";
      }

      await supabase.from("predictions").update(updateData).eq("id", match.id);
      updated++;
    } catch (err) {
      console.error("Failed to update fixture", match.fixture_id, err);
    }
    await new Promise(r => setTimeout(r, 1000));
  }

  return NextResponse.json({ updated });
}