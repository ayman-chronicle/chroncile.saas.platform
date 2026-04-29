import type {
  Impersonator,
  User,
} from "@workos-inc/node";
import { cookies } from "next/headers";

import { assertWorkOSEnvironment, workos } from "./workos";

export const SESSION_COOKIE_NAME = "wos-session";

const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

function cookiePassword(): string {
  const password = process.env.WORKOS_COOKIE_PASSWORD;
  if (!password || password.length < 32) {
    throw new Error(
      "WORKOS_COOKIE_PASSWORD must be set and at least 32 characters long. " +
        "Generate one with: openssl rand -base64 32",
    );
  }
  return password;
}

function cookieAttributes() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_COOKIE_MAX_AGE,
  };
}

export type AuthenticateResult =
  | {
      authenticated: true;
      accessToken: string;
      sessionId: string;
      user: User;
      organizationId?: string;
      role?: string;
      roles?: string[];
      permissions?: string[];
      entitlements?: string[];
      featureFlags?: string[];
      impersonator?: Impersonator;
    }
  | {
      authenticated: false;
      reason:
        | "invalid_jwt"
        | "invalid_session_cookie"
        | "no_session_cookie_provided"
        | "no_cookie";
    };

export type RefreshResult =
  | {
      authenticated: true;
      sealedSession: string;
      sessionId: string;
      user: User;
      organizationId?: string;
      role?: string;
      roles?: string[];
      permissions?: string[];
      entitlements?: string[];
      featureFlags?: string[];
      impersonator?: Impersonator;
    }
  | {
      authenticated: false;
      reason: string;
    };

export interface SealedSession {
  authenticate(): Promise<AuthenticateResult>;
  refresh(opts?: {
    cookiePassword?: string;
    organizationId?: string;
  }): Promise<RefreshResult>;
  getLogOutUrl(opts?: { returnTo?: string }): Promise<string>;
}

export async function loadSession(): Promise<SealedSession | null> {
  const sessionData = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!sessionData) return null;

  assertWorkOSEnvironment();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const helper = (workos.userManagement as any).loadSealedSession({
    sessionData,
    cookiePassword: cookiePassword(),
  }) as SealedSession;
  return helper;
}

export async function getSession(): Promise<AuthenticateResult> {
  const session = await loadSession();
  if (!session) {
    return { authenticated: false, reason: "no_cookie" };
  }
  return session.authenticate();
}

export async function setSealedSession(sealedSession: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, sealedSession, cookieAttributes());
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE_NAME);
}

export function getCookiePassword(): string {
  return cookiePassword();
}

export function getSessionCookieAttributes() {
  return cookieAttributes();
}
