"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function AdminPredictionsPage() {
  const [predictions, setPredictions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [editingPrediction, setEditingPrediction] = useState<any>(null);
  const [editValues, setEditValues] = useState<any>({ match_name: "", prediction: "", confidence: "" });

  const fetchPredictions = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("predictions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (data) setPredictions(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchPredictions();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this prediction?")) return;
    await supabase.from("predictions").delete().eq("id", id);
    toast.success("Deleted");
    fetchPredictions();
  };

  const handleUpdateResult = async (id: string, result: string) => {
    await supabase.from("predictions").update({ result }).eq("id", id);
    toast.success("Result updated");
    fetchPredictions();
  };

  const openEditModal = (p: any) => {
    setEditingPrediction(p);
    setEditValues({
      match_name: p.match_name,
      prediction: p.prediction,
      confidence: p.confidence,
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
    fetchPredictions();
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
      fetchPredictions();
    } catch {
      toast.error("AI generation failed");
    } finally {
      setGeneratingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-[#050505] text-white items-center justify-center">
        <div className="text-xl text-gold-400">Loading predictions...</div>
      </div>
    );
  }

  return (
    <div className="p-6 text-white max-w-7xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/portal‑sydr____">
          <Button variant="ghost" className="text-gray-400 hover:text-white">
            <ArrowLeft className="h-4 w-4 mr-1" /> Dashboard
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">All Predictions</h1>
      </div>

      {predictions.length === 0 ? (
        <p className="text-gray-400">No predictions yet.</p>
      ) : (
        <div className="rounded-xl border border-white/10 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-card text-gray-400 text-xs uppercase">
              <tr>
                <th className="p-3">Match</th>
                <th className="p-3">Prediction</th>
                <th className="p-3">Conf.</th>
                <th className="p-3">Status</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {predictions.map((p) => (
                <tr key={p.id} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                  <td className="p-3 font-medium">{p.match_name}</td>
                  <td className="p-3">{p.prediction || "—"}</td>
                  <td className="p-3 text-green-400">{p.confidence}%</td>
                  <td className="p-3">
                    <select
                      value={p.result || "Pending"}
                      onChange={(e) => handleUpdateResult(p.id, e.target.value)}
                      className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-gray-300"
                    >
                      <option value="Pending">Pending</option>
                      <option value="Win">Win</option>
                      <option value="Loss">Loss</option>
                    </select>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEditModal(p)} className="text-xs text-gold-400 hover:underline">Edit</button>
                      <button onClick={() => handleDelete(p.id)} className="text-xs text-red-400 hover:underline">Delete</button>
                      <button
                        onClick={() => handleGenerateAI(p)}
                        disabled={generatingId === p.id}
                        className="text-xs text-blue-400 hover:underline"
                      >
                        {generatingId === p.id ? "..." : "AI Predict"}
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
            <h3 className="text-lg font-semibold mb-4">Edit Prediction</h3>
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