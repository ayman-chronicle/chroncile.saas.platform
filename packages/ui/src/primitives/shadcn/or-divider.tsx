import { cva } from "class-variance-authority";

export const orDividerRootVariants = cva("flex items-center my-s-2 select-none", {
  variants: {
    density: {
      brand: "gap-s-3",
      compact: "gap-[10px]",
    },
  },
  defaultVariants: {
    density: "brand",
  },
});

export const orDividerLineVariants = cva("h-px flex-1", {
  variants: {
    density: {
      brand: "bg-hairline",
      compact: "bg-l-border",
    },
  },
  defaultVariants: {
    density: "brand",
  },
});

export const orDividerLabelVariants = cva("", {
  variants: {
    density: {
      brand: "font-mono text-mono-sm uppercase tracking-tactical text-ink-dim",
      compact: "font-sans text-[12px] font-medium text-l-ink-dim",
    },
  },
  defaultVariants: {
    density: "brand",
  },
});
