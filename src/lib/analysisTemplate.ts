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

  // ---------- BUILD SENTENCES FROM REAL DATA ----------
  const observations: string[] = [];

  // Form comparison
  if (homeForm > 0 && awayForm > 0) {
    if (homeForm > awayForm + 2) {
      observations.push(
        `${home} arrive in far stronger shape, having collected ${homeForm} points from their last 5 outings compared to just ${awayForm} for ${away}.`
      );
    } else if (awayForm > homeForm + 2) {
      observations.push(
        `${away} hold a clear form edge heading into this clash — ${awayForm} points from 5 matches versus ${homeForm} for the hosts.`
      );
    } else {
      observations.push(
        `Both sides are closely matched on recent form, with ${home} and ${away} posting ${homeForm} and ${awayForm} points respectively over their last 5.`
      );
    }
  } else if (homeForm > 0) {
    observations.push(`${home} have put together a run of ${homeForm} points from their last 5 fixtures.`);
  } else if (awayForm > 0) {
    observations.push(`${away} enter this fixture with ${awayForm} points banked across their last 5 matches.`);
  }

  // Attacking strength
  if (homeGoals >= 2 && homeGoals < 8) {
    observations.push(
      `${home} carry genuine attacking threat, averaging ${homeGoals} goals per game in front of their own supporters.`
    );
  } else if (homeGoals >= 8) {
    // Unrealistic stat – skip or soften
    observations.push(`${home} have shown they can find the net consistently at home.`);
  }

  if (awayGoals >= 2 && awayGoals < 8) {
    observations.push(
      `${away} are no slouches going forward either, posting an average of ${awayGoals} goals per away match.`
    );
  }

  // Defensive solidity
  if (homeClean >= 3) {
    observations.push(
      `${home}'s backline has been resolute, recording ${homeClean} clean sheets in their last 5 matches.`
    );
  }
  if (awayClean >= 3) {
    observations.push(
      `${away} have matched that defensive steel with ${awayClean} shutouts of their own across the same period.`
    );
  }

  // Goal trends (Over 2.5)
  if (homeOver25 >= 60 && awayOver25 >= 60) {
    observations.push(
      `Goal-heavy encounters are the norm for both — Over 2.5 has landed in ${homeOver25}% of ${home}'s recent games and ${awayOver25}% of ${away}'s.`
    );
  } else if (homeOver25 >= 60) {
    observations.push(
      `${home} have seen Over 2.5 goals in ${homeOver25}% of their recent fixtures.`
    );
  } else if (awayOver25 >= 60) {
    observations.push(
      `${away}'s matches have trended toward high scores, with Over 2.5 hitting in ${awayOver25}% of cases.`
    );
  }

  // BTTS trends
  if (homeBtts >= 60 && awayBtts >= 60) {
    observations.push(
      `Both teams have found the net in ${homeBtts}% of ${home}'s matches and ${awayBtts}% of ${away}'s — expect action at both ends.`
    );
  } else if (homeBtts >= 60) {
    observations.push(`BTTS has landed in ${homeBtts}% of ${home}'s recent contests.`);
  } else if (awayBtts >= 60) {
    observations.push(`BTTS has paid out in ${awayBtts}% of ${away}'s latest outings.`);
  }

  // Weakness flags
  if (homeFailed >= 3) {
    observations.push(`${home} have blanked in ${homeFailed} of their last 5 — a concern in the final third.`);
  }
  if (awayFailed >= 3) {
    observations.push(`${away} have fired blanks in ${awayFailed} of their last 5, struggling to convert chances.`);
  }

  // ---------- CONCLUSION (varied by risk & confidence) ----------
  const engineProb = scores[prediction];
  const riskLower = risk.toLowerCase();
  const conclusionsLowRisk = [
    `Our model projects a final score of ${expectedScore} and sees ${prediction} as the most logical outcome with a ${confidence}% confidence rating. A ${stake} stake is recommended for this ${riskLower}‑risk opportunity.`,
    `The expected scoreline of ${expectedScore} aligns with ${prediction} at a ${confidence}% confidence tier. Given the low‑risk profile, a ${stake} allocation offers sensible exposure.`,
  ];
  const conclusionsMedRisk = [
    `With an expected final score of ${expectedScore}, ${prediction} stands out at a ${confidence}% confidence level. The moderate risk warrants a controlled ${stake} stake.`,
    `The numbers point to a ${expectedScore} finish, supporting ${prediction}. At ${confidence}% confidence and ${riskLower} risk, we suggest a ${stake} unit allocation.`,
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

  // ---------- ASSEMBLE ----------
  const selectedObservations = observations.slice(0, 3); // keep it concise
  return selectedObservations.join(" ") + " " + conclusion;
}