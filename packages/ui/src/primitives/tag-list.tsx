"use client";

import * as React from "react";

import { useResolvedChromeDensity } from "../theme/chrome-style-context";
import {
  tagListButtonVariants,
  tagListCheckboxVariants,
  tagListDotStackVariants,
  tagListDotVariants,
  tagListDropdownSearchLabelVariants,
  tagListDropdownSearchVariants,
  tagListDropdownVariants,
  tagListOptionContentVariants,
  tagListOptionDotWrapVariants,
  tagListOptionLabelVariants,
  tagListOptionVariants,
  tagListOptionsVariants,
  tagListPendingIndicatorVariants,
  tagListShortcutVariants,
} from "./shadcn";

export type TagListColor =
  | "bug"
  | "feature"
  | "improvement"
  | "neutral"
  | "teal"
  | "amber"
  | "green"
  | "orange"
  | "pink"
  | "violet"
  | "ember"
  | "red";

export interface TagListItem {
  id: string;
  label: React.ReactNode;
  color?: TagListColor;
}

export type TagListDensity = "compact" | "brand";
export type TagListSelectionResult = Iterable<string> | void;
export type TagListSelectionChange = (
  ids: Set<string>,
  meta: {
    item: TagListItem;
    selected: boolean;
    previousIds: Set<string>;
    requestId: number;
  }
) => TagListSelectionResult | Promise<TagListSelectionResult>;

export interface TagListSummaryRenderState {
  selectedItems: TagListItem[];
  selectedIds: Set<string>;
  totalItems: number;
  defaultLabel: React.ReactNode;
  emptyLabel: React.ReactNode;
  pendingIds: Set<string>;
}

const colorClass: Record<TagListColor, string> = {
  bug: "bg-[#eb5757]",
  feature: "bg-[#bb87fc]",
  improvement: "bg-[#4ea7fc]",
  neutral: "bg-l-ink-dim",
  teal: "bg-event-teal",
  amber: "bg-event-amber",
  green: "bg-event-green",
  orange: "bg-event-orange",
  pink: "bg-event-pink",
  violet: "bg-event-violet",
  ember: "bg-ember",
  red: "bg-event-red",
};

function getColor(item: TagListItem): TagListColor {
  return item.color ?? "neutral";
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3" aria-hidden>
      <path
        d="M3.5 8.25 6.5 11 12.5 4.75"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function toSelectionSet(value: Iterable<string> | undefined): Set<string> {
  return new Set(value ?? []);
}

export interface TagListProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  items: TagListItem[];
  density?: TagListDensity;
  maxDots?: 1 | 2 | 3;
  emptyLabel?: React.ReactNode;
  label?: React.ReactNode;
  renderLabel?: (state: TagListSummaryRenderState) => React.ReactNode;
  dropdown?: boolean;
  selectedIds?: Iterable<string>;
  defaultSelectedIds?: Iterable<string>;
  onSelectionChange?: TagListSelectionChange;
  /**
   * `sync` updates immediately, then calls `onSelectionChange`.
   * `async` waits for a returned promise before committing local state.
   */
  selectionMode?: "sync" | "async";
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  placeholder?: React.ReactNode;
  shortcut?: React.ReactNode;
  dropdownClassName?: string;
  ref?: React.Ref<HTMLButtonElement>;
}

