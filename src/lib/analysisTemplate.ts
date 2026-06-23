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
  const homeForm = safeNum(match.form_points_a);
  const awayForm = safeNum(match.form_points_b);
  const homeGoals = safeNum(match.home_goals_scored);
  const awayGoals = safeNum(match.away_goals_scored);
  const homeClean = safeNum(match.clean_sheets_last5_a);
  const awayClean = safeNum(match.clean_sheets_last5_b);
  const homeOver25 = safeNum(match.over25_last5_pct_a);
  const awayOver25 = safeNum(match.over25_last5_pct_b);
  const homeBtts = safeNum(match.btts_last5_pct_a);
  const awayBtts = safeNum(match.btts_last5_pct_b);
  const homeFailed = safeNum(match.failed_to_score_last5_a);
  const awayFailed = safeNum(match.failed_to_score_last5_b);
  const strengthA = safeNum(match.strength_a) || 5;
  const strengthB = safeNum(match.strength_b) || 5;
  const posA = safeNum(match.league_position_a);
  const posB = safeNum(match.league_position_b);

  const hasStats = homeForm > 0 || awayForm > 0;
  const expectedScore = `${scores.expectedHomeGoals}-${scores.expectedAwayGoals}`;
  const riskLower = risk.toLowerCase();

  const isHomePick = prediction === "Home Win";
  const isAwayPick = prediction === "Away Win";
  const isDrawPick = prediction === "Draw";

  const formEdgeHome = homeForm - awayForm;
  const strengthEdgeHome = strengthA - strengthB;
  const positionEdgeHome = (posA && posB) ? posB - posA : 0;

  const observations: string[] = [];

  // ---------- FORM ANALYSIS ----------
  if (homeForm > 0 && awayForm > 0) {
    const diff = Math.abs(homeForm - awayForm);

    if (isHomePick) {
      if (formEdgeHome >= 3) {
        observations.push(`${home} hold a clear form advantage, collecting ${homeForm} points from their last 5 matches compared to just ${awayForm} for ${away}.`);
      } else if (formEdgeHome >= 1) {
        observations.push(`${home} come into this match with a slight edge in recent form (${homeForm} vs ${awayForm} points), which could prove decisive at home.`);
      } else if (formEdgeHome <= -3) {
        observations.push(`Despite ${away}’s superior recent form (${awayForm} pts vs ${homeForm}), ${home}’s home advantage and overall quality tilt the balance.`);
      } else if (formEdgeHome <= -1) {
        observations.push(`While ${away} have been slightly more consistent lately, ${home}’s home strength and squad depth give them the nod.`);
      } else {
        observations.push(`Both sides are evenly matched on recent form, but ${home}’s home advantage and deeper squad give them the edge.`);
      }
    } else if (isAwayPick) {
      if (formEdgeHome <= -3) {
        observations.push(`${away} hold a clear form advantage, collecting ${awayForm} points from their last 5 matches compared to just ${homeForm} for the hosts.`);
      } else if (formEdgeHome <= -1) {
        observations.push(`${away} travel with a slight edge in recent form (${awayForm} vs ${homeForm} points), which makes them favourites.`);
      } else if (formEdgeHome >= 3) {
        observations.push(`Even though ${home} boast superior recent form (${homeForm} pts), ${away}’s quality on the road and tactical setup give them the advantage.`);
      } else {
        observations.push(`Recent form is nearly identical, but ${away}’s away record and counter‑attacking ability tip the scales.`);
      }
    } else if (isDrawPick) {
      if (diff <= 2) {
        observations.push(`${home} and ${away} arrive in nearly identical form (${homeForm} vs ${awayForm} points), making a stalemate the most likely outcome.`);
      } else if (formEdgeHome > 2) {
        observations.push(`Although ${home} have been the better side lately (${homeForm} pts), ${away}’s resilience on the road could force a share of the points.`);
      } else {
        observations.push(`Despite ${away}’s recent edge in form (${awayForm} pts), ${home}’s home strength may be enough to secure a draw.`);
      }
    }
  } else if (homeForm > 0) {
    observations.push(`${home} have gathered ${homeForm} points from their last 5 fixtures.`);
  } else if (awayForm > 0) {
    observations.push(`${away} bring ${awayForm} points from their previous 5 matches.`);
  }

  // ---------- ATTACKING THREAT ----------
  const showHomeAttack = isHomePick || isDrawPick;
  const showAwayAttack = isAwayPick || isDrawPick;

  if (showHomeAttack) {
    if (homeGoals >= 2 && homeGoals <= 3) {
      observations.push(`${home} carry genuine attacking threat, averaging ${homeGoals} goals per game in front of their own supporters.`);
    } else if (homeGoals > 3) {
      observations.push(`${home} have been consistently dangerous in attack, especially at home.`);
    }
  }
  if (showAwayAttack) {
    if (awayGoals >= 2 && awayGoals <= 3) {
      observations.push(`${away} are equally capable going forward, posting an average of ${awayGoals} goals per away match.`);
    } else if (awayGoals > 3) {
      observations.push(`${away} have shown they can score freely on the road.`);
    }
  }

  // ---------- DEFENSIVE SOLIDITY ----------
  if (isHomePick && homeClean >= 3) {
    observations.push(`${home}'s defence has been resolute, recording ${homeClean} clean sheets in their last 5 matches.`);
  }
  if (isAwayPick && awayClean >= 3) {
    observations.push(`${away} have matched that defensive steel with ${awayClean} shutouts of their own across the same period.`);
  }
  if (isDrawPick) {
    if (homeClean >= 3) observations.push(`${home} have kept ${homeClean} clean sheets in their last 5.`);
    if (awayClean >= 3) observations.push(`${away} have recorded ${awayClean} shutouts, setting up a tight defensive contest.`);
  }

  // ---------- GOAL TRENDS ----------
  const goalsPick = match.goals_pick || "";
  const isOverPick = goalsPick === "Over 2.5 Goals";
  const isUnderPick = goalsPick === "Under 2.5 Goals";
  const bttsPick = match.btts_pick || "";
  const isBttsYes = bttsPick === "Both Teams to Score";

  if (isOverPick) {
    if (homeOver25 >= 60) observations.push(`${home} have seen Over 2.5 goals in ${homeOver25}% of their recent fixtures.`);
    if (awayOver25 >= 60) observations.push(`${away}'s matches have trended toward high scores, with Over 2.5 hitting in ${awayOver25}% of cases.`);
  }
  if (isUnderPick) {
    if (homeOver25 < 40) observations.push(`${home}'s recent games have been low‑scoring affairs.`);
    if (awayOver25 < 40) observations.push(`${away} have also struggled to produce high‑scoring matches.`);
  }
  if (isBttsYes) {
    if (homeBtts >= 60) observations.push(`Both teams have scored in ${homeBtts}% of ${home}'s recent contests.`);
    if (awayBtts >= 60) observations.push(`BTTS has paid out in ${awayBtts}% of ${away}'s latest outings.`);
  }
  if (!isBttsYes) {
    if (homeBtts < 30) observations.push(`${home}'s matches rarely see goals at both ends.`);
    if (awayBtts < 30) observations.push(`${away} have also kept things tight at the back.`);
  }

  // ---------- WEAKNESS FLAGS ----------
  if (isHomePick && awayFailed >= 3) {
    observations.push(`${away} have blanked in ${awayFailed} of their last 5, struggling to convert chances.`);
  }
  if (isAwayPick && homeFailed >= 3) {
    observations.push(`${home} have fired blanks in ${homeFailed} of their last 5, a major concern.`);
  }

  // ---------- LEAGUE POSITION ----------
  if (posA > 0 && posB > 0) {
    if (isHomePick && posA < posB) {
      observations.push(`${home} sit higher in the standings (${posA} vs ${posB}), which may give them a psychological edge.`);
    } else if (isAwayPick && posB < posA) {
      observations.push(`${away} enjoy a superior league position (${posB} to ${posA}) heading into this clash.`);
    } else if (isDrawPick) {
      observations.push(`Both sides are level in the table, making this a crucial encounter.`);
    }
  }

  // ---------- CONCLUSION (varied, unique) ----------
  const engineProb = scores[prediction];
  const conclusionsLow: string[] = [
    `Our model projects a final score of ${expectedScore} and sees ${prediction} as the most logical outcome with a ${confidence}% confidence rating. A ${stake} stake is recommended for this low‑risk opportunity.`,
    `The expected scoreline of ${expectedScore} aligns perfectly with ${prediction} at a ${confidence}% confidence tier. Given the low‑risk profile, a ${stake} allocation offers sensible exposure.`,
    `${prediction} is the clear pick here, backed by a ${confidence}% confidence reading. The predicted ${expectedScore} finish supports a calm ${stake} unit play.`,
    `With everything pointing toward ${prediction}, our engine assigns a ${confidence}% confidence level. A conservative ${stake} stake is suggested for this low‑risk fixture.`,
    `The data leans heavily toward ${prediction}, with a projected score of ${expectedScore}. At ${confidence}% confidence, a ${stake} position is appropriate.`,
  ];

  const conclusionsMed: string[] = [
    `With an expected final score of ${expectedScore}, ${prediction} stands out at a ${confidence}% confidence level. The moderate risk warrants a controlled ${stake} stake.`,
    `The numbers point to a ${expectedScore} finish, supporting ${prediction}. At ${confidence}% confidence and medium risk, we suggest a ${stake} unit allocation.`,
    `${prediction} looks the best bet here, with our model forecasting ${expectedScore}. Confidence is ${confidence}%, and the medium‑risk rating calls for a ${stake} stake.`,
    `Given the moderate risk profile, ${prediction} (${expectedScore}) earns a ${confidence}% confidence score. A measured ${stake} entry is recommended.`,
    `Our analysis favours ${prediction} with a ${expectedScore} outcome. Confidence sits at ${confidence}%; risk is medium — stake ${stake}.`,
  ];

  const conclusionsHigh: string[] = [
    `This is a riskier call — the underlying metrics flag ${prediction} as a value angle despite a projected ${expectedScore} scoreline. Confidence sits at ${confidence}%; keep stakes tight at ${stake}.`,
    `${prediction} offers potential value here, though the high‑risk nature means volatility is expected. The model projects a ${expectedScore} outcome and assigns ${confidence}% confidence — limit exposure to ${stake}.`,
    `A high‑risk opportunity presents itself: ${prediction} (expected score ${expectedScore}) with a ${confidence}% confidence rating. Caution is advised; stake no more than ${stake}.`,
    `While the numbers hint at ${prediction} and a ${expectedScore} finish, the risk level is elevated. Confidence is ${confidence}%; a cautious ${stake} stake is wise.`,
    `For those comfortable with risk, ${prediction} at ${confidence}% confidence could be worth a small play. Predicted score: ${expectedScore}. Stake: ${stake}.`,
  ];

  let conclusion = "";
  if (riskLower === "low") conclusion = pick(conclusionsLow);
  else if (riskLower === "medium") conclusion = pick(conclusionsMed);
  else conclusion = pick(conclusionsHigh);

  // ---------- FALLBACK ----------
  if (!hasStats) {
    const fallbacks = [
      `${home} and ${away} meet with limited recent data available, so our engine relies on squad strength projections. The expected score of ${expectedScore} points toward ${prediction} at a ${confidence}% confidence level. Risk is assessed as ${riskLower} — recommended stake: ${stake}.`,
      `With sparse form data for this fixture, we default to underlying performance metrics. The algorithm projects a ${expectedScore} finish and identifies ${prediction} as the optimal play (${confidence}% confidence, ${riskLower} risk). Stake: ${stake}.`,
    ];
    return pick(fallbacks);
  }

  // ---------- ASSEMBLE ----------
  const selectedObservations = observations.slice(0, 3);
  if (selectedObservations.length < 2) {
    selectedObservations.push(`This is a tightly‑poised contest where small margins will likely decide the outcome.`);
  }
  return selectedObservations.join(" ") + " " + conclusion;
}