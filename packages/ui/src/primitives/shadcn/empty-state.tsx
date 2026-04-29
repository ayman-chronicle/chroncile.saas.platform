import { cva } from "class-variance-authority";

export const emptyStateRootVariants = cva(
  "empty-state flex flex-col items-center justify-center text-center",
  {
    variants: {
      density: {
        brand: "rounded-md",
        compact: "rounded-l",
      },
      size: {
        sm: "gap-s-2 px-s-4 py-s-8",
        md: "gap-s-3 px-s-6 py-s-12",
        lg: "gap-s-4 px-s-8 py-s-16",
      },
      chrome: {
        default: "",
        minimal: "border border-transparent bg-transparent",
        outline: "",
      },
    },
    compoundVariants: [
      {
        density: "brand",
        chrome: "default",
        className: "border border-hairline border-dashed bg-surface-01",
      },
      {
        density: "brand",
        chrome: "outline",
        className: "border border-hairline bg-transparent",
      },
      {
        density: "compact",
        chrome: "default",
        className: "border border-l-border border-dashed bg-l-surface-raised",
      },
      {
        density: "compact",
        chrome: "outline",
        className: "border border-l-border bg-transparent",
      },
    ],
    defaultVariants: {
      chrome: "default",
      density: "brand",
      size: "md",
    },
  }
);

export const emptyStateHeaderVariants = cva(
  "empty-state__header flex flex-col items-center gap-s-2"
);

export const emptyStateMediaVariants = cva(
  "empty-state__media flex items-center justify-center",
  {
    variants: {
      density: {
        brand: "text-ink-dim",
        compact: "text-l-ink-dim",
      },
      size: {
        sm: "h-7 w-7",
        md: "h-8 w-8",
        lg: "h-10 w-10",
      },
      mediaVariant: {
        default: "",
        icon: "rounded-pill p-s-2",
      },
    },
    compoundVariants: [
      { density: "brand", mediaVariant: "icon", className: "bg-surface-03" },
      { density: "compact", mediaVariant: "icon", className: "bg-l-wash-5" },
    ],
    defaultVariants: {
      density: "brand",
      mediaVariant: "default",
      size: "md",
    },
  }
);

export const emptyStateTitleVariants = cva("empty-state__title", {
  variants: {
    density: {
      brand: "font-display text-title-sm text-ink-hi",
      compact: "font-sans text-[15px] font-medium text-l-ink",
    },
  },
  defaultVariants: {
    density: "brand",
  },
});

export const emptyStateDescriptionVariants = cva(
  "empty-state__description max-w-[360px]",
  {
    variants: {
      density: {
        brand: "font-sans text-sm text-ink-lo",
        compact: "font-sans text-[13px] text-l-ink-lo",
      },
    },
    defaultVariants: {
      density: "brand",
    },
  }
);

export const emptyStateContentVariants = cva(
  "empty-state__content mt-s-2 flex items-center gap-s-2"
);
