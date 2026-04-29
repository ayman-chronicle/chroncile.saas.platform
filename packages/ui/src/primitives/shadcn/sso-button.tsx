import { cva } from "class-variance-authority";

export const ssoButtonVariants = cva(
  "group inline-flex w-full items-center border transition-[background-color,border-color,color] duration-fast ease-out data-[focus-visible=true]:outline data-[focus-visible=true]:outline-1 data-[focus-visible=true]:outline-ember data-[disabled=true]:opacity-40 data-[disabled=true]:cursor-not-allowed data-[pending=true]:cursor-wait",
  {
    variants: {
      density: {
        brand:
          "h-[44px] gap-s-3 px-s-3 rounded-sm border-hairline-strong bg-surface-01 font-sans text-[13.5px] font-medium text-ink-hi data-[hovered=true]:bg-surface-02 data-[hovered=true]:border-ink-dim",
        compact:
          "h-[32px] gap-[8px] px-[10px] rounded-md border-l-border bg-l-surface-raised font-sans text-[13px] font-medium text-l-ink data-[hovered=true]:bg-l-surface-hover data-[hovered=true]:border-l-border-strong",
      },
    },
    defaultVariants: {
      density: "brand",
    },
  }
);

export const ssoIconVariants = cva(
  "inline-flex shrink-0 items-center justify-center",
  {
    variants: {
      density: {
        brand: "h-5 w-5 text-ink",
        compact: "h-4 w-4 text-l-ink",
      },
    },
    defaultVariants: {
      density: "brand",
    },
  }
);

export const ssoLabelVariants = cva("flex-1 text-left");

export const ssoKbdVariants = cva("inline-flex items-center justify-center", {
  variants: {
    density: {
      brand:
        "h-[18px] min-w-[18px] rounded-l-sm bg-surface-03 px-[5px] font-mono text-mono-sm text-ink-dim",
      compact:
        "h-[16px] min-w-[16px] rounded-l-sm bg-l-wash-3 px-[4px] font-sans text-[10px] font-medium text-l-ink-dim",
    },
  },
  defaultVariants: {
    density: "brand",
  },
});

export const ssoSpinnerVariants = cva(
  "shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent",
  {
    variants: {
      density: {
        brand: "h-4 w-4",
        compact: "h-3.5 w-3.5",
      },
    },
    defaultVariants: {
      density: "brand",
    },
  }
);
