import { cva } from "class-variance-authority";

export const passwordMeterRootVariants = cva("flex flex-col", {
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

export const passwordMeterBarsVariants = cva("flex gap-[4px]");

export const passwordMeterBarVariants = cva(
  "h-[3px] flex-1 transition-colors duration-fast ease-out",
  {
    variants: {
      density: {
        brand: "rounded-pill bg-surface-03",
        compact: "rounded-pill bg-l-wash-5",
      },
    },
    defaultVariants: {
      density: "brand",
    },
  }
);

export const passwordMeterMetaVariants = cva(
  "flex items-center justify-between",
  {
    variants: {
      density: {
        brand: "font-mono text-mono-sm uppercase tracking-tactical text-ink-dim",
        compact: "font-sans text-[12px] font-medium text-l-ink-dim",
      },
    },
    defaultVariants: {
      density: "brand",
    },
  }
);

export const passwordMeterStrengthVariants = cva("", {
  variants: {
    density: {
      brand: "text-ink-lo",
      compact: "text-l-ink-lo",
    },
  },
  defaultVariants: {
    density: "brand",
  },
});

export const passwordMeterRulesVariants = cva(
  "grid grid-cols-2 gap-x-s-3 gap-y-[6px] mt-s-1"
);

export const passwordMeterRuleVariants = cva(
  "inline-flex items-center gap-[6px]",
  {
    variants: {
      density: {
        brand: "font-mono text-mono-sm text-ink-dim",
        compact: "font-sans text-[12px] text-l-ink-dim",
      },
    },
    defaultVariants: {
      density: "brand",
    },
  }
);

export const passwordMeterRuleCheckVariants = cva(
  "inline-flex h-[12px] w-[12px] items-center justify-center text-transparent",
  {
    variants: {
      density: {
        brand: "rounded-pill border border-hairline-strong",
        compact: "rounded-pill border border-l-border",
      },
      met: {
        true: "text-ink-hi border-event-green/60 bg-event-green/15 [&>svg]:text-event-green",
      },
    },
    defaultVariants: {
      density: "brand",
    },
  }
);
