"use client";
import { useState, useEffect, useMemo } from "react";
import PublicHeader from "@/components/PublicHeader";
import Footer from "@/components/Footer";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { motion } from "framer-motion";
import { Activity } from "lucide-react";
import { AnalysisModal } from "@/components/AnalysisModal";
import DateFilter from "@/components/DateFilter";
import AffiliateCta from "@/components/AffiliateCta";
import LoadingScreen from "@/components/LoadingScreen";

export default function PredictionsPage() {
  const [analysisModalOpen, setAnalysisModalOpen] = useState(false);
  const [selectedAnalysis, setSelectedAnalysis] = useState<any>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [predictions, setPredictions] = useState<any[]>([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  fetch("/api/get-predictions?t=" + Date.now(), { cache: "no-store" })
    .then((r) => r.json())
    .then((data) => {
      setPredictions(data.predictions || []);
      setLoading(false);
    })
    .catch(() => setLoading(false));
}, []);


  // Filter by date range
  const filteredPredictions = useMemo(() => {
    if (!dateFrom && !dateTo) return predictions;
    return predictions.filter((p: any) => {
      const kickoff = new Date(p.kickoff_time);
      if (dateFrom && kickoff < new Date(dateFrom)) return false;
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        if (kickoff > toDate) return false;
      }
      return true;
    });
  }, [predictions, dateFrom, dateTo]);

  // Group filtered predictions by date
  const grouped = useMemo(() => {
    const groups: Record<string, any[]> = {};
    filteredPredictions.forEach((p) => {
      const dateKey = new Date(p.kickoff_time).toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(p);
    });
    return groups;
  }, [filteredPredictions]);

  const handleOpenAnalysis = (match: any) => {
    setSelectedAnalysis(match);
    setAnalysisModalOpen(true);
  };

  const handleCloseAnalysis = () => {
    setAnalysisModalOpen(false);
    setSelectedAnalysis(null);
  };

  return (
    <div className="min-h-screen bg-surface-primary text-white flex flex-col pb-24 lg:pb-0">
      <PublicHeader />
      <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-8 py-8 sm:py-12 w-full">
        <h1 className="text-2xl sm:text-4xl font-bold mb-6 sm:mb-8">
          All Predictions
        </h1>

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
          <LoadingScreen message="Loading predictions…" />
        ) : filteredPredictions.length === 0 ? (
          <p className="text-gray-400 text-sm">No predictions for this period.</p>
        ) : (
          Object.keys(grouped).map((dateLabel) => (
            <div key={dateLabel} className="mb-10">
              <h2 className="text-xl font-semibold mb-4 text-gold-400">
                {dateLabel}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {grouped[dateLabel].map((p) => (
                  <motion.div
                    key={p.id}
                    whileHover={{ y: -5 }}
                    className="rounded-[18px] bg-surface-card border border-white/5 p-4 sm:p-5"
                  >
                    {/* League */}
                    <div className="flex items-center mb-3">
                      <span className="text-xs text-gray-400 uppercase flex items-center gap-1">
                        <Activity className="h-3 w-3 text-gold-400" />
                        {p.sport}
                      </span>
                    </div>

                    {/* Teams */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-center flex-1">
                        {p.crest_a ? (
                          <img
                            src={p.crest_a}
                            alt={p.team_a}
                            className="h-10 w-10 object-contain mx-auto mb-1"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gray-800 mx-auto mb-1" />
                        )}
                        <p className="text-xs font-medium">{p.team_a}</p>
                      </div>

                      {/* LIVE / FT / TIME between crests */}
                      <div className="text-center px-2">
                        {p.match_status === "LIVE" ? (
                          <div className="flex flex-col items-center gap-1">
                            <span className="relative flex items-center gap-1.5">
                              <span className="relative flex h-2 w-2">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75"></span>
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500"></span>
                              </span>
                              <span className="text-xs font-bold text-red-400">LIVE</span>
                            </span>
                            {p.actual_home_score != null && p.actual_away_score != null && (
                              <span className="text-sm font-bold text-white tabular-nums">
                                {p.actual_home_score} - {p.actual_away_score}
                              </span>
                            )}
                          </div>
                        ) : p.match_status === "FINISHED" ? (
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-xs font-bold text-gray-400">FT</span>
                            {p.actual_home_score != null && p.actual_away_score != null && (
                              <span className="text-sm font-bold text-white tabular-nums">
                                {p.actual_home_score} - {p.actual_away_score}
                              </span>
                            )}
                          </div>
                        ) : (
                          <>
                            <p className="text-xs font-bold text-gray-500">{p.time}</p>
                            <p className="text-xs text-gray-600">VS</p>
                          </>
                        )}
                      </div>

                      <div className="text-center flex-1">
                        {p.crest_b ? (
                          <img
                            src={p.crest_b}
                            alt={p.team_b}
                            className="h-10 w-10 object-contain mx-auto mb-1"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gray-800 mx-auto mb-1" />
                        )}
                        <p className="text-xs font-medium">{p.team_b}</p>
                      </div>
                    </div>
                                        {/* Main Prediction */}
                    <p className="text-sm font-semibold">{p.main_pick || p.prediction}</p>

                                        {/* Probability Bars */}
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center gap-1 text-[10px] sm:text-xs">
                        <span className="text-gray-400 w-3">1</span>
                        <div className="flex-1 h-1.5 rounded-full bg-gray-800 overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${p.prob_home}%` }} />
                        </div>
                        <span className="text-blue-400 font-medium w-7 text-right">{p.prob_home}%</span>

                        <span className="text-gray-400 w-3">X</span>
                        <div className="flex-1 h-1.5 rounded-full bg-gray-800 overflow-hidden">
                          <div className="h-full bg-yellow-500 rounded-full" style={{ width: `${p.prob_draw}%` }} />
                        </div>
                        <span className="text-yellow-400 font-medium w-7 text-right">{p.prob_draw}%</span>

                        <span className="text-gray-400 w-3">2</span>
                        <div className="flex-1 h-1.5 rounded-full bg-gray-800 overflow-hidden">
                          <div className="h-full bg-red-500 rounded-full" style={{ width: `${p.prob_away}%` }} />
                        </div>
                        <span className="text-red-400 font-medium w-7 text-right">{p.prob_away}%</span>
                      </div>

                      {/* Edge line – placed below the bars */}
                      <p className="text-[10px] text-gray-400">
                        Edge: <span className="text-gold-400 font-medium">+{p.main_edge}%</span>
                      </p>

                      <div className="flex items-center gap-2 text-[10px] text-gray-500">
                        <span>Stake: <span className="text-white">{p.recommended_stake || "—"}</span></span>
                        <span>•</span>
                        <span>Risk: <span className="text-white">{p.risk_level || "—"}</span></span>
                      </div>
                    </div>

                    {/* Expected Score */}
                    {p.expected_score && (
                      <p className="mt-2 text-xs text-gold-400 font-semibold">
                        Predicted Score: {p.expected_score}
                      </p>
                    )}

                    {/* Picks Grid */}
                    <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                      <div>
                        <span className="text-gray-500">Main:</span>{" "}
                        <span className="text-white font-medium">{p.main_pick || "—"}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Safe:</span>{" "}
                        <span className="text-white font-medium">{p.safe_pick || "—"}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Goals:</span>{" "}
                        <span className="text-white font-medium">{p.goals_pick || "—"}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">BTTS:</span>{" "}
                        <span className="text-white font-medium">{p.btts_pick || "—"}</span>
                      </div>
                    </div>

                    {/* Risk & Stake */}
                    <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                      <span>Risk: {p.risk_level || "—"}</span>
                      <span>Stake: {p.recommended_stake || "—"}</span>
                    </div>
                    {/* Affiliate CTAs */}
                    <AffiliateCta matchId={p.id} />

                    {/* Analysis Preview */}
                    {p.analysis && (
                      <>
                        <p className="mt-2 text-xs text-gray-400 italic line-clamp-2 leading-relaxed">
                          💡 {p.analysis}
                        </p>
                        <button
                          onClick={() => handleOpenAnalysis(p)}
                          className="text-xs text-gold-400 hover:underline mt-1"
                        >
                          View Full Analysis
                        </button>
                      </>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
      <Footer />
      <MobileBottomNav />
      <AnalysisModal
        isOpen={analysisModalOpen}
        onClose={handleCloseAnalysis}
        match={selectedAnalysis}
      />
    </div>
  );
}