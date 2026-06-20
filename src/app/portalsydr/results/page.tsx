"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminResultsPage() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("predictions")
      .select("*")
      .not("result", "is", null)
      .neq("result", "Pending")
      .order("kickoff_time", { ascending: false })
      .then(({ data }) => {
        if (data) setResults(data);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/portalsydr">
            <Button variant="ghost" className="text-gold-400">
              <ArrowLeft className="h-4 w-4 mr-1" /> Dashboard
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Match Results (Admin)</h1>
        </div>
        {loading ? (
          <p className="text-gray-400">Loading…</p>
        ) : results.length === 0 ? (
          <p className="text-gray-400">No results recorded yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-card text-gray-400">
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3">Match</th>
                  <th className="p-3">Prediction</th>
                  <th className="p-3">Score</th>
                  <th className="p-3">Result</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.id} className="border-t border-white/5 hover:bg-white/5">
                    <td className="p-3">{new Date(r.created_at).toLocaleDateString()}</td>
                    <td className="p-3">{r.match_name}</td>
                    <td className="p-3">{r.main_pick || r.prediction}</td>
                    <td className="p-3">
                      {r.actual_home_score != null ? `${r.actual_home_score} - ${r.actual_away_score}` : "—"}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        r.result === "Win" ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                      }`}>
                        {r.result}
                      </span>
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