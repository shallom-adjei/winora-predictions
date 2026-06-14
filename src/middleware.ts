import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  if (
    request.nextUrl.pathname === "/portal‑sydr____/login" ||
    request.nextUrl.pathname === "/api/admin-login"
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get("admin_token")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/portal‑sydr____/login", request.url));
  }

  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword || decoded !== adminPassword) {
      throw new Error("Invalid token");
    }

    return NextResponse.next();
  } catch {
    const response = NextResponse.redirect(new URL("/portal‑sydr____/login", request.url));
    response.cookies.delete("admin_token");
    return response;
  }
}

export const config = {
  matcher: ["/portal‑sydr____", "/portal‑sydr____/:path*"],
};
