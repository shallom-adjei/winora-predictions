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
  stake: string,
  expectedScore: string
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
  const posA = safeNum(match.league_position_a);
  const posB = safeNum(match.league_position_b);
  const restA = safeNum(match.rest_days_a);
  const restB = safeNum(match.rest_days_b);

  // Detect neutral venue (World Cup matches not played in either team's country)
  const isNeutral = match.league === "FIFA World Cup" || match.competition_id === 2000;
  const homeCtx = (neutralPhrase: string, homePhrase: string) =>
    isNeutral ? neutralPhrase : homePhrase;

  const hasStats = homeForm > 0 || awayForm > 0;
  const riskLower = risk.toLowerCase();

  const isHomePick = prediction === "Home Win";
  const isAwayPick = prediction === "Away Win";
  const isDrawPick = prediction === "Draw";

  const formEdgeHome = homeForm - awayForm;
  const observations: string[] = [];

  // ----- 1. FORM -----
  if (homeForm > 0 && awayForm > 0) {
    const diff = Math.abs(homeForm - awayForm);

    if (isHomePick) {
      if (formEdgeHome >= 3) {
        observations.push(pick([
          `${home} hold a clear form advantage, collecting ${homeForm} points from their last 5 matches compared to just ${awayForm} for ${away}.`,
          `${home} are in far better shape, with ${homeForm} points from five games versus ${awayForm} for the visitors.`,
        ]));
      } else if (formEdgeHome >= 1) {
        observations.push(pick([
          `${home} come into this match with a slight edge in recent form (${homeForm} vs ${awayForm} points), ${homeCtx("which could prove decisive on neutral ground", "which could prove decisive at home")}.`,
          `A narrow form advantage (${homeForm} to ${awayForm}) gives ${home} a subtle edge.`,
        ]));
      } else if (formEdgeHome <= -3) {
        observations.push(pick([
          `${away} may arrive with better recent numbers (${awayForm} pts), but ${home}’s ${homeCtx("recent form", "home strength")} and tactical setup are expected to override that.`,
          `Although ${away} have posted ${awayForm} points lately, ${home}’s familiarity with ${homeCtx("the neutral setting", "home conditions")} tips the scales.`,
          `Form favours ${away} (${awayForm} pts vs ${homeForm}), yet ${home}’s ${homeCtx("tournament resilience", "home resilience")} often compensates.`,
        ]));
      } else if (formEdgeHome <= -1) {
        observations.push(pick([
          `${away} hold a minor form advantage (${awayForm} vs ${homeForm}), but ${homeCtx("the neutral venue often levels such gaps", "playing at home often levels such gaps")}.`,
          `The visitors have been marginally sharper (${awayForm} pts), though ${home} ${homeCtx("will bank on tournament experience", "will bank on home support")}.`,
        ]));
      } else {
        observations.push(pick([
          `Both sides arrive with identical form (${homeForm} pts), so ${homeCtx("the neutral setting could prove decisive", "home advantage could prove decisive")}.`,
          `With form locked at ${homeForm} points apiece, the match is finely poised.`,
        ]));
      }
    } else if (isAwayPick) {
      if (formEdgeHome <= -3) {
        observations.push(pick([
          `${away} hold a clear form advantage, collecting ${awayForm} points from their last 5 matches compared to just ${homeForm} for the hosts.`,
          `${away} travel in superior shape (${awayForm} pts vs ${homeForm}), making them rightful favourites.`,
        ]));
      } else if (formEdgeHome <= -1) {
        observations.push(pick([
          `${away} travel with a slight edge in recent form (${awayForm} vs ${homeForm} points), which could make the difference.`,
          `A minor form lead (${awayForm} to ${homeForm}) hands the initiative to the visitors.`,
        ]));
      } else if (formEdgeHome >= 3) {
        observations.push(pick([
          `Even though ${home} boast superior recent form (${homeForm} pts), ${away}’s quality ${homeCtx("in neutral venues", "on the road")} gives them the nod.`,
          `${home} may be flying high (${homeForm} pts), but ${away} have the tools to spoil the party.`,
        ]));
      } else {
        observations.push(pick([
          `Recent form is nearly identical, but ${away}’s ${homeCtx("record in neutral settings", "away record")} and counter‑attacking ability tip the scales.`,
          `With little to separate them on paper, ${away}’s ${homeCtx("tournament resilience", "road resilience")} could prove decisive.`,
        ]));
      }
    } else if (isDrawPick) {
      if (diff <= 2) {
        observations.push(pick([
          `${home} and ${away} arrive in nearly identical form (${homeForm} vs ${awayForm} points), making a stalemate the most likely outcome.`,
          `The form guide is too close to call (${homeForm} vs ${awayForm}), pointing squarely at a draw.`,
        ]));
      } else if (formEdgeHome > 2) {
        observations.push(pick([
          `Although ${home} have been the better side lately (${homeForm} pts), ${away}’s resilience ${homeCtx("in tournaments", "on the road")} could force a share of the points.`,
          `${home}’s form (${homeForm} pts) is stronger, but ${away} rarely leave empty‑handed.`,
        ]));
      } else {
        observations.push(pick([
          `Despite ${away}’s recent edge (${awayForm} pts), ${home}’s ${homeCtx("recent form", "home strength")} may be enough to secure a draw.`,
          `${away} come in with slightly better numbers, but a stalemate looks the safest call.`,
        ]));
      }
    }
  } else if (homeForm > 0) {
    observations.push(`${home} have gathered ${homeForm} points from their last 5 fixtures.`);
  } else if (awayForm > 0) {
    observations.push(`${away} bring ${awayForm} points from their previous 5 matches.`);
  }

  // ----- 2. ATTACKING THREAT -----
  const showHomeAttack = isHomePick || isDrawPick;
  const showAwayAttack = isAwayPick || isDrawPick;

  if (showHomeAttack) {
    if (homeGoals >= 2 && homeGoals <= 3) {
      observations.push(pick([
        `${home} carry genuine attacking threat, averaging ${homeGoals} goals per game ${homeCtx("in recent matches", "in front of their own supporters")}.`,
        `${home} are a real danger ${homeCtx("recently", "at home")}, netting ${homeGoals} goals per match on average.`,
      ]));
    } else if (homeGoals > 3) {
      observations.push(`${home} have been consistently dangerous in attack, especially ${homeCtx("in tournament play", "at home")}.`);
    }
  }
  if (showAwayAttack) {
    if (awayGoals >= 2 && awayGoals <= 3) {
      observations.push(pick([
        `${away} are equally capable going forward, posting an average of ${awayGoals} goals ${homeCtx("per match on the road (neutral)", "per away match")}.`,
        `${away} offer a steady threat ${homeCtx("in neutral venues", "on the road")} with ${awayGoals} goals per game.`,
      ]));
    } else if (awayGoals > 3) {
      observations.push(`${away} have shown they can score freely ${homeCtx("in neutral venues", "on the road")}.`);
    }
  }

  // ----- 3. DEFENSIVE SOLIDITY -----
  if (isHomePick && homeClean >= 3) {
    observations.push(pick([
      `${home}'s defence has been resolute, recording ${homeClean} clean sheets in their last 5 matches.`,
      `${home} have kept ${homeClean} clean sheets recently, a sign of defensive stability.`,
    ]));
  }
  if (isAwayPick && awayClean >= 3) {
    observations.push(pick([
      `${away} also boast ${awayClean} clean sheets lately, making them hard to break down.`,
    ]));
  }
  if (isDrawPick) {
    if (homeClean >= 3) observations.push(`${home} have kept ${homeClean} clean sheets in their last 5.`);
    if (awayClean >= 3) observations.push(`${away} have recorded ${awayClean} shutouts, setting up a tight defensive contest.`);
  }

  // ----- 4. GOAL TRENDS -----
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
    if (homeOver25 < 40) observations.push(pick([
      `${home}'s recent games have been low‑scoring affairs.`,
      `${home} have trended toward tighter, lower‑scoring contests.`,
    ]));
    if (awayOver25 < 40) observations.push(pick([
      `${away} have also struggled to produce high‑scoring matches.`,
      `${away} have similarly been involved in defensively‑minded games.`,
    ]));
  }
  if (isBttsYes) {
    if (homeBtts >= 60) observations.push(`Both teams have scored in ${homeBtts}% of ${home}'s recent contests.`);
    if (awayBtts >= 60) observations.push(`BTTS has paid out in ${awayBtts}% of ${away}'s latest outings.`);
  }
  if (!isBttsYes) {
    if (homeBtts < 30) observations.push(`${home}'s matches rarely see goals at both ends.`);
    if (awayBtts < 30) observations.push(`${away} have also kept things tight at the back.`);
  }

  // ----- 5. WEAKNESS FLAGS -----
  if (isHomePick && awayFailed >= 3) {
    observations.push(`${away} have blanked in ${awayFailed} of their last 5, struggling to convert chances.`);
  }
  if (isAwayPick && homeFailed >= 3) {
    observations.push(`${home} have fired blanks in ${homeFailed} of their last 5, a major concern.`);
  }

  // ----- 6. LEAGUE POSITION -----
  if (posA > 0 && posB > 0) {
    if (isHomePick && posA < posB) {
      observations.push(pick([
        `${home} sit higher in the standings (${posA} vs ${posB}), which may give them a psychological edge.`,
        `${home} enjoy a superior ranking (${posA} to ${posB}), reinforcing their favourite tag.`,
      ]));
    } else if (isAwayPick && posB < posA) {
      observations.push(pick([
        `${away} enjoy a superior league position (${posB} to ${posA}) heading into this clash.`,
        `${away} rank higher (${posB} vs ${posA}), adding weight to their case.`,
      ]));
    } else if (isDrawPick) {
      observations.push(`Both sides are level in the table, making this a crucial encounter.`);
    }
  }

  // ----- 7. REST DAYS -----
  if (restA > 0 && restA <= 3) observations.push(`${home} have had only ${restA} days of rest, which could lead to fatigue.`);
  if (restB > 0 && restB <= 3) observations.push(`${away} are on a short turnaround with just ${restB} days since their last match.`);

  // ----- 8. CONCLUSIONS -----
  const conclusionsLow: string[] = [
    `Our model projects a final score of ${expectedScore} and sees ${prediction} as the most logical outcome with a ${confidence}% confidence rating. A ${stake} stake is recommended for this low‑risk opportunity.`,
    `The expected scoreline of ${expectedScore} aligns perfectly with ${prediction} at a ${confidence}% confidence tier. Given the low‑risk profile, a ${stake} allocation offers sensible exposure.`,
    `${prediction} is the clear pick here, backed by a ${confidence}% confidence reading. The predicted ${expectedScore} finish supports a calm ${stake} unit play.`,
    `With everything pointing toward ${prediction}, our engine assigns a ${confidence}% confidence level. A conservative ${stake} stake is suggested for this low‑risk fixture.`,
    `The data leans heavily toward ${prediction}, with a projected score of ${expectedScore}. At ${confidence}% confidence, a ${stake} position is appropriate.`,
    `${prediction} stands out as the safest option, carrying a ${confidence}% confidence rating. A ${stake} stake reflects the low‑risk nature of the fixture.`,
  ];

  const conclusionsMed: string[] = [
    `With an expected final score of ${expectedScore}, ${prediction} stands out at a ${confidence}% confidence level. The moderate risk warrants a controlled ${stake} stake.`,
    `The numbers point to a ${expectedScore} finish, supporting ${prediction}. At ${confidence}% confidence and medium risk, we suggest a ${stake} unit allocation.`,
    `${prediction} looks the best bet here, with our model forecasting ${expectedScore}. Confidence is ${confidence}%, and the medium‑risk rating calls for a ${stake} stake.`,
    `Given the moderate risk profile, ${prediction} (${expectedScore}) earns a ${confidence}% confidence score. A measured ${stake} entry is recommended.`,
    `Our analysis favours ${prediction} with a ${expectedScore} outcome. Confidence sits at ${confidence}%; risk is medium — stake ${stake}.`,
    `${prediction} is backed by solid data (${expectedScore}, ${confidence}% confidence). The moderate risk suggests a ${stake} unit play.`,
  ];

  const conclusionsHigh: string[] = [
    `This is a riskier call — the underlying metrics flag ${prediction} as a value angle despite a projected ${expectedScore} scoreline. Confidence sits at ${confidence}%; keep stakes tight at ${stake}.`,
    `${prediction} offers potential value here, though the high‑risk nature means volatility is expected. The model projects a ${expectedScore} outcome and assigns ${confidence}% confidence — limit exposure to ${stake}.`,
    `A high‑risk opportunity presents itself: ${prediction} (expected score ${expectedScore}) with a ${confidence}% confidence rating. Caution is advised; stake no more than ${stake}.`,
    `While the numbers hint at ${prediction} and a ${expectedScore} finish, the risk level is elevated. Confidence is ${confidence}%; a cautious ${stake} stake is wise.`,
    `For those comfortable with risk, ${prediction} at ${confidence}% confidence could be worth a small play. Predicted score: ${expectedScore}. Stake: ${stake}.`,
    `${prediction} is a high‑risk suggestion, with the model seeing a ${expectedScore} result. Confidence is ${confidence}%, so limit your position to ${stake}.`,
  ];

  let conclusion = "";
  if (riskLower === "low") conclusion = pick(conclusionsLow);
  else if (riskLower === "medium") conclusion = pick(conclusionsMed);
  else conclusion = pick(conclusionsHigh);

  // ----- FALLBACK (no stats) -----
  if (!hasStats) {
    const fallbacks = [
      `${home} and ${away} meet with limited recent data available, so our engine relies on squad strength projections. The expected score of ${expectedScore} points toward ${prediction} at a ${confidence}% confidence level. Risk is assessed as ${riskLower} — recommended stake: ${stake}.`,
      `With sparse form data for this fixture, we default to underlying performance metrics. The algorithm projects a ${expectedScore} finish and identifies ${prediction} as the optimal play (${confidence}% confidence, ${riskLower} risk). Stake: ${stake}.`,
    ];
    return pick(fallbacks);
  }

  // ----- Remove contradictory observations (Over 2.5 vs "low-scoring") -----
  if (isOverPick) {
    const contradictory = [
      "low‑scoring affairs",
      "struggled to produce high‑scoring",
      "kept things tight at the back",
      "trended toward tighter",
    ];
    for (let i = observations.length - 1; i >= 0; i--) {
      if (contradictory.some(phrase => observations[i].toLowerCase().includes(phrase))) {
        observations.splice(i, 1);
      }
    }
  }

  // ----- ASSEMBLE -----
  const selectedObservations = observations.slice(0, 3);
  if (selectedObservations.length < 2) {
    selectedObservations.push(`This is a tightly‑poised contest where small margins will likely decide the outcome.`);
  }
  return selectedObservations.join(" ") + " " + conclusion;
}