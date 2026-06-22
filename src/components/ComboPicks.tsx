"use client";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Activity } from "lucide-react";
import AffiliateCta from "@/components/AffiliateCta";
import { computePrediction } from "@/lib/predictionEngine";

// Markets we consider for the combo (exclude 1X/X2 – those are “safe”)
const COMBO_MARKETS = [
  "Home Win", "Draw", "Away Win",
  "Over 1.5 Goals", "Over 2.5 Goals", "Under 2.5 Goals",
  "Both Teams to Score", "BTTS No"
] as const;

function bestMarket(match: any) {
  const scores = computePrediction(match);
  let best: string | null = null;
  let bestProb = 0;

  for (const market of COMBO_MARKETS) {
    const prob = scores[market as keyof typeof scores] as number;
    if (prob > bestProb) {
      bestProb = prob;
      best = market;
    }
  }
  return { market: best, confidence: bestProb };
}

export default function ComboPicks({ predictions }: { predictions: any[] }) {
  const [open, setOpen] = useState(false);

  const topFive = useMemo(() => {
    return predictions
      .filter((p: any) => p.prediction && p.prediction !== "No recommendation" && p.match_status !== "FINISHED")
      .map((p: any) => {
        const { market, confidence } = bestMarket(p);
        return { ...p, comboMarket: market, comboConfidence: confidence };
      })
      .filter((p: any) => p.comboMarket) // in case engine returns nothing
      .sort((a: any, b: any) => b.comboConfidence - a.comboConfidence)
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

                    {/* Combo pick – the most probable market */}
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