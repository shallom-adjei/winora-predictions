import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  if (
    request.nextUrl.pathname === "/portalsydr/login" ||
    request.nextUrl.pathname === "/api/admin-login" ||
    request.nextUrl.pathname === "/api/admin-change-password"
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get("admin_token")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/portalsydr/login", request.url));
  }

  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");

    const { supabase } = await import("@/lib/supabase");
    const { data } = await supabase
      .from("admin_settings")
      .select("value")
      .eq("key", "admin_password")
      .single();

    if (!data || decoded !== data.value) {
      throw new Error("Invalid token");
    }

    return NextResponse.next();
  } catch {
    const response = NextResponse.redirect(new URL("/portalsydr/login", request.url));
    response.cookies.delete("admin_token");
    return response;
  }
}

export const config = {
  matcher: ["/portalsydr/:path*"],
};