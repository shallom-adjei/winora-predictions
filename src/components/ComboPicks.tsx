"use client";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Activity } from "lucide-react";
import AffiliateCta from "@/components/AffiliateCta";

function comboScore(match: any): number {
  const confidence = Number(match.confidence) || 0;
  const matchesUsedA = Number(match.matches_used_a) || 0;
  const matchesUsedB = Number(match.matches_used_b) || 0;
  const minMatches = Math.min(matchesUsedA, matchesUsedB);
  const formA = Number(match.form_points_a) || 0;
  const formB = Number(match.form_points_b) || 0;
  const formGap = Math.abs(formA - formB);
  return confidence + Math.min(minMatches, 20) + Math.min(formGap, 10);
}

export default function ComboPicks({ predictions }: { predictions: any[] }) {
  const [open, setOpen] = useState(false);

  const comboSorted = useMemo(() => {
    return predictions
      .filter((p: any) => p.prediction && p.prediction !== "No recommendation" && p.match_status !== "FINISHED")
      .sort((a: any, b: any) => comboScore(b) - comboScore(a));
  }, [predictions]);

  const topThree = comboSorted.slice(0, 3);

  return (
    <section className="mx-auto max-w-[1280px] px-6 lg:px-8 mb-12">
      {/* Header */}
      <div
        className="flex items-center justify-between cursor-pointer bg-[#0D0D0D] border border-gold-400/20 rounded-2xl px-6 py-4 hover:border-gold-400/40 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <h2 className="text-xl lg:text-2xl font-bold text-gold-400">
          ⚡ Daily Combo
        </h2>
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <span className="hidden sm:inline">Top value matches</span>
          {open ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </div>
      </div>

      {/* Collapsed cards (always visible, but hide when expanded) */}
      {!open && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
          {topThree.map((match: any) => (
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
                <p className="text-sm font-semibold text-center">{match.main_pick}</p>
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-1.5 flex-1 rounded-full bg-gray-800">
                    <div className="h-full rounded-full bg-green-500" style={{ width: `${match.confidence}%` }} />
                  </div>
                  <span className="text-xs font-bold text-green-500">{match.confidence}%</span>
                </div>
              </div>
              <AffiliateCta matchId={match.id} />
            </div>
          ))}
        </div>
      )}

      {/* Expanded view – full match list with detailed predictions */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mt-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {comboSorted.map((match: any) => (
                <div
                  key={match.id}
                  className="rounded-xl bg-[#0D0D0D] border border-white/10 p-4"
                >
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
                    </div>
                    <div className="text-center flex-1">
                      {match.crest_b && <img src={match.crest_b} alt={match.team_b} className="h-8 w-8 object-contain mx-auto mb-1" />}
                      <p className="text-xs font-medium">{match.team_b}</p>
                    </div>
                  </div>

                  <p className="text-sm font-semibold">{match.main_pick}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-1.5 flex-1 rounded-full bg-gray-800">
                      <div className="h-full rounded-full bg-green-500" style={{ width: `${match.confidence}%` }} />
                    </div>
                    <span className="text-xs font-bold text-green-500">{match.confidence}%</span>
                  </div>

                  {match.expected_score && (
                    <p className="mt-2 text-xs text-gold-400">Predicted: {match.expected_score}</p>
                  )}

                  <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                    <div><span className="text-gray-500">Main:</span> {match.main_pick}</div>
                    <div><span className="text-gray-500">Safe:</span> {match.safe_pick}</div>
                    <div><span className="text-gray-500">Goals:</span> {match.goals_pick}</div>
                    <div><span className="text-gray-500">BTTS:</span> {match.btts_pick}</div>
                  </div>

                  <div className="mt-2 text-xs text-gray-500">
                    Risk: {match.risk_level} | Stake: {match.recommended_stake}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}