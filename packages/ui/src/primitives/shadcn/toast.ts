import { cva } from "class-variance-authority";

export const toastRegionVariants = cva(
  "fixed top-s-4 right-s-4 z-50 flex flex-col gap-s-2 outline-none"
);

export const toastVariants = cva(
  "relative pointer-events-auto flex items-start gap-s-3 border shadow-panel min-w-[260px] max-w-[440px] outline-none data-[focus-visible=true]:outline data-[focus-visible=true]:outline-1 data-[focus-visible=true]:outline-ember",
  {
    variants: {
      density: {
        brand: "rounded-sm bg-surface-02 px-s-4 py-s-3",
        compact: "rounded-l bg-l-surface-raised px-[12px] py-[10px]",
      },
      tone: {
        default: "",
        success: "",
        danger: "",
        info: "",
        warning: "",
      },
    },
    compoundVariants: [
      { density: "brand", tone: "default", className: "border-hairline-strong" },
      { density: "brand", tone: "success", className: "border-event-green/40" },
      { density: "brand", tone: "danger", className: "border-event-red/40" },
      { density: "brand", tone: "info", className: "border-event-teal/40" },
      { density: "brand", tone: "warning", className: "border-event-amber/40" },
      { density: "compact", tone: "default", className: "border-l-border" },
      { density: "compact", tone: "success", className: "border-event-green/40" },
      { density: "compact", tone: "danger", className: "border-event-red/40" },
      { density: "compact", tone: "info", className: "border-event-teal/40" },
      { density: "compact", tone: "warning", className: "border-event-amber/40" },
    ],
    defaultVariants: {
      density: "brand",
      tone: "default",
    },
  }
);

export const toastContentVariants = cva("flex-1 flex flex-col gap-s-1");

export const toastTitleVariants = cva("", {
  variants: {
    density: {
      brand: "font-sans text-sm font-medium text-ink-hi",
      compact: "font-sans text-[13px] font-medium text-l-ink",
    },
  },
  defaultVariants: {
    density: "brand",
  },
});

export const toastDescriptionVariants = cva("", {
  variants: {
    density: {
      brand: "font-sans text-sm text-ink-lo",
      compact: "font-sans text-[13px] text-l-ink-lo",
    },
  },
  defaultVariants: {
    density: "brand",
  },
});

export const toastActionVariants = cva(
  "inline-flex items-center border outline-none data-[focus-visible=true]:outline data-[focus-visible=true]:outline-1 data-[focus-visible=true]:outline-ember",
  {
    variants: {
      density: {
        brand:
          "rounded-xs border-hairline-strong bg-surface-01 px-s-2 py-s-1 font-mono text-mono-sm uppercase tracking-tactical text-ink data-[hovered=true]:bg-surface-03 data-[hovered=true]:text-ink-hi",
        compact:
          "rounded-l border-l-border bg-l-surface-input px-[8px] py-[4px] font-sans text-[12px] font-medium text-l-ink data-[hovered=true]:bg-l-surface-hover data-[hovered=true]:text-l-ink",
      },
    },
    defaultVariants: {
      density: "brand",
    },
  }
);

export const toastCloseVariants = cva(
  "inline-flex items-center justify-center outline-none data-[focus-visible=true]:outline data-[focus-visible=true]:outline-1 data-[focus-visible=true]:outline-ember",
  {
    variants: {
      density: {
        brand:
          "h-6 w-6 rounded-xs text-ink-dim data-[hovered=true]:bg-surface-03 data-[hovered=true]:text-ink-hi",
        compact:
          "h-5 w-5 rounded-l text-l-ink-dim data-[hovered=true]:bg-l-surface-hover data-[hovered=true]:text-l-ink",
      },
    },
    defaultVariants: {
      density: "brand",
    },
  }
);
