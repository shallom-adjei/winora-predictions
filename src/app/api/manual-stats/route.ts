import { NextRequest, NextResponse } from "next/server";

// ----- Recency weight (half‑life ~1 year) -----
function recencyWeight(dateStr: string): number {
  const daysAgo = (new Date().getTime() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24);
  return Math.exp(-daysAgo / 365);
}

// ----- Standard stats calculator (unchanged, but now returns raw data for Dixon‑Coles) -----
function calculateStatsFromMatches(matches: any[]) {
  let formPoints = 0;
  let homeGoals = 0, homeConceded = 0, homeCount = 0;
  let awayGoals = 0, awayConceded = 0, awayCount = 0;
  let cleanSheets = 0, failedToScore = 0;
  let over25Count = 0, bttsCount = 0;

  const last5 = matches.slice(0, 5);

  for (const m of matches) {
    const gf = m.goalsFor;
    const ga = m.goalsAgainst;
    const isHome = m.home;

    if (gf > ga) formPoints += 3;
    else if (gf === ga) formPoints += 1;

    if (isHome) { homeGoals += gf; homeConceded += ga; homeCount++; }
    else { awayGoals += gf; awayConceded += ga; awayCount++; }

    if (ga === 0) cleanSheets++;
    if (gf === 0) failedToScore++;
    if (gf + ga > 2.5) over25Count++;
    if (gf > 0 && ga > 0) bttsCount++;
  }

  let formPointsLast5 = 0, cleanSheetsLast5 = 0, failedToScoreLast5 = 0;
  let over25Last5 = 0, bttsLast5 = 0;

  for (const m of last5) {
    const gf = m.goalsFor, ga = m.goalsAgainst;
    if (gf > ga) formPointsLast5 += 3;
    else if (gf === ga) formPointsLast5 += 1;
    if (ga === 0) cleanSheetsLast5++;
    if (gf === 0) failedToScoreLast5++;
    if (gf + ga > 2.5) over25Last5++;
    if (gf > 0 && ga > 0) bttsLast5++;
  }

  return {
    form_points: formPointsLast5,
    home_goals_scored: homeCount ? (homeGoals / homeCount).toFixed(1) : null,
    home_goals_conceded: homeCount ? (homeConceded / homeCount).toFixed(1) : null,
    away_goals_scored: awayCount ? (awayGoals / awayCount).toFixed(1) : null,
    away_goals_conceded: awayCount ? (awayConceded / awayCount).toFixed(1) : null,
    clean_sheets_last5: cleanSheetsLast5,
    failed_to_score_last5: failedToScoreLast5,
    over25_last5_pct: ((over25Last5 / 5) * 100).toFixed(0),
    btts_last5_pct: ((bttsLast5 / 5) * 100).toFixed(0),
    matches_used: matches.length,
    avg_scored: matches.length ? (matches.reduce((s, m) => s + m.goalsFor, 0) / matches.length) : 0,
    avg_conceded: matches.length ? (matches.reduce((s, m) => s + m.goalsAgainst, 0) / matches.length) : 0,
  };
}

// ----- Dixon‑Coles attack/defense parameters -----
function computeDixonColes(matchesA: any[], matchesB: any[]) {
  const allMatches = [...matchesA, ...matchesB];
  const totalMatches = allMatches.length;
  if (totalMatches === 0) return { attA: null, defA: null, attB: null, defB: null, overallAvg: 1 };

  const overallAvgGoals = allMatches.reduce((s, m) => s + m.goalsFor + m.goalsAgainst, 0) / totalMatches;

  const avgScoredA = matchesA.length ? matchesA.reduce((s, m) => s + m.goalsFor, 0) / matchesA.length : overallAvgGoals;
  const avgConcededA = matchesA.length ? matchesA.reduce((s, m) => s + m.goalsAgainst, 0) / matchesA.length : overallAvgGoals;
  const avgScoredB = matchesB.length ? matchesB.reduce((s, m) => s + m.goalsFor, 0) / matchesB.length : overallAvgGoals;
  const avgConcededB = matchesB.length ? matchesB.reduce((s, m) => s + m.goalsAgainst, 0) / matchesB.length : overallAvgGoals;

  const attA = avgScoredA / overallAvgGoals;
  const defA = avgConcededA / overallAvgGoals;
  const attB = avgScoredB / overallAvgGoals;
  const defB = avgConcededB / overallAvgGoals;

  return { attA, defA, attB, defB, overallAvg: overallAvgGoals };
}

