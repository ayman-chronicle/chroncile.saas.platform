import { cva } from "class-variance-authority";

export const autocompleteVariants = cva(
  "flex flex-col gap-s-2 border shadow-panel",
  {
    variants: {
      density: {
        brand: "rounded-md border-hairline-strong bg-surface-02 p-s-2",
        compact: "rounded-l border-l-border bg-l-surface-raised p-[6px] gap-[6px]",
      },
    },
    defaultVariants: {
      density: "brand",
    },
  }
);
