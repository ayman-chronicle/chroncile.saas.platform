/**
 * Service-to-service client for the Chronicle Rust backend.
 * Uses SERVICE_SECRET + token-exchange to authenticate requests.
 */

const SERVICE_SECRET = process.env.SERVICE_SECRET ?? "";
const SERVICE_USER_ID = process.env.SERVICE_USER_ID ?? "env-manager-service-account";

let cachedTokens: Map<string, { token: string; expiresAt: number }> = new Map();

async function getServiceToken(backendUrl: string): Promise<string | null> {
  const cacheKey = backendUrl;
  const cached = cachedTokens.get(cacheKey);
  if (cached && cached.expiresAt > Date.now() + 60_000) {
    return cached.token;
  }

  try {
    const res = await fetch(`${backendUrl}/api/platform/auth/token-exchange`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_secret: SERVICE_SECRET,
        user_id: SERVICE_USER_ID,
        email: "admin@chronicle-labs.com",
        name: "Env Manager",
        tenant_id: SERVICE_USER_ID,
        tenant_name: "Chronicle Labs",
        tenant_slug: "chronicle-labs",
      }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return null;
    const { token } = await res.json();
    if (!token) return null;

    cachedTokens.set(cacheKey, {
      token,
      expiresAt: Date.now() + 23 * 60 * 60 * 1000,
    });
    return token;
  } catch {
    return null;
  }
}

export async function backendFetch(
  backendUrl: string,
  path: string,
  init?: RequestInit
): Promise<Response> {
  // Try x-service-secret first (new admin endpoints)
  const adminRes = await fetch(`${backendUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-service-secret": SERVICE_SECRET,
      ...init?.headers,
    },
    signal: AbortSignal.timeout(10_000),
  });

  if (adminRes.ok || adminRes.status === 404) return adminRes;

  // Fall back to JWT-based auth (existing protected endpoints)
  const token = await getServiceToken(backendUrl);
  if (!token) throw new Error("Could not obtain service token");

  return fetch(`${backendUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
    signal: AbortSignal.timeout(10_000),
  });
}
