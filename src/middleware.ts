import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createHmac } from "crypto";

export function middleware(request: NextRequest) {
  // Allow access to the login page and login API
  if (
    request.nextUrl.pathname === "/admin/login" ||
    request.nextUrl.pathname === "/api/admin-login"
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get("admin_token")?.value;

  // No token → redirect to login
  if (!token) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  
  // ... inside middleware function
try {
  const secret = process.env.SUPABASE_ANON_KEY || "fallback-secret";
  const [passwordPart, expiryStr, signature] = token.split(":");
  const expiry = parseInt(expiryStr);

  if (Date.now() > expiry) {
    throw new Error("Expired");
  }

  // Decode percent‑encoded characters (e.g., %40 → @)
  const decodedPassword = decodeURIComponent(passwordPart);

  const payload = `${decodedPassword}:${expiryStr}`;
  const expectedSig = createHmac("sha256", secret).update(payload).digest("hex");

  if (signature !== expectedSig || decodedPassword !== process.env.ADMIN_PASSWORD) {
    throw new Error("Invalid token");
  }

  return NextResponse.next();
} catch {
    // Clear the invalid cookie and redirect to login
    const response = NextResponse.redirect(new URL("/admin/login", request.url));
    response.cookies.delete("admin_token");
    return response;
  }
}

// Protect all /admin routes except /admin/login and /api/admin-login
export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
