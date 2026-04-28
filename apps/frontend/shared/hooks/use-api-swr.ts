"use client";

import useSWR, { type SWRConfiguration, type SWRResponse } from "swr";
import { getBackendUrl } from "platform-api";

import { useAuthSession } from "@/shared/auth/auth-session-provider";

const BACKEND_URL = getBackendUrl();

/**
 * SWR-backed reader for the Chronicle backend.
 *
 * Uses `authorizedFetch` from `<AuthSessionProvider>` so that:
 *   - The Authorization header is attached automatically.
 *   - On 401, the provider triggers a refresh + retries the request once.
 */
export function useApiSwr<T>(
  path: string | null,
  config?: SWRConfiguration<T>,
): SWRResponse<T> {
  const { session, authorizedFetch } = useAuthSession();
  const token = session?.accessToken ?? null;

  const fetcher = async (p: string): Promise<T> => {
    const res = await authorizedFetch(`${BACKEND_URL}${p}`, {
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });
    if (!res.ok) {
      const err = await res
        .json()
        .catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `Request failed: ${res.status}`);
    }
    return res.json();
  };

  return useSWR<T>(token && path ? path : null, fetcher, config);
}
