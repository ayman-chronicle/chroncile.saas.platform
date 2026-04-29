"use client";

/*
 * Table — semantic table primitives styled with Chronicle density variants.
 *
 *   <Table aria-label="Runs" selectionMode="multiple" sortDescriptor={sort} onSortChange={setSort}>
 *     <TableHeader>
 *       <Column id="name" isRowHeader allowsSorting>Name</Column>
 *       <Column id="status">Status</Column>
 *     </TableHeader>
 *     <TableBody items={rows}>
 *       {(row) => (
 *         <Row>
 *           <Cell>{row.name}</Cell>
 *           <Cell>{row.status}</Cell>
 *         </Row>
 *       )}
 *     </TableBody>
 *   </Table>
 *
 * For a sticky header in a scroll container, wrap the table in your own
 * `<div className="overflow-auto max-h-[…]">`.
 */

import * as React from "react";

import { cn } from "../utils/cn";
import { useResolvedChromeDensity } from "../theme/chrome-style-context";
import {
  tableBodyVariants,
  tableCellVariants,
  tableColumnVariants,
  tableHeaderVariants,
  tableRowVariants,
  tableSortIndicatorVariants,
  tableVariants,
} from "./shadcn";

const TableDensityContext = React.createContext<"compact" | "brand" | undefined>(
  undefined,
);

export interface SortDescriptor {
  column: React.Key;
  direction: "ascending" | "descending";
}

export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  className?: string;
  density?: "compact" | "brand";
  selectionMode?: "none" | "single" | "multiple" | string;
  sortDescriptor?: SortDescriptor;
  onSortChange?: (descriptor: SortDescriptor) => void;
}

export function Table({
  className,
  density: densityProp,
  selectionMode: _selectionMode,
  sortDescriptor: _sortDescriptor,
  onSortChange: _onSortChange,
  ...rest
}: TableProps) {
  const density = useResolvedChromeDensity(densityProp);
  return (
    <TableDensityContext.Provider value={density}>
      <table
        {...rest}
        data-density={density}
        className={cn(tableVariants({ density }), className)}
      />
    </TableDensityContext.Provider>
  );
}

export interface TableHeaderProps
  extends React.HTMLAttributes<HTMLTableSectionElement> {
  className?: string;
}

export function TableHeader({
  className,
  ...rest
}: TableHeaderProps) {
  return (
    <thead {...rest} className={cn(tableHeaderVariants(), className)} />
  );
}

export interface TableBodyProps<T extends object = object>
  extends Omit<React.HTMLAttributes<HTMLTableSectionElement>, "children"> {
  className?: string;
  items?: Iterable<T>;
  children?: React.ReactNode | ((item: T) => React.ReactNode);
}

export function TableBody<T extends object>({
  className,
  items,
  children,
  ...rest
}: TableBodyProps<T>) {
  const rows = items
    ? Array.from(items, (item, index) => (
        <React.Fragment key={index}>
          {(children as (item: T) => React.ReactNode)(item)}
        </React.Fragment>
      ))
    : children;

  return (
    <tbody {...rest} className={cn(tableBodyVariants(), className)}>
      {rows as React.ReactNode}
    </tbody>
  );
}

export interface ColumnProps extends Omit<
  React.ThHTMLAttributes<HTMLTableCellElement>,
  "className" | "children"
> {
  className?: string;
  children?: React.ReactNode;
  allowsSorting?: boolean;
  sortDirection?: "ascending" | "descending";
  isRowHeader?: boolean;
}

export function Column({
  className,
  children,
  allowsSorting,
  sortDirection,
  isRowHeader,
  ...rest
}: ColumnProps) {
  const ctxDensity = React.useContext(TableDensityContext);
  const density = useResolvedChromeDensity(ctxDensity);
  return (
    <th
      {...rest}
      scope={isRowHeader ? "row" : "col"}
      className={cn(tableColumnVariants({ density }), className)}
    >
      <span className="inline-flex items-center">
        {children as React.ReactNode}
        {allowsSorting ? (
          <span
            aria-hidden
            className={tableSortIndicatorVariants({ density })}
            data-sort-direction={sortDirection}
          >
            <svg viewBox="0 0 12 12" fill="none" className="h-full w-full">
              <path
                d="M3 5l3 3 3-3"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        ) : null}
      </span>
    </th>
  );
}

export interface RowProps
  extends React.HTMLAttributes<HTMLTableRowElement> {
  className?: string;
}

export function Row({
  className,
  ...rest
}: RowProps) {
  const ctxDensity = React.useContext(TableDensityContext);
  const density = useResolvedChromeDensity(ctxDensity);
  return (
    <tr {...rest} className={cn(tableRowVariants({ density }), className)} />
  );
}

export interface CellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  className?: string;
}

export function Cell({ className, ...rest }: CellProps) {
  const ctxDensity = React.useContext(TableDensityContext);
  const density = useResolvedChromeDensity(ctxDensity);
  return (
    <td
      {...rest}
      className={cn(tableCellVariants({ density }), className)}
    />
  );
}
