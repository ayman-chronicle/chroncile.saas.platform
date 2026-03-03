import { auth } from "@/lib/auth";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";
const SERVICE_SECRET = process.env.SERVICE_SECRET || "";

const tokenCache = new Map<string, { token: string; expiresAt: number }>();

export async function fetchFromBackend<T = unknown>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const session = await auth();

  if (!session?.user?.tenantId) {
    throw new Error("Unauthorized");
  }

  const token = await getBackendToken(session.user);

  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `Backend request failed: ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

interface SessionUser {
  id: string;
  email?: string | null;
  name?: string | null;
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
}

async function getBackendToken(user: SessionUser): Promise<string> {
  const cached = tokenCache.get(user.id);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.token;
  }

  const res = await fetch(`${BACKEND_URL}/api/platform/auth/token-exchange`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      service_secret: SERVICE_SECRET,
      user_id: user.id,
      email: user.email,
      name: user.name,
      tenant_id: user.tenantId,
      tenant_name: user.tenantName,
      tenant_slug: user.tenantSlug,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg =
      body?.error ?? (res.status === 401 ? "Unauthorized" : res.statusText);
    throw new Error(
      `Failed to exchange session for backend token: ${msg}. ` +
        "Ensure SERVICE_SECRET is set and identical in frontend and backend .env."
    );
  }

  const data = await res.json();
  tokenCache.set(user.id, {
    token: data.token,
    expiresAt: Date.now() + 23 * 60 * 60 * 1000,
  });
  return data.token;
}
