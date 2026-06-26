import { NextRequest, NextResponse } from "next/server";
import { computePrediction, calculateConfidence, selectConsistentScore } from "@/lib/predictionEngine";
import type { PredictionScores } from "@/lib/predictionEngine";
import { generateAnalysis } from "@/lib/analysisTemplate";

function calculateDataQuality(match: any) {
  let quality = 0;
  if (match.form_points_a != null && match.form_points_b != null) quality += 15;
  if (match.form_points_b != null) quality += 15;
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

  // If Elo not set, try to fetch from team_elos
  if (match.elo_a == null || match.elo_b == null) {
    const { supabase } = await import("@/lib/supabase");
    const [eloResA, eloResB] = await Promise.all([
      supabase.from("team_elos").select("elo_rating").eq("team_name", match.team_a).maybeSingle(),
      supabase.from("team_elos").select("elo_rating").eq("team_name", match.team_b).maybeSingle(),
    ]);
    match.elo_a = match.elo_a ?? eloResA?.data?.elo_rating ?? 1500;
    match.elo_b = match.elo_b ?? eloResB?.data?.elo_rating ?? 1500;
  }

  const dataQuality = calculateDataQuality(match);
  const scores = computePrediction(match);

  // ----- Market selection -----
  const marketsSafe: (keyof PredictionScores)[] = ["1X", "X2"];

  const best = (marketList: (keyof PredictionScores)[]) =>
    marketList.reduce((prev, curr) =>
      (scores[curr] as number) > (scores[prev] as number) ? curr : prev
    );

  // Main pick – highest probability 1X2 outcome
  const mainPick = (
    ["Home Win", "Draw", "Away Win"] as (keyof PredictionScores)[]
  ).reduce((best, current) =>
    (scores[current] as number) > (scores[best] as number) ? current : best
  , "Draw" as keyof PredictionScores);

  // --- Model-driven consistent score selection ---
  const preferOver25 = scores["Over 2.5 Goals"] > 50;
  const preferBttsYes = scores["Both Teams to Score"] > 50;

  const expectedScore = selectConsistentScore(
    scores.rawExpectedHome,
    scores.rawExpectedAway,
    mainPick as "Home Win" | "Draw" | "Away Win",
    preferOver25,
    preferBttsYes
  );

  // Derive market picks from the chosen scoreline
  const [predHome, predAway] = expectedScore.split("-").map(Number);
  const totalGoals = predHome + predAway;
  const goalsPick = totalGoals > 2.5 ? "Over 2.5 Goals" : "Under 2.5 Goals";
  const bttsPick = predHome > 0 && predAway > 0
    ? "Both Teams to Score"
    : "BTTS No";

  const safePick = best(marketsSafe);

  // Confidence for the main pick
  const totalMatchesUsed = Math.max(
    Number(match.matches_used_a) || 0,
    Number(match.matches_used_b) || 0
  );
  const confidence = calculateConfidence(scores, mainPick, dataQuality, totalMatchesUsed);

  // Risk – based on edge between main pick and next best 1X2
  const mainScore = scores[mainPick] as number;
  const secondScore = Math.max(
    ...(["Home Win", "Draw", "Away Win"] as (keyof PredictionScores)[])
      .filter(m => m !== mainPick)
      .map(m => scores[m] as number)
  );
  const edge = mainScore - secondScore;
  const risk =
    edge > 15 && dataQuality > 70 ? "Low" : edge > 8 ? "Medium" : "High";

  const stake = confidence >= 88 ? "2/5" : confidence >= 78 ? "1.5/5" : "1/5";

  const analysis = generateAnalysis(
    match,
    mainPick,
    scores,
    confidence,
    risk,
    stake,
    expectedScore
  );

  // Log probabilities for calibration
  const { supabase } = await import("@/lib/supabase");
  await supabase.from("prediction_logs").insert({
    prediction_id: match.id,
    prob_home_win: scores["Home Win"],
    prob_draw: scores["Draw"],
    prob_away_win: scores["Away Win"],
    prob_over25: scores["Over 2.5 Goals"],
    prob_under25: scores["Under 2.5 Goals"],
    prob_btts: scores["Both Teams to Score"],
    prob_btts_no: scores["BTTS No"],
    main_pick: mainPick,
    safe_pick: safePick,
    goals_pick: goalsPick,
    btts_pick: bttsPick,
  });

  return NextResponse.json({
    prediction: mainPick,
    confidence,
    analysis,
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