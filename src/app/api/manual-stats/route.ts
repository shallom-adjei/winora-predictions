import { NextRequest, NextResponse } from "next/server";

// ----- Helpers -----

function rankingToElo(rank: number): number {
  if (!rank || rank <= 0) return 1500;
  return 2400 - (rank - 1) * 4;   // rough mapping, good enough for starting Elo
}

function calculateRestDays(matches: any[]): number | null {
  if (matches.length < 2) return null;
  const sorted = [...matches].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const d1 = new Date(sorted[0].date);
  const d2 = new Date(sorted[1].date);
  return Math.round((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24));
}

// ----- Original stats calculator (unchanged) -----
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

// ----- Dixon‑Coles parameters -----
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

// ----- Main endpoint -----
export async function POST(req: NextRequest) {
  const { matchId, matchesA, matchesB, h2hMatches, fifaRankingA, fifaRankingB, eloA, eloB } = await req.json();
  if (!matchId || !matchesA || !matchesB) {
    return NextResponse.json({ error: "Missing required data" }, { status: 400 });
  }

  const { supabase } = await import("@/lib/supabase");

  const statsA = calculateStatsFromMatches(matchesA);
  const statsB = calculateStatsFromMatches(matchesB);
  const dc = computeDixonColes(matchesA, matchesB);

  // Rest days from the match lists
  const restA = calculateRestDays(matchesA);
  const restB = calculateRestDays(matchesB);

  // Elo ratings – use AI‑provided if available, else derive from FIFA ranking
  const finalEloA = eloA || (fifaRankingA ? rankingToElo(fifaRankingA) : null);
  const finalEloB = eloB || (fifaRankingB ? rankingToElo(fifaRankingB) : null);

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
    elo_a: finalEloA, elo_b: finalEloB,
    rest_days_a: restA, rest_days_b: restB,
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