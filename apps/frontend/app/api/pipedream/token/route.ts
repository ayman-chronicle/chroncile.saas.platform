import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createConnectToken, isPipedreamConfigured } from "@/lib/pipedream";

export const dynamic = "force-dynamic";

/**
 * POST /api/pipedream/token
 * 
 * Creates a short-lived Connect token for the frontend to initiate
 * the Pipedream account connection flow.
 */
export async function POST(request: NextRequest) {
  // Verify user is authenticated
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  // Check Pipedream is configured
  if (!isPipedreamConfigured()) {
    return NextResponse.json(
      { error: "Pipedream is not configured" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { app } = body as { app?: string };

    // Use tenantId as the external user ID for Pipedream
    // This allows all users in a tenant to share connections
    const externalUserId = session.user.tenantId;

    // Get the app URL for redirects and webhooks
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    
    // Build allowed origins - include both http and https for localhost
    const allowedOrigins = [appUrl];
    if (appUrl.includes("localhost")) {
      // Add both http and https variants for local development
      allowedOrigins.push(appUrl.replace("http://", "https://"));
      allowedOrigins.push(appUrl.replace("https://", "http://"));
    }

    console.log("[Pipedream Token] Creating token with:", {
      externalUserId,
      allowedOrigins,
      appUrl,
      app,
    });

    const tokenResponse = await createConnectToken({
      externalUserId,
      app, // Pass the app slug to connect
      allowedOrigins,
      successRedirectUri: `${appUrl}/dashboard/connections?pipedream_success=true${app ? `&app=${app}` : ""}`,
      errorRedirectUri: `${appUrl}/dashboard/connections?pipedream_error=true`,
      webhookUri: `${appUrl}/api/pipedream/auth-webhook`,
    });
    
    console.log("[Pipedream Token] Success! Connect URL:", tokenResponse.connect_link_url);

    return NextResponse.json({
      token: tokenResponse.token,
      connectLinkUrl: tokenResponse.connect_link_url,
      expiresAt: tokenResponse.expires_at,
    });
  } catch (error) {
    console.error("Failed to create Pipedream connect token:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create token" },
      { status: 500 }
    );
  }
}
