import { getIronSession } from "iron-session";
import { SessionOptions } from "iron-session";

export interface SessionData {
  isLoggedIn: boolean;
}

export const sessionOptions: SessionOptions = {
  password: process.env.ADMIN_SESSION_PASSWORD || "a-very-long-secure-password-32chars!!",   // at least 32 characters
  cookieName: "winora_admin_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",   // true in production (HTTPS)
    httpOnly: true,
    sameSite: "lax" as const,
    maxAge: 7 * 24 * 60 * 60,                        // 7 days
    path: "/",
  },
};

// Helper to read the session from a NextRequest (for middleware)
export async function getSessionFromRequest(req: Request) {
  const res = new Response();   // dummy response
  const session = await getIronSession<SessionData>(req, res, sessionOptions);
  return session;
}