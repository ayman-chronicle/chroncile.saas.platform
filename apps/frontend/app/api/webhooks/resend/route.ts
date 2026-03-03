import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Resend webhook: delivery/opens/clicks.
 * Escalation log lives in the backend (Rust). Point Resend to the backend
 * when POST /api/webhooks/resend is implemented there, or keep this stub
 * and accept that delivery status is not updated in the app.
 */
export async function POST() {
  return NextResponse.json(
    {
      error: "Resend webhook not handled here. Configure webhook URL to the backend when available.",
      code: "USE_BACKEND_WEBHOOK",
    },
    { status: 501 }
  );
}
