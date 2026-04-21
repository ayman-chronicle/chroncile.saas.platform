"use client";

/*
 * Chronicle Labs — RAC provider shim.
 *
 * Mounts react-aria-components' I18nProvider (locale-aware number/date
 * formatting, RTL propagation) and optionally a RouterProvider so RAC's
 * <Link> components do client-side navigation through the host app's
 * router. Apps pass their own `navigate` callback so `ui` never imports
 * `next/navigation` directly.
 */

import * as React from "react";
import { I18nProvider } from "react-aria-components/I18nProvider";
import { RouterProvider } from "react-aria-components";

export interface UIProvidersProps {
  /** BCP-47 locale. Defaults to `en-US`. */
  locale?: string;
  /**
   * Client-side navigate function. When provided, RAC `<Link>` components
   * call this instead of a full page reload. Shape matches
   * `(path, routerOptions) => void`.
   */
  navigate?: (path: string, routerOptions?: unknown) => void;
  /**
   * Optional href resolver. Defaults to identity. Use this when your router
   * expects a transformed href (locale prefix, basePath, etc.).
   */
  useHref?: (href: string) => string;
  children: React.ReactNode;
}

/**
 * Single mount point for all Chronicle UI providers that need to live at
 * the root of the React tree. Our existing `ThemeProvider` is separate —
 * it already lives in `ui/theme` and can wrap (or be wrapped by) this.
 */
export function UIProviders({
  locale = "en-US",
  navigate,
  useHref,
  children,
}: UIProvidersProps) {
  const body = navigate ? (
    <RouterProvider navigate={navigate} useHref={useHref}>
      {children}
    </RouterProvider>
  ) : (
    children
  );

  return <I18nProvider locale={locale}>{body}</I18nProvider>;
}
