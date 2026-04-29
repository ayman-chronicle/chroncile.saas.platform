"use client";

/*
 * Breadcrumbs — linear navigational trail.
 *
 *   <Breadcrumbs>
 *     <Breadcrumb href="/">Home</Breadcrumb>
 *     <Breadcrumb href="/runs">Runs</Breadcrumb>
 *     <Breadcrumb>Run 4829</Breadcrumb>
 *   </Breadcrumbs>
 */

import * as React from "react";

import { useResolvedChromeDensity } from "../theme/chrome-style-context";
import {
  breadcrumbItemVariants,
  breadcrumbLinkVariants,
  breadcrumbsVariants,
} from "./shadcn";

export type BreadcrumbsDensity = "compact" | "brand";

const BreadcrumbsDensityContext =
  React.createContext<BreadcrumbsDensity | undefined>(undefined);

export interface BreadcrumbsProps
  extends Omit<React.OlHTMLAttributes<HTMLOListElement>, "className" | "children"> {
  className?: string;
  children: React.ReactNode;
  density?: BreadcrumbsDensity;
}

export function Breadcrumbs({
  className,
  children,
  density: densityProp,
  ...rest
}: BreadcrumbsProps) {
  const density = useResolvedChromeDensity(densityProp);
  return (
    <BreadcrumbsDensityContext.Provider value={density}>
      <ol
        {...rest}
        className={breadcrumbsVariants({ density, className })}
      >
        {children as React.ReactNode}
      </ol>
    </BreadcrumbsDensityContext.Provider>
  );
}

export interface BreadcrumbProps
  extends Omit<React.LiHTMLAttributes<HTMLLIElement>, "className" | "children"> {
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
  const ctxDensity = React.useContext(BreadcrumbsDensityContext);
  const density = useResolvedChromeDensity(ctxDensity);
  return (
    <li
      {...rest}
      className={breadcrumbItemVariants({ density, className })}
    >
      {href ? (
        <a href={href} className={breadcrumbLinkVariants({ density })}>
          {children}
        </a>
      ) : (
        <span aria-current="page">{children}</span>
      )}
    </li>
  );
}
