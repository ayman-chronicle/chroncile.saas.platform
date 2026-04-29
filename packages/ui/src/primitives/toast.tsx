"use client";

/*
 * Toast — small module-level queue rendered by a single ToastProvider.
 *
 * Usage:
 *   // Once, at app root:
 *   <ToastProvider>
 *     …app…
 *   </ToastProvider>
 *
 *   // Anywhere:
 *   const toast = useToast();
 *   toast.add({ title: "Saved", tone: "success" });
 *
 * A toast is a plain object `{ title, description?, tone?, action? }`.
 */

import * as React from "react";

import { useResolvedChromeDensity } from "../theme/chrome-style-context";
import {
  toastActionVariants,
  toastCloseVariants,
  toastContentVariants,
  toastDescriptionVariants,
  toastRegionVariants,
  toastTitleVariants,
  toastVariants,
} from "./shadcn";

export type ToastTone = "default" | "success" | "danger" | "info" | "warning";
export type ToastDensity = "compact" | "brand";

export interface ChronicleToastContent {
  title: React.ReactNode;
  description?: React.ReactNode;
  tone?: ToastTone;
  /**
   * Optional action rendered as a button at the right edge. Calling the
   * returned handler automatically dismisses the toast.
   */
  action?: { label: string; onClick?: () => void; onPress?: () => void };
}

interface ToastRecord {
  key: string;
  content: ChronicleToastContent;
}

let toasts: ToastRecord[] = [];
const listeners = new Set<() => void>();

function notifyToastListeners() {
  listeners.forEach((listener) => listener());
}

function subscribeToasts(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function addToast(content: ChronicleToastContent, timeout = 5000) {
  const key = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  toasts = [...toasts, { key, content }].slice(-5);
  notifyToastListeners();
  if (timeout > 0) {
    window.setTimeout(() => closeToast(key), timeout);
  }
  return key;
}

function closeToast(key: string) {
  toasts = toasts.filter((toast) => toast.key !== key);
  notifyToastListeners();
}

export interface ToastProviderProps {
  children: React.ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const density = useResolvedChromeDensity();
  const [items, setItems] = React.useState(toasts);

  React.useEffect(
    () =>
      subscribeToasts(() => {
        setItems([...toasts]);
      }),
    []
  );

  return (
    <>
      {children}
      <div className={toastRegionVariants()} role="region" aria-live="polite">
        {items.map((toast) => {
          const tone = toast.content.tone ?? "default";
          return (
            <div
              key={toast.key}
              role="status"
              className={toastVariants({ tone, density })}
            >
              <div className={toastContentVariants()}>
                <div className={toastTitleVariants({ density })}>
                  {toast.content.title}
                </div>
                {toast.content.description ? (
                  <div className={toastDescriptionVariants({ density })}>
                    {toast.content.description}
                  </div>
                ) : null}
              </div>
              {toast.content.action ? (
                <button
                  type="button"
                  onClick={() => {
                    toast.content.action?.onClick?.();
                    toast.content.action?.onPress?.();
                    closeToast(toast.key);
                  }}
                  className={toastActionVariants({ density })}
                >
                  {toast.content.action.label}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => closeToast(toast.key)}
                className={toastCloseVariants({ density })}
                aria-label="Close"
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3">
                  <path
                    d="M6 18L18 6M6 6l12 12"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}

export interface UseToastReturn {
  /** Push a new toast. Returns its key so callers can dismiss it early. */
  add: (
    content: ChronicleToastContent,
    options?: { timeout?: number }
  ) => string;
  /** Programmatically dismiss a toast by key. */
  dismiss: (key: string) => void;
}

export function useToast(): UseToastReturn {
  return React.useMemo(
    () => ({
      add: (content, options) =>
        addToast(content, options?.timeout ?? 5000),
      dismiss: (key) => closeToast(key),
    }),
    []
  );
}
