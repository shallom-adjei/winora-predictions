import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, SessionData } from "@/lib/session";

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  if (password !== adminPassword) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  // Get or create the session
  const res = new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" },
  });
  const session = await getIronSession<SessionData>(req, res, sessionOptions);

  session.isLoggedIn = true;
  await session.save();

  return res;
}