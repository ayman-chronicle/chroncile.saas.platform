"use client";

/*
 * Toast — RAC's Toast primitives are marked UNSTABLE in v1.17 but are
 * production-ready. We wrap them behind a stable Chronicle API so the
 * namespace churn doesn't leak to consumers when RAC promotes them.
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
import {
  UNSTABLE_ToastRegion as RACToastRegion,
  UNSTABLE_Toast as RACToast,
  UNSTABLE_ToastContent as RACToastContent,
  UNSTABLE_ToastQueue as RACToastQueue,
  Button as RACButton,
  Text as RACText,
} from "react-aria-components";

import { tv } from "../utils/tv";

export type ToastTone = "default" | "success" | "danger" | "info" | "warning";

export interface ChronicleToastContent {
  title: React.ReactNode;
  description?: React.ReactNode;
  tone?: ToastTone;
  /**
   * Optional action rendered as a button at the right edge. Calling the
   * returned handler automatically dismisses the toast.
   */
  action?: { label: string; onPress: () => void };
}

const toastStyles = tv({
  slots: {
    region: "fixed top-s-4 right-s-4 z-50 flex flex-col gap-s-2 outline-none",
    toast:
      "relative pointer-events-auto flex items-start gap-s-3 rounded-sm border " +
      "bg-surface-02 px-s-4 py-s-3 shadow-panel min-w-[260px] max-w-[440px] outline-none " +
      "data-[focus-visible=true]:outline data-[focus-visible=true]:outline-1 " +
      "data-[focus-visible=true]:outline-ember",
    title: "font-sans text-sm font-medium text-ink-hi",
    description: "font-sans text-sm text-ink-lo",
    content: "flex-1 flex flex-col gap-s-1",
    action:
      "inline-flex items-center rounded-xs border border-hairline-strong " +
      "bg-surface-01 px-s-2 py-s-1 font-mono text-mono-sm uppercase tracking-tactical text-ink " +
      "data-[hovered=true]:bg-surface-03 data-[hovered=true]:text-ink-hi outline-none " +
      "data-[focus-visible=true]:outline data-[focus-visible=true]:outline-1 " +
      "data-[focus-visible=true]:outline-ember",
    close:
      "inline-flex h-6 w-6 items-center justify-center rounded-xs text-ink-dim outline-none " +
      "data-[hovered=true]:bg-surface-03 data-[hovered=true]:text-ink-hi " +
      "data-[focus-visible=true]:outline data-[focus-visible=true]:outline-1 " +
      "data-[focus-visible=true]:outline-ember",
  },
  variants: {
    tone: {
      default: { toast: "border-hairline-strong" },
      success: { toast: "border-event-green/40" },
      danger: { toast: "border-event-red/40" },
      info: { toast: "border-event-teal/40" },
      warning: { toast: "border-event-amber/40" },
    },
  },
  defaultVariants: { tone: "default" },
});

/**
 * Module-level queue, created once per browser tab. RAC's `ToastQueue`
 * is a subscribe/publish store that multiple `ToastRegion`s could read
 * from, but we intentionally mount only one region per app.
 */
const toastQueue = new RACToastQueue<ChronicleToastContent>({
  maxVisibleToasts: 5,
});

export interface ToastProviderProps {
  children: React.ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const slots = toastStyles({});
  return (
    <>
      {children}
      <RACToastRegion queue={toastQueue} className={slots.region()}>
        {({ toast }) => {
          const tone = toast.content.tone ?? "default";
          const variantSlots = toastStyles({ tone });
          return (
            <RACToast toast={toast} className={variantSlots.toast()}>
              <RACToastContent className={variantSlots.content()}>
                <RACText slot="title" className={variantSlots.title()}>
                  {toast.content.title}
                </RACText>
                {toast.content.description ? (
                  <RACText
                    slot="description"
                    className={variantSlots.description()}
                  >
                    {toast.content.description}
                  </RACText>
                ) : null}
              </RACToastContent>
              {toast.content.action ? (
                <RACButton
                  onPress={() => {
                    toast.content.action?.onPress();
                    toastQueue.close(toast.key);
                  }}
                  className={variantSlots.action()}
                >
                  {toast.content.action.label}
                </RACButton>
              ) : null}
              <RACButton
                slot="close"
                className={variantSlots.close()}
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
              </RACButton>
            </RACToast>
          );
        }}
      </RACToastRegion>
    </>
  );
}

export interface UseToastReturn {
  /** Push a new toast. Returns its key so callers can dismiss it early. */
  add: (
    content: ChronicleToastContent,
    options?: { timeout?: number },
  ) => string;
  /** Programmatically dismiss a toast by key. */
  dismiss: (key: string) => void;
}

export function useToast(): UseToastReturn {
  return React.useMemo(
    () => ({
      add: (content, options) =>
        toastQueue.add(content, { timeout: options?.timeout ?? 5000 }),
      dismiss: (key) => toastQueue.close(key),
    }),
    [],
  );
}
