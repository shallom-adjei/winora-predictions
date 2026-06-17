"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  BarChart3,
  TrendingUp,
  Users,
  DollarSign,
  Eye,
  Bell,
  ArrowUpRight,
  ChevronDown,
  Activity,
  CreditCard,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";

// ---------- MOCK DATA (fallback) ----------
const quickStatsFallback = [
  { label: "Today's Predictions", value: "0", change: "", icon: BarChart3 },
  { label: "Win Rate", value: "0%", change: "", icon: TrendingUp },
  { label: "Pending", value: "0", change: "", icon: Eye },
  { label: "Avg Confidence", value: "0%", change: "", icon: DollarSign },
];

const pieDataFallback = [
  { name: "Football", value: 1, color: "#D4AF37" },
];

const performanceDataFallback = [
  { date: "No data", winRate: 0, roi: 0 },
];

const activityFeedFallback = [
  { icon: TrendingUp, title: "No activity yet", desc: "Add your first prediction to get started.", time: "" },
];

const revenueData = [
  { date: "May 17", revenue: 1800, profit: 200 },
  { date: "May 18", revenue: 2200, profit: 400 },
  { date: "May 19", revenue: 2600, profit: 600 },
  { date: "May 20", revenue: 2400, profit: 500 },
  { date: "May 21", revenue: 2800, profit: 700 },
  { date: "May 22", revenue: 3200, profit: 900 },
  { date: "May 23", revenue: 3000, profit: 800 },
  { date: "May 24", revenue: 3500, profit: 1000 },
];

