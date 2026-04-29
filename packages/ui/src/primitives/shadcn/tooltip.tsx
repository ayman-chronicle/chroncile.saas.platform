import { cva } from "class-variance-authority";

export const tooltipVariants = cva(
  "z-50 border bg-surface-02 shadow-card outline-none data-[entering=true]:animate-in data-[entering=true]:fade-in data-[exiting=true]:animate-out data-[exiting=true]:fade-out",
  {
    variants: {
      density: {
        brand:
          "rounded-xs border-hairline-strong px-s-2 py-s-1 font-mono text-mono-sm text-ink",
        compact:
          "rounded-l border-l-border px-[8px] py-[4px] font-sans text-[12px] font-medium text-l-ink",
      },
    },
    defaultVariants: {
      density: "brand",
    },
  }
);

export const tooltipArrowVariants = cva("fill-surface-02 stroke-hairline-strong");
