import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { id, currentTopStoryUntil } = await req.json();
  const now = new Date();
  const isTop = currentTopStoryUntil && new Date(currentTopStoryUntil) > now;
  const newValue = isTop ? null : new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

  const { supabase } = await import("@/lib/supabase");
  await supabase.from("blog_posts").update({ top_story_until: newValue }).eq("id", id);

  const response = NextResponse.json({ success: true });
  response.headers.set("Cache-Control", "no-store");
  return response;
}