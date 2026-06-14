"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function AdminResultsPage() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchResults = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("predictions")
      .select("*")
      .not("result", "is", null)
      .neq("result", "Pending")
      .order("created_at", { ascending: false })
      .limit(100);

    if (data) setResults(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchResults();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen bg-[#050505] text-white items-center justify-center">
        <div className="text-xl text-gold-400">Loading results...</div>
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
        <h1 className="text-2xl font-bold">Match Results</h1>
      </div>

      {results.length === 0 ? (
        <p className="text-gray-400">No results yet. Mark predictions as Win/Loss to see them here.</p>
      ) : (
        <div className="rounded-xl border border-white/10 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-card text-gray-400 text-xs uppercase">
              <tr>
                <th className="p-3">Match</th>
                <th className="p-3">Prediction</th>
                <th className="p-3">Conf.</th>
                <th className="p-3">Result</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.id} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                  <td className="p-3 font-medium">{r.match_name}</td>
                  <td className="p-3">{r.prediction || "—"}</td>
                  <td className="p-3 text-green-400">{r.confidence}%</td>
                  <td className="p-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      r.result === "Win" ? "bg-green-500/10 text-green-500" :
                      r.result === "Loss" ? "bg-red-500/10 text-red-500" :
                      "bg-yellow-500/10 text-yellow-500"
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
  );
}