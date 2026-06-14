import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createHmac } from "crypto";

const SECRET = "winora‑admin‑protection‑2026";   // must match the API route

export function middleware(request: NextRequest) {
  // Allow access to login page and login API
  if (
    request.nextUrl.pathname === "/admin/login" ||
    request.nextUrl.pathname === "/api/admin-login"
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get("admin_token")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  try {
    const [expiryStr, signature] = token.split(":");
    const expiry = parseInt(expiryStr);

    if (Date.now() > expiry) {
      throw new Error("Expired");
    }

    // Re‑compute signature and compare
    const expectedSig = createHmac("sha256", SECRET).update(expiryStr).digest("hex");

    if (signature !== expectedSig) {
      throw new Error("Invalid signature");
    }

    return NextResponse.next();
  } catch {
    // Invalid token – clear cookie and redirect to login
    const response = NextResponse.redirect(new URL("/admin/login", request.url));
    response.cookies.delete("admin_token");
    return response;
  }
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
