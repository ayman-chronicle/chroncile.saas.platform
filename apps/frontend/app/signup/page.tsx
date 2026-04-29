"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthShell, SignUpEmail } from "ui/auth";

function authPath(): string {
  const params = new URLSearchParams({ from: "/dashboard" });
  return `/api/auth/oauth/google?${params.toString()}`;
}

export default function SignupPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const startGoogleOAuth = () => {
    window.location.assign(authPath());
  };

  const showUnsupportedEmailSignup = () => {
    setError("Email/password signup is not configured yet. Continue with Google.");
  };

  return (
    <AuthShell
      topbar={{
        cta: (
          <button type="button" onClick={() => router.push("/login")}>
            Sign in
          </button>
        ),
      }}
      align="center"
      chromeStyle="product"
    >
      <SignUpEmail
        persona="signup"
        onSubmit={showUnsupportedEmailSignup}
        onSignIn={() => router.push("/login")}
        onSSO={(provider) => {
          if (provider === "google") {
            startGoogleOAuth();
            return;
          }
          setError("Google sign-up is currently configured for this app.");
        }}
        error={error}
      />
    </AuthShell>
  );
}
