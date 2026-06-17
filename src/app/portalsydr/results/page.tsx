"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { evaluatePick } from "@/lib/utils";

function ResultBadge({ result }: { result: "Win" | "Loss" | "Pending" }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
        result === "Win"
          ? "bg-green-500/15 text-green-400"
          : result === "Loss"
          ? "bg-red-500/15 text-red-400"
          : "bg-gray-500/15 text-gray-400"
      }`}
    >
      {result}
    </span>
  );
}

export default function AdminResultsPage() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("predictions")
      .select("*")
      .not("result", "is", null)
      .neq("result", "Pending")
      .order("kickoff_time", { ascending: false })
      .then(({ data }) => {
        if (data) setResults(data);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/portalsydr">
            <Button variant="ghost" className="text-gold-400">
              <ArrowLeft className="h-4 w-4 mr-1" /> Dashboard
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Match Results</h1>
        </div>

        {loading ? (
          <p className="text-gray-400">Loading…</p>
        ) : results.length === 0 ? (
          <p className="text-gray-400">No results recorded yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {results.map((match) => {
              const mainResult = evaluatePick(match.main_pick, match.actual_home_score, match.actual_away_score);
              const safeResult = evaluatePick(match.safe_pick, match.actual_home_score, match.actual_away_score);
              const goalsResult = evaluatePick(match.goals_pick, match.actual_home_score, match.actual_away_score);
              const bttsResult = evaluatePick(match.btts_pick, match.actual_home_score, match.actual_away_score);

              return (
                <div
                  key={match.id}
                  className="rounded-[18px] bg-[#0D0D0D] border border-white/5 p-4 sm:p-5"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-gray-400">{match.sport}</span>
                    <span className="text-xs text-gray-500">
                      {new Date(match.kickoff_time || match.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    <div className="text-center flex-1">
                      {match.crest_a ? (
                        <img src={match.crest_a} alt={match.team_a} className="h-10 w-10 object-contain mx-auto mb-1" />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-gray-800 mx-auto mb-1" />
                      )}
                      <p className="text-xs font-medium">{match.team_a}</p>
                    </div>
                    <div className="text-center px-2">
                      {match.actual_home_score != null && match.actual_away_score != null ? (
                        <div className="flex flex-col items-center">
                          <span className="text-xl font-bold">{match.actual_home_score} - {match.actual_away_score}</span>
                          <span className="text-xs text-gray-400">FT</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500">VS</span>
                      )}
                    </div>
                    <div className="text-center flex-1">
                      {match.crest_b ? (
                        <img src={match.crest_b} alt={match.team_b} className="h-10 w-10 object-contain mx-auto mb-1" />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-gray-800 mx-auto mb-1" />
                      )}
                      <p className="text-xs font-medium">{match.team_b}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold">{match.main_pick}</span>
                    <ResultBadge result={mainResult} />
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Safe</span>
                      <ResultBadge result={safeResult} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Goals</span>
                      <ResultBadge result={goalsResult} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">BTTS</span>
                      <ResultBadge result={bttsResult} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Conf.</span>
                      <span className="text-white font-semibold">{match.confidence}%</span>
                    </div>
                  </div>
                  {match.expected_score && (
                    <p className="mt-2 text-xs text-gold-400">Predicted: {match.expected_score}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}