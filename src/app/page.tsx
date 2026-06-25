"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Crown, ArrowRight, BarChart3, TrendingUp, Activity, ShieldCheck } from "lucide-react";
import PublicHeader from "@/components/PublicHeader";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import { AnalysisModal } from "@/components/AnalysisModal";
import AdBanner from "@/components/AdBanner";
import AffiliateCta from "@/components/AffiliateCta";
import ComboPicks from "@/components/ComboPicks";

export default function Home() {
const [overview, setOverview] = useState({
  totalPredictions: 0,
  winRate: "0",
  wins: 0,
  losses: 0,
  draws: 0,
  streak: 0,
  pending: 0,
  avgConfidence: "0",
});
  const [analysisModalOpen, setAnalysisModalOpen] = useState(false);
  const [selectedAnalysis, setSelectedAnalysis] = useState<any>(null);
  const [livePredictions, setLivePredictions] = useState<any[]>([]);

  // Fetch KPIs
  useEffect(() => {
fetch("/api/kpi-overview")
  .then((r) => r.json())
  .then((d) => {
    setOverview({
      totalPredictions: d.total || 0,
      winRate: d.winRate || "0",
      wins: d.wins || 0,
      losses: d.losses || 0,
      draws: d.draws || 0,
      streak: d.streak || 0,
      pending: d.pending || 0,
      avgConfidence: d.avgConf || "0",
    });
  })
      .catch((err) => console.error("KPI fetch failed", err));
  }, []);

  // Fetch live predictions (non-finished)
  useEffect(() => {
    fetch("/api/get-predictions")
      .then((r) => r.json())
      .then((data) => setLivePredictions(data.predictions || []))
      .catch(() => {});
  }, []);

  const topPicks = useMemo(() => {
    return livePredictions
      .filter((p: any) => p.prediction && p.prediction !== "No recommendation")
      .slice(0, 3)
      .map((p: any) => ({
        id: p.id,
        league: p.sport,
        home: p.team_a,
        away: p.team_b,
        time: p.time,
        prediction: p.prediction,
        confidence: p.confidence,
        analysis: p.analysis,
        crest_a: p.crest_a,
        crest_b: p.crest_b,
        expectedScore: p.expected_score,
        mainPick: p.main_pick,
        safePick: p.safe_pick,
        goalsPick: p.goals_pick,
        bttsPick: p.btts_pick,
        riskLevel: p.risk_level,
        stake: p.recommended_stake,
        match_status: p.match_status,
        actual_home_score: p.actual_home_score,
        actual_away_score: p.actual_away_score,
        matches_used_a: p.matches_used_a,
        matches_used_b: p.matches_used_b,
        form_points_a: p.form_points_a,
        form_points_b: p.form_points_b,
      }));
  }, [livePredictions]);

  const handleOpenAnalysis = (match: any) => {
    setSelectedAnalysis({
      home: match.home || match.team_a || match.match?.split(" vs ")[0],
      away: match.away || match.team_b || match.match?.split(" vs ")[1],
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
              <Link href="/vip">
                <Button className="h-[60px] w-[250px] rounded-xl bg-gold-400 text-base font-semibold text-black hover:bg-gold-500 gap-2">
                  <Crown className="h-5 w-5" /> Get Early Access <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/predictions">
                <Button variant="outline" className="h-[60px] w-[250px] rounded-xl border-white/20 text-base font-semibold text-white hover:bg-white/5">
                  View Today's Picks
                </Button>
              </Link>
            </div>
          </div>

          {/* Desktop floating card: Today's Overview */}
          <div className="hidden lg:block absolute top-1/2 -translate-y-1/2 right-8 xl:right-16">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="w-[290px] rounded-2xl border border-gold-400/20 bg-gradient-to-br from-white/[0.03] to-white/[0.01] backdrop-blur-xl p-5 flex flex-col justify-between shadow-[0_0_30px_rgba(212,175,55,0.08)]"
            >
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

              <div className="space-y-3">
                <div className="rounded-xl bg-white/[0.03] px-4 py-3 flex items-center justify-between">
                  <span className="text-xs text-gray-400">Predictions Made</span>
                  <span className="text-lg font-bold text-white tabular-nums">{overview.totalPredictions}</span>
                </div>
<div className="rounded-xl bg-white/[0.03] px-4 py-3 flex items-center justify-between">
  <span className="text-xs text-gray-400">Verified Record</span>
  <div className="text-right">
    <span className="text-lg font-bold text-green-400 tabular-nums">{overview.winRate}%</span>
    <div className="text-[10px] text-gray-500 mt-0.5">
      W: {overview.wins} · L: {overview.losses}{overview.draws > 0 ? ` · D: ${overview.draws}` : ""}
    </div>
  </div>
</div>
<Link href="/results" className="text-[10px] text-gold-400 hover:underline mt-2 inline-block">
  See all verified picks →
</Link>
                <div className="rounded-xl bg-white/[0.03] px-4 py-3 flex items-center justify-between">
                  <span className="text-xs text-gray-400">Current Streak</span>
                  <div className="flex items-center gap-1">
                    <span className="text-lg font-bold text-green-400 tabular-nums">{overview.streak}</span>
                    <span className="text-xs text-green-400/70">W</span>
                  </div>
                </div>
              </div>

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
        <AdBanner variant="banner" />
      </div>

      {/* ===== KPI BAR ===== */}
      <section className="mx-auto max-w-[1280px] px-6 lg:px-8 mt-16 mb-16 lg:mb-24">
        <div className="hidden lg:grid grid-cols-4 gap-4 rounded-2xl border border-white/10 bg-[#0D0D0D] p-8 h-[130px]">
          {[
 { icon: BarChart3, title: "Total Predictions", value: overview.totalPredictions },
  { icon: ShieldCheck, title: "Verified Accuracy", value: `${overview.winRate}%`, subtitle: `W:${overview.wins} L:${overview.losses}${overview.draws > 0 ? ` D:${overview.draws}` : ""}` },
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
    {item.subtitle && <p className="text-[10px] text-gray-500">{item.subtitle}</p>}
  </div>
</div>
          ))}
        </div>

<div className="lg:hidden grid grid-cols-2 gap-4">
  {[
    { icon: BarChart3, title: "Total Predictions", value: overview.totalPredictions },
    { icon: ShieldCheck, title: "Verified Accuracy", value: `${overview.winRate}%`, subtitle: `W:${overview.wins} L:${overview.losses}${overview.draws > 0 ? ` D:${overview.draws}` : ""}` },
    { icon: Activity, title: "Pending", value: overview.pending },
    { icon: TrendingUp, title: "Avg Confidence", value: `${overview.avgConfidence}%` },
  ].map((item, idx) => (
    <div key={idx} className="rounded-2xl border border-white/5 bg-[#0D0D0D] p-5 flex flex-col items-start">
      <div className="h-10 w-10 rounded-full bg-gold-400/20 flex items-center justify-center mb-3">
        <item.icon className="h-5 w-5 text-gold-400" />
      </div>
      <p className="text-xs text-gray-400">{item.title}</p>
      <p className="text-2xl font-bold mt-1">{item.value}</p>
      {item.subtitle && <p className="text-[10px] text-gray-500 mt-0.5">{item.subtitle}</p>}
    </div>
  ))}
</div>
        <div className="lg:hidden mx-auto max-w-[1280px] px-6 mb-8">
          <AdBanner variant="banner" />
        </div>
      </section>

      {/* ===== DAILY COMBO ===== */}
      <ComboPicks predictions={livePredictions} />

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
                  className="rounded-2xl bg-[#0D0D0D] border border-white/5 p-5 min-h-[330px] flex flex-col justify-between">
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
                        {match.match_status === "LIVE" ? (
                          <div className="flex flex-col items-center gap-1">
                            <span className="relative flex items-center gap-1.5">
                              <span className="relative flex h-2 w-2">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75"></span>
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500"></span>
                              </span>
                              <span className="text-xs font-bold text-red-400">LIVE</span>
                            </span>
                            {match.actual_home_score != null && match.actual_away_score != null && (
                              <span className="text-sm font-bold text-white tabular-nums">
                                {match.actual_home_score} - {match.actual_away_score}
                              </span>
                            )}
                          </div>
                        ) : match.match_status === "FINISHED" ? (
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-xs font-bold text-gray-400">FT</span>
                            {match.actual_home_score != null && match.actual_away_score != null && (
                              <span className="text-sm font-bold text-white tabular-nums">
                                {match.actual_home_score} - {match.actual_away_score}
                              </span>
                            )}
                          </div>
                        ) : (
                          <>
                            <p className="text-xs font-bold text-gray-500">{match.time}</p>
                            <p className="text-xs text-gray-600">VS</p>
                          </>
                        )}
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
                        {match.expectedScore && (
                          <p className="mt-3 text-xs text-gold-400 font-semibold">
                            Predicted Score: {match.expectedScore}
                          </p>
                        )}
                        <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
                          <div><span className="text-gray-500">Main:</span> <span className="text-white font-medium">{match.mainPick}</span></div>
                          <div><span className="text-gray-500">Safe:</span> <span className="text-white font-medium">{match.safePick}</span></div>
                          <div><span className="text-gray-500">Goals:</span> <span className="text-white font-medium">{match.goalsPick}</span></div>
                          <div><span className="text-gray-500">BTTS:</span> <span className="text-white font-medium">{match.bttsPick}</span></div>
                        </div>
                        <div className="mt-2 flex items-center gap-2 text-xs">
                          <span className="text-gray-500">Risk: {match.riskLevel} | Stake: {match.stake}</span>
                        </div>
                        <AffiliateCta matchId={match.id} />
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
                <motion.div
                  key={idx}
                  whileTap={{ scale: 0.98 }}
                  className="rounded-[18px] bg-[#0D0D0D] border border-white/5 p-4"
                >
                  <div className="flex items-center gap-2 text-xs text-gray-400 uppercase mb-3">
                    <Activity className="h-3 w-3 text-gold-400" />
                    {match.league}
                  </div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-center flex-1">
                      {match.crest_a ? (
                        <img src={match.crest_a} alt={match.home} className="h-10 w-10 object-contain mx-auto mb-1" />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-gray-800 mx-auto mb-1" />
                      )}
                      <p className="text-xs font-medium">{match.home}</p>
                    </div>
                    <div className="text-center px-2">
                      {match.match_status === "LIVE" ? (
                        <div className="flex flex-col items-center gap-1">
                          <span className="relative flex items-center gap-1.5">
                            <span className="relative flex h-2 w-2">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75"></span>
                              <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500"></span>
                            </span>
                            <span className="text-xs font-bold text-red-400">LIVE</span>
                          </span>
                          {match.actual_home_score != null && match.actual_away_score != null && (
                            <span className="text-sm font-bold text-white tabular-nums">
                              {match.actual_home_score} - {match.actual_away_score}
                            </span>
                          )}
                        </div>
                      ) : match.match_status === "FINISHED" ? (
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-xs font-bold text-gray-400">FT</span>
                          {match.actual_home_score != null && match.actual_away_score != null && (
                            <span className="text-sm font-bold text-white tabular-nums">
                              {match.actual_home_score} - {match.actual_away_score}
                            </span>
                          )}
                        </div>
                      ) : (
                        <>
                          <p className="text-xs font-bold text-gray-500">{match.time}</p>
                          <p className="text-xs text-gray-600">VS</p>
                        </>
                      )}
                    </div>
                    <div className="text-center flex-1">
                      {match.crest_b ? (
                        <img src={match.crest_b} alt={match.away} className="h-10 w-10 object-contain mx-auto mb-1" />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-gray-800 mx-auto mb-1" />
                      )}
                      <p className="text-xs font-medium">{match.away}</p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold">{match.prediction}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-1.5 flex-1 rounded-full bg-gray-800">
                      <div className="h-full rounded-full bg-green-500" style={{ width: `${match.confidence}%` }} />
                    </div>
                    <span className="text-xs font-bold text-green-500">{match.confidence}%</span>
                  </div>
                  {match.expectedScore && (
                    <p className="mt-2 text-xs text-gold-400 font-semibold">Predicted Score: {match.expectedScore}</p>
                  )}
                  <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                    <div><span className="text-gray-500">Main:</span> <span className="text-white font-medium">{match.mainPick}</span></div>
                    <div><span className="text-gray-500">Safe:</span> <span className="text-white font-medium">{match.safePick}</span></div>
                    <div><span className="text-gray-500">Goals:</span> <span className="text-white font-medium">{match.goalsPick}</span></div>
                    <div><span className="text-gray-500">BTTS:</span> <span className="text-white font-medium">{match.bttsPick}</span></div>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">Risk: {match.riskLevel} | Stake: {match.stake}</div>
                  <AffiliateCta matchId={match.id} />
                  {match.analysis && (
                    <button
                      onClick={() => handleOpenAnalysis(match)}
                      className="text-xs text-gold-400 hover:underline mt-2"
                    >
                      View Full Analysis
                    </button>
                  )}
                </motion.div>
              ))}
            </div>
          </>
        )}
      </section>

      <div className="mx-auto max-w-[1280px] px-6 mb-12">
        <AdBanner variant="banner" />
      </div>

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
          <Link href="/vip">
            <Button className="h-[60px] w-[250px] rounded-xl bg-gold-400 text-base font-semibold text-black hover:bg-gold-500 gap-2">
              <Crown className="h-5 w-5" /> Get Early Access <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </motion.div>
      </section>

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
                <li><Link href="/about" className="hover:text-white transition-colors">About</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
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
                <li><a href="/Telegram" className="hover:text-white transition-colors">Telegram</a></li>
                <li><a href="/Instagram" className="hover:text-white transition-colors">Instagram</a></li>
                <li><a href="/Twitter" className="hover:text-white transition-colors">Twitter</a></li>
                <li><a href="/YouTube" className="hover:text-white transition-colors">YouTube</a></li>
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
      <AnalysisModal
        isOpen={analysisModalOpen}
        onClose={handleCloseAnalysis}
        match={selectedAnalysis}
      />
    </div>
  );
}