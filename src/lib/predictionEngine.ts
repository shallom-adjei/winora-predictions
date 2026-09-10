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
  if (competitionId === 2000) return 2.70;
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

  // ---------- 1. Team strength from Elo (or league position fallback) ----------
  const leaguePositionToElo = (pos: number): number => {
    // 1st place → 2000 Elo, 20th place → 1400 Elo
    // Clamped to a realistic range for club football
    return Math.max(1400, Math.min(2000, 2000 - (pos - 1) * 32));
  };

  const formToElo = (formPoints: number): number => {
    return 1500 + (formPoints - 15) * 20;
  };

  const eloA = match.elo_a != null
    ? Number(match.elo_a)
    : (match.league_position_a != null
        ? leaguePositionToElo(Number(match.league_position_a))
        : (match.form_points_a != null
            ? formToElo(Number(match.form_points_a))
            : 1500));

  const eloB = match.elo_b != null
    ? Number(match.elo_b)
    : (match.league_position_b != null
        ? leaguePositionToElo(Number(match.league_position_b))
        : (match.form_points_b != null
            ? formToElo(Number(match.form_points_b))
            : 1500));

  const eloDiff = eloA - eloB;

  const homeAdvantage  = getHomeAdvantage(match.league, match.competition_id);
  const matchesUsedTotal =
    (Number(match.matches_used_a) || 0) + (Number(match.matches_used_b) || 0);
  const effectiveHomeAdvantage = matchesUsedTotal <= 4 ? 1.05 : homeAdvantage;
  const leagueAvgGoals = getLeagueAvgGoals(match.league, match.competition_id);

  // Elo-based expected goal ratio (how much stronger the home team is)
  const eloFactorA = 1 / (1 + Math.pow(10, -eloDiff / 400));
  const eloFactorB = 1 - eloFactorA;

  // Prior expected goals – normalised so total equals leagueAvgGoals
  const homeShare = 1 / (1 + Math.pow(10, -eloDiff / 400)); // identical to eloFactorA
  const totalPrior = leagueAvgGoals;
  const priorHome = totalPrior * homeShare * (effectiveHomeAdvantage / (effectiveHomeAdvantage + (2 - effectiveHomeAdvantage)) * 2);
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
let formHome = homeScored * 0.6 + awayConceded * 0.4;
let formAway = awayScored * 0.6 + homeConceded * 0.4;

  // ---------- 3. Dixon‑Coles parameters (if available) ----------
  const rawAttA = Number(match.att_a);
  const rawDefA = Number(match.def_a);
  const rawAttB = Number(match.att_b);
  const rawDefB = Number(match.def_b);

  const rawAttHomeA = Number(match.att_home_a);
  const rawDefHomeA = Number(match.def_home_a);
  const rawAttAwayB = Number(match.att_away_b);
  const rawDefAwayB = Number(match.def_away_b);

  let dcHome: number | null = null;
  let dcAway: number | null = null;

  if (rawAttHomeA && rawDefHomeA && rawAttAwayB && rawDefAwayB) {
    // venue-specific DC (preferred)
    dcHome = clamp(rawAttHomeA) * clamp(rawDefAwayB) * leagueAvgGoals;
    dcAway = clamp(rawAttAwayB) * clamp(rawDefHomeA) * leagueAvgGoals;
  } else if (rawAttA && rawDefA && rawAttB && rawDefB) {
    // overall DC fallback
    dcHome = clamp(rawAttA) * clamp(rawDefB) * leagueAvgGoals * effectiveHomeAdvantage;
    dcAway = clamp(rawAttB) * clamp(rawDefA) * leagueAvgGoals * (2 - effectiveHomeAdvantage);
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

const homeFormPoints = match.form_points_a != null ? Number(match.form_points_a) : null;
const awayFormPoints = match.form_points_b != null ? Number(match.form_points_b) : null;

if (homeFormPoints != null && awayFormPoints != null) {
  const formGap = homeFormPoints - awayFormPoints;
  if (formGap >= 5) {
    expectedHome *= 1.08;
    expectedAway *= 0.92;
  } else if (formGap <= -5) {
    expectedHome *= 0.92;
    expectedAway *= 1.08;
  }
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

  // ---------- Normalise raw probabilities ----------
  // The Poisson+DC loop can leave 1X2 slightly off 100%. Normalise before rounding.
  const raw1x2Total = homeWin + draw + awayWin;
  if (raw1x2Total <= 0) {
    // Safety net: even split if something went wrong
    homeWin = 34;
    draw = 33;
    awayWin = 33;
  } else {
    homeWin = (homeWin / raw1x2Total) * 100;
    draw    = (draw    / raw1x2Total) * 100;
    awayWin = (awayWin / raw1x2Total) * 100;
  }

  // BTTS pair normalisation (they should already sum to 100, but be safe)
  const rawBttsTotal = btts + (1 - btts);
  if (rawBttsTotal <= 0) btts = 0.5;

  // Now round once, cap, and compute double chances from the raw unrounded values
  const cap = (v: number) => Math.min(v, 95);

  const raw1X = homeWin + draw;
  const rawX2 = awayWin + draw;

  const homeWinRounded = cap(Math.round(homeWin));
  const drawRounded    = cap(Math.round(draw));
  const awayWinRounded = cap(Math.round(awayWin));
  const over15Rounded  = cap(Math.round(over15 * 100));
  const over25Rounded  = cap(Math.round(over25 * 100));
  const under25Rounded = cap(Math.round(under25 * 100));
  const bttsRounded    = cap(Math.round(btts * 100));
  const bttsNoRounded  = cap(Math.round((1 - btts) * 100));

  return {
    "Home Win": homeWinRounded,
    "Draw": drawRounded,
    "Away Win": awayWinRounded,
    "1X": cap(Math.round(raw1X)),
    "X2": cap(Math.round(rawX2)),
    "Over 1.5 Goals": over15Rounded,
    "Over 2.5 Goals": over25Rounded,
    "Under 2.5 Goals": under25Rounded,
    "Both Teams to Score": bttsRounded,
    "BTTS No": bttsNoRounded,
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

return `${candidates[0].i}-${candidates[0].j}`;
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