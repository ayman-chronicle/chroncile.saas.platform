export const radius = {
  xs: "var(--r-xs)",
  sm: "var(--r-sm)",
  md: "var(--r-md)",
  lg: "var(--r-lg)",
  xl: "var(--r-xl)",
  pill: "var(--r-pill)",
} as const;

export type Radius = keyof typeof radius;
