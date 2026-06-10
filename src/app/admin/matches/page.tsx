"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, TrendingUp } from "lucide-react";

export default function AdminMatchesPage() {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [editingPrediction, setEditingPrediction] = useState<any>(null);
  const [editValues, setEditValues] = useState<any>({ match_name: "", prediction: "", confidence: "" });

  const fetchMatches = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("predictions")
      .select("*")
      .or("result.eq.pending,result.is.null")
      .order("created_at", { ascending: false })
      .limit(50);  // show more matches on this dedicated page

    if (data) {
      setMatches(
        data.map((p) => ({
          id: p.id,
          match_name: p.match_name,
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
        }))
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMatches();
  }, []);

  // ----- Actions (same as dashboard) -----
  const handleDelete = async (id: string) => {
    if (!confirm("Delete this prediction?")) return;
    await supabase.from("predictions").delete().eq("id", id);
    toast.success("Deleted");
    fetchMatches();
  };

  const handleUpdateResult = async (id: string, result: string) => {
    await supabase.from("predictions").update({ result }).eq("id", id);
    toast.success("Result updated");
    fetchMatches();
  };

  const openEditModal = (match: any) => {
    setEditingPrediction(match);
    setEditValues({
      match_name: match.match_name,
      prediction: match.prediction,
      confidence: match.confidence,
    });
  };

  const handleEditSave = async () => {
    if (!editingPrediction) return;
    await supabase
      .from("predictions")
      .update({
        match_name: editValues.match_name,
        prediction: editValues.prediction,
        confidence: Number(editValues.confidence),
      })
      .eq("id", editingPrediction.id);
    toast.success("Updated");
    setEditingPrediction(null);
    fetchMatches();
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
        })
        .eq("id", match.id);

      toast.success("AI prediction generated!");
      fetchMatches();
    } catch {
      toast.error("AI generation failed");
    } finally {
      setGeneratingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-[#050505] text-white items-center justify-center">
        <div className="text-xl text-gold-400">Loading matches...</div>
      </div>
    );
  }

  return (
    <div className="p-6 text-white max-w-7xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin">
          <Button variant="ghost" className="text-gray-400 hover:text-white">
            <ArrowLeft className="h-4 w-4 mr-1" /> Dashboard
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Upcoming Matches</h1>
      </div>

      {matches.length === 0 ? (
        <p className="text-gray-400">No upcoming matches. Add some from the dashboard or fetch live matches.</p>
      ) : (
        <div className="rounded-xl border border-white/10 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-card text-gray-400 text-xs uppercase">
              <tr>
                <th className="p-3">Match</th>
                <th className="p-3">League</th>
                <th className="p-3">Time</th>
                <th className="p-3">Prediction</th>
                <th className="p-3">Conf.</th>
                <th className="p-3">Status</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((match) => (
                <tr key={match.id} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                  <td className="p-3 font-medium">{match.match_name}</td>
                  <td className="p-3 text-gray-400">{match.league}</td>
                  <td className="p-3">{match.time}</td>
                  <td className="p-3">{match.prediction || "—"}</td>
                  <td className="p-3 text-green-400">{match.confidence}%</td>
                  <td className="p-3">
                    <select
                      value={match.status}
                      onChange={(e) => handleUpdateResult(match.id, e.target.value)}
                      className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-gray-300"
                    >
                      <option value="Pending">Pending</option>
                      <option value="Win">Win</option>
                      <option value="Loss">Loss</option>
                    </select>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEditModal(match)} className="text-xs text-gold-400 hover:underline">Edit</button>
                      <button onClick={() => handleDelete(match.id)} className="text-xs text-red-400 hover:underline">Delete</button>
                      <button
                        onClick={() => handleGenerateAI(match)}
                        disabled={generatingId === match.id}
                        className="text-xs text-blue-400 hover:underline"
                      >
                        {generatingId === match.id ? "..." : "AI Predict"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Modal */}
      {editingPrediction && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-[#0D0D0D] border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Edit Match</h3>
            <div className="space-y-3">
              <input
                value={editValues.match_name}
                onChange={(e) => setEditValues({ ...editValues, match_name: e.target.value })}
                placeholder="Match Name"
                className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white"
              />
              <input
                value={editValues.prediction}
                onChange={(e) => setEditValues({ ...editValues, prediction: e.target.value })}
                placeholder="Prediction"
                className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white"
              />
              <input
                type="number"
                value={editValues.confidence}
                onChange={(e) => setEditValues({ ...editValues, confidence: e.target.value })}
                placeholder="Confidence"
                className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white"
              />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="ghost" onClick={() => setEditingPrediction(null)}>Cancel</Button>
              <Button onClick={handleEditSave} className="bg-gold-400 text-black">Save</Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}