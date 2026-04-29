"use client";

/*
 * DropdownMenu — Radix menu compound with Chronicle density variants.
 *
 *   <DropdownMenu>
 *     <DropdownMenuTrigger>
 *       <Button>Actions</Button>
 *     </DropdownMenuTrigger>
 *     <DropdownMenuContent>
 *       <DropdownMenuItem onAction={() => ...}>Open</DropdownMenuItem>
 *       <DropdownMenuSection title="Danger">
 *         <DropdownMenuItem onAction={() => ...}>Delete</DropdownMenuItem>
 *       </DropdownMenuSection>
 *     </DropdownMenuContent>
 *   </DropdownMenu>
 */

import * as React from "react";
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";

import { cn } from "../utils/cn";
import { useResolvedChromeDensity } from "../theme/chrome-style-context";
import {
  dropdownMenuItemVariants,
  dropdownMenuPopoverVariants,
  dropdownMenuSectionHeaderVariants,
  dropdownMenuSectionVariants,
  dropdownMenuSeparatorVariants,
  dropdownMenuVariants,
} from "./shadcn";

const DropdownMenuDensityContext = React.createContext<
  "compact" | "brand" | undefined
>(undefined);

export interface DropdownMenuProps
  extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Root> {}

export function DropdownMenu(props: DropdownMenuProps) {
  return <DropdownMenuPrimitive.Root {...props} />;
}

export function DropdownMenuTrigger({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DropdownMenuPrimitive.Trigger asChild>{children}</DropdownMenuPrimitive.Trigger>;
}

export interface DropdownMenuContentProps
  extends Omit<
    React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>,
    "className" | "children"
  > {
  className?: string;
  classNames?: { popover?: string; menu?: string };
  density?: "compact" | "brand";
  children: React.ReactNode;
}

export function DropdownMenuContent({
  className,
  classNames,
  density: densityProp,
  children,
  ...rest
}: DropdownMenuContentProps) {
  const density = useResolvedChromeDensity(densityProp);
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        {...rest}
        className={cn(
          dropdownMenuPopoverVariants({ density }),
          dropdownMenuVariants(),
          classNames?.popover,
          classNames?.menu,
          className
        )}
      >
      <DropdownMenuDensityContext.Provider value={density}>
        {children as React.ReactNode}
      </DropdownMenuDensityContext.Provider>
      </DropdownMenuPrimitive.Content>
    </DropdownMenuPrimitive.Portal>
  );
}

export interface DropdownMenuItemProps extends Omit<
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item>,
  "className"
> {
  className?: string;
  /** Apply destructive styling (red). */
  danger?: boolean;
  onAction?: () => void;
}

export function DropdownMenuItem({
  className,
  danger = false,
  onAction,
  onSelect,
  ...props
}: DropdownMenuItemProps) {
  const ctxDensity = React.useContext(DropdownMenuDensityContext);
  const density = useResolvedChromeDensity(ctxDensity);
  return (
    <DropdownMenuPrimitive.Item
      {...props}
      onSelect={(event) => {
        onSelect?.(event);
        if (!event.defaultPrevented) onAction?.();
      }}
      className={cn(dropdownMenuItemVariants({ density, danger }), className)}
    />
  );
}

export interface DropdownMenuSectionProps extends Omit<
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Group>,
  "className" | "children" | "title"
> {
  className?: string;
  title?: React.ReactNode;
  children?: React.ReactNode;
}

export function DropdownMenuSection({
  className,
  title,
  children,
  ...rest
}: DropdownMenuSectionProps) {
  const ctxDensity = React.useContext(DropdownMenuDensityContext);
  const density = useResolvedChromeDensity(ctxDensity);
  return (
    <DropdownMenuPrimitive.Group
      {...rest}
      className={dropdownMenuSectionVariants({ className })}
    >
      {title ? (
        <DropdownMenuPrimitive.Label
          className={dropdownMenuSectionHeaderVariants({ density })}
        >
          {title}
        </DropdownMenuPrimitive.Label>
      ) : null}
      {children as React.ReactNode}
    </DropdownMenuPrimitive.Group>
  );
}

export function DropdownMenuSeparator() {
  const ctxDensity = React.useContext(DropdownMenuDensityContext);
  const density = useResolvedChromeDensity(ctxDensity);
  return (
    <DropdownMenuPrimitive.Separator
      className={dropdownMenuSeparatorVariants({ density })}
    />
  );
}
