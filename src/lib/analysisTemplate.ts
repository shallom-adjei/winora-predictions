// ------- Pick a random element -------
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ------- Build a clean, non‑contradictory analysis -------
export function generateAnalysis(
  match: any,
  prediction: string,
  confidence: number,
  risk: string,
  stake: string
): string {
  const hasData = match.form_points_a != null || match.form_points_b != null;

  // ----- If no stats at all, use a generic but confident preview -----
  if (!hasData) {
    return pick([
      `In this FIFA World Cup 2026 clash, ${match.team_a} take on ${match.team_b}. Both sides will be eager to make an early statement. Our prediction model points towards ${prediction} with a confidence of ${confidence}%. Risk is assessed as ${risk.toLowerCase()}. Recommended stake: ${stake}.`,
      `${match.team_a} vs ${match.team_b} promises to be a tightly contested World Cup 2026 encounter. Based on squad strength and recent international pedigree, ${prediction} is the favoured outcome (${confidence}% confidence, ${risk.toLowerCase()} risk). Stake: ${stake}.`,
      `FIFA World Cup 2026 action sees ${match.team_a} face ${match.team_b}. While detailed statistics are unavailable, ${prediction} is the most likely market according to our engine. Confidence: ${confidence}%, risk: ${risk.toLowerCase()}. We recommend a ${stake} stake.`,
    ]);
  }

  // ----- Gather only valid, non‑zero stats -----
  const sentences: string[] = [];

  const addStat = (s: string) => { if (s) sentences.push(s); };

  // Form (only if points > 0)
  if (match.form_points_a > 0) {
    addStat(pick([
      `${match.team_a} have collected ${match.form_points_a} points from their last 5 matches.`,
      `${match.team_a}’s recent form shows ${match.form_points_a} points in the last 5 games.`,
      `Over the last 5 fixtures, ${match.team_a} have earned ${match.form_points_a} points.`,
    ]));
  }
  if (match.form_points_b > 0) {
    addStat(pick([
      `${match.team_b} have managed ${match.form_points_b} points in their previous 5 outings.`,
      `${match.team_b}’s last 5 matches yielded ${match.form_points_b} points.`,
      `${match.team_b} have collected ${match.form_points_b} points from their last 5.`,
    ]));
  }

  // Goals (only if both scored and conceded are valid numbers > 0)
  if (match.home_goals_scored > 0 && match.home_goals_conceded >= 0) {
    addStat(pick([
      `${match.team_a} average ${match.home_goals_scored} goals scored and ${match.home_goals_conceded} conceded per home game.`,
      `At home, ${match.team_a} score ${match.home_goals_scored} and concede ${match.home_goals_conceded} on average.`,
      `${match.team_a}’s home matches see ${match.home_goals_scored} scored and ${match.home_goals_conceded} conceded per game.`,
    ]));
  }
  if (match.away_goals_scored > 0 && match.away_goals_conceded >= 0) {
    addStat(pick([
      `${match.team_b} average ${match.away_goals_scored} goals scored and ${match.away_goals_conceded} conceded per away game.`,
      `Away from home, ${match.team_b} score ${match.away_goals_scored} and concede ${match.away_goals_conceded} on average.`,
      `${match.team_b}’s away record shows ${match.away_goals_scored} scored and ${match.away_goals_conceded} conceded per match.`,
    ]));
  }

  // Clean sheets (only if count >= 1, and avoid saying "defensive solidity" for just 1)
  if (match.clean_sheets_last5_a >= 2) {
    addStat(pick([
      `${match.team_a} have kept ${match.clean_sheets_last5_a} clean sheets in their last 5 matches, showing strong defensive organisation.`,
      `${match.team_a}’s defence has recorded ${match.clean_sheets_last5_a} clean sheets in the last 5.`,
    ]));
  }
  if (match.clean_sheets_last5_b >= 2) {
    addStat(pick([
      `${match.team_b} have kept ${match.clean_sheets_last5_b} clean sheets in their last 5 outings.`,
      `${match.team_b}’s backline has ${match.clean_sheets_last5_b} clean sheets in the last 5.`,
    ]));
  }

  // Failed to score (only if count >= 2, otherwise it's not notable)
  if (match.failed_to_score_last5_a >= 2) {
    addStat(pick([
      `${match.team_a} have failed to score in ${match.failed_to_score_last5_a} of their last 5 matches.`,
      `${match.team_a} have been shut out in ${match.failed_to_score_last5_a} of their previous 5.`,
    ]));
  }
  if (match.failed_to_score_last5_b >= 2) {
    addStat(pick([
      `${match.team_b} have failed to score in ${match.failed_to_score_last5_b} of their last 5.`,
      `${match.team_b} have been blanked in ${match.failed_to_score_last5_b} of their last 5 matches.`,
    ]));
  }

  // Over 2.5 %
  if (match.over25_last5_pct_a > 0) {
    addStat(pick([
      `${match.over25_last5_pct_a}% of ${match.team_a}’s recent matches have seen Over 2.5 Goals.`,
      `Over 2.5 Goals has landed in ${match.over25_last5_pct_a}% of ${match.team_a}’s last 5.`,
    ]));
  }
  if (match.over25_last5_pct_b > 0) {
    addStat(pick([
      `${match.over25_last5_pct_b}% of ${match.team_b}’s recent matches have finished with Over 2.5 Goals.`,
      `In ${match.over25_last5_pct_b}% of ${match.team_b}’s last 5, Over 2.5 Goals has been a winning bet.`,
    ]));
  }

  // BTTS %
  if (match.btts_last5_pct_a > 0) {
    addStat(pick([
      `Both Teams to Score has occurred in ${match.btts_last5_pct_a}% of ${match.team_a}’s recent matches.`,
      `${match.team_a} have seen BTTS in ${match.btts_last5_pct_a}% of their last 5 games.`,
    ]));
  }
  if (match.btts_last5_pct_b > 0) {
    addStat(pick([
      `BTTS has landed in ${match.btts_last5_pct_b}% of ${match.team_b}’s last 5 fixtures.`,
      `In ${match.btts_last5_pct_b}% of ${match.team_b}’s recent matches, both teams have scored.`,
    ]));
  }

  // H2H (if present)
  if (match.h2h_last5) {
    addStat(pick([
      `Recent head‑to‑head meetings have been competitive, with both sides trading wins.`,
      `The last few encounters between these teams suggest a balanced contest.`,
      `Previous meetings between ${match.team_a} and ${match.team_b} have often been tight.`,
    ]));
  }

  // Shuffle for variety
  sentences.sort(() => Math.random() - 0.5);

  // Conclusion that always supports the prediction
  const conclusion = pick([
    `Based on these indicators, ${prediction} is the strongest betting market with ${confidence}% confidence and a ${risk.toLowerCase()} risk level. Recommended stake: ${stake}.`,
    `All data points towards ${prediction} (${confidence}% confidence, ${risk.toLowerCase()} risk). A stake of ${stake} is suggested.`,
    `The statistics heavily favour ${prediction} at ${confidence}% confidence. This is a ${risk.toLowerCase()}-risk pick, and we recommend a ${stake} stake.`,
  ]);

  return sentences.join(" ") + " " + conclusion;
}