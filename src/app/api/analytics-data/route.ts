import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const { supabase } = await import("@/lib/supabase");

  // ----- total views (exclude admin) -----
  const { count: total } = await supabase
    .from("analytics_events")
    .select("*", { count: "exact", head: true })
    .not("path", "ilike", "/portalsydr%");

  // ----- unique visitors -----
  const { data: allVisitors } = await supabase
    .from("analytics_events")
    .select("visitor_id")
    .not("path", "ilike", "/portalsydr%");
  const uniqueSet = new Set(allVisitors?.map((v: any) => v.visitor_id));

  // ----- today's views -----
  const todayStart = new Date().toISOString().split("T")[0] + "T00:00:00";
  const todayEnd = new Date().toISOString().split("T")[0] + "T23:59:59";
  const { count: today } = await supabase
    .from("analytics_events")
    .select("*", { count: "exact", head: true })
    .not("path", "ilike", "/portalsydr%")
    .gte("created_at", todayStart)
    .lte("created_at", todayEnd);

  // ----- last 7 days -----
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
    .not("path", "ilike", "/portalsydr%")
    .gte("created_at", sevenDaysAgo.toISOString());

  if (recentEvents) {
    recentEvents.forEach((e: any) => {
      const day = new Date(e.created_at).toISOString().split("T")[0];
      const entry = last7Days.find((d) => d.date === day);
      if (entry) entry.views++;
    });
  }

  // ----- top pages -----
  const { data: pathData } = await supabase
    .from("analytics_events")
    .select("path")
    .not("path", "ilike", "/portalsydr%");
  const pathCounts: Record<string, number> = {};
  pathData?.forEach((r: any) => {
    pathCounts[r.path] = (pathCounts[r.path] || 0) + 1;
  });
  const topPages = Object.entries(pathCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  // ----- device breakdown -----
  const { data: deviceData } = await supabase
    .from("analytics_events")
    .select("device")
    .not("path", "ilike", "/portalsydr%");
  const deviceCounts: Record<string, number> = {};
  deviceData?.forEach((r: any) => {
    deviceCounts[r.device] = (deviceCounts[r.device] || 0) + 1;
  });
  const deviceBreakdown = Object.entries(deviceCounts).map(([name, value]) => ({ name, value }));

  // ----- browser breakdown -----
  const { data: browserData } = await supabase
    .from("analytics_events")
    .select("browser")
    .not("path", "ilike", "/portalsydr%");
  const browserCounts: Record<string, number> = {};
  browserData?.forEach((r: any) => {
    browserCounts[r.browser] = (browserCounts[r.browser] || 0) + 1;
  });
  const browserBreakdown = Object.entries(browserCounts).map(([name, value]) => ({ name, value }));

  return NextResponse.json({
    totalViews: total || 0,
    uniqueVisitors: uniqueSet.size,
    todayViews: today || 0,
    viewsOverTime: last7Days,
    topPages,
    deviceBreakdown,
    browserBreakdown,
  });
}