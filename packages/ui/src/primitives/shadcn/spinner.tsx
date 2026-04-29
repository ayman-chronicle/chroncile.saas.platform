import { cva } from "class-variance-authority";

export const spinnerVariants = cva(
  "inline-block shrink-0 rounded-full border-2 border-current border-t-transparent animate-spin",
  {
    variants: {
      size: {
        sm: "h-3 w-3 border-[1.5px]",
        md: "h-4 w-4",
        lg: "h-6 w-6",
        xl: "h-8 w-8 border-[3px]",
      },
      tone: {
        default: "text-ink-dim",
        ember: "text-ember",
        inverse: "text-ink-inv",
        success: "text-event-green",
        danger: "text-event-red",
      },
    },
    defaultVariants: {
      size: "md",
      tone: "default",
    },
  }
);
