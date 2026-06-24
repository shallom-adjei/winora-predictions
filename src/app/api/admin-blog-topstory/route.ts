import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { id, currentTopStoryUntil } = await req.json();
  const now = new Date();
  const isTop = currentTopStoryUntil && new Date(currentTopStoryUntil) > now;

  const newValue = isTop ? null : new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

  const { supabase } = await import("@/lib/supabase");
  const { error } = await supabase
    .from("blog_posts")
    .update({ top_story_until: newValue })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}