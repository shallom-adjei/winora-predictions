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

// Elo → goal advantage factor (1 Elo point ≈ 0.0005 goals)
function eloFactor(eloDiff: number): number {
  return 1 + eloDiff * 0.0005;
}

// Fatigue factor: <3 days rest penalises xG
function fatigueFactor(restDays: number | null): number {
  if (restDays === null) return 1;
  if (restDays <= 2) return 0.92;
  if (restDays === 3) return 0.96;
  return 1;
}

export function computePrediction(match: any): PredictionScores {
  // ----- Dixon‑Coles expected goals (if available) -----
  const attA = Number(match.att_a);
  const defA = Number(match.def_a);
  const attB = Number(match.att_b);
  const defB = Number(match.def_b);

  let expectedHome: number;
  let expectedAway: number;

  if (attA && defA && attB && defB) {
    const overallAvg = 2.5;
    const homeAdvantage = 1.15;
    expectedHome = attA * defB * overallAvg * homeAdvantage;
    expectedAway = attB * defA * overallAvg * (2 - homeAdvantage);
  } else {
    // Fallback heuristic
    const homeScored = Number(match.home_goals_scored) || 0;
    const homeConceded = Number(match.home_goals_conceded) || 0;
    const awayScored = Number(match.away_goals_scored) || 0;
    const awayConceded = Number(match.away_goals_conceded) || 0;

    expectedHome = (homeScored * 0.6 + awayConceded * 0.4) * 1.05;
    expectedAway = (awayScored * 0.4 + homeConceded * 0.6) * 0.95;
  }

  // ----- Elo modifier -----
  const eloA = Number(match.elo_a) || 1500;
  const eloB = Number(match.elo_b) || 1500;
  const eloDiff = eloA - eloB;
  const eloFactorA = eloFactor(eloDiff);
  const eloFactorB = 1 / eloFactorA;   // symmetrical

  expectedHome *= eloFactorA;
  expectedAway *= eloFactorB;

  // ----- Competition weight (applied to xG to scale down friendlies) -----
  const weight = Number(match.competition_weight) || 1;
  expectedHome *= weight;
  expectedAway *= weight;

  // ----- Rest days / fatigue -----
  const restA = Number(match.rest_days_a) || null;
  const restB = Number(match.rest_days_b) || null;
  expectedHome *= fatigueFactor(restA);
  expectedAway *= fatigueFactor(restB);

  // ----- Goal floor -----
  const goalFloor = 0.5;
  if (expectedHome < goalFloor && expectedAway < goalFloor) {
    expectedHome = Math.max(expectedHome, 0.3);
    expectedAway = Math.max(expectedAway, 0.3);
  }

  // ----- Poisson probabilities -----
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

  const cap = (v: number) => Math.min(v, 95);
  const rawBtts = btts;
  homeWin = cap(Math.round(homeWin * 100));
  draw = cap(Math.round(draw * 100));
  awayWin = cap(Math.round(awayWin * 100));
  over15 = cap(Math.round(over15 * 100));
  over25 = cap(Math.round(over25 * 100));
  under25 = cap(Math.round(under25 * 100));
  btts = cap(Math.round(rawBtts * 100));
  const bttsNo = cap(Math.round((1 - rawBtts) * 100));

  return {
    "Home Win": homeWin,
    "Draw": draw,
    "Away Win": awayWin,
    "1X": cap(Math.round(homeWin + draw)),
    "X2": cap(Math.round(awayWin + draw)),
    "Over 1.5 Goals": over15,
    "Over 2.5 Goals": over25,
    "Under 2.5 Goals": under25,
    "Both Teams to Score": btts,
    "BTTS No": bttsNo,
    expectedHomeGoals: Math.round(expectedHome),
    expectedAwayGoals: Math.round(expectedAway),
  };
}

// ----- Confidence (unchanged) -----
export function calculateConfidence(
  scores: PredictionScores,
  targetMarket: keyof PredictionScores,
  dataQuality: number,
  matchesUsed: number = 5
): number {
  const prob = scores[targetMarket] as number;
  let baseline = 33;
  if (targetMarket === "1X" || targetMarket === "X2") baseline = 60;
  if (["Over 2.5 Goals", "Under 2.5 Goals", "Both Teams to Score", "BTTS No"].includes(targetMarket)) baseline = 50;
  if (targetMarket === "Over 1.5 Goals") baseline = 75;

  const edge = prob - baseline;
  const dataFactor = Math.min(1, matchesUsed / 10);
  const rawConfidence = 60 + edge * 0.6 + dataQuality * 0.15 * dataFactor;

  return Math.min(Math.max(Math.round(rawConfidence), 50), 92);
}