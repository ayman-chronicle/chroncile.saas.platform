"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "radix-ui";

import type { VariantProps } from "class-variance-authority";
import { cn } from "../utils/cn";
import { useResolvedChromeDensity } from "../theme/chrome-style-context";
import { Button } from "./button";
import {
  modalActionsVariants,
  modalBodyVariants,
  modalCloseVariants,
  modalDialogVariants,
  modalHeaderVariants,
  modalOverlayVariants,
  modalTitleVariants,
  modalVariants,
} from "./shadcn";

type ModalVariantProps = VariantProps<typeof modalTitleVariants>;

export interface ModalProps extends ModalVariantProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  actions?: React.ReactNode;
  /**
   * `default` — neutral surface
   * `danger`  — same surface, red title (destructive intent)
   * `dark`    — alias for `default`, kept for API compatibility
   */
  variant?: "default" | "danger" | "dark";
  density?: "compact" | "brand";
  className?: string;
  /** Per-slot overrides. */
  classNames?: {
    overlay?: string;
    modal?: string;
    dialog?: string;
    header?: string;
    title?: string;
    close?: string;
    body?: string;
    actions?: string;
  };
  /** Defaults to true — outside click and Escape dismiss the dialog. */
  isDismissable?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  actions,
  variant = "default",
  density: densityProp,
  className,
  classNames,
  isDismissable = true,
}: ModalProps) {
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
          className={cn(modalOverlayVariants(), classNames?.overlay)}
        />
        <DialogPrimitive.Content
          onPointerDownOutside={(event) => {
            if (!isDismissable) event.preventDefault();
          }}
          onEscapeKeyDown={(event) => {
            if (!isDismissable) event.preventDefault();
          }}
          className={cn(modalVariants({ density }), classNames?.modal, className)}
        >
          <div className={modalDialogVariants({ className: classNames?.dialog })}>
            <div
              className={modalHeaderVariants({
                density,
                className: classNames?.header,
              })}
            >
              <DialogPrimitive.Title
                className={modalTitleVariants({
                  density,
                  variant,
                  className: classNames?.title,
                })}
              >
                {title}
              </DialogPrimitive.Title>
              <DialogPrimitive.Close asChild>
                <button
                  type="button"
                  aria-label="Close dialog"
                  className={modalCloseVariants({
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
              className={modalBodyVariants({
                density,
                className: classNames?.body,
              })}
            >
              {children}
            </div>

            {actions ? (
              <div
                className={modalActionsVariants({
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

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: React.ReactNode;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "danger";
  isLoading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default",
  isLoading = false,
}: ConfirmModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      variant={variant}
      actions={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            {cancelText}
          </Button>
          <Button
            variant={variant === "danger" ? "critical" : "primary"}
            onClick={onConfirm}
            disabled={isLoading}
            isLoading={isLoading}
          >
            {confirmText}
          </Button>
        </>
      }
    >
      {typeof message === "string" ? <p>{message}</p> : message}
    </Modal>
  );
}
