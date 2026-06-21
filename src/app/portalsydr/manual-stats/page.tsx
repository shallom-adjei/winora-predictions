"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { ArrowLeft, Copy, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

const PROMPT_TEMPLATE = (teamA: string, teamB: string) => `
Provide the following football statistics for ${teamA} and ${teamB} based on their most recent **10 competitive matches** (World Cup qualifiers, continental championships, friendlies against strong opponents).

Return ONLY a valid JSON object with exactly these keys and numeric values:

{
  "form_points_a": <last 5 matches form points for ${teamA} (3 for win, 1 for draw, 0 for loss, max 15)>,
  "form_points_b": <same for ${teamB}>,
  "home_goals_scored": <average goals scored per game by ${teamA} when playing at home (as float)>,
  "home_goals_conceded": <average goals conceded per game by ${teamA} when playing at home>,
  "away_goals_scored": <average goals scored per game by ${teamB} when playing away>,
  "away_goals_conceded": <average goals conceded per game by ${teamB} when playing away>,
  "clean_sheets_last5_a": <number of clean sheets for ${teamA} in last 5 matches>,
  "clean_sheets_last5_b": <number of clean sheets for ${teamB} in last 5 matches>,
  "failed_to_score_last5_a": <number of matches where ${teamA} failed to score in last 5>,
  "failed_to_score_last5_b": <number of matches where ${teamB} failed to score in last 5>,
  "over25_last5_pct_a": <percentage of ${teamA}'s last 5 matches with over 2.5 goals (0-100)>,
  "over25_last5_pct_b": <percentage of ${teamB}'s last 5 matches with over 2.5 goals (0-100)>,
  "btts_last5_pct_a": <percentage of ${teamA}'s last 5 matches where both teams scored (0-100)>,
  "btts_last5_pct_b": <percentage of ${teamB}'s last 5 matches where both teams scored (0-100)>,
  "matches_used_a": <number of matches the stats for ${teamA} are based on (ideally 10)>,
  "matches_used_b": <number of matches the stats for ${teamB} are based on (ideally 10)>
}
`;

export default function ManualStatsPage() {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null);
  const [statsText, setStatsText] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchMatches = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("predictions")
      .select("*")
      .is("form_points_a", null)
      .order("kickoff_time", { ascending: true })
      .limit(20);
    if (data) setMatches(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchMatches();
  }, []);

  const copyPrompt = (teamA: string, teamB: string, id: string) => {
    navigator.clipboard.writeText(PROMPT_TEMPLATE(teamA, teamB));
    setCopiedId(id);
    toast.success("Prompt copied! Paste it into your AI tool.");
    setTimeout(() => setCopiedId(null), 3000);
  };

  const applyStats = async (matchId: string) => {
    try {
      const parsed = JSON.parse(statsText.trim());
      const res = await fetch("/api/manual-stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId, statsJson: parsed }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Stats applied successfully!");
        setExpandedMatch(null);
        setStatsText("");
        fetchMatches();
      } else {
        toast.error(data.error || "Invalid data. Check the JSON format.");
      }
    } catch {
      toast.error("Invalid JSON. Please paste a valid JSON object.");
    }
  };

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

        <p className="text-gray-400 text-sm mb-6">
          For each match, copy the prompt, paste it into an AI tool (Google AI, ChatGPT, etc.),
          paste the JSON response below, and apply.
        </p>

        {loading ? (
          <p className="text-gray-400">Loading…</p>
        ) : matches.length === 0 ? (
          <p className="text-gray-400">All matches already have stats! 🎉</p>
        ) : (
          <div className="space-y-4">
            {matches.map((match) => (
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
                  <div className="mt-4">
                    <textarea
                      className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white text-sm font-mono placeholder-gray-500 focus:outline-none focus:border-gold-400/50"
                      rows={8}
                      placeholder={`Paste the JSON response from the AI here…`}
                      value={statsText}
                      onChange={(e) => setStatsText(e.target.value)}
                    />
                    <div className="flex justify-end gap-2 mt-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setExpandedMatch(null);
                          setStatsText("");
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        className="bg-gold-400 text-black"
                        size="sm"
                        onClick={() => applyStats(match.id)}
                      >
                        Apply Stats
                      </Button>
                    </div>
                  </div>
                )}

                <button
                  className="text-xs text-gold-400 mt-3 hover:underline"
                  onClick={() => {
                    setExpandedMatch(expandedMatch === match.id ? null : match.id);
                    setStatsText("");
                  }}
                >
                  {expandedMatch === match.id ? "Close" : "Enter Stats Manually"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}