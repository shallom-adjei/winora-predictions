"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import LoadingScreen from "@/components/LoadingScreen";

export default function MatchesPage() {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin-data?t=" + Date.now(), { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setMatches(d.upcoming || []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingScreen message="Loading matches…" />;

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/portalsydr">
            <Button variant="ghost" className="text-gold-400">
              <ArrowLeft className="h-4 w-4 mr-1" /> Dashboard
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Upcoming Matches</h1>
        </div>

        {matches.length === 0 ? (
          <p className="text-gray-400">No upcoming matches.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl bg-[#0D0D0D] border border-white/5">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs text-gray-400 border-b border-white/5">
                  <th className="p-4 font-medium">Match</th>
                  <th className="p-4 font-medium">League</th>
                  <th className="p-4 font-medium">Time</th>
                  <th className="p-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {matches.map((m: any) => (
                  <tr key={m.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="p-4 text-sm">{m.match_name}</td>
                    <td className="p-4 text-xs text-gray-400">{m.sport}</td>
                    <td className="p-4 text-sm">{m.time}</td>
                    <td className="p-4 text-xs">{m.match_status}</td>
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