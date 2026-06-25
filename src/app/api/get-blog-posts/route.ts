import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;               // tells Vercel to never cache this route

export async function GET() {
  const { supabase } = await import("@/lib/supabase");
  const { data } = await supabase
    .from("blog_posts")
    .select("*")
    .order("created_at", { ascending: false });

  const response = NextResponse.json({
    posts: data || [],
    _ts: Date.now()                         // unique every request
  });

  // Aggressive no‑cache headers
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  response.headers.set("Surrogate-Control", "no-store");

  return response;
}