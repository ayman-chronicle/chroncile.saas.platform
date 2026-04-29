import * as React from "react";

import { useResolvedChromeDensity } from "../theme/chrome-style-context";
import {
  panelHeaderTitleVariants,
  ShadcnPanel,
  ShadcnPanelContent,
  ShadcnPanelHeader,
  type ShadcnPanelProps,
} from "./shadcn";

export interface PanelProps extends Omit<ShadcnPanelProps, "density"> {
  elevated?: boolean;
  /**
   * When true, the panel paints the ember-tinted selected row treatment
   * along its left edge. Use sparingly — this is the "one hot surface".
   */
  active?: boolean;
  /** Force a density flavor. */
  density?: "compact" | "brand";
}

export function Panel({
  elevated = false,
  active = false,
  density: densityProp,
  className,
  children,
  ...props
}: PanelProps) {
  const density = useResolvedChromeDensity(densityProp);
  return (
    <ShadcnPanel
      active={active}
      className={className}
      density={density}
      elevated={elevated}
      {...props}
    >
      {children}
    </ShadcnPanel>
  );
}

export interface PanelHeaderProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "title"
> {
  title?: React.ReactNode;
  actions?: React.ReactNode;
  density?: "compact" | "brand";
}

export function PanelHeader({
  title,
  actions,
  density: densityProp,
  className,
  children,
  ...props
}: PanelHeaderProps) {
  const density = useResolvedChromeDensity(densityProp);
  return (
    <ShadcnPanelHeader className={className} density={density} {...props}>
      {title ? (
        <span className={panelHeaderTitleVariants({ density })}>{title}</span>
      ) : null}
      {children}
      {actions ? (
        <div className={density === "compact" ? "ml-auto flex items-center gap-[6px]" : "ml-auto flex items-center gap-s-2"}>{actions}</div>
      ) : null}
    </ShadcnPanelHeader>
  );
}

export interface PanelContentProps extends React.HTMLAttributes<HTMLDivElement> {
  density?: "compact" | "brand";
}

export function PanelContent({
  density: densityProp,
  className,
  children,
  ...props
}: PanelContentProps) {
  const density = useResolvedChromeDensity(densityProp);
  return (
    <ShadcnPanelContent className={className} density={density} {...props}>
      {children}
    </ShadcnPanelContent>
  );
}
