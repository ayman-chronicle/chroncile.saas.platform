import * as React from "react";
import { useResolvedChromeDensity } from "../theme/chrome-style-context";
import {
  emptyStateContentVariants,
  emptyStateDescriptionVariants,
  emptyStateHeaderVariants,
  emptyStateMediaVariants,
  emptyStateRootVariants,
  emptyStateTitleVariants,
} from "./shadcn";

/*
 * EmptyState — zero-results / no-data placeholder with optional icon,
 * description, and primary action. Not interactive in itself; renders
 * whatever action children are passed.
 */

export type EmptyStateSize = "sm" | "md" | "lg";
export type EmptyStateChrome = "default" | "minimal" | "outline";
export type EmptyStateMediaVariant = "default" | "icon";
export type EmptyStateDensity = "compact" | "brand";

export interface EmptyStateProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "title"
> {
  icon?: React.ReactNode;
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  size?: EmptyStateSize;
  chrome?: EmptyStateChrome;
  mediaVariant?: EmptyStateMediaVariant;
  density?: EmptyStateDensity;
}

function EmptyStateRoot({
  icon,
  title,
  description,
  actions,
  size = "md",
  chrome = "default",
  mediaVariant = "default",
  density: densityProp,
  className,
  children,
  ...props
}: EmptyStateProps) {
  const density = useResolvedChromeDensity(densityProp);

  if (children) {
    return (
      <div
        {...props}
        className={emptyStateRootVariants({
          size,
          chrome,
          density,
          className,
        })}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      {...props}
      className={emptyStateRootVariants({ size, chrome, density, className })}
    >
      <div className={emptyStateHeaderVariants()}>
        {icon ? (
          <span
            className={emptyStateMediaVariants({
              density,
              size,
              mediaVariant,
            })}
          >
            {icon}
          </span>
        ) : null}
        {title ? (
          <span className={emptyStateTitleVariants({ density })}>{title}</span>
        ) : null}
        {description ? (
          <p className={emptyStateDescriptionVariants({ density })}>
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className={emptyStateContentVariants()}>{actions}</div> : null}
    </div>
  );
}

export const EmptyState = Object.assign(EmptyStateRoot, {
  Header: ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
    return <div {...props} className={emptyStateHeaderVariants({ className })} />;
  },
  Media: ({
    variant = "default",
    className,
    ...props
  }: React.HTMLAttributes<HTMLDivElement> & {
    variant?: EmptyStateMediaVariant;
  }) => {
    return (
      <div
        {...props}
        data-variant={variant}
        className={emptyStateMediaVariants({
          mediaVariant: variant,
          className,
        })}
      />
    );
  },
  Title: ({
    className,
    ...props
  }: React.HTMLAttributes<HTMLHeadingElement>) => {
    return <h3 {...props} className={emptyStateTitleVariants({ className })} />;
  },
  Description: ({
    className,
    ...props
  }: React.HTMLAttributes<HTMLParagraphElement>) => {
    return (
      <p {...props} className={emptyStateDescriptionVariants({ className })} />
    );
  },
  Content: ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
    return <div {...props} className={emptyStateContentVariants({ className })} />;
  },
});
