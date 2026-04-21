export const spacing = {
  "1": "var(--s-1)",
  "2": "var(--s-2)",
  "3": "var(--s-3)",
  "4": "var(--s-4)",
  "5": "var(--s-5)",
  "6": "var(--s-6)",
  "8": "var(--s-8)",
  "10": "var(--s-10)",
  "12": "var(--s-12)",
  "16": "var(--s-16)",
  "20": "var(--s-20)",
} as const;

export type Spacing = keyof typeof spacing;
