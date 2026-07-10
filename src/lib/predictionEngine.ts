// ---------- Poisson helpers ----------
function poissonProb(lambda: number, k: number): number {
  if (k < 0) return 0;
  let prob = Math.exp(-lambda);
  for (let i = 1; i <= k; i++) prob *= lambda / i;
  return prob;
}

// ---------- Dixon-Coles low-score correction ----------
function dcCorrection(
  i: number, j: number, lambda: number, mu: number, rho = -0.13
): number {
  if (i === 0 && j === 0) return 1 - lambda * mu * rho;
  if (i === 1 && j === 0) return 1 + mu * rho;
  if (i === 0 && j === 1) return 1 + lambda * rho;
  if (i === 1 && j === 1) return 1 - rho;
  return 1;
}

// ---------- League-specific home advantage ----------
const LEAGUE_HOME_ADVANTAGE: Record<string, number> = {
  "Premier League": 1.18, "EFL Championship": 1.22, "Bundesliga": 1.20,
  "La Liga": 1.12, "Serie A": 1.14, "Ligue 1": 1.16, "Eredivisie": 1.19,
  "Primeira Liga": 1.20, "Scottish Premiership": 1.21,
  "UEFA Champions League": 1.10, "UEFA Europa League": 1.10,
  "FIFA World Cup": 1.00, "default": 1.15,
};

// ---------- League-specific average goals ----------
const LEAGUE_AVG_GOALS: Record<string, number> = {
  "Premier League": 2.65, "EFL Championship": 2.55, "Bundesliga": 3.05,
  "La Liga": 2.55, "Serie A": 2.65, "Ligue 1": 2.55, "Eredivisie": 3.10,
  "Scottish Premiership": 2.80, "UEFA Champions League": 2.70,
  "UEFA Europa League": 2.65, "FIFA World Cup": 2.70, "default": 2.55,
};

function getHomeAdvantage(league: string | null, competitionId: number | null): number {
  if (competitionId === 2000) return 1.00;
  if (!league) return LEAGUE_HOME_ADVANTAGE["default"];
  return LEAGUE_HOME_ADVANTAGE[league] ?? LEAGUE_HOME_ADVANTAGE["default"];
}

function getLeagueAvgGoals(league: string | null, competitionId: number | null): number {
  if (competitionId === 2000) return 2.60;
  if (!league) return LEAGUE_AVG_GOALS["default"];
  return LEAGUE_AVG_GOALS[league] ?? LEAGUE_AVG_GOALS["default"];
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
}

