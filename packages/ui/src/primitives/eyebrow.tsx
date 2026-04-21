import * as React from "react";
import { tv } from "../utils/tv";

/**
 * Eyebrow — the tactical uppercase mono label used above section headers
 * and inside panels. The one ubiquitous chrome element of the system.
 */
const eyebrow = tv({
  base:
    "font-mono text-mono uppercase tracking-eyebrow text-ink-dim leading-none",
});

export interface EyebrowProps extends React.HTMLAttributes<HTMLSpanElement> {
  as?: "span" | "div" | "p";
}

export function Eyebrow({
  as: Tag = "span",
  className,
  children,
  ...props
}: EyebrowProps) {
  return (
    <Tag className={eyebrow({ className })} {...props}>
      {children}
    </Tag>
  );
}
