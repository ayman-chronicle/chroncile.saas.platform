import { cva } from "class-variance-authority";

export const copyButtonVariants = cva(
  "inline-flex items-center justify-center border transition-colors duration-fast ease-out outline-none data-[focus-visible=true]:outline data-[focus-visible=true]:outline-1 data-[focus-visible=true]:outline-ember",
  {
    variants: {
      appearance: {
        icon: "",
        text: "h-auto w-auto border-0 bg-transparent px-[6px] py-[2px] font-mono text-[10px] uppercase tracking-[0.04em]",
      },
      density: {
        brand: "h-[30px] w-[30px] rounded-xs",
        compact: "h-[24px] w-[24px] rounded-l",
      },
      copied: {
        true: "border-event-green/40 bg-[rgba(74,222,128,0.08)] text-event-green",
        false: "",
      },
    },
    compoundVariants: [
      {
        density: "brand",
        copied: false,
        className:
          "border-hairline-strong bg-surface-02 text-ink-dim data-[hovered=true]:border-ink-dim data-[hovered=true]:text-ink-hi",
      },
      {
        density: "compact",
        copied: false,
        className:
          "border-l-border bg-l-surface-raised text-l-ink-lo data-[hovered=true]:border-l-border-strong data-[hovered=true]:text-l-ink",
      },
      {
        appearance: "text",
        copied: false,
        className:
          "h-auto w-auto border-transparent bg-transparent text-ink-dim data-[hovered=true]:bg-surface-03 data-[hovered=true]:text-ink-hi",
      },
      {
        appearance: "text",
        copied: true,
        className:
          "h-auto w-auto border-transparent bg-transparent text-event-green data-[hovered=true]:bg-surface-03",
      },
    ],
    defaultVariants: {
      appearance: "icon",
      copied: false,
      density: "brand",
    },
  }
);
