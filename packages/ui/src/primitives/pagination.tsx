"use client";

/*
 * Pagination — a numeric page selector with prev/next affordances.
 * Uncontrolled by default (internal state from `defaultPage`); become
 * controlled by passing `page` + `onPageChange`.
 *
 * Uses native buttons so it can be embedded in any app shell.
 */

import * as React from "react";

import { cn } from "../utils/cn";
import { useResolvedChromeDensity } from "../theme/chrome-style-context";
import {
  paginationButtonVariants,
  paginationEllipsisVariants,
  paginationVariants,
} from "./shadcn";

export interface PaginationProps {
  page?: number;
  defaultPage?: number;
  totalPages: number;
  /** Number of pages to show on each side of the current one. */
  siblings?: number;
  onPageChange?: (page: number) => void;
  className?: string;
  density?: "compact" | "brand";
  labels?: {
    previous?: string;
    next?: string;
    page?: (p: number) => string;
  };
}

function range(start: number, end: number): number[] {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

function buildItems(
  current: number,
  total: number,
  siblings: number
): (number | "…")[] {
  const first = 1;
  const last = total;
  const leftBound = Math.max(current - siblings, first);
  const rightBound = Math.min(current + siblings, last);

  const items: (number | "…")[] = [];

  if (leftBound > first + 1) {
    items.push(first, "…");
  } else {
    items.push(...range(first, Math.min(leftBound - 1, last)));
  }

  items.push(...range(leftBound, rightBound));

  if (rightBound < last - 1) {
    items.push("…", last);
  } else if (rightBound < last) {
    items.push(...range(rightBound + 1, last));
  }

  return items;
}

const PageButton = ({
  isCurrent,
  density,
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  isCurrent?: boolean;
  density: "compact" | "brand";
}) => {
  return (
    <button
      type="button"
      {...rest}
      className={cn(paginationButtonVariants({ density, current: isCurrent }), className)}
    />
  );
};

export function Pagination({
  page,
  defaultPage = 1,
  totalPages,
  siblings = 1,
  onPageChange,
  className,
  density: densityProp,
  labels,
}: PaginationProps) {
  const density = useResolvedChromeDensity(densityProp);
  const [internal, setInternal] = React.useState(defaultPage);
  const current = page ?? internal;
  const set = (p: number) => {
    const clamped = Math.max(1, Math.min(totalPages, p));
    if (page === undefined) setInternal(clamped);
    onPageChange?.(clamped);
  };

  const items = buildItems(current, totalPages, siblings);

  return (
    <nav
      aria-label="Pagination"
      className={paginationVariants({ density, className })}
    >
      <PageButton
        density={density}
        onClick={() => set(current - 1)}
        disabled={current === 1}
        aria-label={labels?.previous ?? "Previous page"}
      >
        ‹
      </PageButton>
      {items.map((it, idx) =>
        it === "…" ? (
          <span
            key={`gap-${idx}`}
            className={paginationEllipsisVariants({ density })}
            aria-hidden
          >
            …
          </span>
        ) : (
          <PageButton
            density={density}
            key={it}
            onClick={() => set(it)}
            isCurrent={it === current}
            aria-current={it === current ? "page" : undefined}
            aria-label={labels?.page ? labels.page(it) : `Page ${it}`}
          >
            {it}
          </PageButton>
        )
      )}
      <PageButton
        density={density}
        onClick={() => set(current + 1)}
        disabled={current === totalPages}
        aria-label={labels?.next ?? "Next page"}
      >
        ›
      </PageButton>
    </nav>
  );
}