export function TagList({
  items,
  density: densityProp,
  maxDots = 3,
  emptyLabel = "No labels",
  label,
  renderLabel,
  dropdown = false,
  selectedIds,
  defaultSelectedIds,
  onSelectionChange,
  selectionMode = "sync",
  open,
  defaultOpen = false,
  onOpenChange,
  placeholder = "Change labels...",
  shortcut = "L",
  dropdownClassName,
  className,
  onClick,
  ref,
  type,
  ...props
}: TagListProps) {
  const density = useResolvedChromeDensity(densityProp);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
  const [internalSelected, setInternalSelected] = React.useState<Set<string>>(
    () => new Set(defaultSelectedIds ?? selectedIds ?? items.map((item) => item.id))
  );
  const baseSelected = React.useMemo(
    () => toSelectionSet(selectedIds ?? internalSelected),
    [internalSelected, selectedIds]
  );
  const [optimisticSelected, setOptimisticSelected] =
    React.useState<Set<string>>(() => new Set(baseSelected));
  const [pendingIds, setPendingIds] = React.useState<Set<string>>(
    () => new Set()
  );
  const selectedRef = React.useRef(new Set(baseSelected));
  const pendingIdsRef = React.useRef(new Set<string>());
  const latestRequestRef = React.useRef(0);
  const isOpen = open ?? internalOpen;
  const selected = selectionMode === "async" ? optimisticSelected : baseSelected;
  selectedRef.current = selected;
  pendingIdsRef.current = pendingIds;

  React.useEffect(() => {
    if (
      selectionMode !== "async" ||
      pendingIdsRef.current.size > 0 ||
      latestRequestRef.current > 0
    ) {
      return;
    }
    setOptimisticSelected(new Set(baseSelected));
  }, [baseSelected, selectionMode]);

  const selectedItems = items.filter((item) => selected.has(item.id));
  const visibleDots = selectedItems.slice(0, maxDots);
  const count = Math.min(visibleDots.length, 3) as 0 | 1 | 2 | 3;
  const defaultLabel =
    selectedItems.length > 0 ? `${selectedItems.length} labels` : emptyLabel;
  const resolvedLabel =
    renderLabel?.({
      selectedItems,
      selectedIds: selected,
      totalItems: items.length,
      defaultLabel,
      emptyLabel,
      pendingIds,
    }) ??
    label ??
    defaultLabel;

  const setOpen = React.useCallback(
    (next: boolean) => {
      if (open === undefined) setInternalOpen(next);
      onOpenChange?.(next);
    },
    [onOpenChange, open]
  );

  React.useEffect(() => {
    if (!dropdown || !isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const root = rootRef.current;
      if (!root || root.contains(event.target as Node)) return;
      setOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [dropdown, isOpen, setOpen]);

  const toggle = React.useCallback(
    async (item: TagListItem) => {
      const id = item.id;
      if (pendingIdsRef.current.has(id)) return;

      const previousIds = new Set(selectedRef.current);
      const next = new Set(previousIds);
      const nextSelected = !next.has(id);
      if (nextSelected) next.add(id);
      else next.delete(id);
      const requestId = latestRequestRef.current + 1;
      latestRequestRef.current = requestId;

      if (selectionMode === "sync") {
        if (selectedIds === undefined) setInternalSelected(next);
        await onSelectionChange?.(next, {
          item,
          selected: nextSelected,
          previousIds,
          requestId,
        });
        return;
      }

      selectedRef.current = next;
      setOptimisticSelected(next);
      setPendingIds((current) => new Set(current).add(id));
      try {
        const result = await onSelectionChange?.(next, {
          item,
          selected: nextSelected,
          previousIds,
          requestId,
        });
        if (requestId === latestRequestRef.current) {
          const committed = result ? toSelectionSet(result) : next;
          selectedRef.current = committed;
          setOptimisticSelected(committed);
          if (selectedIds === undefined) setInternalSelected(committed);
        }
      } catch (error) {
        if (requestId === latestRequestRef.current) {
          selectedRef.current = previousIds;
          setOptimisticSelected(previousIds);
        }
        void error;
      } finally {
        setPendingIds((current) => {
          const updated = new Set(current);
          updated.delete(id);
          return updated;
        });
      }
    },
    [onSelectionChange, selectedIds, selectionMode]
  );

  return (
    <div ref={rootRef} className="relative inline-flex">
      <button
        {...props}
        ref={ref}
        type={type ?? "button"}
        className={tagListButtonVariants({ density, className })}
        data-density={density}
        aria-expanded={dropdown ? isOpen : undefined}
        onClick={(event) => {
          onClick?.(event);
          if (!event.defaultPrevented && dropdown) setOpen(!isOpen);
        }}
      >
        <span
          className={tagListDotStackVariants({ count })}
          aria-hidden
        >
          {visibleDots.map((item, index) => (
            <span
              key={item.id}
              className={tagListDotVariants({
                className: colorClass[getColor(item)],
              })}
              style={{ left: index * 4 }}
            />
          ))}
        </span>
        <span>{resolvedLabel}</span>
      </button>

      {dropdown && isOpen ? (
        <div
          className={tagListDropdownVariants({
            density,
            className: `absolute left-0 top-full z-50 mt-[6px] ${dropdownClassName ?? ""}`,
          })}
          data-density={density}
        >
          <div className={tagListDropdownSearchVariants()}>
            <div className={tagListDropdownSearchLabelVariants()}>
              <span>{placeholder}</span>
            </div>
            {shortcut ? (
              <span className={tagListShortcutVariants()}>{shortcut}</span>
            ) : null}
          </div>
          <div className={tagListOptionsVariants()} role="listbox" aria-multiselectable>
            {items.map((item) => {
              const isSelected = selected.has(item.id);
              const isPending = pendingIds.has(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  role="option"
                  className={tagListOptionVariants({ selected: isSelected })}
                  aria-selected={isSelected}
                  disabled={isPending}
                  onClick={() => void toggle(item)}
                >
                  <span
                    className={tagListCheckboxVariants({
                      selected: isSelected,
                      pending: isPending,
                    })}
                  >
                    {isPending ? (
                      <span className={tagListPendingIndicatorVariants()} />
                    ) : isSelected ? (
                      <CheckIcon />
                    ) : null}
                  </span>
                  <span className={tagListOptionContentVariants()}>
                    <span className={tagListOptionDotWrapVariants()}>
                      <span
                        aria-hidden
                        className={tagListDotVariants({
                          className: colorClass[getColor(item)],
                        })}
                      />
                    </span>
                    <span className={tagListOptionLabelVariants()}>{item.label}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
