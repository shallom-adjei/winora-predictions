"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { ArrowLeft, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

export default function UpcomingMatchesPage() {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMatches = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("predictions")
      .select("*")
      .or("result.eq.pending,result.is.null")
      .order("kickoff_time", { ascending: true });
    if (data) setMatches(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchMatches();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this match?")) return;
    const { error } = await supabase.from("predictions").delete().eq("id", id);
    if (error) { toast.error("Delete failed"); return; }
    toast.success("Match deleted");
    fetchMatches();
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/portalsydr">
            <Button variant="ghost" className="text-gold-400"><ArrowLeft className="h-4 w-4 mr-1" /> Dashboard</Button>
          </Link>
          <h1 className="text-2xl font-bold">All Upcoming Matches</h1>
        </div>

        {loading ? (
          <p className="text-gray-400">Loading...</p>
        ) : matches.length === 0 ? (
          <p className="text-gray-400">No upcoming matches found.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-card text-gray-400">
                <tr>
                  <th className="p-3">Match</th>
                  <th className="p-3">League</th>
                  <th className="p-3">Time</th>
                  <th className="p-3">Stats</th>
                  <th className="p-3">Prediction</th>
                  <th className="p-3">Conf.</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
  {matches.map((match) => (
    <tr key={match.id} className="border-t border-white/5 hover:bg-white/5">
      <td className="p-3">{match.match_name}</td>
      <td className="p-3 text-xs text-gray-400">{match.sport}</td>
      <td className="p-3">{match.time}</td>
      <td className="p-3">
        {match.form_points_a != null || match.form_points_b != null ? (
          <span
            className="text-xs text-green-400 cursor-help underline decoration-dotted"
            title={
  `Form pts: ${match.form_points_a ?? "?"} (H) / ${match.form_points_b ?? "?"} (A)\n` +
  `Goals scored: ${match.home_goals_scored ?? "?"} (H) / ${match.away_goals_scored ?? "?"} (A)\n` +
  `Clean sheets: ${match.clean_sheets_last5_a ?? "?"} (H) / ${match.clean_sheets_last5_b ?? "?"} (A)\n` +
  `Over 2.5: ${match.over25_last5_pct_a ?? "?"}% (H) / ${match.over25_last5_pct_b ?? "?"}% (A)\n` +
  `BTTS: ${match.btts_last5_pct_a ?? "?"}% (H) / ${match.btts_last5_pct_b ?? "?"}% (A)\n` +
  (match.h2h_home_wins != null ? `H2H (last 5): ${match.h2h_home_wins}W ${match.h2h_draws}D ${match.h2h_away_wins}W | Over 2.5: ${match.h2h_over25_pct}% | BTTS: ${match.h2h_btts_pct}%\n` : "") +
  (match.league_position_a != null ? `League position: ${match.team_a} #${match.league_position_a} | ${match.team_b} #${match.league_position_b}` : "")
}
          >
            ✅ Stats loaded
          </span>
        ) : (
          <span className="text-xs text-red-400">⛔ No stats</span>
        )}
      </td>
      <td className="p-3">{match.main_pick || match.prediction || "—"}</td>
      <td className="p-3 text-green-500">{match.confidence}%</td>
      <td className="p-3">
        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
          match.result === "Win" ? "bg-green-500/10 text-green-500" : 
          match.result === "Loss" ? "bg-red-500/10 text-red-500" : 
          "bg-yellow-500/10 text-yellow-500"
        }`}>
          {match.result || "Pending"}
        </span>
      </td>
      <td className="p-3">
        <div className="flex gap-2">
          <button
            onClick={() => handleDelete(match.id)}
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