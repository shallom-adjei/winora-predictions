import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";

const SECRET = "winora‑admin‑protection‑2026";   // fixed string

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  if (password !== adminPassword) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  // Create a simple, password‑free token
  const expiry = Date.now() + 7 * 24 * 60 * 60 * 1000;   // 7 days
  const payload = String(expiry);
  const signature = createHmac("sha256", SECRET).update(payload).digest("hex");
  const token = `${payload}:${signature}`;

  const response = NextResponse.json({ success: true });
  response.cookies.set("admin_token", token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,   // 7 days
  });

  return response;
}
