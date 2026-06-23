import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const { supabase } = await import("@/lib/supabase");
  const { data, error } = await supabase
    .from("predictions")
    .select("*")
    .neq("match_status", "FINISHED")
    .order("kickoff_time", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ predictions: data });
}