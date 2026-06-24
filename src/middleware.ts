import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Allow login page and API routes
  if (
    request.nextUrl.pathname.startsWith("/portalsydr/login") ||
    request.nextUrl.pathname.startsWith("/api/")
  ) {
    return NextResponse.next();
  }

  // Just check if the admin_token cookie exists
  const hasToken = request.cookies.has("admin_token");

  if (!hasToken) {
    return NextResponse.redirect(new URL("/portalsydr/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/portalsydr/:path*"],
};