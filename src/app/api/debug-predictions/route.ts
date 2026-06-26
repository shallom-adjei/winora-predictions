import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const { supabase } = await import("@/lib/supabase");

  const { data, error, count } = await supabase
    .from("predictions")
    .select("*", { count: "exact" })
    .neq("match_status", "FINISHED")
    .order("kickoff_time", { ascending: true })
    .limit(50);

  return NextResponse.json(
    {
      predictions: data || [],
      debug: {
        error: error?.message || null,
        count: count || 0,
        dataLength: data?.length || 0,
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "not set",
      },
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}