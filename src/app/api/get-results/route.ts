import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const { supabaseAdmin } = await import("@/lib/supabaseAdmin");
  const { data, error } = await supabaseAdmin
    .from("predictions")
    .select("*")
    .not("actual_home_score", "is", null)
    .not("actual_away_score", "is", null)
    .not("main_pick", "is", null)
    .neq("main_pick", "")
    .order("kickoff_time", { ascending: false });

  if (error) return NextResponse.json({ results: [] });
  return NextResponse.json({ results: data });
}