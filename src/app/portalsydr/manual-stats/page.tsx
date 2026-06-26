"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Copy, Check, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import LoadingScreen from "@/components/LoadingScreen";

const PROMPT_TEMPLATE = (teamA: string, teamB: string) => {
  const todayStr = new Date().toISOString().split("T")[0];
  return `
You are a football data analyst with full web‑search capability.  
Retrieve **real, verified statistics** for **${teamA}** and **${teamB}**.

Search the web for their **10 most recent competitive matches** (World Cup, qualifiers, continental championships, and official friendlies) played **before ${todayStr}**.  
Also find their **current official ranking** and the **last 5 head‑to‑head meetings**.

---

🔴 **ABSOLUTE REQUIREMENTS – FAILURE TO FOLLOW ANY OF THESE WILL CAUSE THE RESPONSE TO BE REJECTED:**

1. **Search the web.** Do not use training data. Use sources like Flashscore, ESPN, FIFA.com, Sofascore, 11v11.com etc.

2. **Return EXACTLY 10 matches for each team.** Not 6, not 8 – exactly 10. If fewer than 10 exist, include all available. If more than 10 exist, use the 10 most recent.

3. **Home/away balance is MANDATORY.** For each team, include at least 4 home and 4 away matches in the 10. If a team has fewer home or away matches, explain in a \`_warning\` field (see structure).

4. **Every match MUST include the opponent's FIFA ranking at the time the match was played.**  
   - Search for it specifically. If the exact ranking is unknown, use the most recent ranking available and mark it with \`"estimated": true\`.  
   - The field is called \`opponentFifaRank\`. It is **not optional** – \`null\` is only acceptable for clubs where FIFA rankings don't apply.

5. **Do not invent data.** If you can't verify it, either omit that match or mark unverifiable fields as \`null\` with a \`_warning\`.

6. **Matches must be competitive and from the last 2 years.** Friendlies are acceptable if they were official (not training matches). Do not include club matches for national teams.

7. **Head‑to‑head:** Return the last 5 meetings between ${teamA} and ${teamB}. If fewer than 5, include all available. If none, return an empty array \`[]\`.

8. **Rankings:** The current ranking for each team, according to the most recent official system (e.g., FIFA for national teams). If unavailable, use \`null\`.

---

**Required JSON structure – return ONLY this JSON object, nothing else:**

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
"_warnings": ["any data quality issues, missing rankings, etc. – or empty array if perfect"]
}

- \`matches_A\`: exactly 10 matches for ${teamA} (or all available if fewer), with at least 4 home and 4 away
- \`matches_B\`: exactly 10 matches for ${teamB}, same balance requirement
- \`h2h_matches\`: last 5 head‑to‑head meetings between ${teamA} and ${teamB}
- \`ranking_A\`, \`ranking_B\`: current official ranking numbers (not strings)
- \`_warnings\`: array of strings explaining any data gaps (e.g. "only 6 matches found for Team B", "opponent ranking estimated for March 2026 match")

**Return ONLY the JSON object. No markdown, no explanations, no code fences. Pure JSON.**
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
    const res = await fetch("/api/admin-data?t=" + Date.now(), { cache: "no-store" });
    const data = await res.json();
    if (data.upcoming) setAllMatches(data.upcoming);
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