"use client";

import * as React from "react";
import { Link as RACLink } from "react-aria-components";

import { tv } from "../utils/tv";
import { Logo } from "../primitives/logo";

/**
 * ChronHeader — the spare top-left wordmark header used across the
 * handoff pages. Nothing else. Perfect for marketing/docs shells.
 *
 * The link uses RAC's `Link` so it integrates with `RouterProvider`
 * when present (client-side nav), and inherits consistent hover/focus
 * states from the rest of the primitives.
 */
const chronHeader = tv({
  slots: {
    root: "px-s-16 py-s-16 pl-[72px] pr-[72px]",
    link:
      "inline-block h-[8px] opacity-70 outline-none " +
      "transition-opacity duration-base ease-out " +
      "data-[hovered=true]:opacity-100 " +
      "data-[focus-visible=true]:outline data-[focus-visible=true]:outline-1 " +
      "data-[focus-visible=true]:outline-ember",
  },
});

export interface ChronHeaderProps extends React.HTMLAttributes<HTMLElement> {
  href?: string;
  label?: string;
}

export function ChronHeader({
  href = "/",
  label = "Chronicle Labs",
  className,
  ...props
}: ChronHeaderProps) {
  const slots = chronHeader({});
  return (
    <header className={slots.root({ className })} {...props}>
      <RACLink href={href} aria-label={label} className={slots.link()}>
        <Logo variant="wordmark" className="h-full w-auto" />
      </RACLink>
    </header>
  );
}
