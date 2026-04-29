import { cva } from "class-variance-authority";

export const tabsRootVariants = cva(
  "flex flex-col data-[orientation=vertical]:flex-row",
  {
    variants: {
      density: {
        brand: "gap-s-4",
        compact: "gap-[12px]",
      },
    },
    defaultVariants: {
      density: "brand",
    },
  }
);

export const tabsListVariants = cva(
  "flex border-b border-hairline data-[orientation=vertical]:flex-col data-[orientation=vertical]:border-b-0 data-[orientation=vertical]:border-r",
  {
    variants: {
      density: {
        brand: "gap-s-2 data-[orientation=vertical]:gap-s-1",
        compact: "gap-[2px] data-[orientation=vertical]:gap-[2px]",
      },
    },
    defaultVariants: {
      density: "brand",
    },
  }
);

export const tabVariants = cva(
  "relative cursor-pointer outline-none transition-colors duration-fast ease-out data-[selected=true]:after:absolute data-[selected=true]:after:inset-x-0 data-[selected=true]:after:-bottom-px data-[selected=true]:after:bg-ember data-[focus-visible=true]:outline data-[focus-visible=true]:outline-1 data-[focus-visible=true]:outline-ember data-[disabled=true]:opacity-50 data-[disabled=true]:cursor-not-allowed",
  {
    variants: {
      density: {
        brand:
          "px-s-3 py-s-2 font-mono text-mono uppercase tracking-tactical text-ink-lo data-[hovered=true]:text-ink-hi data-[selected=true]:text-ink-hi data-[selected=true]:after:h-[2px]",
        compact:
          "px-[10px] py-[6px] font-sans text-[13px] font-medium tracking-normal leading-none text-l-ink-lo data-[hovered=true]:text-l-ink data-[selected=true]:text-l-ink data-[selected=true]:after:h-[2px]",
      },
    },
    defaultVariants: {
      density: "brand",
    },
  }
);

export const tabPanelVariants = cva("outline-none");
