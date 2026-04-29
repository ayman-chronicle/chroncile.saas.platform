import { NextResponse, type NextRequest } from "next/server";

import {
  classifyAuthError,
  isEmailAlreadyExistsError,
  isWeakPasswordError,
} from "@/server/auth/auth-errors";
import { getCookiePassword, setSealedSession } from "@/server/auth/session";
import {
  assertWorkOSEnvironment,
  workos,
  WORKOS_CLIENT_ID,
} from "@/server/auth/workos";

export const dynamic = "force-dynamic";

interface SignupBody {
  email?: unknown;
  password?: unknown;
  firstName?: unknown;
  lastName?: unknown;
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

function trimOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function POST(request: NextRequest) {
  assertWorkOSEnvironment();

  const body = (await request.json().catch(() => null)) as SignupBody | null;
  const email = trimOrNull(body?.email);
  const password = typeof body?.password === "string" ? body.password : "";
  const firstName = trimOrNull(body?.firstName);
  const lastName = trimOrNull(body?.lastName);

  if (!email || !password) {
    return NextResponse.json(
      { error: "missing_credentials" },
      { status: 400 },
    );
  }

  let userId: string;
  try {
    const created = await workos.userManagement.createUser({
      email,
      password,
      ...(firstName ? { firstName } : {}),
      ...(lastName ? { lastName } : {}),
    });
    userId = created.id;
  } catch (error) {
    if (isEmailAlreadyExistsError(error)) {
      return NextResponse.json(
        { error: "email_already_exists", email },
        { status: 409 },
      );
    }
    if (isWeakPasswordError(error)) {
      const classified = classifyAuthError(error);
      return NextResponse.json(
        { error: "weak_password", message: classified.message },
        { status: 422 },
      );
    }
    console.error("[auth/signup] createUser failed:", error);
    return NextResponse.json(
      { error: "user_creation_failed" },
      { status: 500 },
    );
  }

  const ipAddress = getClientIp(request);
  const userAgent = request.headers.get("user-agent") ?? undefined;
  const userManagement = workos.userManagement as typeof workos.userManagement &
    PasswordAuthenticator;

  let authResult: PasswordAuthSessionResult | null = null;
  let authError: unknown = null;
  try {
    authResult = await userManagement.authenticateWithPassword({
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
    authError = error;
  }

  if (authError) {
    const classified = classifyAuthError(authError);
    if (classified.code === "email_verification_required") {
      return NextResponse.json(
        {
          ok: true,
          requiresVerify: true,
          userId,
          email: classified.email ?? email,
          pendingAuthenticationToken: classified.pendingAuthenticationToken,
        },
        { status: 201 },
      );
    }

    console.error(
      "[auth/signup] unexpected authenticateWithPassword failure:",
      classified.code,
      classified.message,
    );
    return NextResponse.json(
      { error: classified.code || "authentication_failed" },
      { status: 500 },
    );
  }

  const { sealedSession, organizationId } = authResult ?? {};
  if (!sealedSession) {
    console.error(
      "[auth/signup] SDK returned no sealedSession in path-B (verification off)",
    );
    return NextResponse.json(
      { error: "sealing_failed" },
      { status: 500 },
    );
  }

  await setSealedSession(sealedSession);

  return NextResponse.json(
    {
      ok: true,
      skipVerify: true,
      userId,
      redirect: organizationId ? "/dashboard" : "/onboarding/workspace",
    },
    { status: 201 },
  );
}
