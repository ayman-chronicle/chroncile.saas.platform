import { getSession } from "./session";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "";

export interface AuthSessionUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: string;
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  backendToken: string;
  workosUserId: string | null;
  workosOrganizationId: string | null;
}

export interface AuthSession {
  user: AuthSessionUser;
  backendToken: string;
}

interface BackendMeResponse {
  userId: string;
  email: string;
  name: string | null;
  role: string;
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  workosUserId: string | null;
  workosOrganizationId: string | null;
}

/**
 * Returns the current session in NextAuth-compatible shape, or `null` if
 * the user is not signed in (no cookie or expired access token).
 *
 * The caller should redirect to `/login` on null. The client-side
 * `AuthSessionProvider` will handle refresh attempts.
 */
export async function auth(): Promise<AuthSession | null> {
  const session = await getSession();
  if (!session.authenticated) {
    return null;
  }

  // Best-effort backend enrichment for tenant details.
  let me: BackendMeResponse | null = null;
  if (BACKEND_URL && session.organizationId) {
    try {
      const res = await fetch(`${BACKEND_URL}/api/saas/me`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
        next: { revalidate: 0 },
      });
      if (res.ok) {
        me = (await res.json()) as BackendMeResponse;
      }
    } catch (err) {
      console.warn("[auth] backend /api/saas/me unreachable", err);
    }
  }

  const fallbackName =
    [session.user.firstName, session.user.lastName].filter(Boolean).join(" ") ||
    null;

  const user: AuthSessionUser = {
    id: me?.userId ?? session.user.id,
    email: me?.email ?? session.user.email,
    name: me?.name ?? fallbackName,
    image: session.user.profilePictureUrl ?? null,
    role: me?.role ?? session.role ?? "member",
    tenantId: me?.tenantId ?? "",
    tenantName: me?.tenantName ?? "",
    tenantSlug: me?.tenantSlug ?? "",
    backendToken: session.accessToken,
    workosUserId: me?.workosUserId ?? session.user.id,
    workosOrganizationId:
      me?.workosOrganizationId ?? session.organizationId ?? null,
  };

  return { user, backendToken: session.accessToken };
}

// ---------------------------------------------------------------------------
// Compatibility stubs for legacy NextAuth imports.
// ---------------------------------------------------------------------------

const STUB_RESPONSE = () =>
  new Response(
    JSON.stringify({
      error:
        "This route is part of the legacy NextAuth flow which has been replaced by /api/auth/oauth/google + /api/auth/callback. Update your client to call those instead.",
    }),
    { status: 410, headers: { "content-type": "application/json" } },
  );

export const handlers = {
  GET: STUB_RESPONSE,
  POST: STUB_RESPONSE,
};

export async function signIn(): Promise<never> {
  throw new Error(
    "signIn() is no longer supported. Redirect to /api/auth/oauth/google instead.",
  );
}

export async function signOut(): Promise<never> {
  throw new Error(
    "signOut() is no longer supported. Redirect to /api/auth/sign-out instead.",
  );
}
