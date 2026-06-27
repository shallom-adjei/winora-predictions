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

const COMBO_MARKETS = Object.keys(BASELINES);

function marketEdge(prob: number, market: string): number {
  return prob - (BASELINES[market] || 0);
}

export default function ComboPicks({ predictions }: { predictions: any[] }) {
  const [open, setOpen] = useState(false);

  const topFive = useMemo(() => {
    // ---------- 1. Build all candidates ----------
    const allCandidates = predictions
      .filter(
        (p: any) =>
          p.main_pick &&
          p.main_pick !== "No recommendation" &&
          p.match_status !== "FINISHED" &&
          p.probHome != null &&
          p.probDraw != null &&
          p.probAway != null
      )
      .map((p: any) => {
        const scores = computePrediction(p);
        let bestMarket: string | null = null;
        let bestEdge = -Infinity;
        let bestProb = 0;

        for (const market of COMBO_MARKETS) {
          const prob = (scores as any)[market];
          if (typeof prob !== "number") continue;
          const edge = marketEdge(prob, market);
          if (edge > bestEdge) {
            bestEdge = edge;
            bestMarket = market;
            bestProb = prob;
          }
        }

        if (!bestMarket) return null;

        const matchesA = Number(p.matches_used_a) || 0;
        const matchesB = Number(p.matches_used_b) || 0;
        const minMatches = Math.min(matchesA, matchesB);
        const formGap = Math.abs((Number(p.form_points_a) || 0) - (Number(p.form_points_b) || 0));
        const comboScore = bestEdge + Math.min(minMatches, 20) * 0.5 + Math.min(formGap, 10) * 0.3;

        return {
          ...p,
          valueMarket: bestMarket,
          valueProb: bestProb,
          valueEdge: bestEdge,
          comboScore,
          matchesA,
          matchesB,
          minMatches,
        };
      })
      .filter((p: any) => p !== null);

    // ---------- 2. Dynamic tiers ----------
    const tierIdeal: any[] = [];
    const tierGood: any[] = [];
    const tierMin: any[] = [];

    for (const c of allCandidates) {
      const { valueEdge, valueProb, minMatches } = c;
      if (valueEdge >= 12 && valueProb >= 58 && minMatches >= 8) {
        tierIdeal.push(c);
      } else if (valueEdge >= 8 && valueProb >= 55 && minMatches >= 5) {
        tierGood.push(c);
      } else if (valueEdge >= 5 && valueProb >= 52 && minMatches >= 3) {
        tierMin.push(c);
      }
    }

    // Sort each tier by comboScore descending
    tierIdeal.sort((a, b) => b.comboScore - a.comboScore);
    tierGood.sort((a, b) => b.comboScore - a.comboScore);
    tierMin.sort((a, b) => b.comboScore - a.comboScore);

    // ---------- 3. Assemble final 5 with diversity ----------
    const selected: any[] = [];
    const marketCount: Record<string, number> = {};

    const addCandidates = (pool: any[]) => {
      for (const c of pool) {
        if (selected.length >= 5) break;
        const m = c.valueMarket;
        if ((marketCount[m] || 0) >= 2) continue; // max 2 of same market
        selected.push(c);
        marketCount[m] = (marketCount[m] || 0) + 1;
      }
    };

    addCandidates(tierIdeal);
    addCandidates(tierGood);
    addCandidates(tierMin);

    return selected;
  }, [predictions]);

  return (
    <section className="mx-auto max-w-[1280px] px-6 lg:px-8 mb-12">
      {/* Collapsed header */}
      <div
        className="flex items-center justify-between cursor-pointer bg-[#0D0D0D] border border-gold-400/20 rounded-2xl px-6 py-4 hover:border-gold-400/40 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <h2 className="text-xl lg:text-2xl font-bold text-gold-400">
          ⚡ Value Picks
        </h2>
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <span className="hidden sm:inline">Top 5 value markets today</span>
          {open ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </div>
      </div>

      {/* Expanded view */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mt-4"
          >
            {topFive.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                No value picks today. Check back later.
              </p>
            ) : (
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
                          {match.crest_a && (
                            <img src={match.crest_a} alt={match.team_a} className="h-8 w-8 object-contain mx-auto mb-1" />
                          )}
                          <p className="text-xs font-medium">{match.team_a}</p>
                        </div>
                        <div className="text-center px-2">
                          <p className="text-xs font-bold text-gray-500">{match.time}</p>
                          <p className="text-xs text-gray-600">VS</p>
                        </div>
                        <div className="text-center flex-1">
                          {match.crest_b && (
                            <img src={match.crest_b} alt={match.team_b} className="h-8 w-8 object-contain mx-auto mb-1" />
                          )}
                          <p className="text-xs font-medium">{match.team_b}</p>
                        </div>
                      </div>

                      {/* Value pick */}
                      <p className="text-sm font-semibold text-center text-gold-400">
                        {match.valueMarket}
                      </p>
                      <p className="text-xs text-center text-gray-500 mt-1">
                        Confidence: {match.valueProb}%  •  Edge: +{match.valueEdge.toFixed(1)}%
                      </p>

                      {/* 1X2 probability bars */}
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-gray-400 w-4">1</span>
                          <div className="flex-1 h-1.5 rounded-full bg-gray-800 overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${match.probHome}%` }} />
                          </div>
                          <span className="text-blue-400 font-medium w-8 text-right">{match.probHome}%</span>

                          <span className="text-gray-400 w-4">X</span>
                          <div className="flex-1 h-1.5 rounded-full bg-gray-800 overflow-hidden">
                            <div className="h-full bg-yellow-500 rounded-full" style={{ width: `${match.probDraw}%` }} />
                          </div>
                          <span className="text-yellow-400 font-medium w-8 text-right">{match.probDraw}%</span>

                          <span className="text-gray-400 w-4">2</span>
                          <div className="flex-1 h-1.5 rounded-full bg-gray-800 overflow-hidden">
                            <div className="h-full bg-red-500 rounded-full" style={{ width: `${match.probAway}%` }} />
                          </div>
                          <span className="text-red-400 font-medium w-8 text-right">{match.probAway}%</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-gray-500">
                          <span>Stake: <span className="text-white">{match.recommended_stake}</span></span>
                          <span>•</span>
                          <span>Risk: <span className="text-white">{match.risk_level}</span></span>
                        </div>
                      </div>

                      {match.expected_score && (
                        <p className="mt-2 text-xs text-gold-400 text-center">
                          Predicted: {match.expected_score}
                        </p>
                      )}
                    </div>

                    <AffiliateCta matchId={match.id} />
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}