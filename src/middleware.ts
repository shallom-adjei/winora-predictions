import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const host = supabaseUrl.split("//")[1]?.split(".")[0]; // e.g., "qvoauycyibdfxzspjgpb"
  const cookieName = host ? `sb-${host}-auth-token` : "";

  // Check if the Supabase session cookie exists
  const hasSession = request.cookies.has(cookieName);

  // Allow login page and API routes
  if (
    request.nextUrl.pathname.startsWith("/portalsydr/login") ||
    request.nextUrl.pathname.startsWith("/api/")
  ) {
    return NextResponse.next();
  }

  // Redirect to login if no session cookie
  if (!hasSession) {
    return NextResponse.redirect(new URL("/portalsydr/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/portalsydr/:path*"],
};