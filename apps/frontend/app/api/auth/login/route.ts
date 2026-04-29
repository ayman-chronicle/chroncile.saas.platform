import { NextResponse, type NextRequest } from "next/server";

import { classifyAuthError } from "@/server/auth/auth-errors";
import { getCookiePassword, setSealedSession } from "@/server/auth/session";
import {
  assertWorkOSEnvironment,
  workos,
  WORKOS_CLIENT_ID,
} from "@/server/auth/workos";

export const dynamic = "force-dynamic";

interface LoginBody {
  email?: unknown;
  password?: unknown;
}

interface PasswordAuthSessionResult {
  sealedSession?: string;
  organizationId?: string;
}

interface PasswordAuthenticator {
  authenticateWithPassword(args: {
    clientId: string;
    email: string;
    password: string;
    ipAddress?: string;
    userAgent?: string;
    session: {
      sealSession: boolean;
      cookiePassword: string;
    };
  }): Promise<PasswordAuthSessionResult>;
}

function getClientIp(request: NextRequest): string | undefined {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || undefined;
  return request.headers.get("x-real-ip") ?? undefined;
}

function safeRedirect(value: unknown): string {
  if (typeof value !== "string") return "/dashboard";
  if (!value.startsWith("/") || value.startsWith("//")) return "/dashboard";
  return value;
}

export async function POST(request: NextRequest) {
  assertWorkOSEnvironment();

  const body = (await request.json().catch(() => null)) as LoginBody | null;
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json(
      { error: "missing_credentials" },
      { status: 400 },
    );
  }

  const ipAddress = getClientIp(request);
  const userAgent = request.headers.get("user-agent") ?? undefined;
  const fromHeader = request.headers.get("x-auth-from");
  const userManagement = workos.userManagement as typeof workos.userManagement &
    PasswordAuthenticator;

  let result: PasswordAuthSessionResult;
  try {
    result = await userManagement.authenticateWithPassword({
      clientId: WORKOS_CLIENT_ID,
      email,
      password,
      ipAddress,
      userAgent,
      session: {
        sealSession: true,
        cookiePassword: getCookiePassword(),
      },
    });
  } catch (error) {
    const classified = classifyAuthError(error);

    switch (classified.code) {
      case "email_verification_required":
        return NextResponse.json(
          {
            ok: false,
            code: classified.code,
            pendingAuthenticationToken: classified.pendingAuthenticationToken,
            email: classified.email ?? email,
          },
          { status: 200 },
        );

      case "sso_required":
        return NextResponse.json(
          {
            ok: false,
            code: classified.code,
            connectionIds: classified.connectionIds ?? [],
            email: classified.email ?? email,
          },
          { status: 200 },
        );

      case "organization_authentication_methods_required":
        return NextResponse.json(
          {
            ok: false,
            code: classified.code,
            authMethods: classified.authMethods ?? {},
            connectionIds: classified.connectionIds ?? [],
          },
          { status: 200 },
        );

      case "mfa_enrollment":
      case "mfa_challenge":
      case "organization_selection_required":
        return NextResponse.json(
          { error: classified.code, message: classified.message },
          { status: 501 },
        );

      default:
        console.warn(
          "[auth/login] authenticateWithPassword failed:",
          classified.code,
          classified.message,
        );
        return NextResponse.json(
          { error: "invalid_credentials" },
          { status: 401 },
        );
    }
  }

  const { sealedSession, organizationId } = result;

  if (!sealedSession) {
    console.error(
      "[auth/login] SDK returned no sealedSession despite sealSession=true",
    );
    return NextResponse.json({ error: "sealing_failed" }, { status: 500 });
  }

  await setSealedSession(sealedSession);

  const fallback = !organizationId ? "/onboarding/workspace" : "/dashboard";
  const redirect = !organizationId ? fallback : safeRedirect(fromHeader);

  return NextResponse.json({ ok: true, redirect });
}
