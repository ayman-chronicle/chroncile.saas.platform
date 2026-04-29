import { cva } from "class-variance-authority";

export const listboxRootVariants = cva(
  "flex flex-col border bg-surface-01 outline-none max-h-[320px] overflow-auto data-[focus-visible=true]:outline data-[focus-visible=true]:outline-1 data-[focus-visible=true]:outline-ember",
  {
    variants: {
      density: {
        brand: "rounded-sm border-hairline p-s-1",
        compact: "rounded-l border-l-border p-[2px]",
      },
    },
    defaultVariants: {
      density: "brand",
    },
  }
);

export const listboxItemVariants = cva(
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

export const listboxSectionVariants = cva("py-s-1");

export const listboxSectionHeaderVariants = cva("", {
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
