import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const { supabase } = await import("@/lib/supabase");
  const { data } = await supabase
    .from("blog_posts")
    .select("*")
    .order("created_at", { ascending: false });

  return NextResponse.json({
    posts: data || [],
    _ts: Date.now()        // ← forces fresh response every call
  });
}