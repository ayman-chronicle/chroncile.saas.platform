"use client";

/**
 * Client-side WorkOS session provider.
 *
 * Pattern: the SDK's official Next.js helper (`@workos-inc/authkit-nextjs`)
 * wraps the app in an `<AuthKitProvider>` that handles session refresh
 * transparently — we discard that SDK because we want a custom UI, but we
 * mirror its responsibilities here.
 *
 * Responsibilities:
 *   1. Read the current session via `GET /api/auth/me`.
 *   2. Schedule a proactive refresh (`POST /api/auth/refresh`) ~60s before
 *      the access token expires.
 *   3. On any backend 401, fire a refresh and let consumers retry.
 *   4. Provide a stable React context — `useAuthSession()` — to consumers.
 *
 * Why this lives in the client:
 *   - Server components can't mutate cookies after rendering, so they can't
 *     do silent refresh transparently. The cleanest place to handle "is the
 *     token still good? if not, get a new one without disrupting the page"
 *     is in client code that owns its own URL and timing.
 *
 * Why polling instead of websockets:
 *   - Refreshes are cheap (~50ms) and infrequent (~once per 5 min). Polling
 *     `/api/auth/me` only happens on focus + at scheduled times, not on
 *     every render. No backend changes required.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export interface AuthSessionUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  profilePictureUrl: string | null;
  emailVerified: boolean;
}

export interface AuthSession {
  authenticated: true;
  user: AuthSessionUser;
  sessionId: string;
  organizationId: string | null;
  role: string | null;
  roles: string[] | null;
  permissions: string[] | null;
  entitlements: string[] | null;
  featureFlags: string[] | null;
  impersonator: { email: string; reason?: string } | null;
  accessToken: string;
  accessTokenExpiresAt: number | null;
}

export interface AuthSessionContextValue {
  /** Loading on initial fetch. */
  loading: boolean;
  /** The current session, or null if not signed in. */
  session: AuthSession | null;
  /**
   * Force-refresh the session by hitting `/api/auth/refresh` and re-reading
   * `/api/auth/me`. Called automatically on 401 from `authorizedFetch`.
   * Returns the new session, or null if refresh failed.
   */
  refresh: () => Promise<AuthSession | null>;
  /**
   * Wrapper around `fetch` that:
   *   - Adds `Authorization: Bearer <accessToken>` automatically
   *   - On 401, triggers a refresh and retries once
   *   - Throws if the second attempt also returns 401 (caller redirects)
   */
  authorizedFetch: (
    input: RequestInfo | URL,
    init?: RequestInit,
  ) => Promise<Response>;
}

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);

/** How close to expiry (in seconds) we trigger a proactive refresh. */
const REFRESH_BUFFER_SECONDS = 60;

/** How long to wait between session re-reads when the tab is focused. */
const FOCUS_REVALIDATE_MS = 30_000;

interface MeResponseAuthenticated extends AuthSession {
  authenticated: true;
}
interface MeResponseUnauthenticated {
  authenticated: false;
  reason: string;
}
type MeResponse = MeResponseAuthenticated | MeResponseUnauthenticated;

async function fetchMe(): Promise<MeResponse | null> {
  try {
    const res = await fetch("/api/auth/me", { cache: "no-store" });
    if (res.status === 401) {
      const body = await res.json().catch(() => ({ reason: "unauthorized" }));
      return { authenticated: false, reason: body.reason ?? "unauthorized" };
    }
    if (!res.ok) return null;
    return (await res.json()) as MeResponse;
  } catch {
    return null;
  }
}

