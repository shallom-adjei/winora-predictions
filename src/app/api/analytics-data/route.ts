import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const { supabase } = await import("@/lib/supabase");

  const { count: total } = await supabase
    .from("analytics_events")
    .select("*", { count: "exact", head: true });

  const { data: allVisitors } = await supabase.from("analytics_events").select("visitor_id");
  const uniqueSet = new Set(allVisitors?.map((v: any) => v.visitor_id));

  const last7Days: { date: string; views: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    last7Days.push({ date: d.toISOString().split("T")[0], views: 0 });
  }

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const { data: recentEvents } = await supabase
    .from("analytics_events")
    .select("created_at")
    .gte("created_at", sevenDaysAgo.toISOString());

  if (recentEvents) {
    recentEvents.forEach((e: any) => {
      const day = new Date(e.created_at).toISOString().split("T")[0];
      const entry = last7Days.find(d => d.date === day);
      if (entry) entry.views++;
    });
  }

  return NextResponse.json({
    totalViews: total || 0,
    uniqueVisitors: uniqueSet.size,
    todayViews: 0,            // we’ll re‑add today’s filter later, just checking raw first
    viewsOverTime: last7Days,
    topPages: [],
    deviceBreakdown: [],
    browserBreakdown: [],
  });
}