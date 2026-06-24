"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Activity, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { evaluatePick } from "@/lib/utils";
import DateFilter from "@/components/DateFilter";
import toast from "react-hot-toast";
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

export default function AdminResultsPage() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fetchResults = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin-results");
      const data = await res.json();
      let list = data.results || [];
      // client‑side date filtering
      if (dateFrom) list = list.filter((m: any) => new Date(m.kickoff_time) >= new Date(`${dateFrom}T00:00:00`));
      if (dateTo) list = list.filter((m: any) => new Date(m.kickoff_time) <= new Date(`${dateTo}T23:59:59`));
      setResults(list);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, [dateFrom, dateTo]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

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

  const handleRefreshScores = async () => {
    try {
      const res = await fetch("/api/cron/update-scores");
      const data = await res.json();
      toast.success(`Scores refreshed: ${data.updated} matches updated`);
      fetchResults();
    } catch {
      toast.error("Failed to refresh scores");
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <Link href="/portalsydr">
              <Button variant="ghost" className="text-gold-400">
                <ArrowLeft className="h-4 w-4 mr-1" /> Dashboard
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">Match Results</h1>
          </div>
          <Button onClick={handleRefreshScores} variant="outline" className="text-sm gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh Scores
          </Button>
        </div>

        <DateFilter
          from={dateFrom}
          to={dateTo}
          onChange={(f, t) => { setDateFrom(f); setDateTo(t); }}
          showQuickButtons={true}
        />

        {loading ? (
          <LoadingScreen message="Loading results…" />
        ) : results.length === 0 ? (
          <p className="text-gray-400">No results for this period.</p>
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
                    <div key={match.id} className="rounded-[18px] bg-[#0D0D0D] border border-white/5 p-4 sm:p-5">
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

                      {/* Confidence & Expected Score */}
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400">Confidence</span>
                          <span className="text-sm font-semibold">{match.confidence}%</span>
                        </div>
                        {match.expected_score && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400">Predicted</span>
                            <span className="text-sm font-semibold text-gold-400">{match.expected_score}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}