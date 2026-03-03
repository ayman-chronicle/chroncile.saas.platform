import { NextResponse } from "next/server";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";

export const dynamic = "force-dynamic";

/** GET /api/email-actions/[token] — proxy to backend; backend verifies token and returns 302 redirect. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  try {
    const { token } = await params;
    if (!token) {
      return NextResponse.redirect(`${baseUrl}/dashboard/labeling`);
    }

    const res = await fetch(
      `${BACKEND_URL}/api/platform/email-actions/${encodeURIComponent(token)}`,
      { method: "GET", redirect: "manual" }
    );

    if (res.status === 302 || res.status === 301 || res.status === 303) {
      const location = res.headers.get("Location");
      if (location) {
        return NextResponse.redirect(location);
      }
    }

    return NextResponse.redirect(
      `${baseUrl}/dashboard/labeling?error=invalid_or_expired_link`
    );
  } catch (err) {
    console.error("Email action proxy error:", err);
    return NextResponse.redirect(
      `${baseUrl}/dashboard/labeling?error=invalid_or_expired_link`
    );
  }
}
