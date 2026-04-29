"use client";

import * as React from "react";

import { useResolvedChromeDensity } from "../theme/chrome-style-context";
import { cn } from "../utils/cn";
import {
  multiSelectCheckboxVariants,
  multiSelectChevronVariants,
  multiSelectEmptyDescriptionVariants,
  multiSelectEmptyIconVariants,
  multiSelectEmptyTitleVariants,
  multiSelectEmptyVariants,
  multiSelectFooterButtonVariants,
  multiSelectFooterVariants,
  multiSelectHintVariants,
  multiSelectItemContentVariants,
  multiSelectItemDescriptionVariants,
  multiSelectItemIconVariants,
  multiSelectItemLabelVariants,
  multiSelectItemVariants,
  multiSelectListVariants,
  multiSelectPopoverVariants,
  multiSelectRootVariants,
  multiSelectSearchInputVariants,
  multiSelectSearchRootVariants,
  multiSelectSearchWrapVariants,
  multiSelectSectionHeaderVariants,
  multiSelectSupportingTextVariants,
  multiSelectTriggerContentVariants,
  multiSelectTriggerVariants,
  multiSelectValueVariants,
} from "./shadcn";

export type MultiSelectDensity = "compact" | "brand";
export type MultiSelectSelection = Set<string> | "all";

export interface MultiSelectItemType {
  id: string;
  label: React.ReactNode;
  textValue?: string;
  description?: React.ReactNode;
  section?: React.ReactNode;
  icon?: React.ReactNode;
  isDisabled?: boolean;
}

export interface MultiSelectRenderState {
  item: MultiSelectItemType;
  isSelected: boolean;
}

export interface MultiSelectProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children" | "onChange"> {
  items: MultiSelectItemType[];
  children?: React.ReactNode | ((state: MultiSelectRenderState) => React.ReactNode);
  selectedKeys?: MultiSelectSelection;
  defaultSelectedKeys?: Iterable<string>;
  onSelectionChange?: (keys: Set<string>) => void;
  isDisabled?: boolean;
  isRequired?: boolean;
  isInvalid?: boolean;
  placeholder?: React.ReactNode;
  label?: React.ReactNode;
  hint?: React.ReactNode;
  hideRequiredIndicator?: boolean;
  popoverClassName?: string;
  onReset?: () => void;
  onSelectAll?: () => void;
  showFooter?: boolean;
  showSearch?: boolean;
  emptyStateTitle?: React.ReactNode;
  emptyStateDescription?: React.ReactNode;
  selectedCountFormatter?: (count: number) => React.ReactNode;
  supportingText?: React.ReactNode;
  searchPlaceholder?: string;
  density?: MultiSelectDensity;
}

function itemText(item: MultiSelectItemType) {
  if (item.textValue) return item.textValue;
  if (typeof item.label === "string") return item.label;
  return item.id;
}

function toSet(selection: MultiSelectSelection | Iterable<string> | undefined, items: MultiSelectItemType[]) {
  if (selection === "all") return new Set(items.map((item) => item.id));
  return new Set(selection ?? []);
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 18 18" fill="none" className="h-[10px] w-[10px]" aria-hidden>
      <polyline
        points="1 9 7 14 15 4"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className={multiSelectChevronVariants({ open })}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="size-4 shrink-0 text-l-ink-dim" aria-hidden>
      <path
        d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
      />
    </svg>
  );
}

