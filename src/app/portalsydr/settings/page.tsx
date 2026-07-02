"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Database,
  MessageCircle,
  Shield,
  Play,
  RefreshCw,
  Zap,
  CheckCircle,
  XCircle,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

export default function AdminSettingsPage() {
  // Telegram
  const [botToken, setBotToken] = useState("");
  const [channelUsername, setChannelUsername] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [telegramStatus, setTelegramStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [savingTelegram, setSavingTelegram] = useState(false);

  // Password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // Operations
  const [updating, setUpdating] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [postingTelegram, setPostingTelegram] = useState(false);
    // Add prediction
  const [showForm, setShowForm] = useState(false);
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

const [promptTemplate, setPromptTemplate] = useState("");
const [selectedSport, setSelectedSport] = useState("Football");
const [savingPrompt, setSavingPrompt] = useState(false);


  const loadPromptTemplate = async (sport: string) => {
    const key = `prompt_template_${sport.toLowerCase()}`;
    try {
      const res = await fetch(`/api/admin/settings?key=${key}`, { credentials: "include" });
      const data = await res.json();
      if (data.settings?.[key]) {
        setPromptTemplate(data.settings[key]);
      } else {
        // Use a default per sport (we'll define a simple fallback)
        setPromptTemplate(getDefaultPrompt(sport));
      }
    } catch {
      setPromptTemplate(getDefaultPrompt(sport));
    }
  };

    const handleAddPick = async (e: React.FormEvent) => {
    e.preventDefault();
    // Use the anon client for direct insert
    const { supabase } = await import("@/lib/supabase");
    const { error } = await supabase.from("predictions").insert([newPick]);
    if (error) { toast.error("Failed to add prediction"); return; }
    toast.success("Prediction added");
    setNewPick({
      sport: "Football", match_name: "", team_a: "", team_b: "", time: "", prediction: "", confidence: 70, is_premium: false,
    });
    setShowForm(false);
  };

  // Load settings
  useEffect(() => {
    fetch("/api/admin/settings", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (d.settings) {
          setBotToken(d.settings.telegram_bot_token || "");
          setChannelUsername(d.settings.telegram_channel_username || "");
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadPromptTemplate(selectedSport);
  }, [selectedSport]);

    const savePromptTemplate = async () => {
    setSavingPrompt(true);
    const key = `prompt_template_${selectedSport.toLowerCase()}`;
    try {
      await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value: promptTemplate }),
        credentials: "include",
      });
      toast.success("Prompt template saved");
    } catch {
      toast.error("Failed to save");
    } finally {
      setSavingPrompt(false);
    }
  };

  // Save Telegram
  const saveTelegram = async () => {
    setSavingTelegram(true);
    try {
      await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "telegram_bot_token", value: botToken }),
        credentials: "include",
      });
      await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "telegram_channel_username", value: channelUsername }),
        credentials: "include",
      });
      toast.success("Telegram settings saved");
    } catch {
      toast.error("Failed to save");
    } finally {
      setSavingTelegram(false);
    }
  };

  // Test Telegram connection
  const testTelegram = async () => {
    setTelegramStatus("testing");
    try {
      const res = await fetch("/api/admin/telegram-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: botToken, channel: channelUsername }),
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) {
        setTelegramStatus("success");
        toast.success("Telegram connected successfully");
      } else {
        setTelegramStatus("error");
        toast.error(data.error || "Connection failed");
      }
    } catch {
      setTelegramStatus("error");
      toast.error("Network error");
    }
  };

  // Change password
  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangingPassword(true);
    try {
      const res = await fetch("/api/admin-change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Password changed");
        setCurrentPassword("");
        setNewPassword("");
      } else {
        toast.error(data.error || "Failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setChangingPassword(false);
    }
  };

  // Operations
  const handleUpdateMatches = async () => {
    setUpdating(true);
    try {
      const res = await fetch("/api/fetch-matches", { method: "POST", credentials: "include" });
      const data = await res.json();
      toast.success(data.success ? `Added ${data.inserted} matches` : data.error || "Failed");
    } catch { toast.error("Network error"); }
    finally { setUpdating(false); }
  };

  const handleEnrich = async () => {
    setEnriching(true);
    try {
      const res = await fetch("/api/enrich-stats", { method: "POST", credentials: "include" });
      const data = await res.json();
      toast.success(data.success ? "Enrichment complete" : data.error || "Failed");
    } catch { toast.error("Network error"); }
    finally { setEnriching(false); }
  };

  const handleGenerateAll = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/admin-data?t=" + Date.now(), { cache: "no-store" });
      const d = await res.json();
      const matches = d.upcoming || [];
      if (!matches.length) {
        toast.success("No matches to predict.");
        setGenerating(false);
        return;
      }
      toast.loading(`Generating for ${matches.length} matches...`);
      for (const match of matches) {
        await fetch("/api/admin-generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ matchId: match.id }),
          credentials: "include",
        });
      }
      toast.success("All predictions generated!");
    } catch { toast.error("Failed"); }
    finally { setGenerating(false); }
  };

  const handlePostTelegram = async () => {
    setPostingTelegram(true);
    try {
      const res = await fetch("/api/telegram/post", { method: "POST", credentials: "include" });
      const data = await res.json();
      if (data.success) {
        toast.success(`Posted to Telegram (${data.picks} picks)`);
      } else {
        toast.error(data.error || "Failed to post");
      }
    } catch { toast.error("Network error"); }
    finally { setPostingTelegram(false); }
  };

  function getDefaultPrompt(sport: string): string {
  switch (sport) {
    case "Football":
      return `You are a football data analyst… [your current football prompt]`;
    case "Tennis":
      return `You are a tennis data analyst… [tennis prompt]`;
    case "Basketball":
      return `You are a basketball data analyst… [basketball prompt]`;
    case "Baseball":
      return `You are a baseball data analyst… [baseball prompt]`;
    default:
      return "";
  }
}

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-2">
          <Link href="/portalsydr">
            <Button variant="ghost" className="text-gold-400">
              <ArrowLeft className="h-4 w-4 mr-1" /> Dashboard
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Platform Settings</h1>
        </div>

                {/* ── Operations Card ──────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl bg-[#0D0D0D] border border-white/5 p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-full bg-gold-400/10 flex items-center justify-center">
              <Zap className="h-5 w-5 text-gold-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Data Operations</h2>
              <p className="text-xs text-gray-400">Update, enrich, and generate predictions</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Button onClick={handleUpdateMatches} disabled={updating} variant="outline" className="text-sm h-12">
              <RefreshCw className="h-4 w-4 mr-2" />
              {updating ? "Updating..." : "Update Matches"}
            </Button>
            <Button onClick={handleEnrich} disabled={enriching} variant="outline" className="text-sm h-12">
              <Database className="h-4 w-4 mr-2" />
              {enriching ? "Enriching..." : "Enrich Stats"}
            </Button>
            <Button
              onClick={async () => {
                try {
                  const res = await fetch("/api/update-crests", { method: "POST", credentials: "include" });
                  const data = await res.json();
                  toast.success(data.message || "Crests updated");
                } catch { toast.error("Crest update failed"); }
              }}
              variant="outline"
              className="text-sm h-12"
            >
              <Play className="h-4 w-4 mr-2" />
              Update Crests
            </Button>
            <Button onClick={handleGenerateAll} disabled={generating} className="text-sm h-12 bg-gold-400 text-black hover:bg-gold-500">
              <Zap className="h-4 w-4 mr-2" />
              {generating ? "Generating..." : "Generate All"}
            </Button>
            <Button onClick={handlePostTelegram} disabled={postingTelegram} variant="outline" className="text-sm h-12">
              <MessageCircle className="h-4 w-4 mr-2" />
              {postingTelegram ? "Posting..." : "Post to Telegram"}
            </Button>
            <Button
              onClick={() => setShowForm(!showForm)}
              variant="outline"
              className="text-sm h-12"
            >
              {showForm ? "Cancel" : "+ Add New Prediction"}
            </Button>
          </div>

          {/* Form slides open inside the same card */}
          {showForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-4"
            >
              <form onSubmit={handleAddPick} className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <input placeholder="Match Name" value={newPick.match_name} onChange={e => setNewPick({...newPick, match_name: e.target.value})} className="bg-white/5 border border-white/10 rounded-lg p-2 text-white" required />
                <input placeholder="Team A" value={newPick.team_a} onChange={e => setNewPick({...newPick, team_a: e.target.value})} className="bg-white/5 border border-white/10 rounded-lg p-2 text-white" required />
                <input placeholder="Team B" value={newPick.team_b} onChange={e => setNewPick({...newPick, team_b: e.target.value})} className="bg-white/5 border border-white/10 rounded-lg p-2 text-white" required />
                <input placeholder="Time (e.g. 17:30)" value={newPick.time} onChange={e => setNewPick({...newPick, time: e.target.value})} className="bg-white/5 border border-white/10 rounded-lg p-2 text-white" required />
                <input type="number" placeholder="Confidence %" value={newPick.confidence} onChange={e => setNewPick({...newPick, confidence: Number(e.target.value)})} className="bg-white/5 border border-white/10 rounded-lg p-2 text-white" required />
                <select value={newPick.sport} onChange={e => setNewPick({...newPick, sport: e.target.value})} className="bg-[#0D0D0D] text-white border border-white/10 rounded-lg p-2">
                  <option className="bg-[#0D0D0D] text-white">Football</option>
                  <option className="bg-[#0D0D0D] text-white">Basketball</option>
                  <option className="bg-[#0D0D0D] text-white">Tennis</option>
                  <option className="bg-[#0D0D0D] text-white">Baseball</option>
                </select>
                <Button type="submit" className="bg-gold-400 text-black col-span-full">Save Prediction</Button>
              </form>
            </motion.div>
          )}
        </motion.section>

                {/* ── Prompt Customization ──────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.13 }}
          className="rounded-2xl bg-[#0D0D0D] border border-white/5 p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold">AI Prompt Templates</h2>
              <p className="text-xs text-gray-400">Customize the prompt per sport – used in Manual Stats</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <label className="text-xs text-gray-400">Sport:</label>
              <select
                value={selectedSport}
                onChange={(e) => setSelectedSport(e.target.value)}
                className="bg-[#0D0D0D] text-white border border-white/10 rounded-lg p-2"
              >
                <option className="bg-[#0D0D0D] text-white">Football</option>
                <option className="bg-[#0D0D0D] text-white">Tennis</option>
                <option className="bg-[#0D0D0D] text-white">Basketball</option>
                <option className="bg-[#0D0D0D] text-white">Baseball</option>
              </select>
            </div>
            <textarea
              value={promptTemplate}
              onChange={(e) => setPromptTemplate(e.target.value)}
              rows={20}
              className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white text-sm font-mono"
              placeholder="Paste your prompt template here…"
            />
            <Button onClick={savePromptTemplate} disabled={savingPrompt} className="bg-gold-400 text-black text-sm gap-2">
              {savingPrompt ? "Saving..." : "Save Template"}
            </Button>
          </div>
        </motion.section>

        {/* ── Telegram Configuration ───────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-2xl bg-[#0D0D0D] border border-white/5 p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
              <MessageCircle className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Telegram Integration</h2>
              <p className="text-xs text-gray-400">Configure your bot token and channel username</p>
            </div>
            {telegramStatus === "success" && (
              <span className="ml-auto flex items-center gap-1 text-xs text-green-400">
                <CheckCircle className="h-4 w-4" /> Connected
              </span>
            )}
            {telegramStatus === "error" && (
              <span className="ml-auto flex items-center gap-1 text-xs text-red-400">
                <XCircle className="h-4 w-4" /> Connection failed
              </span>
            )}
          </div>
          <div className="grid md:grid-cols-2 gap-4 max-w-2xl">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Bot Token</label>
              <div className="relative">
                <input
                  type={showToken ? "text" : "password"}
                  value={botToken}
                  onChange={(e) => setBotToken(e.target.value)}
                  placeholder="123456:ABC-DEF1234gh..."
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-white text-sm pr-10"
                />
                <button
  onClick={() => setShowToken(!showToken)}
  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
  title={showToken ? "Hide token" : "Show token"}
>
  {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
</button>
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Channel Username</label>
              <input
                value={channelUsername}
                onChange={(e) => setChannelUsername(e.target.value)}
                placeholder="@WinoraTips"
                className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-white text-sm"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <Button onClick={saveTelegram} disabled={savingTelegram} className="bg-gold-400 text-black text-sm gap-2">
              {savingTelegram ? "Saving..." : "Save Settings"}
            </Button>
            <Button
              onClick={testTelegram}
              disabled={telegramStatus === "testing"}
              variant="outline"
              className="text-sm gap-2"
            >
              {telegramStatus === "testing" ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
              Test Connection
            </Button>
          </div>
        </motion.section>

        {/* ── Security ─────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl bg-[#0D0D0D] border border-white/5 p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center">
              <Shield className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Security</h2>
              <p className="text-xs text-gray-400">Change your admin password</p>
            </div>
          </div>
          <form onSubmit={changePassword} className="max-w-md space-y-4">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-white text-sm"
                required
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-white text-sm"
                required
              />
            </div>
            <Button type="submit" disabled={changingPassword} className="bg-gold-400 text-black text-sm gap-2">
              {changingPassword ? "Changing..." : "Change Password"}
            </Button>
          </form>
        </motion.section>
      </div>
    </div>
  );
}