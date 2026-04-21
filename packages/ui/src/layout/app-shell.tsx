import * as React from "react";
import { tv } from "../utils/tv";

/**
 * AppShell — the three-column product shell from pages 06/07:
 * top-bar + left-nav + center + optional right detail. Consumers
 * render their own content into each slot; the shell takes care of
 * grid sizing, borders, and background surfaces.
 */
const appShell = tv({
  slots: {
    root: "grid bg-surface-00 overflow-hidden",
    topbar:
      "col-span-full flex items-center gap-s-5 border-b border-hairline " +
      "bg-surface-01 px-s-5",
    nav: "border-r border-hairline bg-surface-01 p-s-5",
    main: "flex min-w-0 flex-col bg-surface-00",
    detail: "flex flex-col border-l border-hairline bg-surface-01",
    footer: "col-span-full",
  },
  variants: {
    bordered: {
      true: { root: "rounded-md border border-hairline-strong shadow-panel" },
    },
  },
  defaultVariants: { bordered: true },
});

export interface AppShellProps extends React.HTMLAttributes<HTMLDivElement> {
  topbar?: React.ReactNode;
  nav?: React.ReactNode;
  detail?: React.ReactNode;
  footer?: React.ReactNode;
  /** Sidebar column width. Default 240px. */
  navWidth?: number;
  /** Detail column width. Default 380px; pass 0 to collapse. */
  detailWidth?: number;
  /** Topbar height. Default 52px. */
  topbarHeight?: number;
  /** Footer (minimap) height. Default 64px. */
  footerHeight?: number;
  /** Rounded-card container around the shell. Default true. */
  bordered?: boolean;
}

export function AppShell({
  topbar,
  nav,
  detail,
  footer,
  children,
  navWidth = 240,
  detailWidth = 380,
  topbarHeight = 52,
  footerHeight = 64,
  bordered = true,
  className,
  style,
  ...props
}: AppShellProps) {
  const slots = appShell({ bordered });
  const gridCols = detailWidth
    ? `${navWidth}px 1fr ${detailWidth}px`
    : `${navWidth}px 1fr`;

  const gridRows = [
    topbar ? `${topbarHeight}px` : null,
    "1fr",
    footer ? `${footerHeight}px` : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={slots.root({ className })}
      style={{
        gridTemplateColumns: gridCols,
        gridTemplateRows: gridRows,
        ...style,
      }}
      {...props}
    >
      {topbar ? (
        <div className={slots.topbar()} style={{ height: topbarHeight }}>
          {topbar}
        </div>
      ) : null}
      {nav ? <aside className={slots.nav()}>{nav}</aside> : null}
      <section className={slots.main()}>{children}</section>
      {detail && detailWidth ? (
        <aside className={slots.detail()}>{detail}</aside>
      ) : null}
      {footer ? (
        <div className={slots.footer()} style={{ height: footerHeight }}>
          {footer}
        </div>
      ) : null}
    </div>
  );
}
