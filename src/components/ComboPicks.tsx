"use client";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Activity } from "lucide-react";
import AffiliateCta from "@/components/AffiliateCta";
import { computePrediction } from "@/lib/predictionEngine";

// Market baselines – roughly the global average probability
const BASELINES: Record<string, number> = {
  "Home Win": 33,
  "Draw": 24,
  "Away Win": 28,
  "Over 1.5 Goals": 75,
  "Over 2.5 Goals": 50,
  "Under 2.5 Goals": 50,
  "Both Teams to Score": 50,
  "BTTS No": 50,
};

// Markets we consider (excluding safe 1X/X2)
const COMBO_MARKETS = Object.keys(BASELINES);

function marketEdge(prob: number, market: string): number {
  return prob - (BASELINES[market] || 0);
}

export default function ComboPicks({ predictions }: { predictions: any[] }) {
  const [open, setOpen] = useState(false);

  const topFive = useMemo(() => {
    return predictions
      .filter((p: any) => p.prediction && p.prediction !== "No recommendation" && p.match_status !== "FINISHED")
      .map((p: any) => {
        const scores = computePrediction(p);
        let bestMarket: string | null = null;
        let bestEdge = -Infinity;

        for (const market of COMBO_MARKETS) {
          const prob = (scores as any)[market] as number;
          if (prob === undefined) continue;
          const edge = marketEdge(prob, market);
          if (edge > bestEdge) {
            bestEdge = edge;
            bestMarket = market;
          }
        }

        // Composite score: edge + data depth + form gap
        const matchesUsedA = Number(p.matches_used_a) || 0;
        const matchesUsedB = Number(p.matches_used_b) || 0;
        const minMatches = Math.min(matchesUsedA, matchesUsedB);
        const formA = Number(p.form_points_a) || 0;
        const formB = Number(p.form_points_b) || 0;
        const formGap = Math.abs(formA - formB);

        const comboScore = bestEdge + Math.min(minMatches, 20) * 0.5 + Math.min(formGap, 10) * 0.3;

        return {
          ...p,
          comboMarket: bestMarket,
          comboConfidence: bestMarket ? (scores as any)[bestMarket] : 0,
          comboScore,
        };
      })
      .filter((p: any) => p.comboMarket && p.comboConfidence >= 50)  // only reasonable confidence
      .sort((a: any, b: any) => b.comboScore - a.comboScore)
      .slice(0, 5);
  }, [predictions]);

  return (
    <section className="mx-auto max-w-[1280px] px-6 lg:px-8 mb-12">
      {/* Collapsed header – no match previews */}
      <div
        className="flex items-center justify-between cursor-pointer bg-[#0D0D0D] border border-gold-400/20 rounded-2xl px-6 py-4 hover:border-gold-400/40 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <h2 className="text-xl lg:text-2xl font-bold text-gold-400">
          ⚡ Daily Combo
        </h2>
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <span className="hidden sm:inline">Top 5 value picks</span>
          {open ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </div>
      </div>

      {/* Expanded view – top 5 matches, each showing the best market */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mt-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {topFive.map((match: any) => (
                <div
                  key={match.id}
                  className="rounded-xl bg-[#0D0D0D] border border-white/10 p-4 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2 text-xs text-gray-400 uppercase mb-3">
                      <Activity className="h-3 w-3 text-gold-400" />
                      {match.sport}
                    </div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-center flex-1">
                        {match.crest_a && <img src={match.crest_a} alt={match.team_a} className="h-8 w-8 object-contain mx-auto mb-1" />}
                        <p className="text-xs font-medium">{match.team_a}</p>
                      </div>
                      <div className="text-center px-2">
                        <p className="text-xs font-bold text-gray-500">{match.time}</p>
                        <p className="text-xs text-gray-600">VS</p>
                      </div>
                      <div className="text-center flex-1">
                        {match.crest_b && <img src={match.crest_b} alt={match.team_b} className="h-8 w-8 object-contain mx-auto mb-1" />}
                        <p className="text-xs font-medium">{match.team_b}</p>
                      </div>
                    </div>

                    {/* Combo pick – the highest edge market */}
                    <p className="text-sm font-semibold text-center text-gold-400">{match.comboMarket}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-1.5 flex-1 rounded-full bg-gray-800">
                        <div className="h-full rounded-full bg-green-500" style={{ width: `${match.comboConfidence}%` }} />
                      </div>
                      <span className="text-xs font-bold text-green-500">{match.comboConfidence}%</span>
                    </div>

                    {match.expected_score && (
                      <p className="mt-2 text-xs text-gold-400 text-center">
                        Predicted: {match.expected_score}
                      </p>
                    )}

                    <div className="mt-2 text-xs text-gray-500 text-center">
                      Risk: {match.risk_level} | Stake: {match.recommended_stake}
                    </div>
                  </div>

                  {/* Affiliate CTA – only on these combo picks */}
                  <AffiliateCta matchId={match.id} />
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}