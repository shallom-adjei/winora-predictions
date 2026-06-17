// ---------- Poisson helpers ----------
function poissonProb(lambda: number, k: number): number {
  if (k < 0) return 0;
  let prob = Math.exp(-lambda);
  for (let i = 1; i <= k; i++) prob *= lambda / i;
  return prob;
}

export interface PredictionScores {
  "Home Win": number;
  "Draw": number;
  "Away Win": number;
  "1X": number;
  "X2": number;
  "Over 1.5 Goals": number;
  "Over 2.5 Goals": number;
  "Under 2.5 Goals": number;
  "Both Teams to Score": number;
  "BTTS No": number;
  expectedHomeGoals: number;
  expectedAwayGoals: number;
}

export function computePrediction(match: any): PredictionScores {
  const homeScored = Number(match.home_goals_scored) || 0;
  const homeConceded = Number(match.home_goals_conceded) || 0;
  const awayScored = Number(match.away_goals_scored) || 0;
  const awayConceded = Number(match.away_goals_conceded) || 0;

  // Heuristic expected goals (home advantage ~1.05 multiplier)
  const expectedHome = (homeScored * 0.6 + awayConceded * 0.4) * 1.05;
  const expectedAway = (awayScored * 0.4 + homeConceded * 0.6) * 0.95;

  // Poisson probabilities for up to 6 goals (enough for accuracy)
  const maxGoals = 6;
  const probHomeGoals = Array.from({ length: maxGoals + 1 }, (_, k) =>
    poissonProb(expectedHome, k)
  );
  const probAwayGoals = Array.from({ length: maxGoals + 1 }, (_, k) =>
    poissonProb(expectedAway, k)
  );

  let homeWin = 0, draw = 0, awayWin = 0;
  let over15 = 0, over25 = 0, under25 = 0;
  let btts = 0;

  for (let i = 0; i <= maxGoals; i++) {
    for (let j = 0; j <= maxGoals; j++) {
      const prob = probHomeGoals[i] * probAwayGoals[j];
      if (i > j) homeWin += prob;
      else if (i === j) draw += prob;
      else awayWin += prob;
      if (i + j > 1.5) over15 += prob;
      if (i + j > 2.5) over25 += prob;
      else under25 += prob;
      if (i > 0 && j > 0) btts += prob;
    }
  }

  // Convert to percentages
  const toPct = (v: number) => Math.round(v * 100);
  return {
    "Home Win": toPct(homeWin),
    "Draw": toPct(draw),
    "Away Win": toPct(awayWin),
    "1X": toPct(homeWin + draw),
    "X2": toPct(awayWin + draw),
    "Over 1.5 Goals": toPct(over15),
    "Over 2.5 Goals": toPct(over25),
    "Under 2.5 Goals": toPct(under25),
    "Both Teams to Score": toPct(btts),
    "BTTS No": toPct(1 - btts),
    expectedHomeGoals: Math.round(expectedHome * 10) / 10,
    expectedAwayGoals: Math.round(expectedAway * 10) / 10,
  };
}

// Confidence now combines data quality and probability gap
export function calculateConfidence(
  scores: PredictionScores,
  targetMarket: keyof PredictionScores,
  dataQuality: number
): number {
  const prob = scores[targetMarket] as number;
  // Baseline varies by market type
  let baseline = 33;
  if (targetMarket === "1X" || targetMarket === "X2") baseline = 60;
  if (["Over 2.5 Goals", "Under 2.5 Goals", "Both Teams to Score", "BTTS No"].includes(targetMarket)) baseline = 50;
  if (targetMarket === "Over 1.5 Goals") baseline = 75;

  const edge = prob - baseline;
  return Math.min(Math.max(Math.round(60 + edge * 0.6 + dataQuality * 0.15), 50), 92);
}