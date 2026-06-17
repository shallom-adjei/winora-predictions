export interface PredictionScores {
  "Home Win": number;
  "Draw": number;
  "Away Win": number;
  "1X": number;      // Home or Draw
  "X2": number;      // Away or Draw
  "Over 1.5 Goals": number;
  "Over 2.5 Goals": number;
  "Under 2.5 Goals": number;
  "Both Teams to Score": number;
  "BTTS No": number;
}

export function computePrediction(match: any): PredictionScores {
  // ----- 1. Normalized 1X2 Market (always sums to 100%) -----
  let homeWeight = 38;
  let drawWeight = 26;
  let awayWeight = 36;

  const formDiff = (Number(match.form_points_a) || 0) - (Number(match.form_points_b) || 0);
  const goalDiffA = (Number(match.home_goals_scored) || 0) - (Number(match.home_goals_conceded) || 0);
  const goalDiffB = (Number(match.away_goals_scored) || 0) - (Number(match.away_goals_conceded) || 0);

  homeWeight += (formDiff * 1.5) + (goalDiffA * 2.0);
  awayWeight -= (formDiff * 1.5) - (goalDiffB * 2.0);

  if (Math.abs(goalDiffA - goalDiffB) < 0.5) drawWeight += 4;
  if (formDiff === 0) drawWeight += 3;

  const total1X2 = homeWeight + drawWeight + awayWeight;
  const homeWinPct = Math.round((homeWeight / total1X2) * 100);
  const drawPct = Math.round((drawWeight / total1X2) * 100);
  const awayWinPct = 100 - (homeWinPct + drawPct);

  // Double Chance – derived directly from normalized values
  const dc1XPct = homeWinPct + drawPct;
  const dcX2Pct = awayWinPct + drawPct;

  // ----- 2. Over / Under 2.5 (perfect mirror) -----
  let goalPropensity = 50;
  goalPropensity += ((Number(match.over25_last5_pct_a) || 50) - 50) * 0.25;
  goalPropensity += ((Number(match.over25_last5_pct_b) || 50) - 50) * 0.25;
  goalPropensity -= ((Number(match.clean_sheets_last5_a) || 0) * 4) + ((Number(match.clean_sheets_last5_b) || 0) * 4);
  goalPropensity += ((Number(match.home_goals_scored) || 0) + (Number(match.away_goals_scored) || 0)) * 3;

  const over25Pct = Math.min(Math.max(Math.round(goalPropensity), 10), 90);
  const under25Pct = 100 - over25Pct;                // always exact complement
  const over15Pct = Math.min(Math.round(over25Pct * 1.25), 95);

  // ----- 3. BTTS (perfect mirror) -----
  let bttsPropensity = 51;
  bttsPropensity += ((Number(match.btts_last5_pct_a) || 50) - 50) * 0.2;
  bttsPropensity += ((Number(match.btts_last5_pct_b) || 50) - 50) * 0.2;
  bttsPropensity -= ((Number(match.failed_to_score_last5_a) || 0) * 5) + ((Number(match.failed_to_score_last5_b) || 0) * 5);

  const bttsPct = Math.min(Math.max(Math.round(bttsPropensity), 10), 90);
  const bttsNoPct = 100 - bttsPct;

  return {
    "Home Win": homeWinPct,
    "Draw": drawPct,
    "Away Win": awayWinPct,
    "1X": dc1XPct,
    "X2": dcX2Pct,
    "Over 1.5 Goals": over15Pct,
    "Over 2.5 Goals": over25Pct,
    "Under 2.5 Goals": under25Pct,
    "Both Teams to Score": bttsPct,
    "BTTS No": bttsNoPct,
  };
}

// ----- Isolated confidence – now depends on the chosen market -----
export function calculateConfidence(
  scores: PredictionScores,
  targetMarket: keyof PredictionScores,
  dataQuality: number
): number {
  const score = scores[targetMarket];
  let baseline = 33;
  if (targetMarket === "1X" || targetMarket === "X2") baseline = 60;
  if (
    targetMarket === "Over 2.5 Goals" ||
    targetMarket === "Under 2.5 Goals" ||
    targetMarket === "Both Teams to Score" ||
    targetMarket === "BTTS No"
  ) baseline = 50;
  if (targetMarket === "Over 1.5 Goals") baseline = 75;

  const edge = score - baseline;
  let confidence = 60 + edge * 0.5 + dataQuality * 0.15;
  return Math.min(Math.max(Math.round(confidence), 55), 95);
}