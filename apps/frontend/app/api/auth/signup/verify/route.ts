import { NextResponse, type NextRequest } from "next/server";

import { classifyAuthError } from "@/server/auth/auth-errors";
import { getCookiePassword, setSealedSession } from "@/server/auth/session";
import {
  assertWorkOSEnvironment,
  workos,
  WORKOS_CLIENT_ID,
} from "@/server/auth/workos";

export const dynamic = "force-dynamic";

interface VerifyBody {
  pendingAuthenticationToken?: unknown;
  code?: unknown;
}

interface EmailVerificationSessionResult {
  sealedSession?: string;
  organizationId?: string;
}

interface EmailVerificationAuthenticator {
  authenticateWithEmailVerification(args: {
    clientId: string;
    pendingAuthenticationToken: string;
    code: string;
    ipAddress?: string;
    userAgent?: string;
    session: {
      sealSession: boolean;
      cookiePassword: string;
    };
  }): Promise<EmailVerificationSessionResult>;
}

function getClientIp(request: NextRequest): string | undefined {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || undefined;
  return request.headers.get("x-real-ip") ?? undefined;
}

export async function POST(request: NextRequest) {
  assertWorkOSEnvironment();

  const body = (await request.json().catch(() => null)) as VerifyBody | null;
  const pendingAuthenticationToken =
    typeof body?.pendingAuthenticationToken === "string"
      ? body.pendingAuthenticationToken.trim()
      : "";
  const code = typeof body?.code === "string" ? body.code.trim() : "";

  if (!pendingAuthenticationToken) {
    return NextResponse.json(
      { error: "missing_pending_token" },
      { status: 400 },
    );
  }
  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json(
      { error: "invalid_code_format" },
      { status: 400 },
    );
  }

  const ipAddress = getClientIp(request);
  const userAgent = request.headers.get("user-agent") ?? undefined;
  const userManagement = workos.userManagement as typeof workos.userManagement &
    EmailVerificationAuthenticator;

  let result: EmailVerificationSessionResult;
  try {
    result = await userManagement.authenticateWithEmailVerification({
      clientId: WORKOS_CLIENT_ID,
      code,
      pendingAuthenticationToken,
      ipAddress,
      userAgent,
      session: {
        sealSession: true,
        cookiePassword: getCookiePassword(),
      },
    });
  } catch (error) {
    const classified = classifyAuthError(error);
    console.warn(
      "[auth/signup/verify] authenticateWithEmailVerification failed:",
      classified.code,
      classified.message,
    );

    if (
      classified.code === "invalid_one_time_code" ||
      classified.code === "invalid_code" ||
      /code/i.test(classified.message)
    ) {
      return NextResponse.json(
        { error: "invalid_code", message: classified.message },
        { status: 400 },
      );
    }
    if (
      classified.code.startsWith("pending_authentication_token") ||
      /token/i.test(classified.message)
    ) {
      return NextResponse.json(
        { error: "token_invalid", message: classified.message },
        { status: 401 },
      );
    }
    return NextResponse.json(
      { error: classified.code || "verify_failed" },
      { status: 400 },
    );
  }

  const { sealedSession, organizationId } = result;

  if (!sealedSession) {
    console.error(
      "[auth/signup/verify] SDK returned no sealedSession despite sealSession=true",
    );
    return NextResponse.json({ error: "sealing_failed" }, { status: 500 });
  }

  await setSealedSession(sealedSession);

  return NextResponse.json({
    ok: true,
    redirect: organizationId ? "/dashboard" : "/onboarding/workspace",
  });
}
