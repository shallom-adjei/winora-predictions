import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { matchId, statsJson } = await req.json();
  if (!matchId || !statsJson) {
    return NextResponse.json({ error: "Missing matchId or statsJson" }, { status: 400 });
  }

  const { supabase } = await import("@/lib/supabase");

  // Validate the incoming JSON structure
  const requiredFields = [
    "form_points_a", "form_points_b",
    "home_goals_scored", "home_goals_conceded",
    "away_goals_scored", "away_goals_conceded",
    "clean_sheets_last5_a", "clean_sheets_last5_b",
    "failed_to_score_last5_a", "failed_to_score_last5_b",
    "over25_last5_pct_a", "over25_last5_pct_b",
    "btts_last5_pct_a", "btts_last5_pct_b",
    "matches_used_a", "matches_used_b"
  ];

  const missing = requiredFields.filter(f => statsJson[f] === undefined);
  if (missing.length > 0) {
    return NextResponse.json({
      error: "Missing fields",
      missing
    }, { status: 400 });
  }

  const update = {
    ...statsJson,
    // mark as manually enriched so automatic enrichment skips it
    enrichment_source: "manual",
  };

  const { error } = await supabase
    .from("predictions")
    .update(update)
    .eq("id", matchId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}