export const shadows = {
  card: "var(--shadow-card)",
  panel: "var(--shadow-panel)",
  glowEmber: "var(--shadow-glow-ember)",
} as const;

export type Shadow = keyof typeof shadows;
