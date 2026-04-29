import { cva } from "class-variance-authority";

export const formFieldRootVariants = cva("flex flex-col", {
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

export const formFieldLabelVariants = cva("", {
  variants: {
    density: {
      brand: "font-mono text-mono-sm uppercase tracking-tactical",
      compact: "font-sans text-[12px] font-medium tracking-normal text-l-ink-lo",
    },
    tone: {
      default: "text-ink-dim",
      auth: "text-ink-hi",
    },
  },
  compoundVariants: [
    { density: "compact", tone: "default", className: "text-l-ink-lo" },
    { density: "compact", tone: "auth", className: "text-l-ink" },
  ],
  defaultVariants: {
    density: "brand",
    tone: "default",
  },
});

export const formFieldDescriptionVariants = cva("leading-[1.5]", {
  variants: {
    density: {
      brand: "font-mono text-mono-sm text-ink-dim",
      compact: "font-sans text-[12px] text-l-ink-dim",
    },
  },
  defaultVariants: {
    density: "brand",
  },
});

export const formFieldErrorVariants = cva("leading-[1.5] text-event-red", {
  variants: {
    density: {
      brand: "font-mono text-mono-sm",
      compact: "font-sans text-[12px]",
    },
  },
  defaultVariants: {
    density: "brand",
  },
});
