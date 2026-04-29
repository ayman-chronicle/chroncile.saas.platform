import { cva } from "class-variance-authority";

export const accordionGroupVariants = cva(
  "flex flex-col bg-surface-01 border border-hairline divide-y divide-hairline",
  {
    variants: {
      density: {
        brand: "rounded-md",
        compact: "rounded-l",
      },
    },
    defaultVariants: {
      density: "brand",
    },
  }
);

export const accordionItemVariants = cva("outline-none");
export const accordionHeaderVariants = cva("");

export const accordionTriggerVariants = cva(
  "flex w-full items-center justify-between gap-s-3 text-ink-lo transition-colors duration-fast ease-out outline-none data-[hovered=true]:text-ink-hi data-[hovered=true]:bg-surface-02 data-[focus-visible=true]:outline data-[focus-visible=true]:outline-1 data-[focus-visible=true]:outline-ember",
  {
    variants: {
      density: {
        brand: "px-s-4 py-s-3 font-mono text-mono uppercase tracking-tactical",
        compact:
          "px-s-3 py-s-2 font-sans text-[13px] font-medium tracking-normal leading-none",
      },
    },
    defaultVariants: {
      density: "brand",
    },
  }
);

export const accordionChevronVariants = cva(
  "shrink-0 text-ink-dim transition-transform duration-fast ease-out",
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

export const accordionPanelVariants = cva(
  "pt-0 text-body-sm text-ink-lo outline-none",
  {
    variants: {
      density: {
        brand: "px-s-4 pb-s-4",
        compact: "px-s-3 pb-s-3",
      },
    },
    defaultVariants: {
      density: "brand",
    },
  }
);
