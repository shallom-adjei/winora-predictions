import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const { supabase } = await import("@/lib/supabase");
  const { data, error } = await supabase
    .from("blog_posts")
    .select("*")
    .order("created_at", { ascending: false });

  const response = NextResponse.json({ posts: data || [] });
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
}