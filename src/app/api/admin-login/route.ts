import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { password } = await req.json();

  // Fetch the real password from Supabase
  const { supabase } = await import("@/lib/supabase");
  const { data, error } = await supabase
    .from("admin_settings")
    .select("value")
    .eq("key", "admin_password")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  const adminPassword = data.value;

  if (password !== adminPassword) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  // Simple Base64 token
  const token = Buffer.from(password).toString("base64");

  const response = NextResponse.json({ success: true });
  response.cookies.set("admin_token", token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });

  return response;
}