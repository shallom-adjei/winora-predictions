import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const { supabase } = await import("@/lib/supabase");
  const { data, error } = await supabase
    .from("predictions")
    .select("*")
    .not("result", "is", null)
    .neq("result", "Pending")
    .order("kickoff_time", { ascending: false });

  if (error) return NextResponse.json({ results: [] });
  return NextResponse.json({ results: data });
}