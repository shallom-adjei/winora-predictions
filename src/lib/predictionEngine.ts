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
  rawExpectedHome: number;
  rawExpectedAway: number;
  mostProbableScore: string;
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
  // ----- Helper to clamp Dixon‑Coles parameters -----
  const clamp = (v: number) => Math.min(2.5, Math.max(0.3, v));

  // ----- NEW: Home/Away Dixon‑Coles (most accurate) -----
  const rawAttHomeA = Number(match.att_home_a);
  const rawDefHomeA = Number(match.def_home_a);
  const rawAttAwayB = Number(match.att_away_b);
  const rawDefAwayB = Number(match.def_away_b);

  const attHomeA = rawAttHomeA ? clamp(rawAttHomeA) : null;
  const defHomeA = rawDefHomeA ? clamp(rawDefHomeA) : null;
  const attAwayB = rawAttAwayB ? clamp(rawAttAwayB) : null;
  const defAwayB = rawDefAwayB ? clamp(rawDefAwayB) : null;

  let expectedHome: number;
  let expectedAway: number;

  if (attHomeA && defHomeA && attAwayB && defAwayB) {
    // Use home/away parameters
    const overallAvg = 2.5;
    const homeAdvantage = 1.15;
    expectedHome = attHomeA * defAwayB * overallAvg * homeAdvantage;
    expectedAway = attAwayB * defHomeA * overallAvg * (2 - homeAdvantage);
  } else {
    // ----- Fallback to overall Dixon‑Coles (existing logic) -----
    const rawAttA = Number(match.att_a);
    const rawDefA = Number(match.def_a);
    const rawAttB = Number(match.att_b);
    const rawDefB = Number(match.def_b);

    const attA = rawAttA ? clamp(rawAttA) : null;
    const defA = rawDefA ? clamp(rawDefA) : null;
    const attB = rawAttB ? clamp(rawAttB) : null;
    const defB = rawDefB ? clamp(rawDefB) : null;

    if (attA && defA && attB && defB) {
      const overallAvg = 2.5;
      const homeAdvantage = 1.15;
      expectedHome = attA * defB * overallAvg * homeAdvantage;
      expectedAway = attB * defA * overallAvg * (2 - homeAdvantage);
    } else {
      // ----- Heuristic fallback (if no Dixon‑Coles at all) -----
      const homeScored = Number(match.home_goals_scored) || 0;
      const homeConceded = Number(match.home_goals_conceded) || 0;
      const awayScored = Number(match.away_goals_scored) || 0;
      const awayConceded = Number(match.away_goals_conceded) || 0;

      expectedHome = (homeScored * 0.6 + awayConceded * 0.4) * 1.05;
      expectedAway = (awayScored * 0.4 + homeConceded * 0.6) * 0.95;
    }
  }

  // Safety check – if both expected goals are still unrealistically low, fall back to raw averages
  if (expectedHome < 0.5 && expectedAway < 0.5) {
    const homeScored = Number(match.home_goals_scored) || 0;
    const homeConceded = Number(match.home_goals_conceded) || 0;
    const awayScored = Number(match.away_goals_scored) || 0;
    const awayConceded = Number(match.away_goals_conceded) || 0;

    expectedHome = (homeScored * 0.6 + awayConceded * 0.4) * 1.05;
    expectedAway = (awayScored * 0.4 + homeConceded * 0.6) * 0.95;
  }

  // ----- Elo modifier + sanity check (unchanged) -----
  const eloA = Number(match.elo_a) || 1500;
  const eloB = Number(match.elo_b) || 1500;
  const eloDiff = eloA - eloB;
  const ABSOLUTE_ELO_GAP = 200;

  let eloFactorA = eloFactor(eloDiff);
  let eloFactorB = 1 / eloFactorA;

  if (eloDiff > ABSOLUTE_ELO_GAP) {
    eloFactorA *= 1.15;
    eloFactorB *= 0.85;
  } else if (eloDiff < -ABSOLUTE_ELO_GAP) {
    eloFactorA *= 0.85;
    eloFactorB *= 1.15;
  }

  expectedHome *= eloFactorA;
  expectedAway *= eloFactorB;

  // ----- Competition weight -----
  const weight = Number(match.competition_weight) || 1;
  expectedHome *= weight;
  expectedAway *= weight;

  // ----- Rest days / fatigue -----
  const restA = Number(match.rest_days_a) || null;
  const restB = Number(match.rest_days_b) || null;
  expectedHome *= fatigueFactor(restA);
  expectedAway *= fatigueFactor(restB);

    // ----- H2H blending (if available) -----
  const h2hHomeAvg = Number(match.h2h_home_goals_avg);
  const h2hAwayAvg = Number(match.h2h_away_goals_avg);
  if (!isNaN(h2hHomeAvg) && !isNaN(h2hAwayAvg) && (h2hHomeAvg > 0 || h2hAwayAvg > 0)) {
    const h2hWeight = 0.12;   // 12% weight to H2H trend
    expectedHome = expectedHome * (1 - h2hWeight) + h2hHomeAvg * h2hWeight;
    expectedAway = expectedAway * (1 - h2hWeight) + h2hAwayAvg * h2hWeight;
  }

  // ----- Goal floor -----
  const goalFloor = 0.5;
  if (expectedHome < goalFloor && expectedAway < goalFloor) {
    expectedHome = Math.max(expectedHome, 0.3);
    expectedAway = Math.max(expectedAway, 0.3);
  }

  // ----- Poisson probabilities (unchanged) -----
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

    // ----- Most probable exact score -----
  let maxProb = 0;
  let bestHome = 0, bestAway = 0;
  for (let i = 0; i <= maxGoals; i++) {
    for (let j = 0; j <= maxGoals; j++) {
      const prob = probHomeGoals[i] * probAwayGoals[j];
      if (prob > maxProb) {
        maxProb = prob;
        bestHome = i;
        bestAway = j;
      }
    }
  }
  const mostProbableScore = `${bestHome}-${bestAway}`;

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
    rawExpectedHome: expectedHome,
    rawExpectedAway: expectedAway,
    mostProbableScore,
  };
}

