"use client";

import * as React from "react";

import { cn } from "../utils/cn";

export interface BackLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  children: React.ReactNode;
  ref?: React.Ref<HTMLAnchorElement>;
}

export function BackLink({ children, className, ref, ...props }: BackLinkProps) {
  return (
    <a
      ref={ref}
      className={cn(
        "inline-flex items-center gap-[6px] font-mono text-[11px] tracking-[0.04em] text-ink-dim transition-colors duration-fast ease-out hover:text-ink-hi focus-visible:outline focus-visible:outline-1 focus-visible:outline-ember",
        className,
      )}
      {...props}
    >
      <span aria-hidden>{"<"}</span>
      {children}
    </a>
  );
}