export function computePrediction(match: any): PredictionScores {
  const clamp = (v: number) => Math.min(2.5, Math.max(0.3, v));

  // ---------- 1. Team strength from Elo ----------
  const eloA = Number(match.elo_a) || 1500;
  const eloB = Number(match.elo_b) || 1500;
  const eloDiff = eloA - eloB;

  const homeAdvantage  = getHomeAdvantage(match.league, match.competition_id);
  const leagueAvgGoals = getLeagueAvgGoals(match.league, match.competition_id);

  // Elo-based expected goal ratio (how much stronger the home team is)
  const eloFactorA = 1 / (1 + Math.pow(10, -eloDiff / 400));
  const eloFactorB = 1 - eloFactorA;

  // Prior expected goals – normalised so total equals leagueAvgGoals
  const homeShare = 1 / (1 + Math.pow(10, -eloDiff / 400)); // identical to eloFactorA
  const totalPrior = leagueAvgGoals;
  const priorHome = totalPrior * homeShare * (homeAdvantage / (homeAdvantage + (2 - homeAdvantage)) * 2);
  const priorAway = totalPrior - priorHome;

  // ---------- 2. Actual stats (if available) ----------
  const homeScored = Number(match.home_goals_scored) || 0;
  const homeConceded = Number(match.home_goals_conceded) || 0;
  const awayScored = Number(match.away_goals_scored) || 0;
  const awayConceded = Number(match.away_goals_conceded) || 0;
  const matchesUsedA = Number(match.matches_used_a) || 0;
  const matchesUsedB = Number(match.matches_used_b) || 0;

  // How much we trust the actual stats (data weight)
  const weightA = Math.min(1, matchesUsedA / 10);   // full trust after 10 matches
  const weightB = Math.min(1, matchesUsedB / 10);

  // Form-based expected goals
  let formHome = (homeScored * 0.6 + awayConceded * 0.4) * homeAdvantage;
  let formAway = (awayScored * 0.6 + homeConceded * 0.4) * (2 - homeAdvantage);

  // ---------- 3. Dixon‑Coles parameters (if available) ----------
  const rawAttA = Number(match.att_a);
  const rawDefA = Number(match.def_a);
  const rawAttB = Number(match.att_b);
  const rawDefB = Number(match.def_b);

  let dcHome: number | null = null;
  let dcAway: number | null = null;

  if (rawAttA && rawDefA && rawAttB && rawDefB) {
    const attA = clamp(rawAttA);
    const defA = clamp(rawDefA);
    const attB = clamp(rawAttB);
    const defB = clamp(rawDefB);
    dcHome = attA * defB * leagueAvgGoals * homeAdvantage;
    dcAway = attB * defA * leagueAvgGoals * (2 - homeAdvantage);
  }

  // ---------- 4. Combine sources with Bayesian blending ----------
  let expectedHome: number;
  let expectedAway: number;

  // Elo gap influence: the bigger the gap, the more we trust the prior
  const eloGap = Math.abs(eloDiff);
  const priorBoost = Math.min(1, eloGap / 300);   // 0 to 1, max at 300+ gap

  if (dcHome !== null && dcAway !== null) {
    // Blend Dixon‑Coles with form and prior, but prior gets extra weight for large Elo gaps
    const dcWeight = Math.min(0.6, (weightA + weightB) / 2);
    const formWeight = (1 - dcWeight) * 0.5 * (1 - priorBoost);
    const priorWeight = (1 - dcWeight) * 0.5 + (1 - dcWeight) * 0.5 * priorBoost;
    expectedHome = dcHome * dcWeight + formHome * formWeight + priorHome * priorWeight;
    expectedAway = dcAway * dcWeight + formAway * formWeight + priorAway * priorWeight;
  } else if (weightA > 0 || weightB > 0) {
    // Form and prior with prior boost – but when Elo gap is tiny, trust form more
    const eloIsUnreliable = eloGap < 30;
    const effectivePriorBoost = eloIsUnreliable ? 0 : priorBoost;
    const formWeight = Math.min(weightA, weightB) * (1 - effectivePriorBoost);
    const priorWeight = 1 - formWeight;
    expectedHome = formHome * formWeight + priorHome * priorWeight;
    expectedAway = formAway * formWeight + priorAway * priorWeight;
  } else {
    // No data – only prior
    expectedHome = priorHome;
    expectedAway = priorAway;
  }

  // ---------- 6. Competition weight ----------
  const compWeight = Number(match.competition_weight) || 1;
  expectedHome *= compWeight;
  expectedAway *= compWeight;

  // ---------- 7. Fatigue ----------
  const restA = Number(match.rest_days_a) || null;
  const restB = Number(match.rest_days_b) || null;
  const fatigueFactor = (rest: number | null) => {
    if (rest === null) return 1;
    if (rest <= 2) return 0.92;
    if (rest === 3) return 0.96;
    return 1;
  };
  expectedHome *= fatigueFactor(restA);
  expectedAway *= fatigueFactor(restB);

  // ---------- 8. H2H blending (small weight) ----------
  const h2hHomeAvg = Number(match.h2h_home_goals_avg);
  const h2hAwayAvg = Number(match.h2h_away_goals_avg);
  if (!isNaN(h2hHomeAvg) && !isNaN(h2hAwayAvg) && (h2hHomeAvg > 0 || h2hAwayAvg > 0)) {
    const h2hWeight = 0.12;
    expectedHome = expectedHome * (1 - h2hWeight) + h2hHomeAvg * h2hWeight;
    expectedAway = expectedAway * (1 - h2hWeight) + h2hAwayAvg * h2hWeight;
  }

  // ---------- 9. Goal floor (only if both extremely low) ----------
  if (expectedHome < 0.3 && expectedAway < 0.3) {
    expectedHome = Math.max(expectedHome, 0.3);
    expectedAway = Math.max(expectedAway, 0.3);
  }

  // ---------- Form-momentum boost ----------
  const homeFormPoints = Number(match.form_points_a) || 0;
  const awayFormPoints = Number(match.form_points_b) || 0;
  const formGap = homeFormPoints - awayFormPoints;

  if (formGap >= 5) {
    // Home team in much better recent form – boost their xG by 8%
    expectedHome *= 1.08;
    expectedAway *= 0.92;
  } else if (formGap <= -5) {
    // Away team in much better recent form
    expectedHome *= 0.92;
    expectedAway *= 1.08;
  }

  // ---------- 10. Poisson simulation (unchanged) ----------
  const maxGoals = 6;
  const probHomeGoals = Array.from({ length: maxGoals + 1 }, (_, k) =>
    poissonProb(expectedHome, k)
  );
  const probAwayGoals = Array.from({ length: maxGoals + 1 }, (_, k) =>
    poissonProb(expectedAway, k)
  );

  let homeWin = 0, draw = 0, awayWin = 0;
  let over15 = 0, over25 = 0, under25 = 0, btts = 0;

  for (let i = 0; i <= maxGoals; i++) {
        for (let j = 0; j <= maxGoals; j++) {
      const correction = dcCorrection(i, j, expectedHome, expectedAway);
      const prob = probHomeGoals[i] * probAwayGoals[j] * correction;
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
    rawExpectedHome: expectedHome,
    rawExpectedAway: expectedAway,
  };
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
      const correction = dcCorrection(i, j, rawExpHome, rawExpAway);
      const prob = probHome[i] * probAway[j] * correction;
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

  
  candidates.sort((a, b) => b.prob - a.prob);

  // Take the top 3 (or fewer) most probable scores
  const top = candidates.slice(0, 3);

  // Weighted random selection – use a simple deterministic seed from the raw xG values
  // so the same match always produces the same result.
  const seed = Math.round((rawExpHome + rawExpAway) * 1000);
  const pseudoRandom = ((seed * 9301 + 49297) % 233280) / 233280;

  // Build cumulative weights
  const totalProb = top.reduce((sum, s) => sum + s.prob, 0);
  let cumulative = 0;
  const threshold = pseudoRandom * totalProb;

  for (const s of top) {
    cumulative += s.prob;
    if (threshold <= cumulative) {
      return `${s.i}-${s.j}`;
    }
  }

  // Fallback (should never reach here)
  return `${top[0].i}-${top[0].j}`;
}

export function calculateConfidence(
  scores: PredictionScores,
  targetMarket: keyof PredictionScores,
  dataQuality: number,
  matchesUsed = 5
): number {
  const prob = (scores[targetMarket] as number) / 100;

  const baselines: Partial<Record<keyof PredictionScores, number>> = {
    "Home Win": 0.45, "Draw": 0.27, "Away Win": 0.28,
    "1X": 0.67, "X2": 0.55,
    "Over 2.5 Goals": 0.50, "Under 2.5 Goals": 0.50,
    "Both Teams to Score": 0.50, "BTTS No": 0.50,
    "Over 1.5 Goals": 0.75,
  };

  const baseline   = baselines[targetMarket] ?? 0.45;
  const dataFactor = Math.min(1, matchesUsed / 10);
  const edge       = Math.max(0, (prob - baseline) / (1 - baseline));
  const rawConfidence = 50 + edge * 38 + (dataQuality / 100) * 7 * dataFactor;

  return Math.min(Math.max(Math.round(rawConfidence), 50), 92);
}