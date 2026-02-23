import plansJson from "@/config/plans.json";

export interface Plan {
  id: string;
  name: string;
  description: string;
  amountCents: number;
  currency: string;
  interval: string;
  lookupKey: string;
  features: string[];
}

const plans = (plansJson as { plans: Plan[] }).plans;

const REMEDY_MEDS_SLUG = "remedy-meds-f2b2gz";
const TEST_SLUG = "remedy-meds-ygo1c4";

export function getPlans(): Plan[] {
  return plans;
}

const CUSTOM_PLAN_TENANT_SLUGS = [REMEDY_MEDS_SLUG, TEST_SLUG];

/**
 * Returns the plans to show for a tenant. For remedy-meds-f2b2gz and remedy-meds-ygo1c4
 * the top tier is Custom Enterprise ($5K); for all others it is Enterprise ($199).
 */
export function getPlansForTenant(tenantSlug: string | null): Plan[] {
  if (!tenantSlug) return plans.filter((p) => p.id !== "customEnterprise");
  if (CUSTOM_PLAN_TENANT_SLUGS.includes(tenantSlug)) {
    return plans.filter((p) => p.id !== "enterprise");
  }
  return plans.filter((p) => p.id !== "customEnterprise");
}

export function getRecommendedPlanId(tenantSlug: string | null): string {
  if (tenantSlug && CUSTOM_PLAN_TENANT_SLUGS.includes(tenantSlug)) return "customEnterprise";
  return "pro";
}

export function getPlanById(id: string): Plan | undefined {
  return plans.find((p) => p.id === id);
}

export function getPlanByLookupKey(lookupKey: string): Plan | undefined {
  return plans.find((p) => p.lookupKey === lookupKey);
}
