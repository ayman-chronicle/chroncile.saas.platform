import { cva } from "class-variance-authority";

export const progressRootVariants = cva("flex flex-col w-full", {
  variants: {
    density: {
      brand: "gap-s-2",
      compact: "gap-[6px]",
    },
  },
  defaultVariants: {
    density: "brand",
  },
});

export const progressLabelVariants = cva("flex items-center justify-between", {
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

export const progressTrackVariants = cva("relative w-full overflow-hidden", {
  variants: {
    density: {
      brand: "h-[4px] rounded-pill bg-surface-03",
      compact: "h-[3px] rounded-l bg-l-wash-5",
    },
  },
  defaultVariants: {
    density: "brand",
  },
});

export const progressFillVariants = cva(
  "absolute inset-y-0 left-0 bg-ember transition-[width] duration-fast ease-out"
);

export const progressIndeterminateVariants = cva(
  "absolute inset-y-0 w-1/3 bg-ember animate-chron-indeterminate"
);
