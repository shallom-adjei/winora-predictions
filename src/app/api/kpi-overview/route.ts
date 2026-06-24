import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const { supabase } = await import("@/lib/supabase");

  // Total predictions
  const { count: total } = await supabase
    .from("predictions")
    .select("*", { count: "exact", head: true });

  // Win rate
  const { data: results } = await supabase
    .from("predictions")
    .select("result")
    .not("result", "is", null)
    .neq("result", "Pending");
  const wins = results?.filter((r) => r.result === "Win").length || 0;
  const totalWithResult = results?.length || 1;
  const winRate = ((wins / totalWithResult) * 100).toFixed(1);

  // Current streak
  const { data: recent } = await supabase
    .from("predictions")
    .select("result")
    .order("created_at", { ascending: false })
    .limit(20);
  let streak = 0;
  if (recent) {
    for (const r of recent) {
      if (r.result === "Win") streak++;
      else break;
    }
  }

  // Pending count
  const { count: pending } = await supabase
    .from("predictions")
    .select("*", { count: "exact", head: true })
    .or("result.is.null,result.eq.Pending");

  // Average confidence
  const { data: confData } = await supabase
    .from("predictions")
    .select("confidence")
    .not("confidence", "is", null);
  const avgConf = confData?.length
    ? (confData.reduce((sum, r) => sum + (r.confidence || 0), 0) / confData.length).toFixed(1)
    : "0";

  return NextResponse.json({ total, winRate, streak, pending, avgConf });
}