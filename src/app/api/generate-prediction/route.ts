import { NextRequest, NextResponse } from "next/server";
import { computePrediction, calculateConfidence } from "@/lib/predictionEngine";
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
  const hasRealData = dataQuality >= 30;

  let mainPrediction = "Home Win";
  let confidence = 50;
  let risk = "Medium";
  let stake = "1/5";

  if (hasRealData) {
    const scores = computePrediction(match);
    const sorted = Object.entries(scores).sort((a, b) => (b[1] as number) - (a[1] as number));
    mainPrediction = sorted[0]?.[0] || "Home Win";
    const topScore = sorted[0]?.[1] || 50;
    confidence = calculateConfidence(scores as any, dataQuality);
    const secondScore = sorted[1]?.[1] || 50;
    const edge = topScore - secondScore;
    risk = edge < 5 ? "High" : edge < 12 ? "Medium" : "Low";
    stake = confidence >= 85 ? "2/5" : confidence >= 75 ? "1.5/5" : "1/5";
  } else {
    // No real stats – still provide a safe prediction using AI‑free template
    mainPrediction = "Over 2.5 Goals";
    confidence = 60;
    risk = "High";
    stake = "1/5";
  }

  const analysis = generateAnalysis(match, mainPrediction, confidence, risk, stake);

  return NextResponse.json({
    prediction: mainPrediction,
    confidence,
    analysis,
    fullReport: {
      main_prediction: mainPrediction,
      alternative_prediction: "N/A",
      risk_level: risk,
      confidence_score: confidence,
      recommended_stake: stake,
      analysis,
      final_verdict: `${mainPrediction} is the recommended pick.`,
    },
  });
}