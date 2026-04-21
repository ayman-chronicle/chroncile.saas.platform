"use client";

/*
 * Autocomplete — wraps an always-visible collection (menu, listbox) with
 * a filter input. Unlike `Combobox`, it doesn't own the selection — the
 * wrapped collection does. Use this for command palettes, inline
 * typeahead filters, or embedded search-as-you-type surfaces.
 *
 *   <Autocomplete>
 *     <SearchField aria-label="Search">
 *       <Input placeholder="Filter…" />
 *     </SearchField>
 *     <Menu>
 *       <MenuItem>...</MenuItem>
 *     </Menu>
 *   </Autocomplete>
 */

import * as React from "react";
import {
  Autocomplete as RACAutocomplete,
  useFilter,
  type AutocompleteProps as RACAutocompleteProps,
} from "react-aria-components";

import { tv } from "../utils/tv";

const autocompleteStyles = tv({
  base:
    "flex flex-col gap-s-2 rounded-md border border-hairline-strong " +
    "bg-surface-02 p-s-2 shadow-panel",
});

export interface AutocompleteProps<T extends object = object>
  extends RACAutocompleteProps<T> {
  className?: string;
  /** Children should include both an input (e.g. `<SearchField>` with
   * `<Input>`) and a collection (e.g. `<Menu>` or `<Listbox>`). */
  children: React.ReactNode;
}

export function Autocomplete<T extends object = object>({
  className,
  children,
  filter,
  ...rest
}: AutocompleteProps<T>) {
  const { contains } = useFilter({ sensitivity: "base" });
  return (
    <div className={autocompleteStyles({ className })}>
      <RACAutocomplete<T>
        {...rest}
        filter={
          filter ??
          ((textValue, inputValue) => contains(textValue, inputValue))
        }
      >
        {children as React.ReactNode}
      </RACAutocomplete>
    </div>
  );
}
