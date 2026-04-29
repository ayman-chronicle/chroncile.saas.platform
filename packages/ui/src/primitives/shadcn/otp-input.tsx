import { cva } from "class-variance-authority";

export const otpRowVariants = cva("flex", {
  variants: {
    density: {
      brand: "gap-s-2",
      compact: "gap-[6px]",
    },
    codeGrid: {
      true: "gap-s-3",
      false: "",
    },
  },
  defaultVariants: {
    codeGrid: false,
    density: "brand",
  },
});

export const otpCellVariants = cva(
  "text-center border outline-none transition-[border-color,box-shadow,background-color] duration-fast ease-out disabled:opacity-40 disabled:cursor-not-allowed",
  {
    variants: {
      density: {
        brand:
          "h-[52px] w-[44px] rounded-sm bg-surface-00 caret-ember font-mono text-[20px] text-ink-hi border-hairline-strong hover:border-ink-dim focus:border-ember focus:shadow-[0_0_0_3px_rgba(216,67,10,0.12)]",
        compact:
          "h-[36px] w-[32px] rounded-l bg-l-surface-input caret-ember font-sans font-medium text-[16px] text-l-ink border-l-border hover:border-l-border-strong focus:border-[rgba(216,67,10,0.5)] focus:shadow-[0_0_0_3px_rgba(216,67,10,0.12)]",
      },
      state: {
        idle: "",
        filled: "",
        error:
          "border-event-red focus:border-event-red focus:shadow-[0_0_0_3px_rgba(239,68,68,0.18)]",
        success:
          "border-[rgba(74,222,128,0.45)] focus:border-event-green focus:shadow-[0_0_0_3px_rgba(74,222,128,0.18)]",
      },
      codeGrid: {
        true: "h-[64px] w-[52px] text-[26px] caret-[3px] rounded-md bg-transparent focus:caret-ember focus:shadow-[0_0_0_3px_rgba(216,67,10,0.16)]",
        false: "",
      },
    },
    compoundVariants: [
      { density: "brand", state: "filled", className: "bg-surface-01" },
      { density: "compact", state: "filled", className: "bg-l-surface-raised-2" },
    ],
    defaultVariants: {
      codeGrid: false,
      density: "brand",
      state: "idle",
    },
  }
);
