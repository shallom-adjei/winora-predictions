import { NextRequest, NextResponse } from "next/server";
import { computePrediction, calculateConfidence } from "@/lib/predictionEngine";
import type { PredictionScores } from "@/lib/predictionEngine";
import { generateAnalysis } from "@/lib/analysisTemplate";

function calculateDataQuality(match: any) {
  let quality = 0;
  if (match.form_points_a != null && match.form_points_b != null) quality += 15;
  if (match.form_points_a != null) quality += 15;
  if (match.home_goals_scored != null) quality += 10;
  if (match.away_goals_scored != null) quality += 10;
  if (match.over25_last5_pct_a != null) quality += 15;
  if (match.over25_last5_pct_b != null) quality += 15;
  if (match.btts_last5_pct_a != null) quality += 10;
  if (match.h2h_last5) quality += 15;
  if (match.league_position_a != null && match.league_position_b != null) quality += 10;
  return Math.min(quality, 100);
}

export async function POST(req: NextRequest) {
  const { match } = await req.json();
  const dataQuality = calculateDataQuality(match);
  const scores = computePrediction(match);

  // ----- Market selection (smart, not just "highest") -----
   const markets1X2: (keyof PredictionScores)[] = ["Home Win", "Draw", "Away Win"];
  const marketsGoals: (keyof PredictionScores)[] = ["Over 2.5 Goals", "Under 2.5 Goals"];
  const marketsBTTS: (keyof PredictionScores)[] = ["Both Teams to Score", "BTTS No"];
  const marketsSafe: (keyof PredictionScores)[] = ["1X", "X2"];

  const best = (marketList: (keyof PredictionScores)[]) =>
    marketList.reduce((prev, curr) =>
      (scores[curr] as number) > (scores[prev] as number) ? curr : prev
    );

  const mainPick = best(markets1X2);       // always a 1X2
  const goalsPick = best(marketsGoals);    // over/under
  const bttsPick = best(marketsBTTS);
  const safePick = best(marketsSafe);

  // Confidence for the main pick
  const confidence = calculateConfidence(scores, mainPick, dataQuality);

  // Risk – based on edge between main pick and next best 1X2
  const mainScore = scores[mainPick];
  const secondScore = Math.max(...markets1X2.map(m => m === mainPick ? 0 : scores[m]));
  const edge = mainScore - secondScore;
  const risk =
    edge > 15 && dataQuality > 70 ? "Low" : edge > 8 ? "Medium" : "High";

  const stake =
    confidence >= 88 ? "2/5" : confidence >= 78 ? "1.5/5" : "1/5";

  const expectedScore = `${scores.expectedHomeGoals}-${scores.expectedAwayGoals}`;

  const analysis = generateAnalysis(
    match,
    mainPick,             // the analysis template still uses the main pick
    scores,
    confidence,
    risk,
    stake
  );

  return NextResponse.json({
    prediction: mainPick,            // backward compatibility
    confidence,
    analysis,
    // Extended info for the frontend
    expectedScore,
    mainPick,
    safePick,
    goalsPick,
    bttsPick,
    riskLevel: risk,
    stake,
    fullReport: {
      main_prediction: mainPick,
      safe_pick: safePick,
      goals_pick: goalsPick,
      btts_pick: bttsPick,
      expected_score: expectedScore,
      risk_level: risk,
      confidence_score: confidence,
      recommended_stake: stake,
      analysis,
      final_verdict: `${mainPick} is the strongest statistical angle for this fixture.`,
    },
  });
}