// ----- Recency‑weighted H2H calculator -----
function calculateWeightedH2H(h2hMatches: any[]) {
  if (!h2hMatches.length) return null;

  let weightedHomeWins = 0, weightedDraws = 0, weightedAwayWins = 0;
  let weightedOver25 = 0, weightedBtts = 0, totalWeight = 0;

  for (const m of h2hMatches) {
    const w = recencyWeight(m.date);
    totalWeight += w;
    const hs = m.homeScore, as = m.awayScore;
    if (hs > as) weightedHomeWins += w;
    else if (hs === as) weightedDraws += w;
    else weightedAwayWins += w;
    if (hs + as > 2.5) weightedOver25 += w;
    if (hs > 0 && as > 0) weightedBtts += w;
  }

  if (totalWeight === 0) return null;

  return {
    h2h_home_wins: Math.round(weightedHomeWins / totalWeight * 5),
    h2h_draws: Math.round(weightedDraws / totalWeight * 5),
    h2h_away_wins: Math.round(weightedAwayWins / totalWeight * 5),
    h2h_over25_pct: Math.round((weightedOver25 / totalWeight) * 100),
    h2h_btts_pct: Math.round((weightedBtts / totalWeight) * 100),
  };
}

// ----- FIFA ranking → strength (unchanged) -----
function rankingToStrength(rank: number): number {
  if (!rank || rank <= 0) return 5;
  if (rank <= 5) return 10;
  if (rank <= 10) return 9;
  if (rank <= 20) return 8;
  if (rank <= 30) return 7;
  if (rank <= 50) return 6;
  if (rank <= 80) return 5;
  if (rank <= 120) return 4;
  if (rank <= 160) return 3;
  if (rank <= 200) return 2;
  return 1;
}

// ----- Main endpoint -----
export async function POST(req: NextRequest) {
  const { matchId, matchesA, matchesB, h2hMatches, fifaRankingA, fifaRankingB } = await req.json();
  if (!matchId || !matchesA || !matchesB) {
    return NextResponse.json({ error: "Missing required data" }, { status: 400 });
  }

  const { supabase } = await import("@/lib/supabase");

  const statsA = calculateStatsFromMatches(matchesA);
  const statsB = calculateStatsFromMatches(matchesB);
  const weightedH2H = calculateWeightedH2H(h2hMatches || []);
  const { attA, defA, attB, defB } = computeDixonColes(matchesA, matchesB);

  const update: any = {
    enrichment_source: "manual",
    form_points_a: statsA.form_points,
    form_points_b: statsB.form_points,
    home_goals_scored: statsA.home_goals_scored,
    home_goals_conceded: statsA.home_goals_conceded,
    away_goals_scored: statsB.away_goals_scored,
    away_goals_conceded: statsB.away_goals_conceded,
    clean_sheets_last5_a: statsA.clean_sheets_last5,
    clean_sheets_last5_b: statsB.clean_sheets_last5,
    failed_to_score_last5_a: statsA.failed_to_score_last5,
    failed_to_score_last5_b: statsB.failed_to_score_last5,
    over25_last5_pct_a: statsA.over25_last5_pct,
    over25_last5_pct_b: statsB.over25_last5_pct,
    btts_last5_pct_a: statsA.btts_last5_pct,
    btts_last5_pct_b: statsB.btts_last5_pct,
    matches_used_a: statsA.matches_used,
    matches_used_b: statsB.matches_used,
    strength_a: fifaRankingA ? rankingToStrength(fifaRankingA) : null,
    strength_b: fifaRankingB ? rankingToStrength(fifaRankingB) : null,
    league_position_a: fifaRankingA || null,
    league_position_b: fifaRankingB || null,
    att_a: attA,
    def_a: defA,
    att_b: attB,
    def_b: defB,
  };

  if (weightedH2H) {
    update.h2h_home_wins = weightedH2H.h2h_home_wins;
    update.h2h_draws = weightedH2H.h2h_draws;
    update.h2h_away_wins = weightedH2H.h2h_away_wins;
    update.h2h_over25_pct = weightedH2H.h2h_over25_pct;
    update.h2h_btts_pct = weightedH2H.h2h_btts_pct;
  }

  const { error } = await supabase
    .from("predictions")
    .update(update)
    .eq("id", matchId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}