async function postRefresh(): Promise<boolean> {
  try {
    const res = await fetch("/api/auth/refresh", {
      method: "POST",
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function AuthSessionProvider({
  initial,
  children,
}: {
  /** Optional initial value rendered on the server to avoid a flicker. */
  initial?: AuthSession | null;
  children: ReactNode;
}) {
  const [session, setSession] = useState<AuthSession | null>(initial ?? null);
  const [loading, setLoading] = useState<boolean>(initial === undefined);

  // Coalesce concurrent refresh calls.
  const inFlightRefresh = useRef<Promise<AuthSession | null> | null>(null);

  // Schedule handle so we can clear it on unmount / new session.
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadOnce = useCallback(async (): Promise<AuthSession | null> => {
    const me = await fetchMe();
    if (!me) return session; // network blip — keep current
    if (me.authenticated) {
      setSession(me);
      return me;
    }
    setSession(null);
    return null;
  }, [session]);

  const refresh = useCallback(async (): Promise<AuthSession | null> => {
    if (inFlightRefresh.current) return inFlightRefresh.current;

    const promise = (async () => {
      const ok = await postRefresh();
      if (!ok) {
        // Refresh failed — wipe local state and let the caller redirect.
        setSession(null);
        return null;
      }
      return loadOnce();
    })().finally(() => {
      inFlightRefresh.current = null;
    });

    inFlightRefresh.current = promise;
    return promise;
  }, [loadOnce]);

  const authorizedFetch = useCallback(
    async (
      input: RequestInfo | URL,
      init: RequestInit = {},
    ): Promise<Response> => {
      const buildInit = (token: string | null): RequestInit => {
        const headers = new Headers(init.headers);
        if (token) headers.set("authorization", `Bearer ${token}`);
        return { ...init, headers };
      };

      const firstToken = session?.accessToken ?? null;
      const firstRes = await fetch(input, buildInit(firstToken));
      if (firstRes.status !== 401) return firstRes;

      // 401 → try refresh + retry once.
      const refreshed = await refresh();
      const retryToken = refreshed?.accessToken ?? null;
      if (!retryToken) return firstRes; // keep the 401 for the caller to handle
      return fetch(input, buildInit(retryToken));
    },
    [refresh, session],
  );

  // Initial load.
  useEffect(() => {
    if (initial !== undefined) return; // server already provided
    let cancelled = false;
    (async () => {
      await loadOnce();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Schedule proactive refresh based on `accessTokenExpiresAt`.
  useEffect(() => {
    if (refreshTimer.current) {
      clearTimeout(refreshTimer.current);
      refreshTimer.current = null;
    }
    if (!session?.accessTokenExpiresAt) return;

    const nowSeconds = Math.floor(Date.now() / 1000);
    const secondsUntilRefresh =
      session.accessTokenExpiresAt - REFRESH_BUFFER_SECONDS - nowSeconds;
    const ms = Math.max(secondsUntilRefresh * 1000, 0);

    refreshTimer.current = setTimeout(() => {
      void refresh();
    }, ms);

    return () => {
      if (refreshTimer.current) {
        clearTimeout(refreshTimer.current);
        refreshTimer.current = null;
      }
    };
  }, [session?.accessTokenExpiresAt, refresh]);

  // On window focus and at a fixed cadence, re-read /me. Cheap and gives us
  // a way to detect server-side cookie wipes (e.g. revoked elsewhere).
  useEffect(() => {
    if (typeof window === "undefined") return;

    let interval: ReturnType<typeof setInterval> | null = null;

    const tick = () => {
      void loadOnce();
    };

    const onFocus = () => tick();
    window.addEventListener("focus", onFocus);

    interval = setInterval(tick, FOCUS_REVALIDATE_MS);

    return () => {
      window.removeEventListener("focus", onFocus);
      if (interval) clearInterval(interval);
    };
  }, [loadOnce]);

  const value = useMemo<AuthSessionContextValue>(
    () => ({ loading, session, refresh, authorizedFetch }),
    [loading, session, refresh, authorizedFetch],
  );

  return (
    <AuthSessionContext.Provider value={value}>
      {children}
    </AuthSessionContext.Provider>
  );
}

/**
 * Read the current WorkOS session from React context.
 *
 * @throws if used outside `<AuthSessionProvider>` — which is mounted in the
 *   dashboard layout.
 */
export function useAuthSession(): AuthSessionContextValue {
  const ctx = useContext(AuthSessionContext);
  if (!ctx) {
    throw new Error(
      "useAuthSession must be called inside <AuthSessionProvider>. " +
        "Mount the provider in your layout.",
    );
  }
  return ctx;
}
