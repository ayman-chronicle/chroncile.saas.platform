/**
 * GET /api/auth/oauth/google
 *
 * Starts the Google OAuth flow:
 *   1. Build a signed `state` token containing a random nonce and the
 *      optional `?from=` path. Signed with HMAC-SHA256(WORKOS_COOKIE_PASSWORD)
 *      so the callback can detect tampering and recover `from` on return.
 *   2. Ask WorkOS for an authorization URL with `provider=GoogleOAuth` and
 *      our signed state.
 *   3. 302 to it.
 *
 * No more `wos-oauth-state` cookie — the `state` query param round-trips
 * verbatim through WorkOS, which is the pattern the official docs recommend:
 *   "You can use state to encode parameters like originating URL and
 *    query parameters."
 *
 * Docs: https://workos.com/docs/reference/authkit/authentication/get-authorization-url
 */

import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

import { createOAuthState } from "@/server/auth/state-token";
import {
  assertWorkOSEnvironment,
  workos,
  WORKOS_CLIENT_ID,
  WORKOS_REDIRECT_URI,
} from "@/server/auth/workos";

export async function GET(request: NextRequest) {
  assertWorkOSEnvironment();

  const fromParam = request.nextUrl.searchParams.get("from");
  const state = createOAuthState(fromParam);

  const authorizationUrl = workos.userManagement.getAuthorizationUrl({
    provider: "GoogleOAuth",
    redirectUri: WORKOS_REDIRECT_URI,
    clientId: WORKOS_CLIENT_ID,
    state,
  });

  redirect(authorizationUrl);
}
