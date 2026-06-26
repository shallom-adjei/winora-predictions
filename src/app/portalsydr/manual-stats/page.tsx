"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Copy, Check, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import LoadingScreen from "@/components/LoadingScreen";

const PROMPT_TEMPLATE = (teamA: string, teamB: string) => {
  const todayStr = new Date().toISOString().split("T")[0]; // e.g. "2026-06-25"
  return `
You are a football data assistant with access to live web search.  
Your task is to retrieve **real, verified data** about **${teamA}** and **${teamB}**.  
Search the web for their **most recent competitive matches** (World Cup, qualifiers, continental championships, friendlies leagues against strong opponents) played **before ${todayStr}**.  

Also find their **current ranking** and the **last 5 head‑to‑head meetings** between them.

🔴 **CRITICAL RULES** – Follow these exactly or the response will be rejected:

1. **Search the web** – do not rely on your training data. Use real sources (Flashscore, ESPN, FIFA.com, Sofascore etc.).
2. **Only return data you can verify from a specific source.** If a piece of information is unavailable, set its value to \`null\` – DO NOT guess.
3. **Matches must be competitive and recent** (within the last 2 years). Do not include matches older than 2 years unless they are part of the head‑to‑head history.
4. **For each match, include:**
   - \`date\` (YYYY‑MM‑DD)
   - \`opponent\` (team name)
   - \`competition\` (e.g., "World Cup", "Friendly", "UEFA Nations League")
   - \`home\` (true if ${teamA} played at home)
   - \`goalsFor\`, \`goalsAgainst\`
   - \`opponentRank\` (Ranking of the opponent (e.g., "FIFA", "Premier League", "La Liga") at the time of the match, or null if unknown)
   - If you cannot verify a match result, do not include it.
5. **Head‑to‑head:** Return the last 5 meetings between ${teamA} and ${teamB}. If fewer than 5 exist, include all available. If none exist, return an empty array.
6. **Rankings:** Use the most recent official ranking (e.g., "FIFA", "Premier League", "La Liga"). If you cannot find it, set \`null\`.
7. **Do not hallucinate, do not make up data.** I will verify the response against real databases.

Return **only** a valid JSON object with exactly this structure:

{
  "matches_A": [
    {
      "date": "YYYY-MM-DD",
      "opponent": "Team name",
      "competition": "Competition name",
      "home": true,
      "goalsFor": 2,
      "goalsAgainst": 1,
      "opponentFifaRank": 45
    }
  ],
  "matches_B": [ ... ],
  "h2h_matches": [
    {
      "date": "YYYY-MM-DD",
      "competition": "Competition name",
      "homeTeam": "${teamA}",
      "awayTeam": "${teamB}",
      "homeScore": 2,
      "awayScore": 0
    }
  ],
"ranking_A": current rank,
"ranking_B": current rank,
"ranking_system": "FIFA"  (or "Premier League", etc.)
}

- \`matches_A\`: last 10 matches for ${teamA} (include at least 10 if possible)
- \`matches_B\`: last 10 matches for ${teamB}
- \`h2h_matches\`: last 5 head‑to‑head meetings between ${teamA} and ${teamB} (if fewer than 5, include all available; if none, empty array)
- \`ranking_A\`: current ranking for ${teamA}
- \`ranking_B\`: current ranking for ${teamB}

Return **only** the JSON object, nothing else. No explanations, no markdown. Just pure JSON.
`;
};

