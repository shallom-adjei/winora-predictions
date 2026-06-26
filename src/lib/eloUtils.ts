/**
 * Compute new Elo ratings after a match.
 * K-factor depends on competition importance.
 * Returns [newEloA, newEloB]
 */
export function updateElo(
  eloA: number,
  eloB: number,
  result: "Win" | "Loss" | "Draw",   // from perspective of team A
  competition: string                 // league name or competition name
): [number, number] {
  // Determine K-factor based on competition name
  let K = 24; // default
  const compLower = competition.toLowerCase();
  if (compLower.includes("world cup")) K = 40;
  else if (compLower.includes("qualif")) K = 32;
  else if (compLower.includes("nations league")) K = 28;
  else if (compLower.includes("friendly")) K = 16;

  // Expected score
  const expectedA = 1 / (1 + Math.pow(10, (eloB - eloA) / 400));
  const expectedB = 1 - expectedA;

  // Actual score
  const scoreA = result === "Win" ? 1 : result === "Draw" ? 0.5 : 0;
  const scoreB = 1 - scoreA;

  const newEloA = Math.round(eloA + K * (scoreA - expectedA));
  const newEloB = Math.round(eloB + K * (scoreB - expectedB));

  return [newEloA, newEloB];
}