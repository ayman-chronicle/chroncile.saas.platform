"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthShell, SignIn } from "ui/auth";

function authPath(): string {
  const params = new URLSearchParams({ from: "/dashboard" });
  return `/api/auth/oauth/google?${params.toString()}`;
}

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const startGoogleOAuth = () => {
    window.location.assign(authPath());
  };

  const showUnsupportedPassword = () => {
    setError("Password sign-in is not configured yet. Continue with Google.");
  };

  return (
    <AuthShell
      topbar={{
        
      }}
      align="center"
      chromeStyle="product"
    >
      <SignIn
        onSubmit={showUnsupportedPassword}
        onForgot={showUnsupportedPassword}
        onSignUp={() => router.push("/signup")}
        onSSO={(provider) => {
          if (provider === "google") {
            startGoogleOAuth();
            return;
          }
          setError("Google sign-in is currently configured for this app.");
        }}
        error={error}
        lede="Log in to Chronicle"
   
      />
    </AuthShell>
  );
}
