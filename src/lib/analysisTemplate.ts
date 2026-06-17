import type { PredictionScores } from "./predictionEngine";

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateAnalysis(
  match: any,
  prediction: keyof PredictionScores,
  scores: PredictionScores,
  confidence: number,
  risk: string,
  stake: string
): string {
  const hasData = match.form_points_a != null || match.form_points_b != null;

  if (!hasData) {
    return `${match.team_a} square off against ${match.team_b} in what promises to be a competitive tactical matchup. With minimal recent historical data on hand, our engine heavily relies on raw squad parameters and baseline performance metrics. Based on these configurations, backing ${prediction} presents the most logical path forward. Confidence is calculated at ${confidence}%, with an assessed ${risk.toLowerCase()} risk profile. Recommended stake: ${stake}.`;
  }

  const formSentences: string[] = [];
  const tacticalSentences: string[] = [];
  const marketSentences: string[] = [];

  if ((match.form_points_a ?? 0) > 0) {
    formSentences.push(
      `${match.team_a} enter this matchup with a baseline momentum of ${match.form_points_a} points across their last 5 fixtures.`
    );
  }
  if ((match.form_points_b ?? 0) > 0) {
    formSentences.push(
      `${match.team_b} counter with a run of ${match.form_points_b} points over the same competitive cycle.`
    );
  }

  if ((match.home_goals_scored ?? 0) > 1.5) {
    tacticalSentences.push(
      `On their own turf, ${match.team_a} show great attacking depth, generating an average of ${match.home_goals_scored} goals per game.`
    );
  }
  if ((match.clean_sheets_last5_b ?? 0) >= 3) {
    tacticalSentences.push(
      `They will find it tough against a disciplined ${match.team_b} backline that has picked up ${match.clean_sheets_last5_b} clean sheets in their last 5 games.`
    );
  } else if ((match.away_goals_conceded ?? 0) > 1.5) {
    tacticalSentences.push(
      `This is an area of vulnerability for ${match.team_b}, who have struggled to lock down their defensive third on the road, conceding ${match.away_goals_conceded} per match.`
    );
  }

  if (["Over 1.5 Goals", "Over 2.5 Goals", "Both Teams to Score"].includes(prediction)) {
    if ((match.over25_last5_pct_a ?? 0) >= 60) {
      marketSentences.push(
        `An open game looks likely here, especially with Over 2.5 goals paying out in ${match.over25_last5_pct_a}% of ${match.team_a}'s historical data.`
      );
    }
    if ((match.btts_last5_pct_b ?? 0) >= 60) {
      marketSentences.push(
        `This is reinforced by ${match.team_b}'s trend lines, where both teams scored in ${match.btts_last5_pct_b}% of their recent fixtures.`
      );
    }
  }

  if (["Under 2.5 Goals", "BTTS No"].includes(prediction)) {
    if ((match.clean_sheets_last5_a ?? 0) >= 2) {
      marketSentences.push(
        `${match.team_a}'s defensive structure has proven resilient, securing clean sheets in ${match.clean_sheets_last5_a} of their last 5 matches.`
      );
    }
    if ((match.failed_to_score_last5_b ?? 0) >= 2) {
      marketSentences.push(
        `Additionally, ${match.team_b} have run into problems in the final third, failing to find the net in ${match.failed_to_score_last5_b} of their last 5 away outings.`
      );
    }
  }

  let h2hText = "";
  if (match.h2h_dominant_team === match.team_a) {
    h2hText = `Historical matchups lean toward ${match.team_a}, who have controlled recent meetings.`;
  } else if (match.h2h_dominant_team === match.team_b) {
    h2hText = `Head‑to‑head metrics reveal that ${match.team_b} hold a clear tactical advantage in recent encounters.`;
  }

  const engineProb = scores[prediction];
  let conclusion = "";
  if (risk.toLowerCase() === "low" || risk.toLowerCase() === "medium") {
    conclusion = `Factoring in all data points, backing ${prediction} offers a solid risk-to-reward ratio here. Our system assigns this choice an internal probability of ${engineProb}% and a ${confidence}% overall confidence tier. We advise a disciplined ${stake} allocation.`;
  } else {
    conclusion = `While this carries a higher ${risk.toLowerCase()} risk profile, the numbers point toward a market mispricing. The engine flags ${prediction} as a value selection with an internal probability score of ${engineProb}% and a confidence rating of ${confidence}%. A precise stake of ${stake} is recommended.`;
  }

  return [formSentences.join(" "), tacticalSentences.join(" "), marketSentences.join(" "), h2hText, conclusion]
    .filter((str) => str.trim().length > 0)
    .join(" ");
}