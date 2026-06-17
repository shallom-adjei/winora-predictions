import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
export function evaluatePick(
  pick: string,
  homeScore: number | null,
  awayScore: number | null
): "Win" | "Loss" | "Pending" {
  if (homeScore == null || awayScore == null) return "Pending";

  const actualOutcome =
    homeScore > awayScore
      ? "Home Win"
      : homeScore === awayScore
      ? "Draw"
      : "Away Win";
  const totalGoals = homeScore + awayScore;
  const bothScored = homeScore > 0 && awayScore > 0;

  switch (pick) {
    case "Home Win":
      return actualOutcome === "Home Win" ? "Win" : "Loss";
    case "Draw":
      return actualOutcome === "Draw" ? "Win" : "Loss";
    case "Away Win":
      return actualOutcome === "Away Win" ? "Win" : "Loss";
    case "1X":
      return actualOutcome === "Home Win" || actualOutcome === "Draw"
        ? "Win"
        : "Loss";
    case "X2":
      return actualOutcome === "Away Win" || actualOutcome === "Draw"
        ? "Win"
        : "Loss";
    case "Over 2.5 Goals":
      return totalGoals > 2.5 ? "Win" : "Loss";
    case "Under 2.5 Goals":
      return totalGoals < 2.5 ? "Win" : "Loss";
    case "Both Teams to Score":
      return bothScored ? "Win" : "Loss";
    case "BTTS No":
      return !bothScored ? "Win" : "Loss";
    default:
      return "Pending";
  }
}