export function getConstrainedMostProbableScore(
  rawExpHome: number,
  rawExpAway: number,
  pick: "Home Win" | "Draw" | "Away Win"
): string {
  const maxGoals = 6;
  const probHome = Array.from({ length: maxGoals + 1 }, (_, k) => poissonProb(rawExpHome, k));
  const probAway = Array.from({ length: maxGoals + 1 }, (_, k) => poissonProb(rawExpAway, k));

  let bestProb = 0;
  let bestHome = 0;
  let bestAway = 0;
  for (let i = 0; i <= maxGoals; i++) {
    for (let j = 0; j <= maxGoals; j++) {
      const prob = probHome[i] * probAway[j];
      const outcome = i > j ? "Home Win" : i === j ? "Draw" : "Away Win";
      if (outcome === pick && prob > bestProb) {
        bestProb = prob;
        bestHome = i;
        bestAway = j;
      }
    }
  }
  return `${bestHome}-${bestAway}`;
}

export function selectConsistentScore(
  rawExpHome: number,
  rawExpAway: number,
  mainPick: "Home Win" | "Draw" | "Away Win",
  preferOver25: boolean,
  preferBttsYes: boolean
): string {
  const maxGoals = 6;
  const probHome = Array.from({ length: maxGoals + 1 }, (_, k) =>
    poissonProb(rawExpHome, k)
  );
  const probAway = Array.from({ length: maxGoals + 1 }, (_, k) =>
    poissonProb(rawExpAway, k)
  );

  // Build all possible scorelines
  interface ScoreEntry {
    i: number; j: number; prob: number; outcome: string; total: number; btts: boolean;
  }
  const scoresList: ScoreEntry[] = [];
  for (let i = 0; i <= maxGoals; i++) {
    for (let j = 0; j <= maxGoals; j++) {
      const prob = probHome[i] * probAway[j];
      const outcome = i > j ? "Home Win" : i === j ? "Draw" : "Away Win";
      const total = i + j;
      const btts = i > 0 && j > 0;
      scoresList.push({ i, j, prob, outcome, total, btts });
    }
  }

  // Try full constraints
  let candidates = scoresList.filter(
    s =>
      s.outcome === mainPick &&
      (s.total > 2.5) === preferOver25 &&
      s.btts === preferBttsYes
  );

  if (candidates.length === 0) {
    // Relax BTTS requirement
    candidates = scoresList.filter(
      s => s.outcome === mainPick && (s.total > 2.5) === preferOver25
    );
  }
  if (candidates.length === 0) {
    // Relax Over 2.5 requirement too
    candidates = scoresList.filter(s => s.outcome === mainPick);
  }

  // Pick the most probable remaining score
  candidates.sort((a, b) => b.prob - a.prob);
  return `${candidates[0].i}-${candidates[0].j}`;
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