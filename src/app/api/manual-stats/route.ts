import { NextRequest, NextResponse } from "next/server";

const ALLOWED_FIELDS = [
  "form_points_a", "form_points_b",
  "home_goals_scored", "home_goals_conceded",
  "away_goals_scored", "away_goals_conceded",
  "clean_sheets_last5_a", "clean_sheets_last5_b",
  "failed_to_score_last5_a", "failed_to_score_last5_b",
  "over25_last5_pct_a", "over25_last5_pct_b",
  "btts_last5_pct_a", "btts_last5_pct_b",
  "matches_used_a", "matches_used_b",
  "strength_a", "strength_b",
  "h2h_home_wins", "h2h_draws", "h2h_away_wins",
  "h2h_over25_pct", "h2h_btts_pct",
  "league_position_a", "league_position_b"
];

export async function POST(req: NextRequest) {
  const { matchId, statsJson } = await req.json();
  if (!matchId || !statsJson) {
    return NextResponse.json({ error: "Missing matchId or statsJson" }, { status: 400 });
  }

  const { supabase } = await import("@/lib/supabase");

  // Pick only allowed fields from the incoming JSON
  const update: any = {};
  for (const field of ALLOWED_FIELDS) {
    if (statsJson[field] !== undefined) {
      update[field] = statsJson[field];
    }
  }

  // Mark as manually enriched so automatic enrichment skips it
  update.enrichment_source = "manual";

  if (Object.keys(update).length === 1) {
    return NextResponse.json({ error: "No valid fields provided" }, { status: 400 });
  }

  const { error } = await supabase
    .from("predictions")
    .update(update)
    .eq("id", matchId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}