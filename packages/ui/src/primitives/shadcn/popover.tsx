import { cva } from "class-variance-authority";

export const popoverVariants = cva(
  "z-50 border bg-surface-02 shadow-panel outline-none data-[entering=true]:animate-in data-[entering=true]:fade-in data-[exiting=true]:animate-out data-[exiting=true]:fade-out",
  {
    variants: {
      density: {
        brand: "rounded-md border-hairline-strong",
        compact: "rounded-l border-l-border",
      },
    },
    defaultVariants: {
      density: "brand",
    },
  }
);

export const popoverDialogVariants = cva("outline-none");

export const popoverArrowVariants = cva(
  "fill-surface-02 stroke-hairline-strong data-[placement=top]:rotate-180 data-[placement=left]:-rotate-90 data-[placement=right]:rotate-90"
);
