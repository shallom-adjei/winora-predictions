// Shared stats helpers used by both manual and auto enrichment

export function computeDixonColes(
  matchesA: { goalsFor: number; goalsAgainst: number }[],
  matchesB: { goalsFor: number; goalsAgainst: number }[]
) {
  const allMatches = [...matchesA, ...matchesB];
  const totalMatches = allMatches.length;
  if (totalMatches === 0)
    return { attA: null, defA: null, attB: null, defB: null, overallAvg: 1 };

  const overallAvgGoals =
    allMatches.reduce((s, m) => s + m.goalsFor + m.goalsAgainst, 0) /
    totalMatches;

  const avgScoredA =
    matchesA.length > 0
      ? matchesA.reduce((s, m) => s + m.goalsFor, 0) / matchesA.length
      : overallAvgGoals;
  const avgConcededA =
    matchesA.length > 0
      ? matchesA.reduce((s, m) => s + m.goalsAgainst, 0) / matchesA.length
      : overallAvgGoals;
  const avgScoredB =
    matchesB.length > 0
      ? matchesB.reduce((s, m) => s + m.goalsFor, 0) / matchesB.length
      : overallAvgGoals;
  const avgConcededB =
    matchesB.length > 0
      ? matchesB.reduce((s, m) => s + m.goalsAgainst, 0) / matchesB.length
      : overallAvgGoals;

  const attA = avgScoredA / overallAvgGoals;
  const defA = avgConcededA / overallAvgGoals;
  const attB = avgScoredB / overallAvgGoals;
  const defB = avgConcededB / overallAvgGoals;

  return { attA, defA, attB, defB, overallAvg: overallAvgGoals };
}

export function computeDixonColesHomeAway(
  homeMatchesA: { goalsFor: number; goalsAgainst: number }[],
  awayMatchesB: { goalsFor: number; goalsAgainst: number }[]
) {
  const allHomeA = homeMatchesA;
  const allAwayB = awayMatchesB;
  const allMatches = [...allHomeA, ...allAwayB];
  const totalMatches = allMatches.length;
  if (totalMatches === 0)
    return { attHomeA: null, defHomeA: null, attAwayB: null, defAwayB: null, overallAvg: 1 };

  const overallAvgGoals =
    allMatches.reduce((s, m) => s + m.goalsFor + m.goalsAgainst, 0) / totalMatches;

  // Home team's home stats
  const avgScoredHomeA =
    allHomeA.length > 0
      ? allHomeA.reduce((s, m) => s + m.goalsFor, 0) / allHomeA.length
      : overallAvgGoals;
  const avgConcededHomeA =
    allHomeA.length > 0
      ? allHomeA.reduce((s, m) => s + m.goalsAgainst, 0) / allHomeA.length
      : overallAvgGoals;

  // Away team's away stats
  const avgScoredAwayB =
    allAwayB.length > 0
      ? allAwayB.reduce((s, m) => s + m.goalsFor, 0) / allAwayB.length
      : overallAvgGoals;
  const avgConcededAwayB =
    allAwayB.length > 0
      ? allAwayB.reduce((s, m) => s + m.goalsAgainst, 0) / allAwayB.length
      : overallAvgGoals;

  const attHomeA = avgScoredHomeA / overallAvgGoals;
  const defHomeA = avgConcededHomeA / overallAvgGoals;
  const attAwayB = avgScoredAwayB / overallAvgGoals;
  const defAwayB = avgConcededAwayB / overallAvgGoals;

  return { attHomeA, defHomeA, attAwayB, defAwayB, overallAvg: overallAvgGoals };
}