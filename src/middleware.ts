import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createHmac } from "crypto";

export function middleware(request: NextRequest) {
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
    const secret = "winora-admin-protection-2026";
    const [passwordPart, expiryStr, signature] = token.split(":");
    const expiry = parseInt(expiryStr);

    if (Date.now() > expiry) {
      throw new Error("Expired");
    }

    const decodedPassword = decodeURIComponent(passwordPart);
    const payload = `${decodedPassword}:${expiryStr}`;
    const expectedSig = createHmac("sha256", secret).update(payload).digest("hex");

    if (signature !== expectedSig || decodedPassword !== process.env.ADMIN_PASSWORD) {
      throw new Error("Invalid token");
    }

    return NextResponse.next();
  } catch {
    const response = NextResponse.redirect(new URL("/admin/login", request.url));
    response.cookies.delete("admin_token");
    return response;
  }
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
