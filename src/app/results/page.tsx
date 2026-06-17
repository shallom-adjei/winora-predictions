"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import PublicHeader from "@/components/PublicHeader";
import Footer from "@/components/Footer";
import { MobileBottomNav } from "@/components/MobileBottomNav";

export default function ResultsPage() {
  const [results, setResults] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from("predictions")
      .select("*")
      .not("result", "is", null)
      .neq("result", "Pending")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setResults(data);
      });
  }, []);

  return (
    <div className="min-h-screen bg-surface-primary text-white flex flex-col pb-24 lg:pb-0">
      <PublicHeader />
      <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-8 py-8 sm:py-12 w-full">
        <h1 className="text-2xl sm:text-4xl font-bold mb-6 sm:mb-8">Match Results</h1>
        {results.length === 0 ? (
          <p className="text-gray-400 text-sm">No results recorded yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-card text-gray-400">
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3">Match</th>
                  <th className="p-3">Prediction</th>
                  <th className="p-3">Conf.</th>
                  <th className="p-3">Result</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.id} className="border-t border-white/5 hover:bg-white/5">
                    <td className="p-3 text-xs sm:text-sm">{new Date(r.created_at).toLocaleDateString()}</td>
                    <td className="p-3 text-xs sm:text-sm">{r.match_name}</td>
                    <td className="p-3 text-xs sm:text-sm">{r.prediction}</td>
                    <td className="p-3 text-xs sm:text-sm text-positive">{r.confidence}%</td>
                    <td className="p-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
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
      <Footer />
      <MobileBottomNav />
    </div>
  );
}