export function MultiSelect({
  items,
  children,
  selectedKeys,
  defaultSelectedKeys = [],
  onSelectionChange,
  isDisabled = false,
  isRequired = false,
  isInvalid = false,
  placeholder = "Select",
  label,
  hint,
  hideRequiredIndicator = false,
  popoverClassName,
  className,
  onReset,
  onSelectAll,
  showFooter = true,
  showSearch = true,
  emptyStateTitle = "No results found",
  emptyStateDescription = "Please try a different search term.",
  selectedCountFormatter,
  supportingText,
  searchPlaceholder = "Search",
  density: densityProp,
  ...props
}: MultiSelectProps) {
  const density = useResolvedChromeDensity(densityProp);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const isControlled = selectedKeys !== undefined;
  const [internalSelected, setInternalSelected] = React.useState<Set<string>>(
    () => toSet(defaultSelectedKeys, items)
  );
  const selected = React.useMemo(
    () => toSet(selectedKeys ?? internalSelected, items),
    [internalSelected, items, selectedKeys]
  );
  const selectedCount = selected.size;
  const hasSelection = selectedCount > 0;

  React.useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current || rootRef.current.contains(event.target as Node)) return;
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const filteredItems = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) => itemText(item).toLowerCase().includes(needle));
  }, [items, query]);

  const sections = React.useMemo(() => {
    const groups = new Map<React.ReactNode, MultiSelectItemType[]>();
    for (const item of filteredItems) {
      const section = item.section ?? "";
      groups.set(section, [...(groups.get(section) ?? []), item]);
    }
    return Array.from(groups.entries());
  }, [filteredItems]);

  const commit = React.useCallback(
    (next: Set<string>) => {
      if (!isControlled) setInternalSelected(new Set(next));
      onSelectionChange?.(new Set(next));
    },
    [isControlled, onSelectionChange]
  );

  const toggleItem = (item: MultiSelectItemType) => {
    if (item.isDisabled) return;
    const next = new Set(selected);
    if (next.has(item.id)) next.delete(item.id);
    else next.add(item.id);
    commit(next);
  };

  const reset = () => {
    commit(new Set());
    onReset?.();
  };

  const selectAll = () => {
    commit(new Set(items.filter((item) => !item.isDisabled).map((item) => item.id)));
    onSelectAll?.();
  };

  const selectedLabel = selectedCountFormatter
    ? selectedCountFormatter(selectedCount)
    : `${selectedCount} selected`;

  return (
    <div
      ref={rootRef}
      className={cn(multiSelectRootVariants(), className)}
      data-density={density}
      {...props}
    >
      {label ? (
        <div className="font-sans text-[12px] font-medium text-l-ink-lo">
          {label}
          {isRequired && !hideRequiredIndicator ? (
            <span className="ml-[4px] text-event-red">*</span>
          ) : null}
        </div>
      ) : null}

      <div className="relative">
        <button
          type="button"
          disabled={isDisabled}
          aria-expanded={open}
          aria-invalid={isInvalid || undefined}
          className={multiSelectTriggerVariants({ density, invalid: isInvalid })}
          onClick={() => setOpen((next) => !next)}
        >
          <span className={multiSelectTriggerContentVariants()}>
            {hasSelection ? (
              <>
                <span className={multiSelectValueVariants({ state: "selected" })}>
                  {selectedLabel}
                </span>
                {supportingText ? (
                  <span className={multiSelectSupportingTextVariants()}>
                    {supportingText}
                  </span>
                ) : null}
              </>
            ) : (
              <span className={multiSelectValueVariants({ state: "placeholder" })}>
                {placeholder}
              </span>
            )}
          </span>
          <ChevronIcon open={open} />
        </button>

        {open ? (
          <div className={cn(multiSelectPopoverVariants(), popoverClassName)}>
            {showSearch ? (
              <div className={multiSelectSearchWrapVariants()}>
                <label className={multiSelectSearchRootVariants()}>
                  <SearchIcon />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.currentTarget.value)}
                    placeholder={searchPlaceholder}
                    className={multiSelectSearchInputVariants()}
                    autoFocus
                  />
                </label>
              </div>
            ) : null}

            <div className={multiSelectListVariants()} role="listbox" aria-multiselectable>
              {sections.length === 0 ? (
                <div className={multiSelectEmptyVariants()}>
                  <span className={multiSelectEmptyIconVariants()}>
                    <SearchIcon />
                  </span>
                  <div>
                    <p className={multiSelectEmptyTitleVariants()}>{emptyStateTitle}</p>
                    <p className={multiSelectEmptyDescriptionVariants()}>
                      {emptyStateDescription}
                    </p>
                  </div>
                  {query ? (
                    <button
                      type="button"
                      className={multiSelectFooterButtonVariants()}
                      onClick={() => setQuery("")}
                    >
                      Clear search
                    </button>
                  ) : null}
                </div>
              ) : (
                sections.map(([section, sectionItems]) => (
                  <div key={String(section || "default")}>
                    {section ? (
                      <div className={multiSelectSectionHeaderVariants()}>
                        {section}
                      </div>
                    ) : null}
                    {sectionItems.map((item) => {
                      const isSelected = selected.has(item.id);
                      const rendered =
                        typeof children === "function"
                          ? children({ item, isSelected })
                          : children;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          disabled={item.isDisabled}
                          className={multiSelectItemVariants({ selected: isSelected })}
                          onClick={() => toggleItem(item)}
                        >
                          <span className={multiSelectCheckboxVariants({ selected: isSelected })}>
                            {isSelected ? <CheckIcon /> : null}
                          </span>
                          {item.icon ? (
                            <span className={multiSelectItemIconVariants()}>
                              {item.icon}
                            </span>
                          ) : null}
                          {rendered ?? (
                            <span className={multiSelectItemContentVariants()}>
                              <span className={multiSelectItemLabelVariants({ selected: isSelected })}>
                                {item.label}
                              </span>
                              {item.description ? (
                                <span className={multiSelectItemDescriptionVariants()}>
                                  {item.description}
                                </span>
                              ) : null}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            {showFooter ? (
              <div className={multiSelectFooterVariants()}>
                <button
                  type="button"
                  className={multiSelectFooterButtonVariants()}
                  onClick={reset}
                >
                  Reset
                </button>
                <button
                  type="button"
                  className={multiSelectFooterButtonVariants()}
                  onClick={selectAll}
                >
                  Select all
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {hint ? (
        <div className={multiSelectHintVariants({ invalid: isInvalid })}>
          {hint}
        </div>
      ) : null}
    </div>
  );
}
