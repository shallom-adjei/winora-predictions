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

export async function generatePredictionResult(match: any): Promise<PredictionResult> {
 const { supabaseAdmin: supabase } = await import("@/lib/supabaseAdmin");

  // 1. Elo lookup (existing)
  if (match.elo_a == null || match.elo_b == null) {
    const [resA, resB] = await Promise.all([
      match.elo_a == null
        ? supabase.from("team_ratings").select("elo").eq("team_name", match.team_a).maybeSingle()
        : Promise.resolve({ data: null }),
      match.elo_b == null
        ? supabase.from("team_ratings").select("elo").eq("team_name", match.team_b).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    match.elo_a = match.elo_a ?? resA?.data?.elo ?? null;
    match.elo_b = match.elo_b ?? resB?.data?.elo ?? null;
  }

  // 2. Standings lookup (new)
  if (
    match.league_position_a == null ||
    match.league_position_b == null
  ) {
    const [stA, stB] = await Promise.all([
      match.league_position_a == null && match.team_id_a && match.competition_id
        ? supabase.from("team_standings").select("position")
            .eq("team_id", match.team_id_a)
            .eq("competition_id", match.competition_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      match.league_position_b == null && match.team_id_b && match.competition_id
        ? supabase.from("team_standings").select("position")
            .eq("team_id", match.team_id_b)
            .eq("competition_id", match.competition_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    match.league_position_a = match.league_position_a ?? stA?.data?.position ?? null;
    match.league_position_b = match.league_position_b ?? stB?.data?.position ?? null;
  }

  const dataQuality = calculateDataQuality(match);
  const scores      = computePrediction(match);

  // 3. Odds blending (new)
  const { data: market } = await supabase
    .from("match_odds")
    .select("prob_home, prob_draw, prob_away")
    .eq("prediction_id", match.id)
    .maybeSingle();

  if (market && market.prob_home != null) {
    const MW = 0.20; // 20% market weight
    const marketH = Number(market.prob_home) * 100;
    const marketD = Number(market.prob_draw) * 100;
    const marketA = Number(market.prob_away) * 100;

    const blendedH = scores["Home Win"] * (1 - MW) + marketH * MW;
    const blendedD = scores["Draw"]     * (1 - MW) + marketD * MW;
    const blendedA = scores["Away Win"] * (1 - MW) + marketA * MW;

    // Re-normalise to exactly 100
    const total = blendedH + blendedD + blendedA;
    scores["Home Win"] = Math.round((blendedH / total) * 100);
    scores["Draw"]     = Math.round((blendedD / total) * 100);
    scores["Away Win"] = Math.round((blendedA / total) * 100);
    scores["1X"]       = Math.min(95, scores["Home Win"] + scores["Draw"]);
    scores["X2"]       = Math.min(95, scores["Away Win"] + scores["Draw"]);
  }

 const sorted1x2 = (
  ["Home Win", "Draw", "Away Win"] as (keyof PredictionScores)[]
)
  .map((p) => ({ pick: p, prob: scores[p] as number }))
  .sort((a, b) => b.prob - a.prob);

const topPick = sorted1x2[0].pick;
const topProb = sorted1x2[0].prob;
const secondProb = sorted1x2[1].prob;
const probabilityEdge = topProb - secondProb;

const hasElo      = match.elo_a != null && match.elo_b != null;
const hasForm     = match.form_points_a != null && match.form_points_b != null;
const hasLeaguePos = match.league_position_a != null && match.league_position_b != null;
const hasAnySignal = hasElo || hasForm || hasLeaguePos;

// Skip: no signal at all AND weak probability edge → don't force a pick
if (!hasAnySignal && probabilityEdge < 10) {
  throw new Error("INSUFFICIENT_DATA");
}

const mainPick = topPick;

  const preferOver25  = scores["Over 2.5 Goals"] > 50;
  const preferBttsYes = scores["Both Teams to Score"] > 50;
  const expectedScore = selectConsistentScore(
    scores.rawExpectedHome,
    scores.rawExpectedAway,
    mainPick as "Home Win" | "Draw" | "Away Win",
    preferOver25,
    preferBttsYes
  );
  const [predHome, predAway] = expectedScore.split("-").map(Number);
  const goalsPick = predHome + predAway > 2.5 ? "Over 2.5 Goals" : "Under 2.5 Goals";
  const bttsPick  = predHome > 0 && predAway > 0 ? "Both Teams to Score" : "BTTS No";
  const safePick = (["1X", "X2"] as (keyof PredictionScores)[]).reduce(
    (prev, curr) => (scores[curr] as number) > (scores[prev] as number) ? curr : prev
  );
  const totalMatchesUsed = Math.max(
    Number(match.matches_used_a) || 0,
    Number(match.matches_used_b) || 0
  );
  const confidence = calculateConfidence(scores, mainPick, dataQuality, totalMatchesUsed);
  const mainScore = scores[mainPick] as number;
  const secondScore = Math.max(
    ...(["Home Win", "Draw", "Away Win"] as (keyof PredictionScores)[])
      .filter(m => m !== mainPick)
      .map(m => scores[m] as number)
  );
  const edge = mainScore - secondScore;
  const risk: "Low" | "Medium" | "High" =
    edge > 15 && dataQuality > 70 ? "Low"
    : edge > 8 ? "Medium"
    : "High";
  const stake = confidence >= 72 ? "2/5" : confidence >= 62 ? "1.5/5" : "1/5";
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