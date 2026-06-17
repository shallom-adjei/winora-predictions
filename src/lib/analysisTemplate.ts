// ------- Helper to pick a random element from an array -------
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ------- Helper to format a team name (can add facts later) -------
function teamName(name: string): string {
  return name;
}

// ------- Stat‑based sentence pools -------
function formSentences(team: string, points: number, isHome: boolean) {
  const location = isHome ? "home" : "away";
  const templates = [
    `${team} have collected ${points} points from their last 5 ${location} matches.`,
    `In their previous 5 ${location} fixtures, ${team} have earned ${points} points.`,
    `${team}’s recent ${location} form shows ${points} points from the last 5 games.`,
    `Over the last 5 ${location} outings, ${team} have managed ${points} points.`,
  ];
  return pick(templates);
}

function goalSentences(team: string, scored: string, conceded: string, isHome: boolean) {
  const loc = isHome ? "home" : "away";
  const templates = [
    `${team} average ${scored} goals scored and ${conceded} conceded per ${loc} game.`,
    `In ${loc} matches, ${team} score ${scored} and concede ${conceded} on average.`,
    `${team}’s ${loc} record shows ${scored} scored and ${conceded} conceded per game.`,
  ];
  return pick(templates);
}

function cleanSheetSentences(team: string, count: number) {
  if (count === 0) return "";
  const templates = [
    `${team} have kept ${count} clean sheets in their last 5 matches.`,
    `${team}’s defence has recorded ${count} clean sheets in the last 5.`,
    `With ${count} clean sheets in the last 5, ${team} show defensive solidity.`,
  ];
  return pick(templates);
}

function failedToScoreSentences(team: string, count: number) {
  if (count === 0) return "";
  const templates = [
    `${team} have failed to score in ${count} of their last 5 outings.`,
    `${team} have been shut out in ${count} of the previous 5 matches.`,
    `In ${count} of their last 5 games, ${team} couldn’t find the net.`,
  ];
  return pick(templates);
}

function over25Sentences(team: string, pct: number, isHome: boolean) {
  const loc = isHome ? "home" : "away";
  const templates = [
    `${pct}% of ${team}’s recent ${loc} games have seen Over 2.5 Goals.`,
    `Over 2.5 Goals has landed in ${pct}% of ${team}’s last 5 ${loc} matches.`,
    `${team}’s ${loc} matches have been high‑scoring, with ${pct}% hitting Over 2.5.`,
  ];
  return pick(templates);
}

function bttsSentences(team: string, pct: number, isHome: boolean) {
  const loc = isHome ? "home" : "away";
  const templates = [
    `Both Teams to Score has occurred in ${pct}% of ${team}’s recent ${loc} fixtures.`,
    `In ${pct}% of ${team}’s last 5 ${loc} games, both teams found the net.`,
    `${team}’s ${loc} encounters have seen BTTS in ${pct}% of the matches.`,
  ];
  return pick(templates);
}

function h2hSentences(h2h: string) {
  const templates = [
    `Recent head‑to‑head meetings have been competitive, with both sides trading wins.`,
    `The last few encounters between these teams have been closely fought.`,
    `Previous meetings suggest a balanced contest, with no clear dominance.`,
  ];
  return pick(templates);
}

// ------- Main analysis generator -------
export function generateAnalysis(
  match: any,
  prediction: string,
  confidence: number,
  risk: string,
  stake: string
): string {
  const hasData = match.form_points_a != null || match.form_points_b != null;

  // ----- CASE 1: Stats are available -----
  if (hasData) {
    const sentences: string[] = [];

    // Form
    if (match.form_points_a != null) {
      sentences.push(formSentences(match.team_a, match.form_points_a, true));
    }
    if (match.form_points_b != null) {
      sentences.push(formSentences(match.team_b, match.form_points_b, false));
    }

    // Goals
    if (match.home_goals_scored != null && match.home_goals_conceded != null) {
      sentences.push(goalSentences(match.team_a, match.home_goals_scored, match.home_goals_conceded, true));
    }
    if (match.away_goals_scored != null && match.away_goals_conceded != null) {
      sentences.push(goalSentences(match.team_b, match.away_goals_scored, match.away_goals_conceded, false));
    }

    // Clean sheets / failed to score
    if (match.clean_sheets_last5_a) sentences.push(cleanSheetSentences(match.team_a, match.clean_sheets_last5_a));
    if (match.clean_sheets_last5_b) sentences.push(cleanSheetSentences(match.team_b, match.clean_sheets_last5_b));
    if (match.failed_to_score_last5_a) sentences.push(failedToScoreSentences(match.team_a, match.failed_to_score_last5_a));
    if (match.failed_to_score_last5_b) sentences.push(failedToScoreSentences(match.team_b, match.failed_to_score_last5_b));

    // Over 2.5 / BTTS
    if (match.over25_last5_pct_a) sentences.push(over25Sentences(match.team_a, match.over25_last5_pct_a, true));
    if (match.over25_last5_pct_b) sentences.push(over25Sentences(match.team_b, match.over25_last5_pct_b, false));
    if (match.btts_last5_pct_a) sentences.push(bttsSentences(match.team_a, match.btts_last5_pct_a, true));
    if (match.btts_last5_pct_b) sentences.push(bttsSentences(match.team_b, match.btts_last5_pct_b, false));

    // H2H
    if (match.h2h_last5) sentences.push(h2hSentences(match.h2h_last5));

    // Shuffle sentences slightly to avoid always the same order
    sentences.sort(() => Math.random() - 0.5);

    // Conclusion paragraph that ties to the main prediction
    const conclusion = pick([
      `Given the data, ${prediction} is the strongest betting angle with ${confidence}% confidence and a ${risk.toLowerCase()} risk level. Our recommended stake is ${stake}.`,
      `All signs point towards ${prediction} (${confidence}% confidence, ${risk.toLowerCase()} risk). A stake of ${stake} is suggested.`,
      `The stats heavily favour ${prediction} with a confidence of ${confidence}%. This is a ${risk.toLowerCase()}-risk pick, and we recommend a ${stake} stake.`,
    ]);

    return sentences.join(" ") + " " + conclusion;
  }

  // ----- CASE 2: No stats – use a knowledgeable but generic preview -----
  return pick([
    `${match.team_a} and ${match.team_b} meet in a crucial FIFA World Cup 2026 group stage clash. ${
      match.team_a
    } will look to impose their style, while ${
      match.team_b
    } aim to frustrate and hit on the counter. Although detailed statistics are unavailable, ${prediction} is the favoured outcome based on squad strength and recent tournament form. Confidence: ${confidence}%, risk: ${risk.toLowerCase()}. Recommended stake: ${stake}.`,
    `In this World Cup 2026 encounter, ${match.team_a} take on ${match.team_b} with both sides eager to secure a positive result. ${
      match.team_a
    }’s attacking flair could prove decisive, but ${match.team_b}’s defensive organisation will be key. Our analysis points to ${prediction} as the most likely scenario (confidence ${confidence}%, ${risk.toLowerCase()} risk). Stake: ${stake}.`,
    `FIFA World Cup 2026 action sees ${match.team_a} face ${match.team_b} in what promises to be a tightly contested match. ${
      match.team_a
    } enter as slight favourites based on pedigree, but ${match.team_b} have shown they can compete at this level. The engine leans towards ${prediction} with a confidence of ${confidence}%. Risk is assessed as ${risk.toLowerCase()}. We recommend a ${stake} stake.`,
  ]);
}