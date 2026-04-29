import { cva } from "class-variance-authority";

export const modalOverlayVariants = cva(
  "fixed inset-0 z-40 bg-black/60 backdrop-blur-sm data-[entering=true]:animate-in data-[entering=true]:fade-in data-[exiting=true]:animate-out data-[exiting=true]:fade-out"
);

export const modalVariants = cva(
  "fixed left-1/2 top-1/2 z-50 max-h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-[520px] -translate-x-1/2 -translate-y-1/2 overflow-hidden border bg-surface-01 shadow-panel outline-none data-[entering=true]:animate-in data-[entering=true]:zoom-in-95 data-[exiting=true]:animate-out data-[exiting=true]:zoom-out-95",
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

export const modalDialogVariants = cva("outline-none");

export const modalHeaderVariants = cva(
  "flex items-center justify-between border-b border-hairline bg-surface-02",
  {
    variants: {
      density: {
        brand: "px-s-4 py-s-3",
        compact: "px-[14px] py-[10px]",
      },
    },
    defaultVariants: {
      density: "brand",
    },
  }
);

export const modalTitleVariants = cva("", {
  variants: {
    density: {
      brand: "font-display text-title-sm tracking-tight",
      compact: "font-sans text-[14px] font-medium tracking-normal",
    },
    variant: {
      default: "text-ink-hi",
      danger: "text-event-red",
      dark: "text-ink-hi",
    },
  },
  defaultVariants: {
    density: "brand",
    variant: "default",
  },
});

export const modalCloseVariants = cva(
  "inline-flex items-center justify-center text-ink-dim transition-colors duration-fast ease-out data-[hovered=true]:bg-surface-03 data-[hovered=true]:text-ink-hi data-[focus-visible=true]:outline data-[focus-visible=true]:outline-1 data-[focus-visible=true]:outline-ember",
  {
    variants: {
      density: {
        brand: "h-8 w-8 rounded-sm",
        compact: "h-7 w-7 rounded-l",
      },
    },
    defaultVariants: {
      density: "brand",
    },
  }
);

export const modalBodyVariants = cva("text-ink-lo", {
  variants: {
    density: {
      brand: "px-s-4 py-s-4 text-body-sm",
      compact: "px-[14px] py-[14px] font-sans text-[13px] leading-snug",
    },
  },
  defaultVariants: {
    density: "brand",
  },
});

export const modalActionsVariants = cva(
  "flex items-center justify-end border-t border-hairline bg-surface-02",
  {
    variants: {
      density: {
        brand: "gap-s-3 px-s-4 py-s-3",
        compact: "gap-[8px] px-[14px] py-[10px]",
      },
    },
    defaultVariants: {
      density: "brand",
    },
  }
);
