import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const { supabase } = await import("@/lib/supabase");
  const { data, error } = await supabase
    .from("predictions")
    .select("*")
    .order("kickoff_time", { ascending: true });

  if (error) return NextResponse.json({ predictions: [] });
  return NextResponse.json({ predictions: data });
}