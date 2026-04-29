import { cva } from "class-variance-authority";

export const avatarRootVariants = cva(
  "relative inline-flex shrink-0 items-center justify-center overflow-hidden select-none",
  {
    variants: {
      density: {
        brand: "font-mono uppercase text-ink-hi tracking-tactical",
        compact: "font-sans font-medium text-l-ink",
      },
      size: {
        xs: "h-5 w-5 text-[9px]",
        sm: "h-6 w-6 text-[10px]",
        md: "h-8 w-8 text-[11px]",
        lg: "h-10 w-10 text-[12px]",
        xl: "h-12 w-12 text-[14px]",
      },
      shape: {
        circle: "rounded-full",
        square: "rounded-xs",
      },
      tone: {
        neutral: "",
        ember: "bg-[rgba(216,67,10,0.12)] text-ember border border-ember/40",
        teal: "bg-[rgba(45,212,191,0.12)] text-event-teal border border-event-teal/40",
        violet:
          "bg-[rgba(139,92,246,0.12)] text-event-violet border border-event-violet/40",
      },
    },
    compoundVariants: [
      { density: "brand", tone: "neutral", className: "bg-surface-03" },
      { density: "compact", tone: "neutral", className: "bg-l-wash-5" },
      { density: "compact", shape: "square", className: "rounded-l" },
    ],
    defaultVariants: {
      density: "brand",
      shape: "circle",
      size: "md",
      tone: "neutral",
    },
  }
);

export const avatarImageVariants = cva("h-full w-full object-cover");

export const avatarFallbackVariants = cva(
  "flex h-full w-full items-center justify-center text-[0.5em]",
  {
    variants: {
      density: {
        brand: "bg-surface-03 tracking-tactical",
        compact: "bg-l-wash-5 tracking-normal",
      },
    },
    defaultVariants: {
      density: "brand",
    },
  }
);
