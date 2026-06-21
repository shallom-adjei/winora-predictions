import { NextRequest, NextResponse } from "next/server";

// ----- Stat calculator (unchanged) -----
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

  const total = matches.length;

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
    matches_used: total,
  };
}

// ----- H2H calculator -----
function calculateH2H(matches: any[]) {
  let homeWins = 0, draws = 0, awayWins = 0;
  let over25 = 0, btts = 0;
  for (const m of matches) {
    const hs = m.homeScore, as = m.awayScore;
    if (hs > as) homeWins++;
    else if (hs === as) draws++;
    else awayWins++;
    if (hs + as > 2.5) over25++;
    if (hs > 0 && as > 0) btts++;
  }
  const total = matches.length;
  return {
    h2h_home_wins: homeWins,
    h2h_draws: draws,
    h2h_away_wins: awayWins,
    h2h_over25_pct: Math.round((over25 / total) * 100),
    h2h_btts_pct: Math.round((btts / total) * 100),
  };
}

// ----- FIFA ranking → strength (1‑10 scale) -----
function rankingToStrength(rank: number): number {
  if (!rank || rank <= 0) return 5; // default
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
  const h2h = calculateH2H(h2hMatches || []);

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
    // H2H columns
    h2h_home_wins: h2h.h2h_home_wins,
    h2h_draws: h2h.h2h_draws,
    h2h_away_wins: h2h.h2h_away_wins,
    h2h_over25_pct: h2h.h2h_over25_pct,
    h2h_btts_pct: h2h.h2h_btts_pct,
  };

  const { error } = await supabase
    .from("predictions")
    .update(update)
    .eq("id", matchId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}