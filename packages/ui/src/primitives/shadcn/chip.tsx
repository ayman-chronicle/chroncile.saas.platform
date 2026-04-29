import { cva } from "class-variance-authority";

export const chipVariants = cva(
  "inline-flex items-center border whitespace-nowrap transition-[background-color,border-color,color] duration-fast ease-out cursor-pointer select-none",
  {
    variants: {
      density: {
        compact:
          "gap-[6px] h-[26px] px-[8px] rounded-l text-[12px] font-medium font-sans",
        brand:
          "gap-s-2 h-[28px] px-s-2 rounded-xs font-mono text-mono-sm uppercase tracking-tactical",
      },
      active: {
        false: "",
        true: "",
      },
    },
    compoundVariants: [
      {
        density: "compact",
        active: false,
        className:
          "bg-l-wash-2 border-l-border text-l-ink-lo hover:bg-l-wash-5 hover:border-l-border-strong hover:text-l-ink",
      },
      {
        density: "compact",
        active: true,
        className:
          "bg-l-surface-selected border-[rgba(216,67,10,0.35)] text-l-ink hover:bg-l-surface-selected",
      },
      {
        density: "brand",
        active: false,
        className:
          "bg-surface-01 border-hairline-strong text-ink-lo hover:bg-surface-02 hover:text-ink-hi",
      },
      {
        density: "brand",
        active: true,
        className:
          "bg-[rgba(216,67,10,0.08)] border-ember/40 text-ember hover:bg-[rgba(216,67,10,0.12)]",
      },
    ],
    defaultVariants: {
      active: false,
      density: "compact",
    },
  }
);

export const chipCountVariants = cva("inline-flex items-center justify-center", {
  variants: {
    density: {
      compact:
        "font-mono text-[10.5px] px-[5px] py-[1px] rounded-pill bg-l-wash-5 text-l-ink",
      brand:
        "font-mono text-mono-xs px-s-1 py-[1px] rounded-xs bg-surface-03 text-ink",
    },
  },
  defaultVariants: {
    density: "compact",
  },
});

export const chipRemoveVariants = cva(
  "inline-flex items-center justify-center transition-colors duration-fast",
  {
    variants: {
      density: {
        compact: "text-l-ink-dim hover:text-l-ink",
        brand: "text-ink-dim hover:text-ink-hi",
      },
    },
    defaultVariants: {
      density: "compact",
    },
  }
);

export const chipSeparatorVariants = cva("w-px", {
  variants: {
    density: {
      compact: "h-[12px] bg-l-border-strong mx-[2px]",
      brand: "h-[14px] bg-hairline-strong mx-s-1",
    },
  },
  defaultVariants: {
    density: "compact",
  },
});
