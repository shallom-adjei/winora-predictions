import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const { supabase } = await import("@/lib/supabase");
  const { data, error } = await supabase
    .from("predictions")
    .select("*")
    .neq("match_status", "FINISHED")
    .order("kickoff_time", { ascending: true })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return new Response(
    JSON.stringify({
      predictions: data || [],
      _ts: Date.now()
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, max-age=0, must-revalidate, private',
        'CDN-Cache-Control': 'no-store',
        'Vercel-CDN-Cache-Control': 'no-store',
        'Surrogate-Control': 'no-store',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    }
  );
}