// ---------- SIDEBAR ----------
function Sidebar({
  profileOpen,
  setProfileOpen,
  handleLogout,
  setChangePasswordOpen,
}: {
  profileOpen: boolean;
  setProfileOpen: (v: boolean) => void;
  handleLogout: () => void;
  setChangePasswordOpen: (v: boolean) => void;
}) {
  const [active, setActive] = useState("dashboard");

  const menuItems = [
    { title: "Dashboard", icon: BarChart3, href: "/portalsydr" },
    { title: "Predictions", icon: TrendingUp, href: "/portalsydr/predictions" },
    { title: "Upcoming Matches", icon: Activity, href: "/portalsydr/matches" },
    { title: "Results", icon: TrendingUp, href: "/portalsydr/results" },
    { title: "Blog", icon: BarChart3, href: "/portalsydr/blog" },
    { title: "Settings", icon: Settings, href: "/portalsydr/settings" },
    { title: "Profile", icon: Users, href: "/portalsydr/profile" },
  ];

  return (
    <aside className="fixed left-0 top-0 h-screen w-[240px] bg-[#080808] border-r border-white/5 flex flex-col z-50">
      <div className="h-[140px] flex flex-col items-center justify-center border-b border-white/5">
        <div className="h-[70px] w-[70px] rounded-2xl bg-gold-400 flex items-center justify-center mb-2">
          <span className="text-3xl font-bold text-black">W</span>
        </div>
        <div className="text-center">
          <span className="text-lg font-bold text-white">WINORA</span>
          <span className="text-xs text-gold-400 ml-1">ADMIN</span>
        </div>
      </div>

      <nav className="flex-1 py-6 space-y-1">
        {menuItems.map((item) => {
          const isActive = active === item.title.toLowerCase();
          return (
            <Link
              key={item.title}
              href={item.href}
              onClick={() => setActive(item.title.toLowerCase())}
              className={`flex items-center gap-3 px-6 py-2.5 text-sm font-medium transition-all ${
                isActive
                  ? "bg-gold-400/10 border-l-4 border-gold-400 text-gold-400"
                  : "text-gray-400 hover:bg-white/5 hover:text-white border-l-4 border-transparent"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.title}
            </Link>
          );
        })}
      </nav>

      {/* Profile card with dropdown */}
      <div className="p-4 border-t border-white/5 relative">
        <button
          onClick={() => setProfileOpen(!profileOpen)}
          className="flex items-center gap-3 w-full"
        >
          <div className="h-10 w-10 rounded-full bg-gray-700 flex items-center justify-center text-sm font-bold">A</div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-medium text-white truncate">Admin Shallom</p>
            <p className="text-xs text-gray-500 truncate">admin@winora.com</p>
          </div>
          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${profileOpen ? "rotate-180" : ""}`} />
        </button>

        {profileOpen && (
          <div className="absolute bottom-full left-0 right-0 mb-2 bg-[#0D0D0D] border border-white/10 rounded-xl shadow-lg z-50">
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-t-xl"
            >
              Logout
            </button>
            <button
              onClick={() => setChangePasswordOpen(true)}
              className="w-full text-left px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-b-xl"
            >
              Change Password
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

// ---------- MAIN DASHBOARD ----------
export default function AdminDashboard() {
  const [greeting, setGreeting] = useState("");
  const [upcomingMatches, setUpcomingMatches] = useState<any[]>([]);
  const [recentPredictions, setRecentPredictions] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newPick, setNewPick] = useState({
    sport: "Football",
    match_name: "",
    team_a: "",
    team_b: "",
    time: "",
    prediction: "",
    confidence: 70,
    is_premium: false,
  });
  const [editingPrediction, setEditingPrediction] = useState<any>(null);
  const [editValues, setEditValues] = useState<any>({ match_name: "", prediction: "", confidence: "" });
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [enriching, setEnriching] = useState(false);

  // ---- REAL ANALYTICS STATE ----
  const [realPieData, setRealPieData] = useState(pieDataFallback);
  const [realPerformanceData, setRealPerformanceData] = useState(performanceDataFallback);
  const [realActivityFeed, setRealActivityFeed] = useState(activityFeedFallback);
  const [realQuickStats, setRealQuickStats] = useState(quickStatsFallback);

  // ---- OVERVIEW STATE ----
  const [overviewData, setOverviewData] = useState({ winRate: "0" });

  const [updating, setUpdating] = useState(false);
  const [waitlistEntries, setWaitlistEntries] = useState<any[]>([]);

  // ---- PROFILE & PASSWORD STATES ----
  const [profileOpen, setProfileOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: "", new: "" });
  const [passwordError, setPasswordError] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // ---- HANDLERS ----
  const handleLogout = () => {
    document.cookie = "admin_token=; path=/; max-age=0";
    window.location.href = "/portalsydr/login";
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setChangingPassword(true);
    try {
      const res = await fetch("/api/admin-change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordForm.current,
          newPassword: passwordForm.new,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setPasswordError(data.error || "Failed to change password");
        return;
      }
      toast.success("Password changed successfully");
      setChangePasswordOpen(false);
      setPasswordForm({ current: "", new: "" });
    } catch {
      setPasswordError("Network error");
    } finally {
      setChangingPassword(false);
    }
  };

  // ---------- DATA FETCHING ----------
  const fetchDashboardData = async () => {
    setLoading(true);
    const { data: upcoming } = await supabase
      .from("predictions")
      .select("*")
      .or("result.eq.pending,result.is.null")
      .order("created_at", { ascending: false })
      .limit(5);
    if (upcoming) {
      setUpcomingMatches(
        upcoming.map((p) => ({
          id: p.id,
          match: p.match_name,
          league: p.sport,
          time: p.time,
          prediction: p.prediction,
          confidence: p.confidence,
          status: p.result || "Pending",
          team_a: p.team_a,
          team_b: p.team_b,
          form_points_a: p.form_points_a,
          form_points_b: p.form_points_b,
          home_goals_scored: p.home_goals_scored,
          home_goals_conceded: p.home_goals_conceded,
          away_goals_scored: p.away_goals_scored,
          away_goals_conceded: p.away_goals_conceded,
          league_position_a: p.league_position_a,
          league_position_b: p.league_position_b,
          h2h_last5: p.h2h_last5,
          h2h_over25_pct: p.h2h_over25_pct,
          h2h_btts_pct: p.h2h_btts_pct,
          clean_sheets_last5_a: p.clean_sheets_last5_a,
          clean_sheets_last5_b: p.clean_sheets_last5_b,
          failed_to_score_last5_a: p.failed_to_score_last5_a,
          failed_to_score_last5_b: p.failed_to_score_last5_b,
          over25_last5_pct_a: p.over25_last5_pct_a,
          over25_last5_pct_b: p.over25_last5_pct_b,
          btts_last5_pct_a: p.btts_last5_pct_a,
          btts_last5_pct_b: p.btts_last5_pct_b,
          home_team: p.team_a,
          injuries: null,
          odds_home: p.home_odds,
          odds_draw: p.draw_odds,
          odds_away: p.away_odds,
        }))
      );
    }

    const { data: recent } = await supabase
      .from("predictions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);
    if (recent) {
      setRecentPredictions(
        recent.map((p) => ({
          id: p.id,
          date: new Date(p.created_at).toLocaleDateString(),
          match: p.match_name,
          prediction: p.prediction,
          odd: "—",
          stake: "—",
          result: p.result || "Pending",
          profit: "—",
        }))
      );
    }
    setLoading(false);
  };

  const fetchAnalytics = async () => {
    try {
      // ----- Win rate -----
      const { data: results } = await supabase
        .from("predictions")
        .select("result")
        .not("result", "is", null)
        .neq("result", "Pending");
      const wins = results?.filter((r) => r.result === "Win").length || 0;
      const total = results?.length || 1;
      const winRate = ((wins / total) * 100).toFixed(1);

      // ----- Pending -----
      const { count: pending } = await supabase
        .from("predictions")
        .select("*", { count: "exact", head: true })
        .or("result.is.null,result.eq.Pending");

      // ----- Average confidence -----
      const { data: confidenceData } = await supabase
        .from("predictions")
        .select("confidence")
        .not("confidence", "is", null);
      const avgConf = confidenceData?.length
        ? (confidenceData.reduce((sum, r) => sum + (r.confidence || 0), 0) / confidenceData.length).toFixed(1)
        : "0";

      // ----- Today's predictions count -----
      const todayStart = new Date().toISOString().split("T")[0] + "T00:00:00";
      const todayEnd = new Date().toISOString().split("T")[0] + "T23:59:59";
      const { count: todayPreds } = await supabase
        .from("predictions")
        .select("*", { count: "exact", head: true })
        .gte("created_at", todayStart)
        .lte("created_at", todayEnd);

      // ----- Quick stats -----
      setRealQuickStats([
        { label: "Today's Predictions", value: String(todayPreds), change: "", icon: BarChart3 },
        { label: "Win Rate", value: `${winRate}%`, change: "", icon: TrendingUp },
        { label: "Pending", value: String(pending), change: "", icon: Eye },
        { label: "Avg Confidence", value: `${avgConf}%`, change: "", icon: DollarSign },
      ]);

      // ----- Pie chart (predictions by sport) -----
      const { data: sportData } = await supabase.from("predictions").select("sport");
      const sportCounts: Record<string, number> = {};
      sportData?.forEach((p) => {
        const s = p.sport || "Other";
        sportCounts[s] = (sportCounts[s] || 0) + 1;
      });
      const colors = ["#D4AF37", "#22C55E", "#3B82F6", "#EF4444", "#8B5CF6", "#6B7280"];
      const pie = Object.entries(sportCounts).map(([name, value], idx) => ({
        name,
        value,
        color: colors[idx % colors.length],
      }));
      setRealPieData(pie.length > 0 ? pie : pieDataFallback);

      // ----- Performance trend (last 7 days) -----
      const last7Days = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        last7Days.push(d.toISOString().split("T")[0]);
      }
      const perf = [];
      for (const date of last7Days) {
        const start = `${date}T00:00:00`;
        const end = `${date}T23:59:59`;
        const { data: dayResults } = await supabase
          .from("predictions")
          .select("result")
          .gte("created_at", start)
          .lte("created_at", end)
          .not("result", "is", null)
          .neq("result", "Pending");
        const dayWins = dayResults?.filter((r) => r.result === "Win").length || 0;
        const dayTotal = dayResults?.length || 1;
        const dayWinRate = Math.round((dayWins / dayTotal) * 100);
        const roi = dayWinRate > 70 ? 20 : dayWinRate > 50 ? 10 : 0;
        perf.push({ date, winRate: dayWinRate, roi });
      }
      setRealPerformanceData(perf);

      // ----- Recent activity (latest predictions) -----
      const { data: recentPreds } = await supabase
        .from("predictions")
        .select("match_name, prediction, created_at")
        .order("created_at", { ascending: false })
        .limit(5);
      const activities = recentPreds?.map((p) => ({
        icon: TrendingUp,
        title: "New prediction added",
        desc: `${p.match_name} – ${p.prediction || "TBD"}`,
        time: new Date(p.created_at).toLocaleString(),
      })) || activityFeedFallback;
      setRealActivityFeed(activities);

      // ---- Quick Overview ----
      setOverviewData({ winRate: winRate });
    } catch (err) {
      console.error("Analytics fetch error:", err);
    }
    // Fetch waitlist sign‑ups
    const { data: waitlistData } = await supabase
      .from("waitlist")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);
    setWaitlistEntries(waitlistData || []);
  };

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");
    fetchDashboardData();
    fetchAnalytics();
  }, []);

  // ----- Action Handlers -----
  const handleAddPick = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("predictions").insert([newPick]);
    if (error) { toast.error("Failed to add prediction"); return; }
    toast.success("Prediction added");
    setNewPick({ sport: "Football", match_name: "", team_a: "", team_b: "", time: "", prediction: "", confidence: 70, is_premium: false });
    setShowForm(false);
    fetchDashboardData();
    fetchAnalytics();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this prediction?")) return;
    const { error } = await supabase.from("predictions").delete().eq("id", id);
    if (error) { toast.error("Delete failed"); return; }
    toast.success("Prediction deleted");
    fetchDashboardData();
    fetchAnalytics();
  };

  const handleUpdateResult = async (id: string, result: string) => {
    const { error } = await supabase.from("predictions").update({ result }).eq("id", id);
    if (error) { toast.error("Update failed"); return; }
    toast.success("Result updated");
    fetchDashboardData();
    fetchAnalytics();
  };

  const openEditModal = (prediction: any) => {
    setEditingPrediction(prediction);
    setEditValues({
      match_name: prediction.match,
      prediction: prediction.prediction,
      confidence: prediction.confidence,
    });
  };

  const handleEditSave = async () => {
    if (!editingPrediction) return;
    const { error } = await supabase
      .from("predictions")
      .update({
        match_name: editValues.match_name,
        prediction: editValues.prediction,
        confidence: Number(editValues.confidence),
      })
      .eq("id", editingPrediction.id);
    if (error) { toast.error("Edit failed"); return; }
    toast.success("Prediction updated");
    setEditingPrediction(null);
    fetchDashboardData();
    fetchAnalytics();
  };

const handleGenerateAI = async (match: any) => {
  setGeneratingId(match.id);
  try {
    const res = await fetch("/api/generate-prediction", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ match }),
    });
    const aiData = await res.json();
    if (!aiData.prediction) throw new Error("No prediction");

    await supabase
      .from("predictions")
      .update({
        prediction: aiData.prediction,
        confidence: aiData.confidence,
        analysis: aiData.analysis,
        // --- store the new enriched fields ---
        expected_score: aiData.expectedScore,
        main_pick: aiData.mainPick,
        safe_pick: aiData.safePick,
        goals_pick: aiData.goalsPick,
        btts_pick: aiData.bttsPick,
        risk_level: aiData.riskLevel,
        recommended_stake: aiData.stake,
      })
      .eq("id", match.id);

    toast.success("AI prediction generated!");
    fetchDashboardData();
    fetchAnalytics();
  } catch (err) {
    toast.error("AI generation failed");
  } finally {
    setGeneratingId(null);
  }
};

