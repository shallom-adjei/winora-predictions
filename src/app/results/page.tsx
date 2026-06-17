"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import PublicHeader from "@/components/PublicHeader";
import Footer from "@/components/Footer";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { motion } from "framer-motion";
import { Activity } from "lucide-react";
import { evaluatePick } from "@/lib/utils";

function ResultBadge({ result }: { result: "Win" | "Loss" | "Pending" }) {
  return (
    <span
      className={`inline-flex items-center justify-center w-16 py-0.5 rounded-full text-xs font-semibold ${
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

export default function ResultsPage() {
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
    <div className="min-h-screen bg-surface-primary text-white flex flex-col pb-24 lg:pb-0">
      <PublicHeader />
      <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-8 py-8 sm:py-12 w-full">
        <h1 className="text-2xl sm:text-4xl font-bold mb-6 sm:mb-8">Match Results</h1>
        {loading ? (
          <p className="text-gray-400 text-sm">Loading results…</p>
        ) : results.length === 0 ? (
          <p className="text-gray-400 text-sm">No results recorded yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {results.map((match) => {
              const mainResult = evaluatePick(match.main_pick, match.actual_home_score, match.actual_away_score);
              const safeResult = evaluatePick(match.safe_pick, match.actual_home_score, match.actual_away_score);
              const goalsResult = evaluatePick(match.goals_pick, match.actual_home_score, match.actual_away_score);
              const bttsResult = evaluatePick(match.btts_pick, match.actual_home_score, match.actual_away_score);

              return (
                <motion.div
                  key={match.id}
                  whileHover={{ y: -3 }}
                  className="rounded-[18px] bg-surface-card border border-white/5 p-4 sm:p-5"
                >
                  {/* League + Date */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-gray-400 uppercase flex items-center gap-1">
                      <Activity className="h-3 w-3 text-gold-400" />
                      {match.sport}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(match.kickoff_time || match.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Teams & Score */}
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
                          <span className="text-xl font-bold tabular-nums">
                            {match.actual_home_score} - {match.actual_away_score}
                          </span>
                          <span className="text-xs text-gray-400 mt-0.5">FT</span>
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

                  {/* Main pick result */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold">{match.main_pick}</span>
                    <ResultBadge result={mainResult} />
                  </div>

                  {/* Other picks grid */}
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

                  {/* Expected Score */}
                  {match.expected_score && (
                    <p className="mt-2 text-xs text-gold-400">
                      Predicted Score: {match.expected_score}
                    </p>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}