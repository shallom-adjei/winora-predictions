import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { id, title, content, image_url } = await req.json();
  const { supabase } = await import("@/lib/supabase");

  if (id) {
    const updateData: any = { title, content };
    if (image_url) updateData.image_url = image_url;
    const { error } = await supabase.from("blog_posts").update(updateData).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await supabase.from("blog_posts").insert([{ title, content, image_url }]);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}