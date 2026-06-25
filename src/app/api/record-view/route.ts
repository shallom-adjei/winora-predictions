import { NextRequest, NextResponse } from "next/server";
import { UAParser } from "ua-parser-js";

export async function POST(req: NextRequest) {
  const { path, referrer, visitorId } = await req.json();
  const userAgent = req.headers.get("user-agent") || "";
  const parser = new UAParser(userAgent);
  const browser = parser.getBrowser().name || "Unknown";
  const os = parser.getOS().name || "Unknown";
  const device = parser.getDevice().type || "desktop";

  const { supabase } = await import("@/lib/supabase");
  await supabase.from("analytics_events").insert([
    { visitor_id: visitorId || "anonymous", path: path || "/", referrer: referrer || "", browser, os, device }
  ]);
  return NextResponse.json({ success: true });
}