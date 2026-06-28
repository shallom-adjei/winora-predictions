import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const { supabase } = await import("@/lib/supabase");

  const { data: logs } = await supabase
    .from("prediction_logs")
    .select("created_at, main_pick, result_home_win, result_draw, result_away_win")
    .not("result_home_win", "is", null);

  if (!logs || logs.length === 0) {
    return NextResponse.json(
      { performance: [] },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
          "Vercel-CDN-Cache-Control": "no-cache",
        },
      }
    );
  }

  const dailyMap: Record<string, { total: number; wins: number }> = {};
  for (const log of logs) {
    const dateKey = new Date(log.created_at).toISOString().split("T")[0];
    if (!dailyMap[dateKey]) {
      dailyMap[dateKey] = { total: 0, wins: 0 };
    }
    dailyMap[dateKey].total++;

    const success =
      (log.main_pick === "Home Win" && log.result_home_win) ||
      (log.main_pick === "Draw" && log.result_draw) ||
      (log.main_pick === "Away Win" && log.result_away_win);
    if (success) dailyMap[dateKey].wins++;
  }

  const performance = Object.entries(dailyMap)
    .map(([date, stats]) => ({
      date,
      winRate: Math.round((stats.wins / stats.total) * 100),
      roi: 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return NextResponse.json(
    { performance },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "Vercel-CDN-Cache-Control": "no-cache",
      },
    }
  );
}