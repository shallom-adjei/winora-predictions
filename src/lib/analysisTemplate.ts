import type { PredictionScores } from "./predictionEngine";

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function safeNum(n: any): number {
  const num = Number(n);
  return isNaN(num) || num < 0 ? 0 : num;
}

export function generateAnalysis(
  match: any,
  prediction: keyof PredictionScores,
  scores: PredictionScores,
  confidence: number,
  risk: string,
  stake: string
): string {
  const home = match.team_a || "Home";
  const away = match.team_b || "Away";
  const homeGoals = safeNum(match.home_goals_scored);
  const awayGoals = safeNum(match.away_goals_scored);
  const homeForm = safeNum(match.form_points_a);
  const awayForm = safeNum(match.form_points_b);
  const homeClean = safeNum(match.clean_sheets_last5_a);
  const awayClean = safeNum(match.clean_sheets_last5_b);
  const homeOver25 = safeNum(match.over25_last5_pct_a);
  const awayOver25 = safeNum(match.over25_last5_pct_b);
  const homeBtts = safeNum(match.btts_last5_pct_a);
  const awayBtts = safeNum(match.btts_last5_pct_b);
  const homeFailed = safeNum(match.failed_to_score_last5_a);
  const awayFailed = safeNum(match.failed_to_score_last5_b);

  const hasStats = homeForm > 0 || awayForm > 0;
  const expectedScore = `${scores.expectedHomeGoals}-${scores.expectedAwayGoals}`;

  // Determine the predicted total goals and BTTS flag from the picks
  const goalsPick = match.goals_pick || "";
  const bttsPick = match.btts_pick || "";
  const isOver25 = goalsPick === "Over 2.5 Goals";
  const isBTTSYes = bttsPick === "Both Teams to Score";

  // ---------- BUILD OBSERVATIONS FROM REAL DATA ----------
  const observations: string[] = [];

  // --- 1. Form comparison (improved) ---
  if (homeForm > 0 && awayForm > 0) {
    const diff = Math.abs(homeForm - awayForm);
    const maxForm = Math.max(homeForm, awayForm);
    if (maxForm <= 2) {
      // Both teams are struggling
      observations.push(
        `${home} and ${away} have both struggled for consistency, managing just ${homeForm} and ${awayForm} points respectively from their last five matches.`
      );
    } else if (diff <= 1) {
      observations.push(
        `${home} and ${away} arrive in nearly identical form, with ${homeForm} and ${awayForm} points from their last five outings respectively.`
      );
    } else if (homeForm > awayForm) {
      observations.push(
        `${home} hold a clear form advantage, collecting ${homeForm} points from their last 5 matches compared to just ${awayForm} for ${away}.`
      );
    } else {
      observations.push(
        `${away} are the sharper side on recent evidence, having banked ${awayForm} points from five games versus ${homeForm} for the hosts.`
      );
    }
  } else if (homeForm > 0) {
    observations.push(`${home} have gathered ${homeForm} points from their last 5 fixtures.`);
  } else if (awayForm > 0) {
    observations.push(`${away} bring ${awayForm} points from their previous 5 matches.`);
  }

  // --- 2. Attacking strength (capped at 3.0) ---
  if (homeGoals >= 2 && homeGoals <= 3) {
    observations.push(
      `${home} carry genuine attacking threat, averaging ${homeGoals} goals per game in front of their own supporters.`
    );
  } else if (homeGoals > 3) {
    observations.push(`${home} have been consistently dangerous in attack, especially at home.`);
  }

  if (awayGoals >= 2 && awayGoals <= 3) {
    observations.push(
      `${away} are equally capable going forward, posting an average of ${awayGoals} goals per away match.`
    );
  } else if (awayGoals > 3) {
    observations.push(`${away} have shown they can score freely on the road.`);
  }

  // --- 3. Defensive solidity ---
  if (homeClean >= 3) {
    observations.push(
      `${home}'s defence has been resolute, recording ${homeClean} clean sheets in their last 5 matches.`
    );
  }
  if (awayClean >= 3) {
    observations.push(
      `${away} have matched that defensive strength with ${awayClean} shutouts of their own.`
    );
  }

  // --- 4. Goal trends (only if they align with the predicted pick) ---
  if (homeOver25 >= 60 && isOver25) {
    observations.push(
      `${home} have seen Over 2.5 goals in ${homeOver25}% of their recent fixtures.`
    );
  }
  if (awayOver25 >= 60 && isOver25) {
    observations.push(
      `${away}'s matches have trended toward high scores, with Over 2.5 hitting in ${awayOver25}% of cases.`
    );
  }
  // If both high but picks say Under, we skip the stat to avoid contradiction.

  // --- 5. BTTS trends (only if they align with the predicted pick) ---
  if (homeBtts >= 60 && isBTTSYes) {
    if (homeBtts >= 100) {
      observations.push(`Both teams have scored in all of ${home}'s recent fixtures.`);
    } else {
      observations.push(`BTTS has landed in ${homeBtts}% of ${home}'s recent contests.`);
    }
  }
  if (awayBtts >= 60 && isBTTSYes) {
    if (awayBtts >= 100) {
      observations.push(`${away} have also seen goals at both ends in every recent outing.`);
    } else {
      observations.push(`BTTS has paid out in ${awayBtts}% of ${away}'s latest outings.`);
    }
  }

  // --- 6. Weakness flags ---
  if (homeFailed >= 3) {
    observations.push(`${home} have blanked in ${homeFailed} of their last 5 — a concern in the final third.`);
  }
  if (awayFailed >= 3) {
    observations.push(`${away} have failed to score in ${awayFailed} of their last 5, struggling to convert chances.`);
  }

  // --- H2H insights ---
  const h2hHomeWins = safeNum(match.h2h_home_wins);
  const h2hAwayWins = safeNum(match.h2h_away_wins);
  const h2hDraws = safeNum(match.h2h_draws);
  const totalH2H = h2hHomeWins + h2hAwayWins + h2hDraws;
  if (totalH2H >= 3) {
    if (h2hHomeWins > h2hAwayWins + 1) {
      observations.push(
        `Historically, ${home} have dominated this fixture, winning ${h2hHomeWins} of the last ${totalH2H} meetings.`
      );
    } else if (h2hAwayWins > h2hHomeWins + 1) {
      observations.push(
        `${away} have had the better of recent head‑to‑heads, claiming victory in ${h2hAwayWins} of the last ${totalH2H} encounters.`
      );
    } else {
      observations.push(
        `The last ${totalH2H} meetings between these sides have been evenly split (${h2hHomeWins} wins each, ${h2hDraws} draws).`
      );
    }
  }

  // --- 8. League position ---
  const posA = safeNum(match.league_position_a);
  const posB = safeNum(match.league_position_b);
  if (posA > 0 && posB > 0) {
    if (posA < posB) {
      observations.push(`${home} sit higher in the standings (${posA} vs ${posB}), which may give them a psychological edge.`);
    } else if (posB < posA) {
      observations.push(`${away} enjoy a superior league position (${posB} to ${posA}) heading into this clash.`);
    } else {
      observations.push(`Both sides are level in the table, making this a crucial encounter.`);
    }
  }

  // ---------- CONCLUSION (varied by risk & confidence) ----------
  const engineProb = scores[prediction];
  const riskLower = risk.toLowerCase();
  const conclusionsLowRisk = [
    `Our model projects a final score of ${expectedScore} and sees ${prediction} as the most logical outcome with a ${confidence}% confidence rating. A ${stake} stake is recommended for this low‑risk opportunity.`,
    `The expected scoreline of ${expectedScore} aligns perfectly with ${prediction} at a ${confidence}% confidence tier. Given the low‑risk profile, a ${stake} allocation offers sensible exposure.`,
  ];
  const conclusionsMedRisk = [
    `With an expected final score of ${expectedScore}, ${prediction} stands out at a ${confidence}% confidence level. The moderate risk warrants a controlled ${stake} stake.`,
    `The numbers point to a ${expectedScore} finish, supporting ${prediction}. At ${confidence}% confidence and medium risk, we suggest a ${stake} unit allocation.`,
  ];
  const conclusionsHighRisk = [
    `This is a riskier call — the underlying metrics flag ${prediction} as a value angle despite a projected ${expectedScore} scoreline. Confidence sits at ${confidence}%; keep stakes tight at ${stake}.`,
    `${prediction} offers potential value here, though the high‑risk nature means volatility is expected. The model projects a ${expectedScore} outcome and assigns ${confidence}% confidence — limit exposure to ${stake}.`,
  ];

  let conclusion = "";
  if (riskLower === "low") conclusion = pick(conclusionsLowRisk);
  else if (riskLower === "medium") conclusion = pick(conclusionsMedRisk);
  else conclusion = pick(conclusionsHighRisk);

  // ---------- FALLBACK when no stats exist ----------
  if (!hasStats) {
    const fallbacks = [
      `${home} and ${away} meet with limited recent data available, so our engine relies on squad strength projections. The expected score of ${expectedScore} points toward ${prediction} at a ${confidence}% confidence level. Risk is assessed as ${riskLower} — recommended stake: ${stake}.`,
      `With sparse form data for this fixture, we default to underlying performance metrics. The algorithm projects a ${expectedScore} finish and identifies ${prediction} as the optimal play (${confidence}% confidence, ${riskLower} risk). Stake: ${stake}.`,
    ];
    return pick(fallbacks);
  }

  // ---------- ASSEMBLE (limit to 3 strongest observations) ----------
  const selectedObservations = observations.slice(0, 3);
    // Ensure minimum substance
  if (selectedObservations.length < 2) {
    selectedObservations.push(`This is a tightly‑poised contest where small margins will likely decide the outcome.`);
  }
  return selectedObservations.join(" ") + " " + conclusion;
}