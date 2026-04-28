"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { WorkspaceSetup } from "ui/auth";

interface WorkspaceSetupClientProps {
  email: string;
  firstName?: string;
}

interface CreateWorkspaceResponse {
  ok: boolean;
  organizationId?: string;
  error?: string;
}

export function WorkspaceSetupClient({
  email,
  firstName,
}: WorkspaceSetupClientProps) {
  const router = useRouter();

  const [sub, setSub] = useState<"capture" | "running" | "success">("capture");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [workspaceName, setWorkspaceName] = useState<string>("");

  const handleSubmit = async (value: { orgName: string; slug: string }) => {
    setIsSubmitting(true);
    setError(null);

    let response: Response;
    try {
      response = await fetch("/api/onboarding/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: value.orgName, slug: value.slug }),
      });
    } catch {
      setIsSubmitting(false);
      setError("Network error — please retry.");
      return;
    }

    let body: CreateWorkspaceResponse;
    try {
      body = (await response.json()) as CreateWorkspaceResponse;
    } catch {
      setIsSubmitting(false);
      setError("Unexpected server response.");
      return;
    }

    if (!response.ok || !body.ok) {
      setIsSubmitting(false);
      setError(body.error ?? "Couldn't create your workspace. Please retry.");
      return;
    }

    setWorkspaceName(value.orgName);
    setSub("running");

    // Brief animated loader before flipping to success — the WorkOS calls
    // already completed on the server, this delay is purely UX so the user
    // sees the provisioning state.
    setTimeout(() => setSub("success"), 800);
    setIsSubmitting(false);
  };

  return (
    <WorkspaceSetup
      sub={sub}
      email={email}
      firstName={firstName}
      workspaceName={workspaceName}
      error={error}
      isSubmitting={isSubmitting}
      onSubmit={handleSubmit}
      onContinueOnboarding={() => router.push("/dashboard")}
      onSkipToDashboard={() => router.push("/dashboard")}
    />
  );
}
