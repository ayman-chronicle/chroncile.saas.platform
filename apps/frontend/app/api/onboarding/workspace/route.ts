/**
 * POST /api/onboarding/workspace
 *
 * Body: { name: string, slug?: string }
 *
 * Creates a brand-new workspace for the current user:
 *   1. Verify there's an active session (signed-in user).
 *   2. Create a WorkOS Organization.
 *   3. Create an OrganizationMembership linking the user to the org.
 *   4. Register the local Chronicle Tenant via the backend
 *      `/api/platform/tenants/register-workos` endpoint (server-to-server).
 *   5. Refresh the session, scoped to the new org, via the canonical helper:
 *
 *        const session = await workos.userManagement.loadSealedSession({...});
 *        const result = await session.refresh({ organizationId });
 *        cookies.set("wos-session", result.sealedSession);
 *
 * The doc explicitly supports this pattern:
 *   "Passing in a new organization ID will switch the user to that
 *    organization."
 *
 * Docs:
 *   https://workos.com/docs/reference/organization/create
 *   https://workos.com/docs/reference/authkit/organization-membership/create
 *   https://workos.com/docs/reference/authkit/session-helpers#refresh
 */

import { NextResponse, type NextRequest } from "next/server";

import {
  loadSession,
  setSealedSession,
} from "@/server/auth/session";
import { workos } from "@/server/auth/workos";

interface CreateWorkspaceBody {
  name?: unknown;
  slug?: unknown;
}

export async function POST(request: NextRequest) {
  const session = await loadSession();
  if (!session) {
    return NextResponse.json(
      { ok: false, error: "no_session" },
      { status: 401 },
    );
  }

  const auth = await session.authenticate();
  if (!auth.authenticated) {
    return NextResponse.json(
      { ok: false, error: auth.reason },
      { status: 401 },
    );
  }

  let body: CreateWorkspaceBody;
  try {
    body = (await request.json()) as CreateWorkspaceBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_json" },
      { status: 400 },
    );
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (name.length < 2 || name.length > 80) {
    return NextResponse.json(
      { ok: false, error: "invalid_name" },
      { status: 400 },
    );
  }

  const rawSlug = typeof body.slug === "string" ? body.slug.trim() : "";
  const slug = (rawSlug || slugify(name)).toLowerCase();
  if (!/^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/.test(slug)) {
    return NextResponse.json(
      { ok: false, error: "invalid_slug" },
      { status: 400 },
    );
  }

  const serviceSecret = process.env.SERVICE_SECRET;
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (!serviceSecret || !backendUrl) {
    console.error(
      "[onboarding/workspace] SERVICE_SECRET or NEXT_PUBLIC_BACKEND_URL not set",
    );
    return NextResponse.json(
      { ok: false, error: "backend_not_configured" },
      { status: 500 },
    );
  }

  // 1. Create the Organization in WorkOS.
  let organization;
  try {
    organization = await workos.organizations.createOrganization({ name });
  } catch (error) {
    console.error("[onboarding/workspace] createOrganization failed", error);
    return NextResponse.json(
      { ok: false, error: "organization_create_failed" },
      { status: 502 },
    );
  }

  // 2. Add the user to the org as a member.
  try {
    await workos.userManagement.createOrganizationMembership({
      userId: auth.user.id,
      organizationId: organization.id,
    });
  } catch (error) {
    console.error(
      "[onboarding/workspace] createOrganizationMembership failed",
      error,
    );
    return NextResponse.json(
      { ok: false, error: "membership_create_failed" },
      { status: 502 },
    );
  }

  // 3. Register the local Tenant via the backend (server-to-server).
  let backendResult: { tenantId: string; userId: string; created: boolean };
  try {
    const backendRes = await fetch(
      `${backendUrl}/api/platform/tenants/register-workos`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceSecret,
          workosUserId: auth.user.id,
          workosOrganizationId: organization.id,
          email: auth.user.email,
          name,
          slug,
          firstName: auth.user.firstName ?? null,
          lastName: auth.user.lastName ?? null,
        }),
      },
    );
    if (!backendRes.ok) {
      const text = await backendRes.text();
      console.error(
        "[onboarding/workspace] backend register-workos failed",
        backendRes.status,
        text,
      );
      return NextResponse.json(
        { ok: false, error: "backend_register_failed" },
        { status: 502 },
      );
    }
    backendResult = (await backendRes.json()) as typeof backendResult;
  } catch (error) {
    console.error(
      "[onboarding/workspace] backend register-workos network error",
      error,
    );
    return NextResponse.json(
      { ok: false, error: "backend_unreachable" },
      { status: 502 },
    );
  }

  // 4. Refresh the session scoped to the new org. The helper unseals →
  //    exchanges → re-seals; the new sealedSession contains an access token
  //    with `org_id` set so the backend's WorkosAuthUser extractor can
  //    resolve the local tenant.
  const refreshed = await session.refresh({
    organizationId: organization.id,
  });
  if (!refreshed.authenticated) {
    console.error(
      "[onboarding/workspace] session.refresh failed:",
      refreshed.reason,
    );
    return NextResponse.json(
      { ok: false, error: refreshed.reason },
      { status: 502 },
    );
  }

  await setSealedSession(refreshed.sealedSession);

  return NextResponse.json({
    ok: true,
    organizationId: organization.id,
    tenantId: backendResult.tenantId,
  });
}

/**
 * Tiny slugifier: lowercase, replace whitespace with hyphens, strip anything
 * outside [a-z0-9-], collapse repeats, trim hyphens at edges.
 */
function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}
