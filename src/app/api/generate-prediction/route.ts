import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
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

   const result = await generatePredictionResult(match);
  const {
    mainPick, safePick, goalsPick, bttsPick,
    expectedScore, confidence, risk, stake,
    analysis, scores, dataQuality,
  } = result;

 await supabaseAdmin.from("prediction_logs").insert({
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
    probHome:      scores["Home Win"],
    probDraw:      scores["Draw"],
    probAway:      scores["Away Win"],
    mainEdge:      result.mainEdge,
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