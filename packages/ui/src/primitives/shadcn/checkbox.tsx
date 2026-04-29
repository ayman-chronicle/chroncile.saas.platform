import { cva } from "class-variance-authority";

export const checkboxBaseVariants = cva(
  "inline-flex items-center gap-s-2 cursor-pointer data-[disabled=true]:cursor-not-allowed data-[disabled=true]:opacity-50"
);

export const checkboxBoxVariants = cva(
  "relative flex shrink-0 items-center justify-center transition-colors duration-fast ease-out data-[focus-visible=true]:outline data-[focus-visible=true]:outline-1 data-[focus-visible=true]:outline-ember data-[selected=true]:bg-ember data-[selected=true]:border-ember data-[indeterminate=true]:bg-ember data-[indeterminate=true]:border-ember data-[invalid=true]:border-event-red",
  {
    variants: {
      variant: {
        default: "",
        auth: "bg-transparent",
      },
      size: {
        sm: "h-[14px] w-[14px] rounded-l-sm border border-l-border-strong bg-transparent data-[hovered=true]:border-l-border-hover",
        md: "h-[16px] w-[16px] rounded-xs border border-hairline-strong bg-surface-00 data-[hovered=true]:border-ink-dim",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

export const checkboxMarkVariants = cva(
  "stroke-white stroke-[3] opacity-0 data-[selected=true]:opacity-100 data-[indeterminate=true]:opacity-100",
  {
    variants: {
      size: {
        sm: "h-[10px] w-[10px]",
        md: "h-[10px] w-[10px]",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
);

export const checkboxLabelVariants = cva("font-sans text-sm text-ink", {
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
