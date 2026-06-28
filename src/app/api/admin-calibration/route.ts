import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const { supabase } = await import("@/lib/supabase");

  // Get the latest log for each prediction (deduplicate)
  const { data: logs } = await supabase
    .from("prediction_logs")
    .select("*")
    .not("actual_home_score", "is", null)
    .order("created_at", { ascending: false });

  // Deduplicate – keep only the most recent log per prediction_id
  const uniqueLogs = logs?.filter(
    (log, index, self) => self.findIndex(l => l.prediction_id === log.prediction_id) === index
  ) || [];

  if (!logs || logs.length === 0) {
    return NextResponse.json(
      { groups: [], message: "No data yet" },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
          "Vercel-CDN-Cache-Control": "no-cache",
        },
      }
    );
  }

  const groups = [
    { label: "50-59%", min: 50, max: 59, total: 0, wins: 0 },
    { label: "60-69%", min: 60, max: 69, total: 0, wins: 0 },
    { label: "70-79%", min: 70, max: 79, total: 0, wins: 0 },
    { label: "80-89%", min: 80, max: 89, total: 0, wins: 0 },
    { label: "90-92%", min: 90, max: 92, total: 0, wins: 0 },
  ];

  for (const log of uniqueLogs) {
    let prob: number;
    switch (log.main_pick) {
      case "Home Win": prob = log.prob_home_win; break;
      case "Draw":     prob = log.prob_draw;     break;
      case "Away Win": prob = log.prob_away_win; break;
      default: continue;
    }
    const group = groups.find(g => prob >= g.min && prob <= g.max);
    if (!group) continue;

    group.total++;
    const success =
      (log.main_pick === "Home Win" && log.result_home_win) ||
      (log.main_pick === "Draw" && log.result_draw) ||
      (log.main_pick === "Away Win" && log.result_away_win);
    if (success) group.wins++;
  }

  const resultGroups = groups
    .filter(g => g.total > 0)
    .map(g => ({
      label: g.label,
      expectedWinRate: `${g.min}-${g.max}%`,
      actualWinRate: ((g.wins / g.total) * 100).toFixed(1),
      wins: g.wins,
      total: g.total,
    }));

   return NextResponse.json(
      {
      groups: resultGroups,
      totalLogged: uniqueLogs.length,
      pendingCount: 0, 
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "Vercel-CDN-Cache-Control": "no-cache",
      },
    }
  );
}