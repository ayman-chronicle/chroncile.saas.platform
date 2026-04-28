import { NextRequest, NextResponse } from "next/server";

import { SESSION_COOKIE_NAME } from "@/server/auth/session";

const PUBLIC_PATHS = new Set<string>([
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/auth-test", // dev-only debug page (removed in CP 10)
]);

const PUBLIC_PREFIXES = [
  "/api/auth/", // OAuth + callbacks + refresh + sign-out
  "/api/webhooks/", // Stripe, WorkOS, etc.
];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export default function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const hasSession = request.cookies.has(SESSION_COOKIE_NAME);
  if (!hasSession) {
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/") {
      loginUrl.searchParams.set("from", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|_next/data|favicon.ico|.*\\..*$).*)",
  ],
};