export default function ManualStatsPage() {
  // ---------- ALL HOOKS AT THE TOP (no early returns before them) ----------
  const [allMatches, setAllMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [hideWithStats, setHideWithStats] = useState(true);
  const [fullJson, setFullJson] = useState("");

  // Fetch upcoming matches via internal API
  const fetchMatches = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin-upcoming-matches");
      const data = await res.json();
      if (data.matches) setAllMatches(data.matches);
    } catch (err) {
      console.error("Failed to fetch upcoming matches", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  // Derived state (hook, so it must stay before early return)
  const matchesToShow = useMemo(() => {
    if (hideWithStats) {
      return allMatches.filter(m => m.form_points_a == null || m.form_points_a === 0);
    }
    return allMatches;
  }, [allMatches, hideWithStats]);

  // Regular function – fine to stay here
  const copyPrompt = (teamA: string, teamB: string, id: string) => {
    navigator.clipboard.writeText(PROMPT_TEMPLATE(teamA, teamB));
    setCopiedId(id);
    toast.success("Prompt copied! Paste it into your AI tool.");
    setTimeout(() => setCopiedId(null), 3000);
  };

  // ---------- NORMAL RENDER ----------
  return (
    <div className="min-h-screen bg-[#050505] text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/portalsydr">
            <Button variant="ghost" className="text-gold-400">
              <ArrowLeft className="h-4 w-4 mr-1" /> Dashboard
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Manual Stats Entry</h1>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <p className="text-gray-400 text-sm">
            Upcoming matches only. Copy the prompt, paste into an AI tool, then paste the JSON response and apply.
          </p>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Filter className="h-4 w-4 text-gold-400" />
            <span className="text-gray-300">Hide matches with stats</span>
            <input
              type="checkbox"
              className="accent-gold-400 h-4 w-4"
              checked={hideWithStats}
              onChange={(e) => setHideWithStats(e.target.checked)}
            />
          </label>
        </div>

        {loading ? (
          <LoadingScreen message="Loading matches…" />
        ) : matchesToShow.length === 0 ? (
          <p className="text-gray-400">
            {hideWithStats
              ? "All upcoming matches already have stats! 🎉"
              : "No upcoming matches found."}
          </p>
        ) : (
          <div className="space-y-4">
            {matchesToShow.map((match) => (
              <div
                key={match.id}
                className="rounded-xl bg-[#0D0D0D] border border-white/10 p-5"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{match.match_name}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(match.kickoff_time).toLocaleString()}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => copyPrompt(match.team_a, match.team_b, match.id)}
                  >
                    {copiedId === match.id ? (
                      <>
                        <Check className="h-4 w-4 text-green-400" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" /> Copy Prompt
                      </>
                    )}
                  </Button>
                </div>

                {expandedMatch === match.id && (
                  <div className="mt-4 space-y-3">
                    <textarea
                      className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white text-sm font-mono placeholder-gray-500 focus:outline-none focus:border-gold-400/50"
                      rows={14}
                      placeholder={`Paste the complete JSON response from the AI here (including matches_A, matches_B, h2h_matches, fifa_ranking_A, fifa_ranking_B)…`}
                      value={fullJson}
                      onChange={(e) => setFullJson(e.target.value)}
                    />
                    <div className="flex justify-end gap-2 mt-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setExpandedMatch(null);
                          setFullJson("");
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        className="bg-gold-400 text-black"
                        size="sm"
                        onClick={async () => {
                          try {
                            const data = JSON.parse(fullJson.trim());
                            if (!data.matches_A || !data.matches_B) {
                              toast.error("Missing matches_A or matches_B in the JSON.");
                              return;
                            }
                            const res = await fetch("/api/manual-stats", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                matchId: match.id,
                                matchesA: data.matches_A,
                                matchesB: data.matches_B,
                                h2hMatches: data.h2h_matches || [],
                                fifaRankingA: data.ranking_A,
                                fifaRankingB: data.ranking_B,
                              }),
                            });
                            const result = await res.json();
                            if (result.success) {
                              toast.success("Enriched stats applied! All fields updated.");
                              setExpandedMatch(null);
                              setFullJson("");
                              fetchMatches();
                            } else {
                              toast.error(result.error || "Invalid data.");
                            }
                          } catch {
                            toast.error("Invalid JSON. Please paste a valid object.");
                          }
                        }}
                      >
                        Calculate & Apply
                      </Button>
                    </div>
                  </div>
                )}

                <button
                  className="text-xs text-gold-400 mt-3 hover:underline"
                  onClick={() => {
                    setExpandedMatch(expandedMatch === match.id ? null : match.id);
                    setFullJson("");
                  }}
                >
                  {expandedMatch === match.id ? "Close" : "Enter / Update Stats"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}