import { cva } from "class-variance-authority";

export const multiSelectRootVariants = cva("flex flex-col gap-s-1");

export const multiSelectTriggerVariants = cva(
  "relative flex w-full cursor-pointer items-center border shadow-[0_1px_0.5px_rgba(0,0,0,0.15)] outline-none transition-[background-color,border-color,color,box-shadow] duration-fast ease-out disabled:cursor-not-allowed disabled:opacity-50 data-[focus-visible=true]:outline data-[focus-visible=true]:outline-1 data-[focus-visible=true]:outline-ember",
  {
    variants: {
      density: {
        compact:
          "h-[32px] rounded-l border-l-border bg-l-surface-input px-[10px] font-sans text-[13px] text-l-ink data-[hovered=true]:border-l-border-strong data-[hovered=true]:bg-l-surface-hover",
        brand:
          "h-[40px] rounded-sm border-hairline-strong bg-surface-00 px-s-3 font-mono text-mono-lg text-ink data-[hovered=true]:border-ink-dim",
      },
      invalid: {
        true: "border-event-red data-[focus-visible=true]:outline-event-red",
      },
    },
    defaultVariants: {
      density: "compact",
    },
  }
);

export const multiSelectTriggerContentVariants = cva(
  "flex min-w-0 flex-1 items-center truncate text-left"
);

export const multiSelectValueVariants = cva("min-w-0 truncate", {
  variants: {
    state: {
      placeholder: "text-l-ink-dim",
      selected: "font-medium text-l-ink",
    },
  },
  defaultVariants: {
    state: "placeholder",
  },
});

export const multiSelectSupportingTextVariants = cva("ml-[6px] truncate text-l-ink-dim");

export const multiSelectChevronVariants = cva(
  "ml-auto size-4 shrink-0 text-l-ink-dim transition-transform duration-fast",
  {
    variants: {
      open: {
        true: "rotate-180",
        false: "",
      },
    },
    defaultVariants: {
      open: false,
    },
  }
);

export const multiSelectPopoverVariants = cva(
  "absolute left-0 top-full z-50 mt-[4px] w-full overflow-hidden rounded-l border border-[var(--l-pop-border)] bg-[var(--l-pop-bg)] shadow-l-pop outline-none"
);

export const multiSelectSearchWrapVariants = cva(
  "border-b border-l-border-faint px-s-2 py-s-2"
);

export const multiSelectSearchRootVariants = cva(
  "flex h-[28px] items-center gap-[8px] rounded-l border border-l-border bg-l-surface-input px-[10px] text-l-ink transition-colors duration-fast focus-within:border-[rgba(216,67,10,0.5)] focus-within:shadow-[0_0_0_3px_rgba(216,67,10,0.12)]"
);

export const multiSelectSearchInputVariants = cva(
  "min-w-0 flex-1 bg-transparent font-sans text-[13px] text-l-ink outline-none placeholder:text-l-ink-dim"
);

export const multiSelectListVariants = cva("max-h-[304px] overflow-y-auto py-[4px] outline-none");

export const multiSelectSectionHeaderVariants = cva(
  "border-t border-l-border-faint px-s-2 py-[6px] first:border-t-0 font-sans text-[11px] font-medium text-l-ink-dim"
);

export const multiSelectItemVariants = cva(
  "flex w-full cursor-pointer select-none items-center gap-s-3 px-s-3 py-s-2 text-left outline-none transition-colors duration-fast disabled:cursor-not-allowed disabled:opacity-50 data-[focus-visible=true]:outline data-[focus-visible=true]:outline-1 data-[focus-visible=true]:outline-ember",
  {
    variants: {
      selected: {
        true: "bg-l-surface-selected",
        false: "hover:bg-l-surface-hover",
      },
    },
    defaultVariants: {
      selected: false,
    },
  }
);

export const multiSelectCheckboxVariants = cva(
  "flex size-[14px] shrink-0 items-center justify-center rounded-l-sm border text-white",
  {
    variants: {
      selected: {
        true: "border-[var(--l-accent)] bg-[var(--l-accent)]",
        false: "border-l-border-strong bg-transparent",
      },
    },
    defaultVariants: {
      selected: false,
    },
  }
);

export const multiSelectItemIconVariants = cva("shrink-0 text-l-ink-dim");

export const multiSelectItemContentVariants = cva("min-w-0 flex-1");

export const multiSelectItemLabelVariants = cva("block truncate text-[13px]", {
  variants: {
    selected: {
      true: "font-medium text-l-ink",
      false: "text-l-ink-lo",
    },
  },
  defaultVariants: {
    selected: false,
  },
});

export const multiSelectItemDescriptionVariants = cva(
  "mt-[2px] block truncate text-[10px] text-l-ink-dim"
);

export const multiSelectFooterVariants = cva(
  "flex items-center justify-between border-t border-l-border px-s-3 py-s-2"
);

export const multiSelectFooterButtonVariants = cva(
  "rounded-l px-[8px] py-[4px] font-sans text-[12px] font-medium text-l-ink-dim transition-colors duration-fast hover:bg-l-wash-3 hover:text-l-ink"
);

export const multiSelectEmptyVariants = cva(
  "flex flex-col items-center gap-s-2 px-s-4 py-s-5 text-center"
);

export const multiSelectEmptyIconVariants = cva(
  "flex size-7 items-center justify-center rounded-pill bg-l-wash-5 text-l-ink-dim"
);

export const multiSelectEmptyTitleVariants = cva(
  "font-sans text-[13px] font-medium text-l-ink"
);

export const multiSelectEmptyDescriptionVariants = cva(
  "font-sans text-[12px] text-l-ink-dim"
);

export const multiSelectHintVariants = cva("font-sans text-[12px]", {
  variants: {
    invalid: {
      true: "text-event-red",
      false: "text-l-ink-dim",
    },
  },
  defaultVariants: {
    invalid: false,
  },
});
