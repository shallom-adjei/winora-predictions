"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Save, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

export default function AdminSettingsPage() {
  // Telegram settings
  const [botToken, setBotToken] = useState("");
  const [channelUsername, setChannelUsername] = useState("");
  const [savingTelegram, setSavingTelegram] = useState(false);

  // Password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // Action button states
  const [updating, setUpdating] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [postingTelegram, setPostingTelegram] = useState(false);

  // Load saved settings
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

  // Save Telegram settings
  const saveTelegram = useCallback(async () => {
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
  }, [botToken, channelUsername]);

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

  // Action handlers
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

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <Link href="/portalsydr">
            <Button variant="ghost" className="text-gold-400">
              <ArrowLeft className="h-4 w-4 mr-1" /> Dashboard
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Settings</h1>
        </div>

        {/* ── Data Operations ──────────────────────────────── */}
        <section className="rounded-2xl bg-[#0D0D0D] border border-white/5 p-6">
          <h2 className="text-xl font-semibold mb-4">Data Operations</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Button onClick={handleUpdateMatches} disabled={updating} variant="outline" className="text-sm">
              {updating ? "Updating..." : "Update Matches & Stats"}
            </Button>
            <Button onClick={handleEnrich} disabled={enriching} variant="outline" className="text-sm">
              {enriching ? "Enriching..." : "Enrich Stats"}
            </Button>
            <Button onClick={async () => {
              try {
                const res = await fetch("/api/update-crests", { method: "POST", credentials: "include" });
                const data = await res.json();
                toast.success(data.message || "Crests updated");
              } catch { toast.error("Crest update failed"); }
            }} variant="outline" className="text-sm">
              Update Crests
            </Button>
            <Button onClick={handleGenerateAll} disabled={generating} className="text-sm bg-gold-400 text-black">
              {generating ? "Generating..." : "Generate All Predictions"}
            </Button>
            <Button onClick={handlePostTelegram} disabled={postingTelegram} variant="outline" className="text-sm">
              {postingTelegram ? "Posting..." : "Post to Telegram"}
            </Button>
          </div>
        </section>

        {/* ── Telegram Configuration ───────────────────────── */}
        <section className="rounded-2xl bg-[#0D0D0D] border border-white/5 p-6">
          <h2 className="text-xl font-semibold mb-4">Telegram Integration</h2>
          <div className="space-y-4 max-w-md">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Bot Token</label>
              <input
                type="password"
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                placeholder="123456:ABC-DEF1234gh..."
                className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Channel Username</label>
              <input
                value={channelUsername}
                onChange={(e) => setChannelUsername(e.target.value)}
                placeholder="@WinoraTips"
                className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white text-sm"
              />
            </div>
            <Button onClick={saveTelegram} disabled={savingTelegram} className="bg-gold-400 text-black text-sm gap-2">
              <Save className="h-4 w-4" /> {savingTelegram ? "Saving..." : "Save Telegram Settings"}
            </Button>
          </div>
        </section>

        {/* ── Security ─────────────────────────────────────── */}
        <section className="rounded-2xl bg-[#0D0D0D] border border-white/5 p-6">
          <h2 className="text-xl font-semibold mb-4">Security</h2>
          <form onSubmit={changePassword} className="max-w-md space-y-4">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white text-sm"
                required
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white text-sm"
                required
              />
            </div>
            <Button type="submit" disabled={changingPassword} className="bg-gold-400 text-black text-sm gap-2">
              <Check className="h-4 w-4" /> {changingPassword ? "Changing..." : "Change Password"}
            </Button>
          </form>
        </section>
      </div>
    </div>
  );
}