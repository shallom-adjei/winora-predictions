import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const { supabase } = await import("@/lib/supabase");
  const { data, error } = await supabase
    .from("predictions")
    .select("*")
    .or("result.eq.pending,result.is.null")
    .order("kickoff_time", { ascending: true });

  if (error) return NextResponse.json({ matches: [] });
  return NextResponse.json({ matches: data });
}