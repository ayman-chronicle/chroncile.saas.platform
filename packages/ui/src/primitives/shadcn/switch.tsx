import { cva } from "class-variance-authority";

export const switchBaseVariants = cva(
  "inline-flex items-center gap-s-2 cursor-pointer data-[disabled=true]:cursor-not-allowed data-[disabled=true]:opacity-50"
);

export const switchTrackVariants = cva(
  "relative inline-flex shrink-0 items-center rounded-pill transition-colors duration-fast ease-out data-[selected=true]:bg-ember data-[selected=true]:border-ember data-[focus-visible=true]:outline data-[focus-visible=true]:outline-1 data-[focus-visible=true]:outline-ember",
  {
    variants: {
      size: {
        sm: "h-[14px] w-[26px] border-0 bg-l-wash-5",
        md: "h-[20px] w-[36px] border border-hairline-strong bg-surface-03",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
);

export const switchThumbVariants = cva(
  "inline-block rounded-full bg-white shadow-sm transition-transform duration-fast ease-out",
  {
    variants: {
      size: {
        sm: "h-[10px] w-[10px] translate-x-[2px] data-[selected=true]:translate-x-[12px]",
        md: "h-[14px] w-[14px] translate-x-[2px] data-[selected=true]:translate-x-[18px]",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
);

export const switchLabelVariants = cva("font-sans text-sm text-ink", {
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
