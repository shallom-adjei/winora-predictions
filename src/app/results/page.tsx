"use client";
import { useState, useEffect, useMemo } from "react";
import PublicHeader from "@/components/PublicHeader";
import Footer from "@/components/Footer";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { motion } from "framer-motion";
import { Activity } from "lucide-react";
import { evaluatePick } from "@/lib/utils";
import DateFilter from "@/components/DateFilter";
import LoadingScreen from "@/components/LoadingScreen";

function ResultBadge({ result }: { result: "Win" | "Loss" | "Pending" }) {
  return (
    <span
      className={`inline-flex items-center justify-center w-14 py-0.5 rounded-full text-xs font-semibold ${
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
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    setLoading(true);
    fetch("/api/get-results?t=" + Date.now(), { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        let all = data.results || [];
        // Client‑side date filtering (keep your existing logic)
        if (dateFrom) all = all.filter((m: any) => new Date(m.kickoff_time) >= new Date(`${dateFrom}T00:00:00`));
        if (dateTo) all = all.filter((m: any) => new Date(m.kickoff_time) <= new Date(`${dateTo}T23:59:59`));
        setResults(all);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [dateFrom, dateTo]);

  // Group by date
  const grouped = useMemo(() => {
    const groups: Record<string, any[]> = {};
    results.forEach((match) => {
      const dateKey = new Date(match.kickoff_time || match.created_at).toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(match);
    });
    return groups;
  }, [results]);

  return (
    <div className="min-h-screen bg-surface-primary text-white flex flex-col pb-24 lg:pb-0">
      <PublicHeader />
      <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-8 py-8 sm:py-12 w-full">
        <h1 className="text-2xl sm:text-4xl font-bold mb-6 sm:mb-8">Match Results</h1>

        <DateFilter
          from={dateFrom}
          to={dateTo}
          onChange={(f, t) => {
            setDateFrom(f);
            setDateTo(t);
          }}
          showQuickButtons={true}
        />

        {loading ? (
           <LoadingScreen message="Loading results…" />
        ) : results.length === 0 ? (
          <p className="text-gray-400 text-sm">No results for this period.</p>
        ) : (
          Object.keys(grouped).map((dateLabel) => (
            <div key={dateLabel} className="mb-10">
              <h2 className="text-xl font-semibold mb-4 text-gold-400">{dateLabel}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {grouped[dateLabel].map((match) => {
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

                      {/* Detailed picks with outcomes */}
                      <div className="space-y-2 mt-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-xs text-gray-400">Main</span>
                            <span className="text-sm font-medium ml-2">{match.main_pick}</span>
                          </div>
                          <ResultBadge result={mainResult} />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-xs text-gray-400">Safe</span>
                            <span className="text-sm font-medium ml-2">{match.safe_pick}</span>
                          </div>
                          <ResultBadge result={safeResult} />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-xs text-gray-400">Goals</span>
                            <span className="text-sm font-medium ml-2">{match.goals_pick}</span>
                          </div>
                          <ResultBadge result={goalsResult} />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-xs text-gray-400">BTTS</span>
                            <span className="text-sm font-medium ml-2">{match.btts_pick}</span>
                          </div>
                          <ResultBadge result={bttsResult} />
                        </div>
                      </div>

                                             {/* Original Probability Breakdown */}
                      <div className="mt-3 pt-3 border-t border-white/5 space-y-1">
                        <div className="flex items-center gap-1 text-[10px] sm:text-xs">
                          <span className="text-gray-400 w-3">1</span>
                          <div className="flex-1 h-1.5 rounded-full bg-gray-800 overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${match.prob_home}%` }} />
                          </div>
                          <span className="text-blue-400 font-medium w-7 text-right">{match.prob_home}%</span>

                          <span className="text-gray-400 w-3">X</span>
                          <div className="flex-1 h-1.5 rounded-full bg-gray-800 overflow-hidden">
                            <div className="h-full bg-yellow-500 rounded-full" style={{ width: `${match.prob_draw}%` }} />
                          </div>
                          <span className="text-yellow-400 font-medium w-7 text-right">{match.prob_draw}%</span>

                          <span className="text-gray-400 w-3">2</span>
                          <div className="flex-1 h-1.5 rounded-full bg-gray-800 overflow-hidden">
                            <div className="h-full bg-red-500 rounded-full" style={{ width: `${match.prob_away}%` }} />
                          </div>
                          <span className="text-red-400 font-medium w-7 text-right">{match.prob_away}%</span>
                        </div>

                        {/* Edge line */}
                        <p className="text-[10px] text-gray-400">
                          Edge: <span className="text-gold-400 font-medium">+{match.main_edge}%</span>
                        </p>

                        <div className="flex items-center gap-2 text-[10px] text-gray-500">
                          <span>Predicted: <span className="text-gold-400">{match.expected_score}</span></span>
                          <span>•</span>
                          <span>Stake: <span className="text-white">{match.recommended_stake}</span></span>
                          <span>•</span>
                          <span>Risk: <span className="text-white">{match.risk_level}</span></span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}