import {
  computePrediction,
  calculateConfidence,
  selectConsistentScore,
} from "./predictionEngine";
import type { PredictionScores } from "./predictionEngine";
import { generateAnalysis } from "./analysisTemplate";

// ── Data quality score ────────────────────────────────────────
export function calculateDataQuality(match: any): number {
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

// ── Result type ───────────────────────────────────────────────
export interface PredictionResult {
  mainPick:      keyof PredictionScores;
  mainEdge: number;
  safePick:      keyof PredictionScores;
  goalsPick:     string;
  bttsPick:      string;
  expectedScore: string;
  confidence:    number;
  risk:          "Low" | "Medium" | "High";
  stake:         string;
  analysis:      string;
  scores:        PredictionScores;
  dataQuality:   number;
  probHome: number;
  probDraw: number;
  probAway: number;
}

// ── Core shared logic ─────────────────────────────────────────
export async function generatePredictionResult(match: any): Promise<PredictionResult> {
  // ── Elo lookup from team_ratings (ClubElo integration) ──
  // If the match doesn't already have Elo values, look them up from our
  // resolved team_ratings table. The table is populated by /api/refresh-elo,
  // which fuzzy-matches every team name in our DB against ClubElo.
  if (match.elo_a == null || match.elo_b == null) {
    const { supabase } = await import("@/lib/supabase");

    const [resA, resB] = await Promise.all([
      match.elo_a == null
        ? supabase
            .from("team_ratings")
            .select("elo")
            .eq("team_name", match.team_a)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      match.elo_b == null
        ? supabase
            .from("team_ratings")
            .select("elo")
            .eq("team_name", match.team_b)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    match.elo_a = match.elo_a ?? resA?.data?.elo ?? null;
    match.elo_b = match.elo_b ?? resB?.data?.elo ?? null;
  }

  const dataQuality = calculateDataQuality(match);
  const scores      = computePrediction(match);

  // Main pick: highest-probability 1X2 outcome
  const mainPick = (
    ["Home Win", "Draw", "Away Win"] as (keyof PredictionScores)[]
  ).reduce(
    (best, curr) => (scores[curr] as number) > (scores[best] as number) ? curr : best,
    "Draw" as keyof PredictionScores
  );

  // Model-driven consistent scoreline
  const preferOver25  = scores["Over 2.5 Goals"] > 50;
  const preferBttsYes = scores["Both Teams to Score"] > 50;

  const expectedScore = selectConsistentScore(
    scores.rawExpectedHome,
    scores.rawExpectedAway,
    mainPick as "Home Win" | "Draw" | "Away Win",
    preferOver25,
    preferBttsYes
  );

  // Market picks derived from the scoreline
  const [predHome, predAway] = expectedScore.split("-").map(Number);
  const goalsPick = predHome + predAway > 2.5 ? "Over 2.5 Goals" : "Under 2.5 Goals";
  const bttsPick  = predHome > 0 && predAway > 0 ? "Both Teams to Score" : "BTTS No";

  // Safe (double-chance) pick
  const safePick = (["1X", "X2"] as (keyof PredictionScores)[]).reduce(
    (prev, curr) => (scores[curr] as number) > (scores[prev] as number) ? curr : prev
  );

  // Confidence
  const totalMatchesUsed = Math.max(
    Number(match.matches_used_a) || 0,
    Number(match.matches_used_b) || 0
  );
  const confidence = calculateConfidence(scores, mainPick, dataQuality, totalMatchesUsed);

  // Risk: edge between main pick and second-best 1X2
  const mainScore   = scores[mainPick] as number;
  const secondScore = Math.max(
    ...(["Home Win", "Draw", "Away Win"] as (keyof PredictionScores)[])
      .filter(m => m !== mainPick)
      .map(m  => scores[m] as number)
  );
  const edge = mainScore - secondScore;
  const risk: "Low" | "Medium" | "High" =
    edge > 15 && dataQuality > 70 ? "Low"
    : edge > 8                    ? "Medium"
    :                               "High";

  const stake = confidence >= 72 ? "2/5" : confidence >= 62 ? "1.5/5" : "1/5";

  // Analysis text
  const analysis = generateAnalysis(
    match, mainPick, scores, confidence, risk, stake, expectedScore,
    goalsPick, bttsPick
  );

  return {
    mainPick, safePick, goalsPick, bttsPick,
    expectedScore, confidence, risk, stake,
    analysis, scores, dataQuality,
    probHome: scores["Home Win"],
    probDraw: scores["Draw"],
    probAway: scores["Away Win"],
    mainEdge: edge,
  };
}