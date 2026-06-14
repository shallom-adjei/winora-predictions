import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  if (password !== adminPassword) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  // Create a simple signed token (valid for 7 days)
  const secret = process.env.SUPABASE_ANON_KEY || "fallback-secret";   // use any stable secret
  const expiry = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const payload = `${adminPassword}:${expiry}`;
  const signature = createHmac("sha256", secret).update(payload).digest("hex");
  const token = `${payload}:${signature}`;

  const response = NextResponse.json({ success: true });
  response.cookies.set("admin_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,   // 7 days
  });

  return response;
}