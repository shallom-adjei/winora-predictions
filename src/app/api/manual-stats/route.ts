import { NextRequest, NextResponse } from "next/server";

// Fields that must be integers (will be rounded if decimals are provided)
const INTEGER_FIELDS = new Set([
  "form_points_a", "form_points_b",
  "clean_sheets_last5_a", "clean_sheets_last5_b",
  "failed_to_score_last5_a", "failed_to_score_last5_b",
  "matches_used_a", "matches_used_b",
  "strength_a", "strength_b",
  "h2h_home_wins", "h2h_draws", "h2h_away_wins",
  "h2h_over25_pct", "h2h_btts_pct",
  "league_position_a", "league_position_b"
]);

// Fields that can be floats
const FLOAT_FIELDS = new Set([
  "home_goals_scored", "home_goals_conceded",
  "away_goals_scored", "away_goals_conceded",
  "over25_last5_pct_a", "over25_last5_pct_b",
  "btts_last5_pct_a", "btts_last5_pct_b"
]);

export async function POST(req: NextRequest) {
  const { matchId, statsJson } = await req.json();
  if (!matchId || !statsJson) {
    return NextResponse.json({ error: "Missing matchId or statsJson" }, { status: 400 });
  }

  const { supabase } = await import("@/lib/supabase");

  const update: any = {};

  // Round integers, keep floats
  for (const [key, value] of Object.entries(statsJson)) {
    if (typeof value !== "number") continue;

    if (INTEGER_FIELDS.has(key)) {
      update[key] = Math.round(value as number);
    } else if (FLOAT_FIELDS.has(key)) {
      update[key] = value;
    }
    // ignore any unknown fields
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No valid fields provided" }, { status: 400 });
  }

  // Mark as manually enriched (column must exist; if not, it will be ignored gracefully)
  try {
    update.enrichment_source = "manual";
  } catch {}

  const { error } = await supabase
    .from("predictions")
    .update(update)
    .eq("id", matchId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}