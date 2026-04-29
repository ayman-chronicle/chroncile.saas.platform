import { cva } from "class-variance-authority";

export const eyebrowVariants = cva("leading-none [&>b]:font-medium", {
  variants: {
    density: {
      brand:
        "font-mono text-mono uppercase tracking-eyebrow text-ink-dim [&>b]:text-ink-hi",
      compact:
        "font-sans text-[11px] font-medium uppercase tracking-[0.04em] text-l-ink-dim [&>b]:text-l-ink",
    },
  },
  defaultVariants: {
    density: "brand",
  },
});
