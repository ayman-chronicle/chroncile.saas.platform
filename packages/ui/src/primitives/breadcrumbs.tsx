"use client";

/*
 * Breadcrumbs — linear navigational trail. RAC handles separator
 * rendering via CSS, `isCurrent` for the last item, and link handling
 * integrated with the app's RouterProvider.
 *
 *   <Breadcrumbs>
 *     <Breadcrumb href="/">Home</Breadcrumb>
 *     <Breadcrumb href="/runs">Runs</Breadcrumb>
 *     <Breadcrumb>Run 4829</Breadcrumb>
 *   </Breadcrumbs>
 */

import * as React from "react";
import {
  Breadcrumbs as RACBreadcrumbs,
  Breadcrumb as RACBreadcrumb,
  Link as RACLink,
  type BreadcrumbsProps as RACBreadcrumbsProps,
  type BreadcrumbProps as RACBreadcrumbProps,
} from "react-aria-components";

import { tv } from "../utils/tv";
import { composeTwRenderProps } from "../utils/compose";

const breadcrumbStyles = tv({
  slots: {
    root:
      "flex items-center gap-s-2 font-mono text-mono uppercase tracking-tactical text-ink-lo",
    item:
      "flex items-center gap-s-2 " +
      "after:content-['/'] after:text-ink-dim after:mx-s-1 " +
      "last:after:hidden " +
      "data-[current=true]:text-ink-hi",
    link:
      "text-ink-dim outline-none transition-colors duration-fast ease-out " +
      "data-[hovered=true]:text-ink-hi " +
      "data-[focus-visible=true]:outline data-[focus-visible=true]:outline-1 " +
      "data-[focus-visible=true]:outline-ember",
  },
});

export interface BreadcrumbsProps<T extends object = object>
  extends Omit<RACBreadcrumbsProps<T>, "className" | "children"> {
  className?: string;
  children: React.ReactNode;
}

export function Breadcrumbs<T extends object = object>({
  className,
  children,
  ...rest
}: BreadcrumbsProps<T>) {
  const slots = breadcrumbStyles({});
  return (
    <RACBreadcrumbs
      {...(rest as RACBreadcrumbsProps<T>)}
      className={`${slots.root()}${className ? ` ${className}` : ""}`}
    >
      {children as React.ReactNode}
    </RACBreadcrumbs>
  );
}

export interface BreadcrumbProps
  extends Omit<RACBreadcrumbProps, "className" | "children"> {
  className?: string;
  children: React.ReactNode;
  href?: string;
}

export function Breadcrumb({
  className,
  children,
  href,
  ...rest
}: BreadcrumbProps) {
  const slots = breadcrumbStyles({});
  return (
    <RACBreadcrumb
      {...rest}
      className={composeTwRenderProps(className, slots.item())}
    >
      {href ? (
        <RACLink href={href} className={slots.link()}>
          {children}
        </RACLink>
      ) : (
        <span>{children}</span>
      )}
    </RACBreadcrumb>
  );
}
