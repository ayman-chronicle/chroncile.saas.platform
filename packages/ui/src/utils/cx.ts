export type ClassValue =
  | string
  | number
  | null
  | false
  | undefined
  | ClassValue[];

/**
 * Minimal class-name concatenator. Fine-grained merge is a non-goal —
 * the primitives own their base classes and callers pass overrides via
 * `className`, which come last so they win on equal specificity.
 */
export function cx(...args: ClassValue[]): string {
  const out: string[] = [];
  for (const a of args) {
    if (!a) continue;
    if (Array.isArray(a)) {
      const nested = cx(...a);
      if (nested) out.push(nested);
    } else {
      out.push(String(a));
    }
  }
  return out.join(" ");
}
