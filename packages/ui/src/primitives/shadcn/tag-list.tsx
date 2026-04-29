import { cva } from "class-variance-authority";

export const tagListButtonVariants = cva(
  "inline-flex items-center border transition-[background-color,border-color,color] duration-fast ease-out outline-none data-[focus-visible=true]:outline data-[focus-visible=true]:outline-1 data-[focus-visible=true]:outline-ember",
  {
    variants: {
      density: {
        compact:
          "h-[26px] gap-[4px] rounded-l border-l-border bg-l-wash-5 px-[8px] py-[4.5px] font-sans text-[12px] text-l-ink shadow-[0_1px_0.5px_rgba(0,0,0,0.15)] data-[hovered=true]:border-l-border-strong data-[hovered=true]:bg-l-surface-hover",
        brand:
          "h-[28px] gap-s-2 rounded-xs border-hairline-strong bg-surface-01 px-s-2 font-mono text-mono-sm uppercase tracking-tactical text-ink-lo data-[hovered=true]:bg-surface-02 data-[hovered=true]:text-ink-hi",
      },
    },
    defaultVariants: {
      density: "compact",
    },
  }
);

export const tagListDotStackVariants = cva("relative inline-block shrink-0", {
  variants: {
    count: {
      0: "hidden",
      1: "h-[9px] w-[9px]",
      2: "h-[9px] w-[13px]",
      3: "h-[9px] w-[17px]",
    },
  },
  defaultVariants: {
    count: 1,
  },
});

export const tagListDotVariants = cva(
  "absolute left-0 top-0 size-[9px] rounded-pill border border-[var(--l-dot-edge)]"
);

export const tagListDropdownVariants = cva(
  "flex flex-col items-center rounded-[8px] border border-[var(--l-pop-border)] bg-[var(--l-pop-bg)] shadow-l-pop",
  {
    variants: {
      density: {
        compact: "w-[204px]",
        brand: "w-[220px]",
      },
    },
    defaultVariants: {
      density: "compact",
    },
  }
);

export const tagListDropdownSearchVariants = cva(
  "flex h-[36px] w-full items-center border-b border-l-border-faint pr-[12px]"
);

export const tagListDropdownSearchLabelVariants = cva(
  "flex h-full min-w-0 flex-1 items-start px-[14px] py-[10px] font-sans text-[12px] text-l-ink-dim"
);

export const tagListShortcutVariants = cva(
  "flex w-[16px] shrink-0 items-center justify-center rounded-[3px] bg-l-wash-5 p-[2px] font-sans text-[11px] leading-[1.1] text-l-ink-lo"
);

export const tagListOptionsVariants = cva("flex w-full flex-col items-start p-[4px]");

export const tagListOptionVariants = cva(
  "flex h-[32px] w-full items-center gap-[4px] rounded-[4px] px-[8px] py-[4.5px] text-left shadow-[0_1px_0.5px_rgba(0,0,0,0.15)] outline-none transition-colors duration-fast data-[focus-visible=true]:outline data-[focus-visible=true]:outline-1 data-[focus-visible=true]:outline-ember",
  {
    variants: {
      selected: {
        true: "bg-l-surface-selected",
        false: "data-[hovered=true]:bg-l-surface-hover",
      },
    },
    defaultVariants: {
      selected: false,
    },
  }
);

export const tagListCheckboxVariants = cva(
  "flex size-[16px] shrink-0 items-center justify-center rounded-[4px] border border-l-border-strong text-[var(--l-accent)]",
  {
    variants: {
      selected: {
        true: "border-[var(--l-accent)] bg-[var(--l-accent-muted)]",
        false: "",
      },
      pending: {
        true: "cursor-wait opacity-80",
        false: "",
      },
    },
    defaultVariants: {
      pending: false,
      selected: false,
    },
  }
);

export const tagListPendingIndicatorVariants = cva(
  "size-[10px] animate-spin rounded-full border-2 border-current border-t-transparent"
);

export const tagListOptionContentVariants = cva(
  "flex shrink-0 items-center gap-[12px]"
);

export const tagListOptionDotWrapVariants = cva("relative h-[9px] w-[16px] shrink-0");

export const tagListOptionLabelVariants = cva(
  "font-sans text-[12px] text-l-ink"
);
