import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const { supabase } = await import("@/lib/supabase");
  const { data, error } = await supabase
    .from("predictions")
    .select("*")
    .not("result", "is", null)
    .neq("result", "Pending")
    .order("kickoff_time", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ results: data });
}