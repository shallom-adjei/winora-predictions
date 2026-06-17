"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Crown, Star, ArrowRight, BarChart3, TrendingUp, Activity } from "lucide-react";
import PublicHeader from "@/components/PublicHeader";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import Link from "next/link";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { AnalysisModal } from "@/components/AnalysisModal";

export default function Home() {
  const [topPicks, setTopPicks] = useState<any[]>([]);
  const [overview, setOverview] = useState({
    totalPredictions: 0,
    winRate: "0",
    streak: 0,
    roi: "—",
    pending: 0,
    avgConfidence: "0",
  });
  const [analysisModalOpen, setAnalysisModalOpen] = useState(false);
  const [selectedAnalysis, setSelectedAnalysis] = useState<any>(null);

  // ========== FETCH OVERVIEW (KPI + floating card) ==========
  useEffect(() => {
    const fetchOverview = async () => {
      try {
        // Total predictions
        const { count: total, error: totalErr } = await supabase
          .from("predictions")
          .select("*", { count: "exact", head: true });
        if (totalErr) console.error("totalErr:", totalErr);

        // Win rate
        const { data: results, error: winErr } = await supabase
          .from("predictions")
          .select("result")
          .not("result", "is", null)
          .neq("result", "Pending");
        if (winErr) console.error("winErr:", winErr);
        const wins = results?.filter((r) => r.result === "Win").length || 0;
        const totalWithResult = results?.length || 1;
        const winRate = ((wins / totalWithResult) * 100).toFixed(1);

        // Current streak
        const { data: recent, error: streakErr } = await supabase
          .from("predictions")
          .select("result, created_at")
          .order("created_at", { ascending: false })
          .limit(20);
        if (streakErr) console.error("streakErr:", streakErr);
        let streak = 0;
        if (recent) {
          for (const r of recent) {
            if (r.result === "Win") streak++;
            else break;
          }
        }

        // Pending count
        const { count: pending, error: pendErr } = await supabase
          .from("predictions")
          .select("*", { count: "exact", head: true })
          .or("result.is.null,result.eq.Pending");
        if (pendErr) console.error("pendErr:", pendErr);

        // Average confidence
        const { data: confData, error: confErr } = await supabase
          .from("predictions")
          .select("confidence")
          .not("confidence", "is", null);
        if (confErr) console.error("confErr:", confErr);
        const avgConf = confData?.length
          ? (confData.reduce((sum, r) => sum + (r.confidence || 0), 0) / confData.length).toFixed(1)
          : "0";

        setOverview({
          totalPredictions: total || 0,
          winRate,
          streak,
          roi: "—",
          pending: pending || 0,
          avgConfidence: avgConf,
        });
      } catch (err) {
        console.error("Overview fetch error:", err);
      }
    };

    fetchOverview();
  }, []);

  // ========== FETCH TOP PICKS (the 3 most recent predictions) ==========
  useEffect(() => {
    supabase
      .from("predictions")
      .select("*")
      .neq("prediction", "No recommendation")
      .order("created_at", { ascending: false })
      .limit(3)
      .then(({ data, error }) => {
        if (error) {
          console.error("Top picks fetch error:", error.message);
          return;
        }
        if (data) {
          setTopPicks(
  data.map((p) => ({
    league: p.sport,
    home: p.team_a,
    away: p.team_b,
    time: p.time,
    prediction: p.prediction,
    confidence: p.confidence,
    analysis: p.analysis,
    crest_a: p.crest_a,
    crest_b: p.crest_b,
    // --- new fields ---
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
      })
  }, []);

  const handleOpenAnalysis = (match: any) => {
  setSelectedAnalysis({
    home: match.team_a || match.match?.split(" vs ")[0],
    away: match.team_b || match.match?.split(" vs ")[1],
    prediction: match.prediction,
    analysis: match.analysis,
    fullReport: match.fullReport,
  });
  setAnalysisModalOpen(true);
};

  const handleCloseAnalysis = () => {
    setAnalysisModalOpen(false);
    setSelectedAnalysis(null);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white overflow-x-hidden pb-24 lg:pb-0">
      <PublicHeader />

      {/* ===== HERO ===== */}
      <section className="relative w-full min-h-[700px] flex items-center overflow-hidden">
        <div className="absolute inset-0 w-full h-full">
          <img src="/hero-player.png" alt="Winora athlete" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-black/80 lg:bg-gradient-to-r lg:from-black/80 lg:via-black/40 lg:to-transparent" />
        </div>

        <div className="relative z-10 w-full max-w-[1280px] mx-auto px-6 lg:px-8 py-20 lg:py-0">
          <div className="max-w-[640px] space-y-8">
            <p className="text-sm font-semibold text-gold-400 uppercase tracking-widest">Professional Sports Intelligence</p>
            <h1 className="text-5xl lg:text-[80px] font-extrabold leading-none">
              <span className="text-white">SMARTER PREDICTIONS.</span>
              <br />
              <span className="text-gold-400">BETTER RESULTS.</span>
            </h1>
            <p className="text-lg lg:text-2xl text-[#CCCCCC] leading-relaxed">
              Data-driven football predictions backed by expert analysis to help you make smarter betting decisions.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
             <Button className="h-[60px] w-[250px] rounded-xl bg-gold-400 text-base font-semibold text-black hover:bg-gold-500 gap-2">
  <Crown className="h-5 w-5" /> Get Early Access <ArrowRight className="h-4 w-4" />
</Button>
              <Link href="/predictions">
                <Button variant="outline" className="h-[60px] w-[250px] rounded-xl border-white/20 text-base font-semibold text-white hover:bg-white/5">
                  View Today's Picks
                </Button>
              </Link>
            </div>
          </div>

          {/* Desktop floating card: Today's Overview (single, premium) */}
          <div className="hidden lg:block absolute top-1/2 -translate-y-1/2 right-8 xl:right-16">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="w-[290px] rounded-2xl border border-gold-400/20 bg-gradient-to-br from-white/[0.03] to-white/[0.01] backdrop-blur-xl p-5 flex flex-col justify-between shadow-[0_0_30px_rgba(212,175,55,0.08)]"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-gold-400">
                  Today's Overview
                </h3>
                <span className="flex items-center gap-1.5 text-[10px] text-green-400">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400"></span>
                  </span>
                  LIVE
                </span>
              </div>

              {/* Metrics */}
              <div className="space-y-3">
                <div className="rounded-xl bg-white/[0.03] px-4 py-3 flex items-center justify-between">
                  <span className="text-xs text-gray-400">Predictions Made</span>
                  <span className="text-lg font-bold text-white tabular-nums">{overview.totalPredictions}</span>
                </div>
                <div className="rounded-xl bg-white/[0.03] px-4 py-3 flex items-center justify-between">
                  <span className="text-xs text-gray-400">Win Rate</span>
                  <span className="text-lg font-bold text-green-400 tabular-nums">{overview.winRate}%</span>
                </div>
                <div className="rounded-xl bg-white/[0.03] px-4 py-3 flex items-center justify-between">
                  <span className="text-xs text-gray-400">Current Streak</span>
                  <div className="flex items-center gap-1">
                    <span className="text-lg font-bold text-green-400 tabular-nums">{overview.streak}</span>
                    <span className="text-xs text-green-400/70">W</span>
                  </div>
                </div>
                <div className="rounded-xl bg-white/[0.03] px-4 py-3 flex items-center justify-between">
                  <span className="text-xs text-gray-400">ROI Monthly</span>
                  <span className="text-lg font-bold text-gold-400 tabular-nums">{overview.roi}</span>
                </div>
              </div>

              {/* Footer link */}
              <Link href="/predictions" className="mt-4">
                <Button variant="ghost" className="text-gold-400 text-xs hover:bg-white/5 w-full justify-start p-0">
                  View All Predictions <ArrowRight className="ml-2 h-3 w-3" />
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Desktop ad banner (hero → KPI) */}
<div className="hidden lg:block mx-auto max-w-[1280px] px-6 mt-8 mb-8">
  <div className="w-full h-16 bg-[#0D0D0D] border border-white/5 rounded-xl flex items-center justify-center text-gray-500 text-xs tracking-wider">
    ADVERTISEMENT
  </div>
</div>

      {/* ===== KPI BAR ===== */}
      <section className="mx-auto max-w-[1280px] px-6 lg:px-8 mt-16 mb-16 lg:mb-24">
        {/* Desktop KPI – now with 4 real columns */}
        <div className="hidden lg:grid grid-cols-4 gap-4 rounded-2xl border border-white/10 bg-[#0D0D0D] p-8 h-[130px]">
          {[
            { icon: BarChart3, title: "Total Predictions", value: overview.totalPredictions },
            { icon: TrendingUp, title: "Win Rate", value: `${overview.winRate}%` },
            { icon: Activity, title: "Pending", value: overview.pending },
            { icon: TrendingUp, title: "Avg Confidence", value: `${overview.avgConfidence}%` },
          ].map((item) => (
            <div key={item.title} className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-gold-400/20 flex items-center justify-center">
                <item.icon className="h-6 w-6 text-gold-400" />
              </div>
              <div>
                <p className="text-xs text-gray-400">{item.title}</p>
                <p className="text-xl font-bold">{item.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Mobile KPI – static 2‑column grid */}
        <div className="lg:hidden grid grid-cols-2 gap-4">
          {[
            { icon: BarChart3, title: "Total Predictions", value: overview.totalPredictions },
            { icon: TrendingUp, title: "Win Rate", value: `${overview.winRate}%` },
            { icon: Activity, title: "Pending", value: overview.pending },
            { icon: TrendingUp, title: "Avg Confidence", value: `${overview.avgConfidence}%` },
          ].map((item, idx) => (
            <div key={idx} className="rounded-2xl border border-white/5 bg-[#0D0D0D] p-5 flex flex-col items-start">
              <div className="h-10 w-10 rounded-full bg-gold-400/20 flex items-center justify-center mb-3">
                <item.icon className="h-5 w-5 text-gold-400" />
              </div>
              <p className="text-xs text-gray-400">{item.title}</p>
              <p className="text-2xl font-bold mt-1">{item.value}</p>
            </div>
          ))}
        </div>
        {/* Mobile ad (below VIP) */}
<div className="lg:hidden mx-auto max-w-[1280px] px-6 mb-8">
  <div className="w-full h-14 bg-[#0D0D0D] border border-white/5 rounded-xl flex items-center justify-center text-gray-500 text-xs tracking-wider">
    ADVERTISEMENT
  </div>
</div>
      </section>

      {/* ===== TODAY'S TOP PICKS ===== */}
      <section className="mx-auto max-w-[1280px] px-6 lg:px-8 mb-12 lg:mb-24">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl lg:text-3xl font-bold">TODAY'S TOP PICKS</h2>
          <Link href="/predictions">
            <Button variant="ghost" className="text-gold-400 hover:bg-white/5 group">
              View All Predictions <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>

        {topPicks.length === 0 ? (
          <div className="text-center text-gray-500 py-10">No predictions yet.</div>
        ) : (
          <>
            {/* Desktop grid */}
            <div className="hidden lg:grid grid-cols-3 gap-6">
              {topPicks.map((match, idx) => (
                <motion.div key={idx} whileHover={{ y: -4 }}
                  className="rounded-2xl bg-[#0D0D0D] border border-white/5 p-5 h-[330px] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-gray-400 uppercase mb-4">
                      <Activity className="h-3 w-3 text-gold-400" />
                      {match.league}
                    </div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-center flex-1">
                        {match.crest_a ? (
                          <img src={match.crest_a} alt={match.home} className="h-12 w-12 object-contain mx-auto mb-2" />
                        ) : (
                          <div className="h-12 w-12 rounded-full bg-gray-800 mx-auto mb-2" />
                        )}
                        <p className="text-sm font-medium">{match.home}</p>
                      </div>
                      <div className="text-center px-2">
                        <p className="text-xs font-bold text-gray-500">{match.time}</p>
                        <p className="text-xs text-gray-600">VS</p>
                      </div>
                      <div className="text-center flex-1">
                        {match.crest_b ? (
                          <img src={match.crest_b} alt={match.away} className="h-12 w-12 object-contain mx-auto mb-2" />
                        ) : (
                          <div className="h-12 w-12 rounded-full bg-gray-800 mx-auto mb-2" />
                        )}
                        <p className="text-sm font-medium">{match.away}</p>
                      </div>
                    </div>
                    <p className="text-sm font-semibold">{match.prediction}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-1.5 flex-1 rounded-full bg-gray-800">
                        <div className="h-full rounded-full bg-green-500" style={{ width: `${match.confidence}%` }} />
                      </div>
                      <span className="text-xs font-bold text-green-500">{match.confidence}%</span>
                    </div>
                    {match.analysis && (
  <>
    {/* Expected score display */}
    {match.expectedScore && (
      <p className="mt-3 text-xs text-gold-400 font-semibold">
        Predicted Score: {match.expectedScore}
      </p>
    )}

    {/* Picks grid */}
    <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
      <div>
        <span className="text-gray-500">Main:</span>{" "}
        <span className="text-white font-medium">{match.mainPick}</span>
      </div>
      <div>
        <span className="text-gray-500">Safe:</span>{" "}
        <span className="text-white font-medium">{match.safePick}</span>
      </div>
      <div>
        <span className="text-gray-500">Goals:</span>{" "}
        <span className="text-white font-medium">{match.goalsPick}</span>
      </div>
      <div>
        <span className="text-gray-500">BTTS:</span>{" "}
        <span className="text-white font-medium">{match.bttsPick}</span>
      </div>
    </div>

    {/* Risk & Stake */}
    <div className="mt-2 flex items-center gap-2 text-xs">
      <span className="text-gray-500">
        Risk: {match.riskLevel} | Stake: {match.stake}
      </span>
    </div>

    <button
      onClick={() => handleOpenAnalysis(match)}
      className="text-xs text-gold-400 hover:underline mt-1"
    >
      View Full Analysis
    </button>
  </>
)}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Mobile cards */}
            <div className="lg:hidden space-y-4">
              {topPicks.map((match, idx) => (
                <motion.div key={idx} whileTap={{ scale: 0.98 }}
                  className="rounded-2xl bg-[#0D0D0D] border border-white/5 p-4 flex">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2 text-xs text-gray-400 uppercase">
                      <Activity className="h-3 w-3 text-gold-400" />
                      {match.league}
                    </div>
                    <div className="flex items-center gap-2">
                      {match.crest_a ? (
                        <img src={match.crest_a} alt={match.home} className="h-8 w-8 object-contain" />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-gray-800" />
                      )}
                      <p className="text-xs font-medium">{match.home}</p>
                    </div>
                    <p className="text-xs text-gray-500">{match.time}</p>
                    <div className="flex items-center gap-2">
                     
                      {match.crest_b ? (
                        <img src={match.crest_b} alt={match.away} className="h-8 w-8 object-contain" />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-gray-800" />
                      )}
                      <p className="text-xs font-medium">{match.away}</p>
                    </div>
                  </div>
                  <div className="flex-1 flex flex-col justify-between items-end">
                    <div>
                      <p className="text-sm font-semibold text-right">{match.prediction}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="h-1.5 w-20 rounded-full bg-gray-800">
                          <div className="h-full rounded-full bg-green-500" style={{ width: `${match.confidence}%` }} />
                        </div>
                        <span className="text-xs font-bold text-green-500">{match.confidence}%</span>
                      </div>
                     {match.expectedScore && (
  <p className="mt-1 text-xs text-gold-400 font-semibold">
    Score: {match.expectedScore}
  </p>
)}
<div className="grid grid-cols-2 gap-x-2 gap-y-0.5 mt-1 text-[10px]">
  <div><span className="text-gray-500">Main:</span> <span className="text-white">{match.mainPick}</span></div>
  <div><span className="text-gray-500">Safe:</span> <span className="text-white">{match.safePick}</span></div>
  <div><span className="text-gray-500">Goals:</span> <span className="text-white">{match.goalsPick}</span></div>
  <div><span className="text-gray-500">BTTS:</span> <span className="text-white">{match.bttsPick}</span></div>
</div>
<div className="text-[10px] text-gray-500 mt-1">
  Risk: {match.riskLevel} | Stake: {match.stake}
</div>
{match.analysis && (
  <button onClick={() => handleOpenAnalysis(match)} className="text-xs text-gold-400 hover:underline mt-1">
    Full Analysis
  </button>
)}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </section>

      {/* Ad below Top Picks (both screens) */}
<div className="mx-auto max-w-[1280px] px-6 mb-12">
  <div className="w-full h-16 bg-[#0D0D0D] border border-white/5 rounded-xl flex items-center justify-center text-gray-500 text-xs tracking-wider">
    ADVERTISEMENT
  </div>
</div>

      {/* ===== MOBILE VIP CARD ===== */}
      <section className="lg:hidden mx-auto max-w-[1280px] px-6 mb-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-gold-400/30 bg-gradient-to-br from-gold-400/5 to-transparent p-5 flex flex-col items-center text-center">
          <div className="mb-3 flex items-center justify-center">
            <img src="/winora-logo.png" alt="Winora VIP" className="h-8 w-auto" />
            <span className="ml-2 text-base font-bold tracking-widest text-gold-400">VIP</span>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Unlock Premium Access</h2>
          <p className="text-xs text-gray-300 max-w-xs mb-5">
            Get daily premium predictions, expert analysis, and exclusive tools.
          </p>
         <Button className="h-[60px] w-[250px] rounded-xl bg-gold-400 text-base font-semibold text-black hover:bg-gold-500 gap-2">
  <Crown className="h-5 w-5" /> Get Early Access <ArrowRight className="h-4 w-4" />
</Button>
        </motion.div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="border-t border-white/5 bg-[#050505] py-12">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="text-sm font-semibold text-gray-400 mb-4">Products</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><Link href="/predictions" className="hover:text-white transition-colors">Predictions</Link></li>
                <li><Link href="/results" className="hover:text-white transition-colors">Results</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-400 mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><Link href="/#about" className="hover:text-white transition-colors">About</Link></li>
                <li><Link href="/#contact" className="hover:text-white transition-colors">Contact</Link></li>
                <li><Link href="/blog" className="hover:text-white transition-colors">Blog</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-400 mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><Link href="/terms" className="hover:text-white transition-colors">Terms</Link></li>
                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-400 mb-4">Follow Us</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><a href="#" className="hover:text-white transition-colors">Telegram</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Instagram</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Twitter</a></li>
                <li><a href="#" className="hover:text-white transition-colors">YouTube</a></li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-center justify-between border-t border-white/5 pt-8">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <img src="/winora-logo.png" alt="Winora" className="h-8 w-auto" />
              <span className="text-sm text-gray-500">Smarter predictions. Better results.</span>
            </div>
            <p className="text-xs text-gray-600">
              &copy; {new Date().getFullYear()} Winora Sports Intelligence. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      <MobileBottomNav />

      {/* Analysis Modal */}
      <AnalysisModal
        isOpen={analysisModalOpen}
        onClose={handleCloseAnalysis}
        match={selectedAnalysis}
      />
    </div>
  );
}