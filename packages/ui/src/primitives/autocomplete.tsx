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

import { useResolvedChromeDensity } from "../theme/chrome-style-context";
import { autocompleteVariants } from "./shadcn";

export interface AutocompleteProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "className" | "children"> {
  className?: string;
  density?: "compact" | "brand";
  /** Children should include both an input (e.g. `<SearchField>` with
   * `<Input>`) and a collection (e.g. `<Menu>` or `<Listbox>`). */
  children: React.ReactNode;
}

export function Autocomplete({
  className,
  children,
  density: densityProp,
  ...rest
}: AutocompleteProps) {
  const density = useResolvedChromeDensity(densityProp);
  return (
    <div
      {...rest}
      className={autocompleteVariants({ density, className })}
      data-density={density}
    >
      {children as React.ReactNode}
    </div>
  );
}
