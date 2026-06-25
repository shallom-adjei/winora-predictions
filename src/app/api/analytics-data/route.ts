import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const { supabase } = await import("@/lib/supabase");

  const baseQuery = () =>
    supabase.from("analytics_events").select("*", { count: "exact" }).not("path", "ilike", "/portalsydr%");

  // Total views
  const { count: total } = await baseQuery();

  // Unique visitors
  const { data: allVisitors } = await baseQuery();
  const uniqueSet = new Set(allVisitors?.map((v: any) => v.visitor_id));

  // Today
  const todayStart = new Date().toISOString().split("T")[0] + "T00:00:00";
  const todayEnd = new Date().toISOString().split("T")[0] + "T23:59:59";
  const { count: today } = await supabase
    .from("analytics_events")
    .select("*", { count: "exact", head: true })
    .not("path", "ilike", "/portalsydr%")
    .gte("created_at", todayStart)
    .lte("created_at", todayEnd);

  // 7‑day trend
  const last7Days: { date: string; views: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    last7Days.push({ date: d.toISOString().split("T")[0], views: 0 });
  }
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const { data: recent } = await baseQuery().gte("created_at", sevenDaysAgo.toISOString());
  recent?.forEach((e: any) => {
    const day = new Date(e.created_at).toISOString().split("T")[0];
    const entry = last7Days.find(d => d.date === day);
    if (entry) entry.views++;
  });

  // Top pages
  const { data: pathData } = await baseQuery();
  const pathCounts: Record<string, number> = {};
  pathData?.forEach((r: any) => { pathCounts[r.path] = (pathCounts[r.path] || 0) + 1; });
  const topPages = Object.entries(pathCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  // Device / Browser
  const deviceCounts: Record<string, number> = {};
  const browserCounts: Record<string, number> = {};
  allVisitors?.forEach((r: any) => {
    const d = r.device || "desktop";
    const b = r.browser || "Unknown";
    deviceCounts[d] = (deviceCounts[d] || 0) + 1;
    browserCounts[b] = (browserCounts[b] || 0) + 1;
  });

  const response = NextResponse.json({
    totalViews: total || 0,
    uniqueVisitors: uniqueSet.size,
    todayViews: today || 0,
    viewsOverTime: last7Days,
    topPages,
    deviceBreakdown: Object.entries(deviceCounts).map(([name, value]) => ({ name, value })),
    browserBreakdown: Object.entries(browserCounts).map(([name, value]) => ({ name, value })),
    _ts: Date.now(),
    _v: 2,   // increment this if you change the structure
  });

  response.headers.set("Cache-Control", "no-store, max-age=0, must-revalidate");
  return response;
}