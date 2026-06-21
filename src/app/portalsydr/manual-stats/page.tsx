"use client";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { ArrowLeft, Copy, Check, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

const PROMPT_TEMPLATE = (teamA: string, teamB: string) => `
You are a professional football analyst. Search the web for the most recent and reliable data about ${teamA} and ${teamB}. Focus on their last 10 competitive matches (World Cup qualifiers, continental tournaments, friendlies against strong opponents). Use the current date (June 2026) for context.

Return a valid JSON object with exactly these keys. Give numeric values only – no text explanations.

{
  "form_points_a": <last 5 matches form points for ${teamA} (3=win, 1=draw, 0=loss, max 15)>,
  "form_points_b": <same for ${teamB}>,
  "home_goals_scored": <average goals scored per home game by ${teamA} (float)>,
  "home_goals_conceded": <average goals conceded per home game by ${teamA} (float)>,
  "away_goals_scored": <average goals scored per away game by ${teamB} (float)>,
  "away_goals_conceded": <average goals conceded per away game by ${teamB} (float)>,
  "clean_sheets_last5_a": <number of clean sheets for ${teamA} in last 5 matches>,
  "clean_sheets_last5_b": <same for ${teamB}>,
  "failed_to_score_last5_a": <number of matches ${teamA} failed to score in last 5>,
  "failed_to_score_last5_b": <same for ${teamB}>,
  "over25_last5_pct_a": <percentage of ${teamA}'s last 5 matches with over 2.5 goals (0-100)>,
  "over25_last5_pct_b": <same for ${teamB}>,
  "btts_last5_pct_a": <percentage of ${teamA}'s last 5 matches where both teams scored (0-100)>,
  "btts_last5_pct_b": <same for ${teamB}>,
  "matches_used_a": <number of matches the stats for ${teamA} are based on, ideally 10>,
  "matches_used_b": <same for ${teamB}>,
  "strength_a": <overall strength rating for ${teamA} on a scale of 1-10, based on world ranking, squad quality, and recent performances>,
  "strength_b": <same for ${teamB}>,
  "h2h_home_wins": <number of wins for ${teamA} in the last 5 head‑to‑head meetings>,
  "h2h_draws": <number of draws in those 5 meetings>,
  "h2h_away_wins": <number of wins for ${teamB} in those 5 meetings>,
  "h2h_over25_pct": <percentage of those 5 meetings with over 2.5 goals (0-100)>,
  "h2h_btts_pct": <percentage of those 5 meetings where both teams scored (0-100)>,
  "league_position_a": <current FIFA world ranking position for ${teamA}>,
  "league_position_b": <current FIFA world ranking position for ${teamB}>
}

Only return the JSON object – nothing else.
`;

export default function ManualStatsPage() {
  const [allMatches, setAllMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null);
  const [statsText, setStatsText] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [hideWithStats, setHideWithStats] = useState(true);   // default: show only matches without stats

  const fetchMatches = async () => {
    setLoading(true);
    const nowISO = new Date().toISOString();
    const { data } = await supabase
      .from("predictions")
      .select("*")
      .gte("kickoff_time", nowISO)
      .order("kickoff_time", { ascending: true })
      .limit(50);
    if (data) setAllMatches(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchMatches();
  }, []);

  const matchesToShow = useMemo(() => {
    if (hideWithStats) {
      return allMatches.filter(m => m.form_points_a == null || m.form_points_a === 0);
    }
    return allMatches;
  }, [allMatches, hideWithStats]);

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
        fetchMatches();   // refresh list – the match will now have stats and be hidden
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
          <p className="text-gray-400">Loading…</p>
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