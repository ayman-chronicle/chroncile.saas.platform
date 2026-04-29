import { cva } from "class-variance-authority";

export const radioGroupVariants = cva(
  "flex flex-col gap-s-2 data-[orientation=horizontal]:flex-row"
);

export const radioBaseVariants = cva(
  "inline-flex items-center gap-s-2 cursor-pointer data-[disabled=true]:cursor-not-allowed data-[disabled=true]:opacity-50"
);

export const radioIndicatorVariants = cva(
  "relative flex shrink-0 items-center justify-center rounded-full transition-colors duration-fast ease-out data-[focus-visible=true]:outline data-[focus-visible=true]:outline-1 data-[focus-visible=true]:outline-ember data-[selected=true]:border-ember data-[invalid=true]:border-event-red",
  {
    variants: {
      size: {
        sm: "h-[14px] w-[14px] border border-l-border-strong bg-transparent data-[hovered=true]:border-l-border-hover",
        md: "h-[16px] w-[16px] border border-hairline-strong bg-surface-00 data-[hovered=true]:border-ink-dim",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
);

export const radioDotVariants = cva(
  "rounded-full bg-ember opacity-0 data-[selected=true]:opacity-100",
  {
    variants: {
      size: {
        sm: "h-[6px] w-[6px]",
        md: "h-[6px] w-[6px]",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
);

export const radioLabelVariants = cva("font-sans text-sm text-ink", {
  variants: {
    size: {
      sm: "text-[12.5px] text-l-ink",
      md: "text-sm text-ink",
    },
  },
  defaultVariants: {
    size: "md",
  },
});
