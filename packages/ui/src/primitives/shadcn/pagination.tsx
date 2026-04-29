import { cva } from "class-variance-authority";

export const paginationVariants = cva("inline-flex items-center", {
  variants: {
    density: {
      brand: "gap-s-1",
      compact: "gap-[2px]",
    },
  },
  defaultVariants: {
    density: "brand",
  },
});

export const paginationButtonVariants = cva(
  "inline-flex items-center justify-center border outline-none transition-colors duration-fast ease-out data-[focus-visible=true]:outline data-[focus-visible=true]:outline-1 data-[focus-visible=true]:outline-ember data-[disabled=true]:opacity-40 data-[disabled=true]:cursor-not-allowed",
  {
    variants: {
      density: {
        brand:
          "h-[32px] min-w-[32px] rounded-xs border-hairline-strong bg-surface-01 px-s-2 font-mono text-mono-sm text-ink-lo data-[hovered=true]:bg-surface-02 data-[hovered=true]:text-ink-hi",
        compact:
          "h-[26px] min-w-[26px] rounded-l border-l-border bg-l-surface-raised px-[8px] font-sans text-[12px] font-medium text-l-ink-lo data-[hovered=true]:bg-l-surface-hover data-[hovered=true]:text-l-ink",
      },
      current: {
        true: "border-ember bg-[rgba(216,67,10,0.08)] text-ember data-[hovered=true]:bg-[rgba(216,67,10,0.12)]",
      },
    },
    defaultVariants: {
      density: "brand",
    },
  }
);

export const paginationEllipsisVariants = cva("", {
  variants: {
    density: {
      brand: "px-s-1 font-mono text-mono-sm text-ink-dim",
      compact: "px-[6px] font-sans text-[12px] text-l-ink-dim",
    },
  },
  defaultVariants: {
    density: "brand",
  },
});