const handleGenerateAll = async () => {
  const { data: allMatches } = await supabase
    .from("predictions")
    .select("*")
    .or("result.is.null,result.eq.Pending");
  if (!allMatches?.length) { toast.success("No matches to predict."); return; }

  toast.loading(`Generating predictions for ${allMatches.length} matches...`);
  for (const match of allMatches) {
    setGeneratingId(match.id);
    try {
      const res = await fetch("/api/generate-prediction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ match }),
      });
      const aiData = await res.json();
      if (!aiData.prediction) throw new Error("No prediction");

      await supabase
        .from("predictions")
        .update({
          prediction: aiData.prediction,
          confidence: aiData.confidence,
          analysis: aiData.analysis,
          // --- the new enriched fields (same as handleGenerateAI) ---
          expected_score: aiData.expectedScore,
          main_pick: aiData.mainPick,
          safe_pick: aiData.safePick,
          goals_pick: aiData.goalsPick,
          btts_pick: aiData.bttsPick,
          risk_level: aiData.riskLevel,
          recommended_stake: aiData.stake,
        })
        .eq("id", match.id);
    } catch { console.error("Failed for", match.match_name); }
    finally { setGeneratingId(null); }
  }
  toast.success("All predictions generated!");
  fetchDashboardData();
  fetchAnalytics();
};

  const handleEnrich = async () => {
  setEnriching(true);
  try {
    const res = await fetch("/api/enrich-stats", { method: "POST" });
    const data = await res.json();

    if (data.success) {
      if (data.enriched !== undefined && data.failed !== undefined) {
        toast.success(`Enriched ${data.enriched} matches (${data.failed} failed)`);
      } else if (data.message) {
        toast.success(data.message);
      } else {
        toast.success("Enrichment complete");
      }
      fetchDashboardData();
      fetchAnalytics();
    } else {
      toast.error(data.error || "Enrichment failed");
    }
  } catch (err) {
    toast.error("Network error. Please try again.");
  } finally {
    setEnriching(false);
  }
};

  const handleUpdateMatches = async () => {
    setUpdating(true);
    try {
      const res = await fetch("/api/fetch-matches", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        toast.success(`Added ${data.inserted} matches, enriched ${data.enriched}`);
        fetchDashboardData();
        fetchAnalytics();
      } else { toast.error(data.error || "Update failed"); }
    } catch { toast.error("Network error"); }
    finally { setUpdating(false); }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-[#050505] text-white items-center justify-center">
        <div className="text-xl text-gold-400">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#050505] text-white">
      <Sidebar profileOpen={profileOpen} setProfileOpen={setProfileOpen} handleLogout={handleLogout} setChangePasswordOpen={setChangePasswordOpen} />

      <main className="flex-1 ml-[240px] p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between h-20">
          <div>
            <h1 className="text-4xl font-bold">Welcome back, Shallom 👋</h1>
            <p className="text-gray-400 mt-1">Here's what's happening with Winora today.</p>
          </div>
          <div />
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-2">
          <Button onClick={handleUpdateMatches} disabled={updating} variant="outline" className="text-sm">
            {updating ? "Updating..." : "Update Matches & Stats"}
          </Button>
          <Button onClick={handleEnrich} disabled={enriching} variant="outline" className="text-sm">
            {enriching ? "Enriching..." : "Enrich Stats"}
          </Button>
          <Button onClick={async () => {
  try {
    const res = await fetch("/api/update-crests", { method: "POST" });
    const data = await res.json();
    toast.success(data.message || "Crests updated");
  } catch { toast.error("Crest update failed"); }
}} variant="outline" className="text-sm">
  Update Crests
</Button>
          <Button onClick={handleGenerateAll} disabled={generatingId !== null} className="text-sm">
            {generatingId ? "Generating..." : "Generate All Predictions"}
          </Button>
          <Button onClick={() => setShowForm(!showForm)} className="bg-gold-400 text-black">
            {showForm ? "Cancel" : "Add New Prediction"}
          </Button>
        </div>

        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="rounded-[20px] bg-[#0D0D0D] border border-white/5 p-6 mb-6">
            <form onSubmit={handleAddPick} className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <input placeholder="Match Name" value={newPick.match_name} onChange={e => setNewPick({...newPick, match_name: e.target.value})} className="bg-white/5 border border-white/10 rounded-lg p-2 text-white" required />
              <input placeholder="Team A" value={newPick.team_a} onChange={e => setNewPick({...newPick, team_a: e.target.value})} className="bg-white/5 border border-white/10 rounded-lg p-2 text-white" required />
              <input placeholder="Team B" value={newPick.team_b} onChange={e => setNewPick({...newPick, team_b: e.target.value})} className="bg-white/5 border border-white/10 rounded-lg p-2 text-white" required />
              <input placeholder="Time (e.g. 17:30)" value={newPick.time} onChange={e => setNewPick({...newPick, time: e.target.value})} className="bg-white/5 border border-white/10 rounded-lg p-2 text-white" required />
              <input type="number" placeholder="Confidence %" value={newPick.confidence} onChange={e => setNewPick({...newPick, confidence: Number(e.target.value)})} className="bg-white/5 border border-white/10 rounded-lg p-2 text-white" required />
              <select value={newPick.sport} onChange={e => setNewPick({...newPick, sport: e.target.value})} className="bg-white/5 border border-white/10 rounded-lg p-2 text-white">
                <option>Football</option><option>Basketball</option><option>Tennis</option><option>Baseball</option>
              </select>
              <Button type="submit" className="bg-gold-400 text-black col-span-full">Save Prediction</Button>
            </form>
          </motion.div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-4">
          {realQuickStats.map((item, i) => (
            <motion.div key={item.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * i }} className="rounded-[20px] bg-[#0D0D0D] border border-white/5 p-5 hover:-translate-y-1 transition-all">
              <div className="flex items-center justify-between mb-3"><item.icon className="h-5 w-5 text-gold-400"/><span className="text-xs text-green-500">{item.change}</span></div>
              <p className="text-2xl font-bold">{item.value}</p><p className="text-xs text-gray-400 mt-1">{item.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Analytics row */}
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-7 rounded-[20px] bg-[#0D0D0D] border border-white/5 p-6 h-[320px]">
            <h3 className="text-lg font-semibold mb-4">Performance Overview</h3>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={realPerformanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill: "#9CA3AF", fontSize: 12 }} />
                <YAxis tick={{ fill: "#9CA3AF", fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: "#0D0D0D", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px" }} />
                <Line type="monotone" dataKey="winRate" stroke="#FFFFFF" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="roi" stroke="#D4AF37" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex gap-6 mt-3">
              <div className="flex items-center gap-2"><div className="h-3 w-3 rounded-full bg-white" /><span className="text-xs text-gray-400">Win Rate</span></div>
              <div className="flex items-center gap-2"><div className="h-3 w-3 rounded-full bg-gold-400" /><span className="text-xs text-gray-400">ROI</span></div>
            </div>
          </div>

          <div className="col-span-3 rounded-[20px] bg-[#0D0D0D] border border-white/5 p-6 h-[320px] flex flex-col">
            <h3 className="text-lg font-semibold mb-2">Predictions by Sport</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={realPieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                  {realPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "#0D0D0D", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px" }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="text-center mt-2">
              <span className="text-2xl font-bold">{realPieData.reduce((sum, entry) => sum + entry.value, 0)}</span>
              <p className="text-xs text-gray-400">Total</p>
            </div>
            <Button variant="ghost" className="text-gold-400 text-xs w-full mt-auto hover:bg-white/5">
              View Full Report <ArrowUpRight className="ml-1 h-3 w-3" />
            </Button>
          </div>

          <div className="col-span-2 rounded-[20px] bg-[#0D0D0D] border border-white/5 p-6 h-[320px] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Activity</h3>
            <div className="space-y-5">
              {realActivityFeed.map((item, i) => (
                <div key={i} className="flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                    <item.icon className="h-4 w-4 text-gold-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    <p className="text-xs text-gray-400 truncate">{item.desc}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{item.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tables + Quick Overview & Revenue */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
          <div className="space-y-6">
            {/* Upcoming Matches */}
            <div className="rounded-[20px] bg-[#0D0D0D] border border-white/5 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">Upcoming Matches</h3>
                <Link href="/portalsydr/matches">
                  <Button variant="ghost" className="text-gold-400 text-xs hover:bg-white/5">
                    View All Matches <ArrowUpRight className="ml-1 h-3 w-3" />
                  </Button>
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-xs text-gray-400 border-b border-white/5">
                      <th className="pb-3 font-medium">Match</th>
                      <th className="pb-3 font-medium">League</th>
                      <th className="pb-3 font-medium">Time</th>
                      <th className="pb-3 font-medium">Prediction</th>
                      <th className="pb-3 font-medium">Confidence</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {upcomingMatches.length > 0 ? (
                      upcomingMatches.map((match, i) => (
                        <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                          <td className="py-4 text-sm">{match.match}</td>
                          <td className="py-4 text-xs text-gray-400">{match.league}</td>
                          <td className="py-4 text-sm">{match.time}</td>
                          <td className="py-4 text-sm">{match.prediction}</td>
                          <td className="py-4 text-sm text-green-500">{match.confidence}%</td>
                          <td className="py-4">
                            <select value={match.status} onChange={(e) => handleUpdateResult(match.id, e.target.value)} className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-gray-300">
                              <option value="Pending">Pending</option>
                              <option value="Win">Win</option>
                              <option value="Loss">Loss</option>
                            </select>
                          </td>
                          <td className="py-4">
                            <div className="flex gap-2">
                              <button onClick={() => openEditModal(match)} className="text-xs text-gold-400 hover:underline">Edit</button>
                              <button onClick={() => handleDelete(match.id)} className="text-xs text-red-400 hover:underline">Delete</button>
                              <button onClick={() => handleGenerateAI(match)} disabled={generatingId === match.id} className="text-xs text-blue-400 hover:underline ml-1">
                                {generatingId === match.id ? "Generating..." : "AI Predict"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-4 text-center text-gray-500">No upcoming matches</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Predictions */}
            <div className="rounded-[20px] bg-[#0D0D0D] border border-white/5 p-6">
              <h3 className="text-lg font-semibold mb-6">Recent Predictions</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-xs text-gray-400 border-b border-white/5">
                      <th className="pb-3 font-medium">Date</th>
                      <th className="pb-3 font-medium">Match</th>
                      <th className="pb-3 font-medium">Prediction</th>
                      <th className="pb-3 font-medium">Odd</th>
                      <th className="pb-3 font-medium">Stake</th>
                      <th className="pb-3 font-medium">Result</th>
                      <th className="pb-3 font-medium">Profit/Loss</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentPredictions.length > 0 ? (
                      recentPredictions.map((pred, i) => (
                        <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                          <td className="py-4 text-sm">{pred.date}</td>
                          <td className="py-4 text-sm">{pred.match}</td>
                          <td className="py-4 text-sm">{pred.prediction}</td>
                          <td className="py-4 text-sm">{pred.odd}</td>
                          <td className="py-4 text-sm">{pred.stake}</td>
                          <td className="py-4">
                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              pred.result === "Win" ? "bg-green-500/10 text-green-500" :
                              pred.result === "Loss" ? "bg-red-500/10 text-red-500" :
                              "bg-yellow-500/10 text-yellow-500"
                            }`}>{pred.result}</span>
                          </td>
                          <td className={`py-4 text-sm font-medium ${pred.profit.startsWith("+") ? "text-green-500" : "text-red-500"}`}>
                            {pred.profit}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-4 text-center text-gray-500">No recent predictions</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right sidebar */}
          <div className="space-y-6">
            <div className="rounded-[20px] bg-[#0D0D0D] border border-white/5 p-6">
              <h3 className="text-lg font-semibold mb-4">Quick Overview</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-xl p-4">
                  <p className="text-xs text-gray-400">Members</p>
                  <p className="text-xl font-bold text-gray-500">—</p>
                  <p className="text-[10px] text-gray-600 mt-1">Coming soon</p>
                </div>
                <div className="bg-white/5 rounded-xl p-4">
                  <p className="text-xs text-gray-400">VIP</p>
                  <p className="text-xl font-bold text-gray-500">—</p>
                  <p className="text-[10px] text-gray-600 mt-1">Coming soon</p>
                </div>
                <div className="bg-white/5 rounded-xl p-4">
                  <p className="text-xs text-gray-400">Revenue</p>
                  <p className="text-xl font-bold text-gray-500">—</p>
                  <p className="text-[10px] text-gray-600 mt-1">Coming soon</p>
                </div>
                <div className="bg-white/5 rounded-xl p-4">
                  <p className="text-xs text-gray-400">Win Rate</p>
                  <p className="text-xl font-bold">{overviewData.winRate}%</p>
                </div>
              </div>
            </div>

            <div className="rounded-[20px] bg-[#0D0D0D] border border-white/5 p-6 h-[250px]">
              <h3 className="text-lg font-semibold mb-4">Revenue</h3>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fill: "#9CA3AF", fontSize: 12 }} />
                  <Tooltip contentStyle={{ backgroundColor: "#0D0D0D", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px" }} />
                  <Bar dataKey="revenue" fill="#D4AF37" radius={[4,4,0,0]} />
                  <Bar dataKey="profit" fill="#6B7280" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-[20px] bg-[#0D0D0D] border border-white/5 p-6">
              <h3 className="text-lg font-semibold mb-4">Waitlist Sign‑ups</h3>
              {waitlistEntries.length === 0 ? (
                <p className="text-sm text-gray-400">No sign‑ups yet.</p>
              ) : (
                <ul className="space-y-2">
                  {waitlistEntries.map((entry) => (
                    <li key={entry.id} className="text-sm text-gray-300">
                      {entry.email}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Edit Modal */}
      {editingPrediction && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-[#0D0D0D] border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Edit Prediction</h3>
            <div className="space-y-3">
              <input value={editValues.match_name} onChange={e => setEditValues({...editValues, match_name: e.target.value})} placeholder="Match Name" className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white" />
              <input value={editValues.prediction} onChange={e => setEditValues({...editValues, prediction: e.target.value})} placeholder="Prediction" className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white" />
              <input type="number" value={editValues.confidence} onChange={e => setEditValues({...editValues, confidence: e.target.value})} placeholder="Confidence" className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white" />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="ghost" onClick={() => setEditingPrediction(null)}>Cancel</Button>
              <Button onClick={handleEditSave} className="bg-gold-400 text-black">Save</Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Change Password Modal */}
      {changePasswordOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-[#0D0D0D] border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-white mb-4">Change Password</h3>
            <form onSubmit={handleChangePassword} className="space-y-3">
              <input type="password" placeholder="Current password" value={passwordForm.current} onChange={e => setPasswordForm({...passwordForm, current: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white" required />
              <input type="password" placeholder="New password" value={passwordForm.new} onChange={e => setPasswordForm({...passwordForm, new: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white" required />
              {passwordError && <p className="text-red-400 text-sm">{passwordError}</p>}
              <div className="flex justify-end gap-3 mt-4">
                <Button variant="ghost" onClick={() => { setChangePasswordOpen(false); setPasswordError(""); }}>Cancel</Button>
                <Button type="submit" disabled={changingPassword} className="bg-gold-400 text-black">{changingPassword ? "Updating..." : "Change Password"}</Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
