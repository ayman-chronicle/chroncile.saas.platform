"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  AuthShell,
  WorkspaceSetup,
  type ProvisioningStep,
  type WorkspaceSetupCaptureValue,
  type WorkspaceSetupSub,
} from "ui/auth";
import {
  OnboardingShell,
  StepConnect,
  StepDescribe,
  StepDone,
  StepMiddleware,
  StepStream,
  type ConnectState,
  type DescribeState,
  type OnboardingStepId,
  type SourceId,
} from "ui/onboarding";

const ONBOARDING_ORDER = [
  "describe",
  "connect",
  "stream",
  "middleware",
  "done",
] as const satisfies readonly OnboardingStepId[];

type ProductOnboardingStep = (typeof ONBOARDING_ORDER)[number];
type FlowStep = WorkspaceSetupSub | ProductOnboardingStep;

const ONBOARDING_STEPS = [
  { id: "describe", label: "Describe" },
  { id: "connect", label: "Connect" },
  { id: "stream", label: "Preview" },
  { id: "middleware", label: "Install" },
  { id: "done", label: "Launch" },
] as const satisfies readonly { id: OnboardingStepId; label: string }[];

function isProductOnboardingStep(step: FlowStep): step is ProductOnboardingStep {
  return (ONBOARDING_ORDER as readonly string[]).includes(step);
}

const RUNNING_STEPS: ProvisioningStep[] = [
  {
    label: "Create WorkOS organization",
    state: "running",
    techKey: "workos.organizations.create",
  },
  {
    label: "Attach you as admin",
    state: "pending",
    techKey: "userManagement.createOrganizationMembership",
  },
  {
    label: "Register Chronicle workspace",
    state: "pending",
    techKey: "tenants.registerWorkos",
  },
  {
    label: "Refresh session into workspace",
    state: "pending",
    techKey: "session.refresh",
  },
];

const DONE_STEPS = RUNNING_STEPS.map((step) => ({
  ...step,
  state: "done" as const,
}));

interface WorkspaceSetupClientProps {
  email: string;
  firstName?: string | null;
}

export function WorkspaceSetupClient({
  email,
  firstName,
}: WorkspaceSetupClientProps) {
  const router = useRouter();
  const [flowStep, setFlowStep] = useState<FlowStep>("capture");
  const [error, setError] = useState<string | null>(null);
  const [workspaceName, setWorkspaceName] = useState<string>("");
  const [describe, setDescribe] = useState<DescribeState>({
    mode: "freeform",
  });
  const [connect, setConnect] = useState<ConnectState>({
    connected: [],
    backfills: {},
  });

  useEffect(() => {
    setConnect((current) => ({
      ...current,
      intendedSources: describe.intendedSources,
      sandbox: describe.sandbox,
    }));
  }, [describe.intendedSources, describe.sandbox]);

  const advance = (delta: 1 | -1) => {
    if (!isProductOnboardingStep(flowStep)) return;
    const index = ONBOARDING_ORDER.indexOf(flowStep);
    if (index < 0) return;
    const next = Math.max(0, Math.min(ONBOARDING_ORDER.length - 1, index + delta));
    setFlowStep(ONBOARDING_ORDER[next]);
  };

  const connected = connect.connected as SourceId[];

  async function submit(value: WorkspaceSetupCaptureValue) {
    setError(null);
    setWorkspaceName(value.orgName);
    setFlowStep("running");

    try {
      const response = await fetch("/api/onboarding/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(value),
      });
      const data = (await response.json().catch(() => null)) as {
        error?: string;
        workspace?: { name?: string };
      } | null;

      if (!response.ok) {
        throw new Error(data?.error ?? "workspace_provisioning_failed");
      }

      setWorkspaceName(data?.workspace?.name ?? value.orgName);
      setFlowStep("success");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message.replaceAll("_", " ")
          : "Workspace provisioning failed",
      );
      setFlowStep("capture");
    }
  }

  if (isProductOnboardingStep(flowStep)) {
    let body: ReactNode = null;
    switch (flowStep) {
      case "describe":
        body = (
          <StepDescribe
            value={describe}
            onChange={setDescribe}
            onNext={() => advance(1)}
          />
        );
        break;
      case "connect":
        body = (
          <StepConnect
            value={connect}
            onChange={setConnect}
            onNext={() => advance(1)}
            onBack={() => advance(-1)}
          />
        );
        break;
      case "stream":
        body = (
          <StepStream
            value={{ connected }}
            onNext={() => advance(1)}
            onBack={() => advance(-1)}
          />
        );
        break;
      case "middleware":
        body = (
          <StepMiddleware onNext={() => advance(1)} onBack={() => advance(-1)} />
        );
        break;
      case "done":
        body = (
          <StepDone
            value={{
              name: describe.name || workspaceName,
              connected,
            }}
            onRestart={() => setFlowStep("describe")}
            onOpen={() => router.push("/dashboard")}
          />
        );
        break;
    }

    return (
      <OnboardingShell
        currentStep={flowStep}
        steps={ONBOARDING_STEPS}
        onJumpStep={(id) => {
          if (id !== "billing") setFlowStep(id);
        }}
        align="center"
        chromeStyle="product"
      >
        {body}
      </OnboardingShell>
    );
  }

  const workspaceSub = flowStep as WorkspaceSetupSub;

  return (
    <AuthShell
      topbar={{
        steps: [{ id: "workspace", label: "Workspace" }],
        currentIndex: 0,
      }}
      align="center"
      chromeStyle="product"
    >
      <WorkspaceSetup
        sub={workspaceSub}
        email={email}
        error={error}
        isSubmitting={workspaceSub === "running"}
        steps={workspaceSub === "success" ? DONE_STEPS : RUNNING_STEPS}
        firstName={firstName ?? undefined}
        workspaceName={workspaceName}
        onSubmit={submit}
        onContinueOnboarding={() => setFlowStep("describe")}
        onSkipToDashboard={() => router.push("/dashboard")}
      />
    </AuthShell>
  );
}
