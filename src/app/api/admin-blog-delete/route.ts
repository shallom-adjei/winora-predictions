import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { id } = await req.json();
  const { supabase } = await import("@/lib/supabase");
  await supabase.from("blog_posts").delete().eq("id", id);

  const response = NextResponse.json({ success: true });
  response.headers.set("Cache-Control", "no-store");
  return response;
}