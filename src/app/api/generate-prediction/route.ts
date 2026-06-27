import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { generatePredictionResult } from "@/lib/generatePredictionResult";

export async function POST(req: NextRequest) {
  let body: { match?: any };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { match } = body;
  if (!match || typeof match !== "object") {
    return NextResponse.json({ error: "Request body must include a `match` object" }, { status: 400 });
  }

  // Fetch Elo if missing
  if (match.elo_a == null || match.elo_b == null) {
    const [eloResA, eloResB] = await Promise.all([
      supabase.from("team_elos").select("elo_rating").eq("team_name", match.team_a).maybeSingle(),
      supabase.from("team_elos").select("elo_rating").eq("team_name", match.team_b).maybeSingle(),
    ]);
    match.elo_a = match.elo_a ?? eloResA?.data?.elo_rating ?? 1500;
    match.elo_b = match.elo_b ?? eloResB?.data?.elo_rating ?? 1500;
  }

  const result = generatePredictionResult(match);
  const {
    mainPick, safePick, goalsPick, bttsPick,
    expectedScore, confidence, risk, stake,
    analysis, scores, dataQuality,
  } = result;

  await supabase.from("prediction_logs").insert({
    prediction_id:  match.id,
    prob_home_win:  scores["Home Win"],
    prob_draw:      scores["Draw"],
    prob_away_win:  scores["Away Win"],
    prob_over25:    scores["Over 2.5 Goals"],
    prob_under25:   scores["Under 2.5 Goals"],
    prob_btts:      scores["Both Teams to Score"],
    prob_btts_no:   scores["BTTS No"],
    data_quality:   dataQuality,
    main_pick:      mainPick,
    safe_pick:      safePick,
    goals_pick:     goalsPick,
    btts_pick:      bttsPick,
  });

  return NextResponse.json({
    prediction:    mainPick,
    confidence,
    analysis,
    expectedScore,
    mainPick,
    safePick,
    goalsPick,
    bttsPick,
    riskLevel:     risk,
    stake,
    fullReport: {
      main_prediction:   mainPick,
      safe_pick:         safePick,
      goals_pick:        goalsPick,
      btts_pick:         bttsPick,
      expected_score:    expectedScore,
      risk_level:        risk,
      confidence_score:  confidence,
      recommended_stake: stake,
      analysis,
      final_verdict: `${mainPick} is the strongest statistical angle for this fixture.`,
    },
  });
}