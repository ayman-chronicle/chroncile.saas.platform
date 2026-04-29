import { cva } from "class-variance-authority";

export const selectRootVariants = cva("flex flex-col gap-s-1 w-full");

export const selectTriggerVariants = cva(
  "flex w-full items-center justify-between gap-s-2 border transition-colors duration-fast ease-out outline-none text-left data-[focus-visible=true]:outline data-[focus-visible=true]:outline-1 data-[disabled=true]:opacity-50 data-[disabled=true]:cursor-not-allowed",
  {
    variants: {
      density: {
        brand:
          "rounded-sm bg-surface-00 px-s-3 py-s-2 pr-[32px] font-mono text-mono-lg text-ink data-[hovered=true]:border-ink-dim data-[focus-visible=true]:border-ember data-[focus-visible=true]:outline-ember data-[open=true]:border-ember",
        compact:
          "h-[28px] rounded-l bg-l-surface-input px-[10px] pr-[28px] font-sans text-[13px] leading-none text-l-ink data-[hovered=true]:border-l-border-strong data-[focus-visible=true]:border-[rgba(216,67,10,0.5)] data-[focus-visible=true]:outline-[rgba(216,67,10,0.5)] data-[focus-visible=true]:shadow-[0_0_0_3px_rgba(216,67,10,0.12)] data-[open=true]:border-[rgba(216,67,10,0.5)]",
      },
      variant: {
        default: "border-hairline-strong",
        auth: "bg-transparent border-hairline-strong text-ink-hi data-[focus-visible=true]:border-ink-hi",
      },
      invalid: {
        true: "border-event-red data-[focus-visible=true]:border-event-red data-[open=true]:border-event-red",
      },
    },
    defaultVariants: {
      density: "brand",
      variant: "default",
    },
  }
);

export const selectValueVariants = cva("truncate data-[placeholder=true]:text-ink-faint", {
  variants: {
    density: {
      brand: "text-ink",
      compact: "text-l-ink",
    },
  },
  defaultVariants: {
    density: "brand",
  },
});

export const selectChevronVariants = cva(
  "pointer-events-none absolute top-1/2 -translate-y-1/2 transition-transform duration-fast ease-out",
  {
    variants: {
      density: {
        brand: "right-s-3 h-4 w-4 text-ink-dim",
        compact: "right-[10px] h-3.5 w-3.5 text-l-ink-dim",
      },
    },
    defaultVariants: {
      density: "brand",
    },
  }
);

export const selectPopoverVariants = cva(
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

export const selectListboxVariants = cva("max-h-[320px] overflow-auto outline-none");

export const selectItemVariants = cva(
  "relative cursor-pointer select-none data-[disabled=true]:opacity-50 data-[disabled=true]:cursor-not-allowed outline-none",
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

export const selectSectionVariants = cva("py-s-1");

export const selectSectionHeaderVariants = cva("", {
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
