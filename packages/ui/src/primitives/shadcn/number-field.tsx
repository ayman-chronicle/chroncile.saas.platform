import { cva } from "class-variance-authority";

export const numberFieldRootVariants = cva("flex flex-col gap-s-1");

export const numberFieldGroupVariants = cva(
  "flex items-stretch transition-colors duration-fast ease-out data-[invalid=true]:border-event-red data-[disabled=true]:opacity-50 data-[disabled=true]:cursor-not-allowed",
  {
    variants: {
      density: {
        compact:
          "h-[28px] rounded-l border border-l-border bg-l-surface-input data-[focus-within=true]:border-[rgba(216,67,10,0.5)] data-[focus-within=true]:shadow-[0_0_0_3px_rgba(216,67,10,0.12)]",
        brand:
          "rounded-sm border border-hairline-strong bg-surface-00 data-[focus-within=true]:border-ember",
      },
    },
    defaultVariants: {
      density: "compact",
    },
  }
);

export const numberFieldInputVariants = cva("flex-1 bg-transparent outline-none", {
  variants: {
    density: {
      compact:
        "px-[10px] font-sans text-[13px] text-l-ink placeholder:text-l-ink-dim",
      brand:
        "px-s-3 py-s-2 font-mono text-mono-lg text-ink placeholder:text-ink-faint",
    },
  },
  defaultVariants: {
    density: "compact",
  },
});

export const numberFieldButtonVariants = cva(
  "inline-flex items-center justify-center transition-colors duration-fast ease-out data-[focus-visible=true]:outline data-[focus-visible=true]:outline-1 data-[focus-visible=true]:outline-ember data-[disabled=true]:opacity-50 data-[disabled=true]:cursor-not-allowed",
  {
    variants: {
      density: {
        compact:
          "h-full w-[24px] text-l-ink-dim data-[hovered=true]:bg-l-wash-3 data-[hovered=true]:text-l-ink",
        brand:
          "h-full w-[28px] text-ink-dim data-[hovered=true]:bg-surface-03 data-[hovered=true]:text-ink-hi",
      },
    },
    defaultVariants: {
      density: "compact",
    },
  }
);
