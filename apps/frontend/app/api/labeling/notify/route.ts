import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ORG_MEMBERS } from "@/lib/labeling/org";
import { getLabelingStore } from "@/lib/labeling/store";
import { buildTraceSummaryForNotification } from "@/lib/labeling/notification-summary";
import { createActionToken } from "@/lib/email-actions";
import { TraceEscalationEmail } from "@/lib/email-templates/trace-escalation";
import { render } from "@react-email/render";
import React from "react";
import { fetchFromBackend } from "@/lib/backend";

export const dynamic = "force-dynamic";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/** POST /api/labeling/notify — proxy to backend (Rust) for send + escalation log. Frontend builds HTML. */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { memberId, traceId, channel, message } = body as {
      memberId: string;
      traceId: string;
      channel: "slack" | "email";
      message?: string;
    };

    if (!memberId || !traceId || !channel) {
      return NextResponse.json(
        { error: "memberId, traceId, and channel are required" },
        { status: 400 }
      );
    }

    if (channel === "email") {
      const member = ORG_MEMBERS.find((m) => m.id === memberId);
      if (!member?.email) {
        return NextResponse.json(
          { error: "Reviewer has no email address" },
          { status: 400 }
        );
      }

      const store = await getLabelingStore();
      const trace = await store.getById(session.user.tenantId, traceId);
      if (!trace) {
        return NextResponse.json(
          { error: "Trace not found" },
          { status: 404 }
        );
      }

      const summary = buildTraceSummaryForNotification(trace, message ?? undefined);
      const viewToken = createActionToken({
        action: "view",
        traceId,
        escalationId: "esc_frontend",
        toUserId: memberId,
      });
      const claimToken = createActionToken({
        action: "claim",
        traceId,
        escalationId: "esc_frontend",
        toUserId: memberId,
      });
      const escalateToken = createActionToken({
        action: "escalate",
        traceId,
        escalationId: "esc_frontend",
        toUserId: memberId,
      });
      const viewUrl = `${BASE_URL}/api/email-actions/${viewToken}`;
      const claimUrl = `${BASE_URL}/api/email-actions/${claimToken}`;
      const escalateUrl = `${BASE_URL}/api/email-actions/${escalateToken}`;

      const html = await render(
        React.createElement(TraceEscalationEmail, {
          summary,
          viewUrl,
          claimUrl,
          escalateUrl,
          customMessage: message ?? null,
        })
      );

      const result = await fetchFromBackend<{
        success: boolean;
        escalationId: string;
        channel: string;
        alreadySent?: boolean;
      }>("/api/platform/labeling/notify", {
        method: "POST",
        body: JSON.stringify({
          memberId,
          traceId,
          channel: "email",
          message: message ?? undefined,
          toEmail: member.email,
          subject: `Trace requires review — #${summary.id}`,
          htmlContent: html,
        }),
      });

      return NextResponse.json({
        success: result.success,
        escalationId: result.escalationId,
        channel: "email",
        ...(result.alreadySent !== undefined && { alreadySent: result.alreadySent }),
      });
    }

    // Slack: proxy same body to backend (backend creates log, no email)
    const result = await fetchFromBackend<{
      success: boolean;
      escalationId: string;
      channel: string;
      alreadySent?: boolean;
    }>("/api/platform/labeling/notify", {
      method: "POST",
      body: JSON.stringify({
        memberId,
        traceId,
        channel: "slack",
        message: message ?? undefined,
      }),
    });

    return NextResponse.json({
      success: result.success,
      escalationId: result.escalationId,
      channel: "slack",
      memberName: ORG_MEMBERS.find((m) => m.id === memberId)?.name ?? "Unknown",
      sentAt: new Date().toISOString(),
      ...(result.alreadySent !== undefined && { alreadySent: result.alreadySent }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send notification";
    console.error("Notify failed:", err);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
