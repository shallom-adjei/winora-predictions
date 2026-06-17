"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import PublicHeader from "@/components/PublicHeader";
import Footer from "@/components/Footer";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Activity } from "lucide-react";
import { AnalysisModal } from "@/components/AnalysisModal";

export default function PredictionsPage() {
  const [predictions, setPredictions] = useState<any[]>([]);
  const [analysisModalOpen, setAnalysisModalOpen] = useState(false);
  const [selectedAnalysis, setSelectedAnalysis] = useState<any>(null);

  useEffect(() => {
    supabase
      .from("predictions")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) {
          setPredictions(
            data.map((p) => ({
              ...p,
              expectedScore: p.expected_score,
              mainPick: p.main_pick,
              safePick: p.safe_pick,
              goalsPick: p.goals_pick,
              bttsPick: p.btts_pick,
              riskLevel: p.risk_level,
              stake: p.recommended_stake,
            }))
          );
        }
      });
  }, []);

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
        <h1 className="text-2xl sm:text-4xl font-bold mb-6 sm:mb-8">All Predictions</h1>
        {predictions.length === 0 ? (
          <p className="text-gray-400 text-sm">No predictions available yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {predictions.map((p) => (
              <motion.div
                key={p.id}
                whileHover={{ y: -5 }}
                className="rounded-[18px] bg-surface-card border border-white/5 p-4 sm:p-5"
              >
                {/* League + Time */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-gray-400 uppercase flex items-center gap-1">
                    <Activity className="h-3 w-3 text-gold-400" />
                    {p.sport}
                  </span>
                  <Badge variant="outline" className="border-gold-400/30 text-gold-400 text-xs">{p.time}</Badge>
                </div>

                {/* Teams */}
                <div className="flex items-center justify-between mb-4">
                  <div className="text-center flex-1">
                    {p.crest_a ? (
                      <img src={p.crest_a} alt={p.team_a} className="h-10 w-10 object-contain mx-auto mb-1" />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-gray-800 mx-auto mb-1" />
                    )}
                    <p className="text-xs font-medium">{p.team_a}</p>
                  </div>
                  <span className="text-xs font-bold text-gray-500 px-2">VS</span>
                  <div className="text-center flex-1">
                    {p.crest_b ? (
                      <img src={p.crest_b} alt={p.team_b} className="h-10 w-10 object-contain mx-auto mb-1" />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-gray-800 mx-auto mb-1" />
                    )}
                    <p className="text-xs font-medium">{p.team_b}</p>
                  </div>
                </div>

                {/* Main Prediction + Confidence */}
                <p className="text-sm font-semibold">{p.mainPick || p.prediction}</p>
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-1.5 flex-1 rounded-full bg-gray-800">
                    <div className="h-full rounded-full bg-positive" style={{ width: `${p.confidence}%` }} />
                  </div>
                  <span className="text-xs font-bold text-positive">{p.confidence}%</span>
                </div>

                {/* Expected Score */}
                {p.expectedScore && (
                  <p className="mt-2 text-xs text-gold-400 font-semibold">
                    Predicted Score: {p.expectedScore}
                  </p>
                )}

                {/* Picks Grid */}
                <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                  <div>
                    <span className="text-gray-500">Main:</span>{" "}
                    <span className="text-white font-medium">{p.mainPick || "—"}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Safe:</span>{" "}
                    <span className="text-white font-medium">{p.safePick || "—"}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Goals:</span>{" "}
                    <span className="text-white font-medium">{p.goalsPick || "—"}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">BTTS:</span>{" "}
                    <span className="text-white font-medium">{p.bttsPick || "—"}</span>
                  </div>
                </div>

                {/* Risk & Stake */}
                <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                  <span>Risk: {p.riskLevel || "—"}</span>
                  <span>Stake: {p.stake || "—"}</span>
                </div>

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