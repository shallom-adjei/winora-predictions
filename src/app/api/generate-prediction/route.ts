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

  // 1. Compute all market probabilities
  const scores = computePrediction(match);
  const sorted = (Object.entries(scores) as [keyof PredictionScores, number][]).sort(
    (a, b) => b[1] - a[1]
  );

  // 2. Choose the best market (cast to the correct type)
  const mainPrediction: keyof PredictionScores =
    sorted[0]?.[0] || "Home Win";

  // 3. Confidence – market‑aware
  const confidence = calculateConfidence(scores, mainPrediction, dataQuality);

  // 4. Risk & stake
  const topScore = sorted[0]?.[1] || 50;
  const secondScore = sorted[1]?.[1] || 50;
  const edge = topScore - secondScore;
  const risk =
    edge > 12 && dataQuality > 70 ? "Low" : edge > 6 ? "Medium" : "High";
  const stake =
    confidence >= 85 ? "2/5" : confidence >= 75 ? "1.5/5" : "1/5";

  // 5. Generate the analysis (now receives the scores object)
  const analysis = generateAnalysis(match, mainPrediction, scores, confidence, risk, stake);

  return NextResponse.json({
    prediction: mainPrediction,
    confidence,
    analysis,
    fullReport: {
      main_prediction: mainPrediction,
      alternative_prediction: sorted[1]?.[0] || "N/A",
      risk_level: risk,
      confidence_score: confidence,
      recommended_stake: stake,
      analysis,
      final_verdict: `${mainPrediction} is the strongest statistical angle for this fixture.`,
    },
  });
}