import * as React from "react";
import { tv, type VariantProps } from "../utils/tv";

const panel = tv({
  base: "relative overflow-hidden rounded-md border",
  variants: {
    elevated: {
      true: "border-hairline-strong bg-surface-02",
      false: "border-hairline bg-surface-01",
    },
    active: {
      true: "before:absolute before:inset-y-0 before:left-0 before:w-[2px] before:bg-ember",
    },
  },
  defaultVariants: { elevated: false },
});

type PanelVariantProps = VariantProps<typeof panel>;

export interface PanelProps
  extends React.HTMLAttributes<HTMLDivElement>,
    PanelVariantProps {
  elevated?: boolean;
  /**
   * When true, the panel paints the ember-tinted selected row treatment
   * along its left edge. Use sparingly — this is the "one hot surface".
   */
  active?: boolean;
}

export function Panel({
  elevated = false,
  active = false,
  className,
  children,
  ...props
}: PanelProps) {
  return (
    <div className={panel({ elevated, active, className })} {...props}>
      {children}
    </div>
  );
}

const panelHeader = tv({
  base:
    "flex items-center justify-between gap-s-3 border-b border-hairline " +
    "bg-surface-02 px-s-4 py-s-3",
});

const panelHeaderTitle = tv({
  base: "font-mono text-mono uppercase tracking-tactical text-ink-lo",
});

export interface PanelHeaderProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title?: React.ReactNode;
  actions?: React.ReactNode;
}

export function PanelHeader({
  title,
  actions,
  className,
  children,
  ...props
}: PanelHeaderProps) {
  return (
    <div className={panelHeader({ className })} {...props}>
      {title ? <span className={panelHeaderTitle()}>{title}</span> : null}
      {children}
      {actions ? (
        <div className="ml-auto flex items-center gap-s-2">{actions}</div>
      ) : null}
    </div>
  );
}

const panelContent = tv({ base: "p-s-4" });

export type PanelContentProps = React.HTMLAttributes<HTMLDivElement>;

export function PanelContent({
  className,
  children,
  ...props
}: PanelContentProps) {
  return (
    <div className={panelContent({ className })} {...props}>
      {children}
    </div>
  );
}
