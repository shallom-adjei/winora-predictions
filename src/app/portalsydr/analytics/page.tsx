"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { ArrowLeft, BarChart3, TrendingUp, Users, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const COLORS = ["#D4AF37", "#6B7280", "#22C55E", "#EF4444", "#3B82F6"];

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [totalViews, setTotalViews] = useState(0);
  const [uniqueVisitors, setUniqueVisitors] = useState(0);
  const [todayViews, setTodayViews] = useState(0);
  const [viewsOverTime, setViewsOverTime] = useState<any[]>([]);
  const [topPages, setTopPages] = useState<any[]>([]);
  const [deviceBreakdown, setDeviceBreakdown] = useState<any[]>([]);
  const [browserBreakdown, setBrowserBreakdown] = useState<any[]>([]);

  const fetchAnalytics = async () => {
    setLoading(true);

    // ----- total views -----
    const { count: total } = await supabase
      .from("analytics_events")
      .select("*", { count: "exact", head: true });
    setTotalViews(total || 0);

    // ----- unique visitors (distinct visitor_id) -----
    const { data: allVisitors } = await supabase
      .from("analytics_events")
      .select("visitor_id");
    const uniqueSet = new Set(allVisitors?.map((v: any) => v.visitor_id));
    setUniqueVisitors(uniqueSet.size);

    // ----- today's views -----
    const todayStart = new Date().toISOString().split("T")[0] + "T00:00:00";
    const todayEnd = new Date().toISOString().split("T")[0] + "T23:59:59";
    const { count: today } = await supabase
      .from("analytics_events")
      .select("*", { count: "exact", head: true })
      .gte("created_at", todayStart)
      .lte("created_at", todayEnd);
    setTodayViews(today || 0);

    // ----- last 7 days trend -----
    const last7Days: { date: string; views: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStr = d.toISOString().split("T")[0];
      last7Days.push({ date: dayStr, views: 0 });
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
        const entry = last7Days.find((d) => d.date === day);
        if (entry) entry.views++;
      });
    }
    setViewsOverTime(last7Days);

    // ----- top pages -----
    const { data: pathData } = await supabase
      .from("analytics_events")
      .select("path");
    const pathCounts: Record<string, number> = {};
    pathData?.forEach((r: any) => {
      pathCounts[r.path] = (pathCounts[r.path] || 0) + 1;
    });
    const sortedPaths = Object.entries(pathCounts)
      .map(([path, count]) => ({ name: path, value: count }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
    setTopPages(sortedPaths);

    // ----- device breakdown -----
    const { data: deviceData } = await supabase
      .from("analytics_events")
      .select("device");
    const deviceCounts: Record<string, number> = {};
    deviceData?.forEach((r: any) => {
      deviceCounts[r.device] = (deviceCounts[r.device] || 0) + 1;
    });
    setDeviceBreakdown(
      Object.entries(deviceCounts).map(([name, value]) => ({ name, value }))
    );

    // ----- browser breakdown -----
    const { data: browserData } = await supabase
      .from("analytics_events")
      .select("browser");
    const browserCounts: Record<string, number> = {};
    browserData?.forEach((r: any) => {
      browserCounts[r.browser] = (browserCounts[r.browser] || 0) + 1;
    });
    setBrowserBreakdown(
      Object.entries(browserCounts).map(([name, value]) => ({ name, value }))
    );

    setLoading(false);
  };

  useEffect(() => {
    fetchAnalytics();
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
          <h1 className="text-2xl font-bold">Site Analytics</h1>
        </div>

        {loading ? (
          <p className="text-gray-400">Loading…</p>
        ) : (
          <div className="space-y-8">
            {/* ---- KPI cards ---- */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-[20px] bg-[#0D0D0D] border border-white/5 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Eye className="h-5 w-5 text-gold-400" />
                  <p className="text-xs text-gray-400">Total Page Views</p>
                </div>
                <p className="text-2xl font-bold">{totalViews}</p>
              </div>
              <div className="rounded-[20px] bg-[#0D0D0D] border border-white/5 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-5 w-5 text-gold-400" />
                  <p className="text-xs text-gray-400">Unique Visitors</p>
                </div>
                <p className="text-2xl font-bold">{uniqueVisitors}</p>
              </div>
              <div className="rounded-[20px] bg-[#0D0D0D] border border-white/5 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-5 w-5 text-gold-400" />
                  <p className="text-xs text-gray-400">Today's Views</p>
                </div>
                <p className="text-2xl font-bold">{todayViews}</p>
              </div>
            </div>

            {/* ---- Views Over Time ---- */}
            <div className="rounded-[20px] bg-[#0D0D0D] border border-white/5 p-6">
              <h3 className="text-lg font-semibold mb-4">Views – Last 7 Days</h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={viewsOverTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fill: "#9CA3AF", fontSize: 12 }} />
                  <YAxis tick={{ fill: "#9CA3AF", fontSize: 12 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0D0D0D",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: "8px",
                    }}
                  />
                  <Line type="monotone" dataKey="views" stroke="#D4AF37" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* ---- Top Pages & Device/Browser ---- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Top Pages */}
              <div className="rounded-[20px] bg-[#0D0D0D] border border-white/5 p-6">
                <h3 className="text-lg font-semibold mb-4">Top 5 Pages</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={topPages} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis type="number" tick={{ fill: "#9CA3AF", fontSize: 12 }} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fill: "#9CA3AF", fontSize: 12 }}
                      width={80}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0D0D0D",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar dataKey="value" fill="#D4AF37" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Device Breakdown */}
              <div className="rounded-[20px] bg-[#0D0D0D] border border-white/5 p-6">
                <h3 className="text-lg font-semibold mb-4">Device</h3>
                {deviceBreakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={deviceBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {deviceBreakdown.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0D0D0D",
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderRadius: "8px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-400 text-sm">No data yet</p>
                )}
                <div className="flex flex-wrap gap-3 mt-2">
                  {deviceBreakdown.map((d, i) => (
                    <span key={d.name} className="flex items-center gap-1 text-xs text-gray-400">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: COLORS[i % COLORS.length] }}
                      />
                      {d.name}
                    </span>
                  ))}
                </div>
              </div>

              {/* Browser Breakdown */}
              <div className="rounded-[20px] bg-[#0D0D0D] border border-white/5 p-6">
                <h3 className="text-lg font-semibold mb-4">Browser</h3>
                {browserBreakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={browserBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {browserBreakdown.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0D0D0D",
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderRadius: "8px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-400 text-sm">No data yet</p>
                )}
                <div className="flex flex-wrap gap-3 mt-2">
                  {browserBreakdown.map((b, i) => (
                    <span key={b.name} className="flex items-center gap-1 text-xs text-gray-400">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: COLORS[i % COLORS.length] }}
                      />
                      {b.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}