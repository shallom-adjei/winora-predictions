// Pure TypeScript engine – no API calls
export function computePrediction(match: any) {
  const formA = Number(match.form_points_a) || 0;
  const formB = Number(match.form_points_b) || 0;
  const goalsA = Number(match.home_goals_scored) || 0;
  const goalsB = Number(match.away_goals_scored) || 0;
  const concededA = Number(match.home_goals_conceded) || 0;
  const concededB = Number(match.away_goals_conceded) || 0;
  const over25A = Number(match.over25_last5_pct_a) || 0;
  const over25B = Number(match.over25_last5_pct_b) || 0;
  const bttsA = Number(match.btts_last5_pct_a) || 0;
  const bttsB = Number(match.btts_last5_pct_b) || 0;
  const h2hOver25 = Number(match.h2h_over25_pct) || 0;
  const h2hBtts = Number(match.h2h_btts_pct) || 0;
  const cleanA = Number(match.clean_sheets_last5_a) || 0;
  const cleanB = Number(match.clean_sheets_last5_b) || 0;
  const failA = Number(match.failed_to_score_last5_a) || 0;
  const failB = Number(match.failed_to_score_last5_b) || 0;

  const formDiff = formA - formB;
  const posGap = (Number(match.league_position_b) || 99) - (Number(match.league_position_a) || 99);

  let homeWin = 0;
  let draw = 0;
  let awayWin = 0;
  let over25 = 0;
  let btts = 0;

  // Home Win
  if (formDiff > 2) homeWin += 10;
  if (formDiff > 4) homeWin += 5;
  if (posGap > 4) homeWin += 8;
  if (goalsA - concededA > 0.5) homeWin += 6;
  if (concededB - goalsB > 0.5) homeWin += 6;
  if (cleanA >= 2 && failB >= 2) homeWin += 5;

  // Away Win
  if (formDiff < -2) awayWin += 10;
  if (formDiff < -4) awayWin += 5;
  if (posGap < -4) awayWin += 8;
  if (goalsB - concededB > 0.5) awayWin += 6;
  if (concededA - goalsA > 0.5) awayWin += 6;
  if (cleanB >= 2 && failA >= 2) awayWin += 5;

  // Draw
  if (Math.abs(formDiff) <= 2) draw += 8;
  if (Math.abs(posGap) <= 3) draw += 7;
  if (cleanA >= 2 && cleanB >= 2) draw += 6;
  if (failA <= 1 && failB <= 1 && over25A < 50 && over25B < 50) draw += 5;

  // Over 2.5 Goals
  if (over25A > 60) over25 += 10;
  if (over25A > 80) over25 += 5;
  if (over25B > 60) over25 += 10;
  if (over25B > 80) over25 += 5;
  if (h2hOver25 > 60) over25 += 8;
  if (bttsA > 60 && bttsB > 60) over25 += 5;

  // Both Teams to Score
  if (bttsA > 60) btts += 10;
  if (bttsA > 80) btts += 5;
  if (bttsB > 60) btts += 10;
  if (bttsB > 80) btts += 5;
  if (h2hBtts > 60) btts += 8;
  if (failA < 2 && failB < 2) btts += 5;
  if (cleanA >= 3 && cleanB >= 3) btts -= 8;
  if (failA >= 3 || failB >= 3) btts -= 5;

  const clamp = (v: number) => Math.min(Math.max(Math.round(v), 15), 95);
  return {
    "Home Win": clamp(homeWin),
    "Draw": clamp(draw),
    "Away Win": clamp(awayWin),
    "Over 2.5 Goals": clamp(over25),
    "Both Teams to Score": clamp(btts),
    "Under 2.5 Goals": clamp(95 - over25),
  };
}

export function calculateConfidence(scores: Record<string, number>, dataQuality: number) {
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const topScore = sorted[0]?.[1] || 50;
  const secondScore = sorted[1]?.[1] || 50;
  const edge = topScore - secondScore;
  const rawConf = Math.round(topScore * (dataQuality / 100));
  return Math.min(rawConf, 90);
}