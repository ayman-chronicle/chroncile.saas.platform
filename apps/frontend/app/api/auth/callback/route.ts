/**
 * GET /api/auth/callback
 *
 * Handles the WorkOS redirect after the OAuth round-trip.
 *
 * Per the doc, three things can happen at the callback:
 *
 * 1. Happy path — `?code=...&state=...`. We exchange the code for a sealed
 *    session and set the cookie.
 *
 * 2. OAuth provider error — `?error=...&error_description=...`. WorkOS or
 *    Google passed back a failure. Redirect to /login with the reason.
 *
 * 3. Authentication error from WorkOS — `authenticateWithCode` throws with a
 *    typed code:
 *      - `email_verification_required`     → user needs to verify email
 *      - `mfa_enrollment` / `mfa_challenge` → user needs MFA flow
 *      - `organization_selection_required` → user is in multiple orgs
 *      - `sso_required`                    → must use SSO
 *      - `organization_authentication_methods_required` → policy mismatch
 *
 *    These come from the doc:
 *    https://workos.com/docs/reference/authkit/authentication-errors
 *
 *    For now (Custom UI, Google OAuth only) we don't have UI for these
 *    flows yet — we redirect to /login with the specific code so the user
 *    knows what happened. The next iteration adds dedicated screens.
 *
 * Docs:
 *   https://workos.com/docs/reference/authkit/authentication/code
 *   https://workos.com/docs/reference/authkit/authentication-errors
 */

import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

import {
  getCookiePassword,
  setSealedSession,
} from "@/server/auth/session";
import { verifyOAuthState } from "@/server/auth/state-token";
import { workos, WORKOS_CLIENT_ID } from "@/server/auth/workos";

function errorRedirect(message: string): never {
  redirect(`/login?error=${encodeURIComponent(message)}`);
}

function getClientIp(request: NextRequest): string | undefined {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || undefined;
  }
  return request.headers.get("x-real-ip") ?? undefined;
}

/**
 * Maps a thrown error from `authenticateWithCode` to a stable `error` code
 * we surface on the /login page. Falls back to a generic code.
 */
function classifyAuthError(err: unknown): string {
  if (!err || typeof err !== "object") return "authentication_failed";

  // WorkOS SDK throws structured errors with a `code` or `error` field.
  const code = (err as { code?: unknown }).code;
  if (typeof code === "string") return code;
  const altError = (err as { error?: unknown }).error;
  if (typeof altError === "string") return altError;

  // OauthException nested errors[].
  const errors = (err as { errors?: unknown[] }).errors;
  if (Array.isArray(errors) && errors.length > 0) {
    const first = errors[0];
    if (first && typeof first === "object") {
      const innerCode =
        (first as { code?: unknown }).code ??
        (first as { error?: unknown }).error;
      if (typeof innerCode === "string") return innerCode;
    }
  }

  return "authentication_failed";
}

export async function GET(request: NextRequest) {
  // 1. Provider-level error came back (user hit "Cancel" on Google, etc.).
  const providerError = request.nextUrl.searchParams.get("error");
  if (providerError) {
    const desc = request.nextUrl.searchParams.get("error_description") ?? "";
    console.warn("[auth/callback] provider returned error:", providerError, desc);
    errorRedirect(providerError);
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");

  if (!code) errorRedirect("missing_code");
  if (!state) errorRedirect("missing_state");

  const stateData = verifyOAuthState(state);
  if (!stateData) errorRedirect("oauth_state_invalid");

  const ipAddress = getClientIp(request);
  const userAgent = request.headers.get("user-agent") ?? undefined;

  // 2. Exchange the code for a sealed session.
  let result;
  try {
    // SDK 9.1.1 ships `sealSession` at runtime; .d.ts lags.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    result = await (workos.userManagement as any).authenticateWithCode({
      code,
      clientId: WORKOS_CLIENT_ID,
      ipAddress,
      userAgent,
      session: {
        sealSession: true,
        cookiePassword: getCookiePassword(),
      },
    });
  } catch (error) {
    const code = classifyAuthError(error);
    console.warn("[auth/callback] authenticateWithCode failed:", code, error);
    errorRedirect(code);
  }

  const { sealedSession, organizationId } = result as {
    sealedSession?: string;
    organizationId?: string;
  };

  if (!sealedSession) {
    console.error(
      "[auth/callback] SDK returned no sealedSession despite sealSession=true",
    );
    errorRedirect("sealing_failed");
  }

  await setSealedSession(sealedSession);

  if (!organizationId) {
    redirect("/onboarding/workspace");
  }

  redirect(stateData.from ?? "/dashboard");
}
