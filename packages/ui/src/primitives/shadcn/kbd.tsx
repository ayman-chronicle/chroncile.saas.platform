import { cva } from "class-variance-authority";

export const kbdVariants = cva(
  "inline-flex items-center justify-center font-mono font-medium",
  {
    variants: {
      density: {
        brand: "bg-surface-02 text-ink-lo rounded-l-sm border border-hairline",
        compact: "bg-l-wash-5 text-l-ink rounded-l-sm",
      },
      size: {
        sm: "min-w-[18px] h-[18px] px-[4px] text-[11px] tracking-mono",
        md: "min-w-[22px] h-[22px] px-[6px] text-[12px] tracking-mono",
      },
    },
    defaultVariants: {
      density: "compact",
      size: "sm",
    },
  }
);
