import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const { supabase } = await import("@/lib/supabase");

  // Get all finished predictions with actual scores
  const { data: matches } = await supabase
    .from("predictions")
    .select("id, actual_home_score, actual_away_score")
    .eq("match_status", "FINISHED")
    .not("actual_home_score", "is", null);

  if (!matches || matches.length === 0) {
    return NextResponse.json({ message: "No finished matches found." });
  }

  let updated = 0;

  for (const match of matches) {
    const hs = match.actual_home_score!;
    const as = match.actual_away_score!;
    const totalGoals = hs + as;

    const { error } = await supabase
      .from("prediction_logs")
      .update({
        actual_home_score: hs,
        actual_away_score: as,
        result_home_win:   hs > as,
        result_draw:       hs === as,
        result_away_win:   as > hs,
        result_over25:     totalGoals > 2.5,
        result_btts:       hs > 0 && as > 0,
      })
      .eq("prediction_id", match.id);

    if (!error) updated++;
  }

  return NextResponse.json({
    message: `Backfilled ${updated} prediction logs.`,
    updated,
  });
}