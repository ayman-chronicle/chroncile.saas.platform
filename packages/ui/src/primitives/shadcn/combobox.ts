import { cva } from "class-variance-authority";

export const comboboxRootVariants = cva("flex flex-col gap-s-1 w-full");
export const comboboxInputWrapperVariants = cva("relative");

export const comboboxInputVariants = cva(
  "w-full border outline-none transition-colors duration-fast ease-out data-[invalid=true]:border-event-red data-[disabled=true]:opacity-50 data-[disabled=true]:cursor-not-allowed",
  {
    variants: {
      density: {
        brand:
          "rounded-sm bg-surface-00 px-s-3 py-s-2 pr-[32px] font-mono text-mono-lg text-ink placeholder:text-ink-faint data-[hovered=true]:border-ink-dim data-[focused=true]:border-ember",
        compact:
          "h-[28px] rounded-l bg-l-surface-input px-[10px] pr-[28px] font-sans text-[13px] leading-none text-l-ink placeholder:text-l-ink-dim data-[hovered=true]:border-l-border-strong data-[focused=true]:border-[rgba(216,67,10,0.5)] data-[focused=true]:shadow-[0_0_0_3px_rgba(216,67,10,0.12)]",
      },
      variant: {
        default: "border-hairline-strong",
        auth: "bg-transparent border-hairline-strong text-ink-hi data-[focused=true]:border-ink-hi",
      },
      invalid: {
        true: "border-event-red data-[focused=true]:border-event-red",
      },
    },
    compoundVariants: [
      { density: "compact", variant: "default", className: "border-l-border" },
    ],
    defaultVariants: {
      density: "brand",
      variant: "default",
    },
  }
);

export const comboboxButtonVariants = cva(
  "absolute top-1/2 -translate-y-1/2 inline-flex items-center justify-center outline-none data-[focus-visible=true]:outline data-[focus-visible=true]:outline-1",
  {
    variants: {
      density: {
        brand:
          "right-s-3 h-5 w-5 text-ink-dim data-[hovered=true]:text-ink-hi data-[focus-visible=true]:outline-ember",
        compact:
          "right-[8px] h-4 w-4 text-l-ink-dim data-[hovered=true]:text-l-ink data-[focus-visible=true]:outline-[rgba(216,67,10,0.5)]",
      },
    },
    defaultVariants: {
      density: "brand",
    },
  }
);

export const comboboxPopoverVariants = cva(
  "z-50 min-w-[var(--trigger-width)] outline-none data-[entering=true]:animate-in data-[entering=true]:fade-in data-[exiting=true]:animate-out data-[exiting=true]:fade-out",
  {
    variants: {
      density: {
        brand:
          "rounded-sm border border-hairline-strong bg-surface-02 p-s-1 shadow-panel",
        compact:
          "rounded-l border border-l-border bg-l-surface-raised p-[2px] shadow-panel",
      },
    },
    defaultVariants: {
      density: "brand",
    },
  }
);

export const comboboxListboxVariants = cva("max-h-[320px] overflow-auto outline-none");

export const comboboxItemVariants = cva(
  "relative cursor-pointer select-none outline-none data-[disabled=true]:opacity-50 data-[disabled=true]:cursor-not-allowed",
  {
    variants: {
      density: {
        brand:
          "rounded-xs px-s-2 py-s-2 font-mono text-mono-lg text-ink data-[focused=true]:bg-surface-03 data-[selected=true]:text-ink-hi data-[selected=true]:bg-surface-03",
        compact:
          "rounded-l-sm px-[8px] py-[5px] font-sans text-[13px] leading-none text-l-ink data-[focused=true]:bg-l-surface-hover data-[selected=true]:text-l-ink data-[selected=true]:bg-l-surface-selected",
      },
    },
    defaultVariants: {
      density: "brand",
    },
  }
);

export const comboboxSectionVariants = cva("py-s-1");

export const comboboxSectionHeaderVariants = cva("", {
  variants: {
    density: {
      brand:
        "px-s-2 pt-s-2 pb-s-1 font-mono text-mono-sm uppercase tracking-tactical text-ink-dim",
      compact:
        "px-[8px] pt-[6px] pb-[3px] font-sans text-[11px] font-medium tracking-normal text-l-ink-dim",
    },
  },
  defaultVariants: {
    density: "brand",
  },
});

export const comboboxEmptyVariants = cva("", {
  variants: {
    density: {
      brand: "px-s-3 py-s-4 font-mono text-mono-sm text-ink-dim",
      compact: "px-[10px] py-[12px] font-sans text-[12px] text-l-ink-dim",
    },
  },
  defaultVariants: {
    density: "brand",
  },
});
