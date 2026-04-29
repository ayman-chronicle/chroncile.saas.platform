import { cva } from "class-variance-authority";

export const searchFieldRootVariants = cva(
  "relative flex w-full items-center transition-colors duration-fast ease-out",
  {
    variants: {
      density: {
        compact:
          "h-[28px] rounded-l border border-l-border bg-l-surface-input pl-[34px] pr-[6px] data-[focus-within=true]:border-[rgba(216,67,10,0.5)] data-[focus-within=true]:shadow-[0_0_0_3px_rgba(216,67,10,0.12)] data-[disabled=true]:opacity-50",
        brand:
          "rounded-sm border border-hairline-strong bg-surface-00 pl-[40px] pr-[8px] data-[focus-within=true]:border-ember data-[disabled=true]:opacity-50",
      },
    },
    defaultVariants: {
      density: "compact",
    },
  }
);

export const searchFieldInputVariants = cva(
  "flex-1 bg-transparent outline-none data-[empty=true]:pr-0",
  {
    variants: {
      density: {
        compact: "font-sans text-[13px] text-l-ink placeholder:text-l-ink-dim",
        brand: "py-s-2 font-mono text-mono-lg text-ink placeholder:text-ink-faint",
      },
    },
    defaultVariants: {
      density: "compact",
    },
  }
);

export const searchFieldIconVariants = cva(
  "pointer-events-none absolute top-1/2 -translate-y-1/2",
  {
    variants: {
      density: {
        compact: "left-[10px] h-[14px] w-[14px] text-l-ink-dim",
        brand: "left-s-3 h-4 w-4 text-ink-dim",
      },
    },
    defaultVariants: {
      density: "compact",
    },
  }
);

export const searchFieldClearVariants = cva(
  "inline-flex items-center justify-center rounded-l transition-colors duration-fast ease-out data-[empty=true]:hidden data-[focus-visible=true]:outline data-[focus-visible=true]:outline-1 data-[focus-visible=true]:outline-ember",
  {
    variants: {
      density: {
        compact:
          "h-[20px] w-[20px] text-l-ink-dim data-[hovered=true]:text-l-ink data-[hovered=true]:bg-l-wash-3",
        brand:
          "h-6 w-6 text-ink-dim data-[hovered=true]:text-ink-hi data-[hovered=true]:bg-surface-03",
      },
    },
    defaultVariants: {
      density: "compact",
    },
  }
);
