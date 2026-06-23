"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { ArrowLeft, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

export default function AdminPredictionsPage() {
  const [predictions, setPredictions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  const fetchPredictions = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("predictions")
      .select("*")
      .order("kickoff_time", { ascending: true });
    if (data) setPredictions(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchPredictions();
  }, []);

const router = useRouter();

const [sessionReady, setSessionReady] = useState(false);

useEffect(() => {
  supabase.auth.getSession().then(({ data }) => {
    if (!data.session) {
      router.replace("/portalsydr/login");
    } else {
      setSessionReady(true);
    }
  });
}, [router]);

if (!sessionReady) {
  return (
    <div className="flex min-h-screen bg-[#050505] text-white items-center justify-center">
      <div className="text-xl text-gold-400">Verifying session…</div>
    </div>
  );
}

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this prediction?")) return;
    const { error } = await supabase.from("predictions").delete().eq("id", id);
    if (error) { toast.error("Delete failed"); return; }
    toast.success("Prediction deleted");
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
      fetchPredictions();
    } catch {
      toast.error("AI generation failed");
    } finally {
      setGeneratingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/portalsydr">
            <Button variant="ghost" className="text-gold-400">
              <ArrowLeft className="h-4 w-4 mr-1" /> Dashboard
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">All Predictions</h1>
        </div>

        {loading ? (
          <p className="text-gray-400">Loading...</p>
        ) : predictions.length === 0 ? (
          <p className="text-gray-400">No predictions yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-card text-gray-400">
                <tr>
                  <th className="p-3">Match</th>
                  <th className="p-3">Time</th>
                  <th className="p-3">Main Pick</th>
                  <th className="p-3">Safe</th>
                  <th className="p-3">Goals</th>
                  <th className="p-3">BTTS</th>
                  <th className="p-3">Score</th>
                  <th className="p-3">Conf.</th>
                  <th className="p-3">Risk</th>
                  <th className="p-3">Stake</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {predictions.map((p) => (
                  <tr key={p.id} className="border-t border-white/5 hover:bg-white/5">
                    <td className="p-3 font-medium">{p.match_name}</td>
                    <td className="p-3 text-xs text-gray-400">{p.time}</td>
                    <td className="p-3">{p.main_pick || "—"}</td>
                    <td className="p-3">{p.safe_pick || "—"}</td>
                    <td className="p-3">{p.goals_pick || "—"}</td>
                    <td className="p-3">{p.btts_pick || "—"}</td>
                    <td className="p-3">{p.expected_score || "—"}</td>
                    <td className="p-3 text-green-500">{p.confidence}%</td>
                    <td className="p-3">{p.risk_level || "—"}</td>
                    <td className="p-3">{p.recommended_stake || "—"}</td>
                    <td className="p-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        p.result === "Win" ? "bg-green-500/10 text-green-500" :
                        p.result === "Loss" ? "bg-red-500/10 text-red-500" :
                        "bg-yellow-500/10 text-yellow-500"
                      }`}>
                        {p.result || "Pending"}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleGenerateAI(p)}
                          disabled={generatingId === p.id}
                          className="text-xs text-blue-400 hover:underline"
                        >
                          {generatingId === p.id ? "Generating..." : "AI Predict"}
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="text-xs text-red-400 hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}