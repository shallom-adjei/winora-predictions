import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const { supabase } = await import("@/lib/supabase");

  // Total predictions (all rows)
  const { count: total } = await supabase
    .from("predictions")
    .select("*", { count: "exact", head: true });

  // Fetch all results that are finalized (not null, not Pending)
  const { data: results } = await supabase
    .from("predictions")
    .select("result")
    .not("result", "is", null)
    .neq("result", "Pending");

  const wins = results?.filter((r) => r.result === "Win").length || 0;
  const losses = results?.filter((r) => r.result === "Loss").length || 0;
  const draws = results?.filter((r) => r.result === "Draw" || r.result === "Push").length || 0;
  const totalFinished = wins + losses + draws;
  const winRate = totalFinished > 0 ? ((wins / totalFinished) * 100).toFixed(1) : "0";

  // Current streak (only counting Win results)
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

   return NextResponse.json(
    { total, winRate, wins, losses, draws, streak, pending, avgConf },
    {
     headers: {
      "Cache-Control": "no-store, max-age=0",
      "Vercel-CDN-Cache-Control": "no-cache",   // <-- add this
    },
    }
  );
}