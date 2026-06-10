import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabase.from("predictions").select("id").limit(1);
  if (error) return NextResponse.json({ ok: false, error: error.message });
  return NextResponse.json({ ok: true, count: data.length });
}