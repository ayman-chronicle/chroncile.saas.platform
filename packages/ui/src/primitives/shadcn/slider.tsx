import { cva } from "class-variance-authority";

export const sliderRootVariants = cva("flex flex-col gap-s-2 w-full");

export const sliderTrackVariants = cva(
  "relative w-full rounded-pill data-[orientation=vertical]:h-full",
  {
    variants: {
      density: {
        brand: "h-[6px] bg-surface-03 data-[orientation=vertical]:w-[6px]",
        compact: "h-[4px] bg-l-wash-3 data-[orientation=vertical]:w-[4px]",
      },
    },
    defaultVariants: {
      density: "brand",
    },
  }
);

export const sliderFillVariants = cva(
  "absolute inset-y-0 left-0 rounded-pill bg-ember pointer-events-none"
);

export const sliderThumbVariants = cva(
  "rounded-full bg-white border border-ember shadow-card cursor-grab data-[dragging=true]:cursor-grabbing data-[dragging=true]:scale-110 data-[focus-visible=true]:outline data-[focus-visible=true]:outline-2 data-[focus-visible=true]:outline-ember data-[focus-visible=true]:outline-offset-2 data-[disabled=true]:opacity-50 data-[disabled=true]:cursor-not-allowed",
  {
    variants: {
      density: {
        brand: "h-[16px] w-[16px]",
        compact: "h-[12px] w-[12px]",
      },
    },
    defaultVariants: {
      density: "brand",
    },
  }
);

export const sliderOutputVariants = cva("self-end", {
  variants: {
    density: {
      brand: "font-mono text-mono-sm text-ink-dim",
      compact: "font-sans text-[11px] font-medium text-l-ink-dim",
    },
  },
  defaultVariants: {
    density: "brand",
  },
});
