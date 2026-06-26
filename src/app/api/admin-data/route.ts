import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const { supabase } = await import("@/lib/supabase");

  // Upcoming matches (pending or null result)
  const { data: upcoming } = await supabase
    .from("predictions")
    .select("*")
    .or("result.eq.pending,result.is.null")
    .order("created_at", { ascending: false })
    .limit(20);

  // Recent predictions
  const { data: recent } = await supabase
    .from("predictions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10);

  // Waitlist
  const { data: waitlist } = await supabase
    .from("waitlist")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10);

  // Analytics data (win rate, pending, avg confidence, today's predictions)
  const { data: results } = await supabase
    .from("predictions")
    .select("result")
    .not("result", "is", null)
    .neq("result", "Pending");
  const wins = results?.filter((r: any) => r.result === "Win").length || 0;
  const total = results?.length || 1;
  const winRate = ((wins / total) * 100).toFixed(1);

  const { count: pending } = await supabase
    .from("predictions")
    .select("*", { count: "exact", head: true })
    .or("result.is.null,result.eq.Pending");

  const { data: confidenceData } = await supabase
    .from("predictions")
    .select("confidence")
    .not("confidence", "is", null);
  const avgConf = confidenceData?.length
    ? (confidenceData.reduce((sum: number, r: any) => sum + (r.confidence || 0), 0) / confidenceData.length).toFixed(1)
    : "0";

  const todayStart = new Date().toISOString().split("T")[0] + "T00:00:00";
  const todayEnd = new Date().toISOString().split("T")[0] + "T23:59:59";
  const { count: todayPreds } = await supabase
    .from("predictions")
    .select("*", { count: "exact", head: true })
    .gte("created_at", todayStart)
    .lte("created_at", todayEnd);

   return NextResponse.json(
    {
      upcoming: upcoming || [],
      recent: recent || [],
      waitlist: waitlist || [],
      winRate,
      pending,
      avgConf,
      todayPreds,
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}