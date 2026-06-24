import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { id, title, content, image_url } = await req.json();
  const { supabase } = await import("@/lib/supabase");

  if (id) {
    const updateData: any = { title, content };
    if (image_url) updateData.image_url = image_url;
    await supabase.from("blog_posts").update(updateData).eq("id", id);
  } else {
    await supabase.from("blog_posts").insert([{ title, content, image_url }]);
  }

  const response = NextResponse.json({ success: true });
  response.headers.set("Cache-Control", "no-store");
  return response;
}