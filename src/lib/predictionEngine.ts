// Winora Prediction Engine v2
// Starts from neutral 50, adjusts based on supplied statistics

export interface PredictionScores {
  "Home Win": number;
  "Draw": number;
  "Away Win": number;
  "Over 1.5 Goals": number;
  "Over 2.5 Goals": number;
  "Under 2.5 Goals": number;
  "Both Teams to Score": number;
  "BTTS No": number;
  "1X": number;     // Home or Draw
  "X2": number;     // Away or Draw
}

export function computePrediction(match: any): PredictionScores {
  const formA = Number(match.form_points_a) || 0;
  const formB = Number(match.form_points_b) || 0;
  const homeGoalsScored = Number(match.home_goals_scored) || 0;
  const homeGoalsConceded = Number(match.home_goals_conceded) || 0;
  const awayGoalsScored = Number(match.away_goals_scored) || 0;
  const awayGoalsConceded = Number(match.away_goals_conceded) || 0;
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

  // ----- Neutral baselines -----
  let homeWin = 50;
  let draw = 50;
  let awayWin = 50;
  let over25 = 50;
  let btts = 50;
  let under25 = 50;
  let over15 = 50;
  let bttsNo = 50;

  // ----- Form difference (weighted momentum would go here) -----
  const formDiff = formA - formB;

  if (formDiff > 3) { homeWin += 8; awayWin -= 5; }
  else if (formDiff > 1) { homeWin += 4; awayWin -= 3; }
  else if (formDiff < -3) { awayWin += 8; homeWin -= 5; }
  else if (formDiff < -1) { awayWin += 4; homeWin -= 3; }
  else { draw += 4; }

  // ----- Home/Away strength -----
  const homeStrength = homeGoalsScored - homeGoalsConceded;
  const awayStrength = awayGoalsScored - awayGoalsConceded;

  if (homeStrength > 1) { homeWin += 8; awayWin -= 4; }
  if (awayStrength > 1) { awayWin += 8; homeWin -= 4; }
  if (Math.abs(homeStrength - awayStrength) < 0.5) draw += 5;

  // ----- Goal trends -----
  if (over25A > 70) over25 += 10;
  if (over25A > 55) over25 += 5;
  if (over25B > 70) over25 += 10;
  if (over25B > 55) over25 += 5;
  if (h2hOver25 > 70) over25 += 8;

  if (bttsA > 70) btts += 8;
  if (bttsA > 55) btts += 4;
  if (bttsB > 70) btts += 8;
  if (bttsB > 55) btts += 4;
  if (h2hBtts > 70) btts += 8;

  // ----- Under 2.5 (independent) -----
  if (over25A < 40) under25 += 8;
  if (over25B < 40) under25 += 8;
  if (h2hOver25 < 40) under25 += 8;
  if (cleanA >= 3) under25 += 6;
  if (cleanB >= 3) under25 += 6;
  if (failA >= 2) under25 += 5;
  if (failB >= 2) under25 += 5;

  // ----- Over 1.5 (very likely if either team scores often) -----
  if (over25A > 50 || over25B > 50) over15 += 10;
  if (bttsA > 50 || bttsB > 50) over15 += 8;
  if (cleanA <= 1 && cleanB <= 1) over15 += 5;

  // ----- BTTS No (opposite) -----
  bttsNo = 95 - btts; // simple mirror; can be refined later

  // ----- Double Chance (1X, X2) -----
  const homeWinDX = homeWin + draw * 0.6;
  const awayWinDX = awayWin + draw * 0.6;
  // Normalize to 15-95 range
  const clamp = (v: number) => Math.min(Math.max(Math.round(v), 15), 95);

  return {
    "Home Win": clamp(homeWin),
    "Draw": clamp(draw),
    "Away Win": clamp(awayWin),
    "Over 1.5 Goals": clamp(over15),
    "Over 2.5 Goals": clamp(over25),
    "Under 2.5 Goals": clamp(under25),
    "Both Teams to Score": clamp(btts),
    "BTTS No": clamp(bttsNo),
    "1X": clamp(Math.round(homeWinDX)),
    "X2": clamp(Math.round(awayWinDX)),
  };
}

export function calculateConfidence(scores: PredictionScores, dataQuality: number, formDiff?: number) {
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const topScore = sorted[0]?.[1] || 50;
  const secondScore = sorted[1]?.[1] || 50;
  const edge = topScore - secondScore;

  // Confidence formula with edge and data quality
  let confidence = topScore + (edge * 0.7) + (dataQuality * 0.2);
  confidence = Math.min(Math.max(Math.round(confidence), 55), 90);
  return confidence;
}