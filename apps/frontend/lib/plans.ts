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

/**
 * Returns the plans to show for a tenant. For remedy-meds-f2b2gz the top tier
 * is Custom Enterprise ($5K); for all others it is Enterprise ($199).
 */
export function getPlansForTenant(tenantSlug: string | null): Plan[] {
  if (!tenantSlug) return plans.filter((p) => p.id !== "customEnterprise");
  if (tenantSlug === REMEDY_MEDS_SLUG || tenantSlug === TEST_SLUG) {
    return plans.filter((p) => p.id !== "enterprise");
  }
  return plans.filter((p) => p.id !== "customEnterprise");
}

export function getPlanById(id: string): Plan | undefined {
  return plans.find((p) => p.id === id);
}

export function getPlanByLookupKey(lookupKey: string): Plan | undefined {
  return plans.find((p) => p.lookupKey === lookupKey);
}
