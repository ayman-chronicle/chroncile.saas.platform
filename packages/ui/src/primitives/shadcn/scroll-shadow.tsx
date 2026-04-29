import { cva } from "class-variance-authority";

export const scrollShadowRootVariants = cva("relative");
export const scrollShadowContainerVariants = cva("overflow-auto");

export const scrollShadowStartVariants = cva(
  "pointer-events-none absolute left-0 top-0 z-10 transition-opacity duration-fast ease-out",
  {
    variants: {
      orientation: {
        vertical:
          "left-0 right-0 top-0 h-[24px] bg-gradient-to-b from-[var(--c-surface-00)] to-transparent",
        horizontal:
          "top-0 bottom-0 left-0 w-[24px] bg-gradient-to-r from-[var(--c-surface-00)] to-transparent",
      },
    },
    defaultVariants: {
      orientation: "vertical",
    },
  }
);

export const scrollShadowEndVariants = cva(
  "pointer-events-none absolute right-0 bottom-0 z-10 transition-opacity duration-fast ease-out",
  {
    variants: {
      orientation: {
        vertical:
          "left-0 right-0 bottom-0 h-[24px] bg-gradient-to-t from-[var(--c-surface-00)] to-transparent",
        horizontal:
          "top-0 bottom-0 right-0 w-[24px] bg-gradient-to-l from-[var(--c-surface-00)] to-transparent",
      },
    },
    defaultVariants: {
      orientation: "vertical",
    },
  }
);
