"use client";

import { useState } from "react";
import { createCheckoutSession, createPortalSession } from "@/app/(dashboard)/dashboard/settings/billing-actions";
import type { Plan } from "@/lib/plans";

interface PlanBillingPanelProps {
  plans: Plan[];
  currentPlanId: string | null;
  hasCustomer: boolean;
  successMessage: boolean;
}

function formatPrice(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

export function PlanBillingPanel({ plans, currentPlanId, hasCustomer, successMessage }: PlanBillingPanelProps) {
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = async (planId: string) => {
    setError(null);
    setLoadingPlanId(planId);
    try {
      const result = await createCheckoutSession(planId);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.url) window.location.href = result.url;
    } finally {
      setLoadingPlanId(null);
    }
  };

  const handleManageBilling = async () => {
    setError(null);
    setPortalLoading(true);
    try {
      const result = await createPortalSession();
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.url) window.location.href = result.url;
    } finally {
      setPortalLoading(false);
    }
  };

  const currentPlan = currentPlanId ? plans.find((p) => p.id === currentPlanId) : null;

  return (
    <div className="panel">
      <div className="panel__header">
        <span className="panel__title">Plan & Billing</span>
        {currentPlan ? (
          <span className="badge badge--nominal">{currentPlan.name}</span>
        ) : (
          <span className="badge badge--neutral">No plan</span>
        )}
      </div>
      <div className="p-4 space-y-4">
        {successMessage && (
          <p className="text-sm text-nominal">Your subscription was updated successfully.</p>
        )}
        {error && <p className="text-sm text-critical">{error}</p>}

        <div>
          <label className="block text-xs text-tertiary tracking-wide uppercase mb-2">Current plan</label>
          <p className="text-sm text-primary">
            {currentPlan ? currentPlan.name : "No active subscription"}
          </p>
        </div>

        <div>
          <label className="block text-xs text-tertiary tracking-wide uppercase mb-2">Plans</label>
          <ul className="space-y-3">
            {plans.map((plan) => (
              <li
                key={plan.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-border-dim last:border-0"
              >
                <div>
                  <span className="text-sm font-medium text-primary">{plan.name}</span>
                  <p className="text-xs text-tertiary mt-0.5">{plan.description}</p>
                  <p className="text-xs text-secondary mt-1">
                    {formatPrice(plan.amountCents, plan.currency)}/{plan.interval}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={loadingPlanId !== null || (currentPlanId === plan.id && hasCustomer)}
                  className="btn btn--primary text-sm"
                >
                  {loadingPlanId === plan.id ? "..." : currentPlanId === plan.id ? "Current" : "Subscribe"}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {hasCustomer && (
          <div className="pt-2">
            <button
              type="button"
              onClick={handleManageBilling}
              disabled={portalLoading}
              className="btn btn--neutral text-sm"
            >
              {portalLoading ? "..." : "Manage billing"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
