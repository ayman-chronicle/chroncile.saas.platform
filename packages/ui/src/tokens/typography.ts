export const fontFamilies = {
  display: "var(--font-display)",
  sans: "var(--font-sans)",
  mono: "var(--font-mono)",
} as const;

export const fontSizes = {
  "display-xxl": "var(--fs-display-xxl)",
  "display-xl": "var(--fs-display-xl)",
  "display-lg": "var(--fs-display-lg)",
  "display-md": "var(--fs-display-md)",
  "display-sm": "var(--fs-display-sm)",
  "title-lg": "var(--fs-title-lg)",
  title: "var(--fs-title)",
  "title-sm": "var(--fs-title-sm)",
  "body-lg": "var(--fs-body-lg)",
  body: "var(--fs-body)",
  "body-sm": "var(--fs-body-sm)",
  micro: "var(--fs-micro)",
  "mono-lg": "var(--fs-mono-lg)",
  mono: "var(--fs-mono)",
  "mono-sm": "var(--fs-mono-sm)",
  "mono-xs": "var(--fs-mono-xs)",
} as const;

export type FontFamily = keyof typeof fontFamilies;
export type FontSize = keyof typeof fontSizes;
