"use client";

/*
 * Drawer — a Modal that slides in from one edge of the viewport.
 * Behaviourally identical to `Modal`; only the geometry changes.
 *
 * Use for side-panel editors, filter sheets, and detail drawers where
 * the underlying page context matters. For centered confirmation
 * dialogs, stay with `Modal`.
 */

import * as React from "react";
import { Dialog as DialogPrimitive } from "radix-ui";

import type { VariantProps } from "class-variance-authority";
import { cn } from "../utils/cn";
import { useResolvedChromeDensity } from "../theme/chrome-style-context";
import {
  drawerActionsVariants,
  drawerBodyVariants,
  drawerCloseVariants,
  drawerDialogVariants,
  drawerHeaderVariants,
  drawerOverlayVariants,
  drawerTitleVariants,
  drawerVariants,
} from "./shadcn";

type DrawerVariantProps = VariantProps<typeof drawerVariants>;

export interface DrawerProps extends DrawerVariantProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  actions?: React.ReactNode;
  placement?: "left" | "right" | "top" | "bottom";
  size?: "sm" | "md" | "lg" | "xl";
  density?: "compact" | "brand";
  isDismissable?: boolean;
  className?: string;
  classNames?: {
    overlay?: string;
    drawer?: string;
    dialog?: string;
    header?: string;
    title?: string;
    close?: string;
    body?: string;
    actions?: string;
  };
}

export function Drawer({
  isOpen,
  onClose,
  title,
  children,
  actions,
  placement = "right",
  size = "md",
  density: densityProp,
  isDismissable = true,
  className,
  classNames,
}: DrawerProps) {
  const density = useResolvedChromeDensity(densityProp);

  return (
    <DialogPrimitive.Root
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(drawerOverlayVariants({ placement }), classNames?.overlay)}
        />
        <DialogPrimitive.Content
          onPointerDownOutside={(event) => {
            if (!isDismissable) event.preventDefault();
          }}
          onEscapeKeyDown={(event) => {
            if (!isDismissable) event.preventDefault();
          }}
          className={cn(
            drawerVariants({ density, placement, size }),
            classNames?.drawer,
            className
          )}
        >
          <div className={drawerDialogVariants({ className: classNames?.dialog })}>
            <div
              className={drawerHeaderVariants({
                density,
                className: classNames?.header,
              })}
            >
              <DialogPrimitive.Title
                className={drawerTitleVariants({
                  density,
                  className: classNames?.title,
                })}
              >
                {title}
              </DialogPrimitive.Title>
              <DialogPrimitive.Close asChild>
                <button
                  type="button"
                  aria-label="Close drawer"
                  className={drawerCloseVariants({
                    density,
                    className: classNames?.close,
                  })}
                >
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                    <path
                      d="M6 18L18 6M6 6l12 12"
                      stroke="currentColor"
                      strokeWidth={1.5}
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </DialogPrimitive.Close>
            </div>

            <div
              className={drawerBodyVariants({
                density,
                className: classNames?.body,
              })}
            >
              {children}
            </div>

            {actions ? (
              <div
                className={drawerActionsVariants({
                  density,
                  className: classNames?.actions,
                })}
              >
                {actions}
              </div>
            ) : null}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
