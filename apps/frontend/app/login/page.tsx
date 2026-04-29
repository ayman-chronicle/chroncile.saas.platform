"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthShell, SignIn, type SignInValue } from "ui/auth";

function googleAuthPath(from: string): string {
  const params = new URLSearchParams({ from });
  return `/api/auth/oauth/google?${params.toString()}`;
}

interface LoginErrorResponse {
  error?: string;
  message?: string;
}

interface LoginOkResponse {
  ok: true;
  redirect: string;
}

interface LoginNeedsVerifyResponse {
  ok: false;
  code: "email_verification_required";
  pendingAuthenticationToken?: string;
  email?: string;
}

interface LoginNeedsSsoResponse {
  ok: false;
  code: "sso_required";
  connectionIds?: string[];
  email?: string;
}

interface LoginAuthMethodsRequiredResponse {
  ok: false;
  code: "organization_authentication_methods_required";
  authMethods?: Record<string, boolean>;
  connectionIds?: string[];
}

type LoginResponse =
  | LoginOkResponse
  | LoginNeedsVerifyResponse
  | LoginNeedsSsoResponse
  | LoginAuthMethodsRequiredResponse
  | LoginErrorResponse;

function humanizeError(code: string | undefined): string {
  if (!code) return "We couldn't sign you in. Try again.";
  const map: Record<string, string> = {
    invalid_credentials: "Email or password is incorrect.",
    missing_credentials: "Enter your email and password.",
    sealing_failed: "Couldn't establish your session. Try again.",
    mfa_enrollment: "MFA is not yet supported in this app.",
    mfa_challenge: "MFA is not yet supported in this app.",
    organization_selection_required:
      "Multi-organization sign-in is not yet supported.",
    rate_limit_exceeded: "Too many attempts. Wait a moment and try again.",
  };
  return map[code] ?? code.replaceAll("_", " ");
}

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") ?? "/dashboard";
  const queryError = searchParams.get("error");

  const [error, setError] = useState<string | null>(
    queryError ? humanizeError(queryError) : null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const startGoogleOAuth = () => {
    window.location.assign(googleAuthPath(from));
  };

  const handleSubmit = async (value: SignInValue) => {
    setError(null);
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-auth-from": from,
        },
        body: JSON.stringify({ email: value.email, password: value.password }),
      });

      const data = (await response.json().catch(() => null)) as LoginResponse | null;

      if (response.ok && data && "ok" in data && data.ok === true) {
        router.push(data.redirect ?? "/dashboard");
        return;
      }

      if (data && "ok" in data && data.ok === false) {
        if (data.code === "email_verification_required") {
          const params = new URLSearchParams({ step: "verify" });
          if (data.email) params.set("email", data.email);
          if (data.pendingAuthenticationToken) {
            params.set("token", data.pendingAuthenticationToken);
          }
          router.push(`/signup?${params.toString()}`);
          return;
        }
        if (data.code === "sso_required") {
          const params = new URLSearchParams({ from });
          window.location.assign(`/api/auth/oauth/google?${params.toString()}`);
          return;
        }
        if (data.code === "organization_authentication_methods_required") {
          const allowed = Object.entries(data.authMethods ?? {})
            .filter(([, ok]) => ok)
            .map(([k]) => k);
          setError(
            allowed.length > 0
              ? `Your admin only allows: ${allowed.join(", ")}.`
              : "Your admin restricts the sign-in methods for this email.",
          );
          return;
        }
      }

      const code = (data as LoginErrorResponse | null)?.error;
      setError(humanizeError(code));
    } catch (err) {
      setError(
        err instanceof Error
          ? "Network error — try again."
          : "Something went wrong. Try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell topbar={{}} align="center" chromeStyle="product">
      <SignIn
        onSubmit={handleSubmit}
        onForgot={() => router.push("/forgot-password")}
        onSignUp={() => router.push("/signup")}
        onSSO={(provider) => {
          if (provider === "google") {
            startGoogleOAuth();
            return;
          }
          setError(
            provider === "github"
              ? "GitHub sign-in isn't enabled yet."
              : provider === "passkey"
                ? "Passkey sign-in isn't enabled yet."
                : "That sign-in method isn't enabled.",
          );
        }}
        error={error}
        isSubmitting={isSubmitting}
        lede="Log in to Chronicle"
      />
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}
