import { cva } from "class-variance-authority";

export const dropdownMenuPopoverVariants = cva(
  "z-50 min-w-[180px] border bg-surface-02 shadow-panel outline-none data-[entering=true]:animate-in data-[entering=true]:fade-in data-[exiting=true]:animate-out data-[exiting=true]:fade-out",
  {
    variants: {
      density: {
        brand: "rounded-sm border-hairline-strong p-s-1",
        compact: "rounded-l border-l-border p-[2px]",
      },
    },
    defaultVariants: {
      density: "brand",
    },
  }
);

export const dropdownMenuVariants = cva("outline-none max-h-[360px] overflow-auto");

export const dropdownMenuItemVariants = cva(
  "relative cursor-pointer select-none outline-none data-[focused=true]:bg-surface-03 data-[disabled=true]:opacity-50 data-[disabled=true]:cursor-not-allowed",
  {
    variants: {
      density: {
        brand: "rounded-xs px-s-2 py-s-2 font-mono text-mono-lg text-ink",
        compact:
          "rounded-l-sm px-[8px] py-[5px] font-sans text-[13px] leading-none text-l-ink data-[focused=true]:bg-l-surface-hover",
      },
      danger: {
        true: "text-event-red data-[focused=true]:bg-[rgba(239,68,68,0.08)]",
      },
    },
    defaultVariants: {
      density: "brand",
    },
  }
);

export const dropdownMenuSectionVariants = cva("py-s-1");

export const dropdownMenuSectionHeaderVariants = cva("", {
  variants: {
    density: {
      brand:
        "px-s-2 pt-s-2 pb-s-1 font-mono text-mono-sm uppercase tracking-tactical text-ink-dim",
      compact:
        "px-[8px] pt-[6px] pb-[3px] font-sans text-[11px] font-medium tracking-normal text-l-ink-dim",
    },
  },
  defaultVariants: {
    density: "brand",
  },
});

export const dropdownMenuSeparatorVariants = cva("h-px bg-hairline", {
  variants: {
    density: {
      brand: "my-s-1",
      compact: "my-[3px] bg-l-border-faint",
    },
  },
  defaultVariants: {
    density: "brand",
  },
});
