import * as React from "react";
import { tv } from "../utils/tv";

/*
 * EmptyState — zero-results / no-data placeholder with optional icon,
 * description, and primary action. Not interactive in itself; renders
 * whatever action children are passed.
 */

const emptyState = tv({
  slots: {
    root:
      "flex flex-col items-center justify-center gap-s-3 rounded-md border " +
      "border-hairline border-dashed bg-surface-01 px-s-6 py-s-12 text-center",
    icon: "h-8 w-8 text-ink-dim",
    title: "font-display text-title-sm text-ink-hi",
    description: "max-w-[360px] font-sans text-sm text-ink-lo",
    actions: "mt-s-2 flex items-center gap-s-2",
  },
});

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actions,
  className,
}: EmptyStateProps) {
  const slots = emptyState({});
  return (
    <div className={slots.root({ className })}>
      {icon ? <span className={slots.icon()}>{icon}</span> : null}
      <span className={slots.title()}>{title}</span>
      {description ? (
        <p className={slots.description()}>{description}</p>
      ) : null}
      {actions ? <div className={slots.actions()}>{actions}</div> : null}
    </div>
  );
}
