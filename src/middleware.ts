import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createHmac } from "crypto";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("admin_token")?.value;

  // If no token, redirect to login
  if (!token) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  // Verify the token
  try {
    const secret = process.env.SUPABASE_ANON_KEY || "fallback-secret";
    const [password, expiryStr, signature] = token.split(":");
    const expiry = parseInt(expiryStr);

    if (Date.now() > expiry) {
      throw new Error("Expired");
    }

    const payload = `${password}:${expiryStr}`;
    const expectedSig = createHmac("sha256", secret).update(payload).digest("hex");

    if (signature !== expectedSig || password !== process.env.ADMIN_PASSWORD) {
      throw new Error("Invalid token");
    }

    return NextResponse.next();
  } catch {
    // Invalid token – clear cookie and redirect
    const response = NextResponse.redirect(new URL("/admin/login", request.url));
    response.cookies.delete("admin_token");
    return response;
  }
}

// Apply to all /admin routes, except the login page itself
export const config = {
  matcher: ["/admin", "/admin/:path*"],
};