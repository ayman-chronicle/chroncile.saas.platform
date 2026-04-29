import { cva } from "class-variance-authority";

export const tableVariants = cva(
  "w-full border-separate border-spacing-0 border bg-surface-01 outline-none",
  {
    variants: {
      density: {
        brand: "rounded-md border-hairline",
        compact: "rounded-l border-l-border",
      },
    },
    defaultVariants: {
      density: "brand",
    },
  }
);

export const tableHeaderVariants = cva("");
export const tableBodyVariants = cva("");

export const tableColumnVariants = cva(
  "sticky top-0 z-10 bg-surface-02 text-left align-middle outline-none data-[allows-sorting=true]:cursor-pointer data-[focus-visible=true]:outline data-[focus-visible=true]:outline-1 data-[focus-visible=true]:outline-ember",
  {
    variants: {
      density: {
        brand:
          "border-b border-hairline-strong px-s-3 py-s-2 font-mono text-mono-sm uppercase tracking-tactical text-ink-dim data-[hovered=true]:text-ink-hi",
        compact:
          "border-b border-l-border px-[10px] py-[6px] font-sans text-[11px] font-medium tracking-normal text-l-ink-dim data-[hovered=true]:text-l-ink",
      },
    },
    defaultVariants: {
      density: "brand",
    },
  }
);

export const tableRowVariants = cva(
  "group outline-none data-[selected=true]:bg-[rgba(216,67,10,0.06)] data-[focus-visible=true]:outline data-[focus-visible=true]:outline-1 data-[focus-visible=true]:-outline-offset-1 data-[focus-visible=true]:outline-ember",
  {
    variants: {
      density: {
        brand: "data-[hovered=true]:bg-surface-02",
        compact: "data-[hovered=true]:bg-l-surface-hover",
      },
    },
    defaultVariants: {
      density: "brand",
    },
  }
);

export const tableCellVariants = cva("align-middle outline-none", {
  variants: {
    density: {
      brand:
        "border-b border-hairline px-s-3 py-s-2 font-mono text-mono-lg text-ink",
      compact:
        "border-b border-l-border-faint px-[10px] py-[6px] font-sans text-[13px] leading-snug text-l-ink",
    },
  },
  defaultVariants: {
    density: "brand",
  },
});

export const tableSortIndicatorVariants = cva(
  "inline-block h-3 w-3 group-data-[sort-direction=descending]:rotate-180",
  {
    variants: {
      density: {
        brand: "ml-s-1 text-ink-dim",
        compact: "ml-[4px] text-l-ink-dim",
      },
    },
    defaultVariants: {
      density: "brand",
    },
  }
);
