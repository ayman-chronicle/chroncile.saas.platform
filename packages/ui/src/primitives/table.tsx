"use client";

/*
 * Table — row-selectable, sortable table backed by RAC's table collection.
 * Supports keyboard navigation (arrow/home/end/PgUp/PgDn), typeahead,
 * single/multiple row selection, column sort direction, and row actions.
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
 * `<div className="overflow-auto max-h-[…]">` — RAC's table renders
 * native `<table>` semantics so sticky positioning works as expected.
 */

import * as React from "react";
import {
  Table as RACTable,
  TableHeader as RACTableHeader,
  TableBody as RACTableBody,
  Column as RACColumn,
  Row as RACRow,
  Cell as RACCell,
  type TableProps as RACTableProps,
  type TableHeaderProps as RACTableHeaderProps,
  type TableBodyProps as RACTableBodyProps,
  type ColumnProps as RACColumnProps,
  type RowProps as RACRowProps,
  type CellProps as RACCellProps,
} from "react-aria-components";

import { tv } from "../utils/tv";
import { composeTwRenderProps } from "../utils/compose";

const tableStyles = tv({
  slots: {
    table:
      "w-full border-separate border-spacing-0 rounded-md border border-hairline " +
      "bg-surface-01 outline-none",
    header: "",
    column:
      "sticky top-0 z-10 bg-surface-02 text-left align-middle " +
      "border-b border-hairline-strong px-s-3 py-s-2 " +
      "font-mono text-mono-sm uppercase tracking-tactical text-ink-dim " +
      "outline-none " +
      "data-[allows-sorting=true]:cursor-pointer " +
      "data-[hovered=true]:text-ink-hi " +
      "data-[focus-visible=true]:outline data-[focus-visible=true]:outline-1 " +
      "data-[focus-visible=true]:outline-ember",
    body: "",
    row:
      "group outline-none " +
      "data-[hovered=true]:bg-surface-02 " +
      "data-[selected=true]:bg-[rgba(216,67,10,0.06)] " +
      "data-[focus-visible=true]:outline data-[focus-visible=true]:outline-1 " +
      "data-[focus-visible=true]:-outline-offset-1 data-[focus-visible=true]:outline-ember",
    cell:
      "align-middle border-b border-hairline px-s-3 py-s-2 font-mono text-mono-lg text-ink outline-none",
    sortIndicator:
      "ml-s-1 inline-block h-3 w-3 text-ink-dim " +
      "group-data-[sort-direction=descending]:rotate-180",
  },
});

export interface TableProps extends Omit<RACTableProps, "className"> {
  className?: string;
}

export function Table({ className, ...rest }: TableProps) {
  const slots = tableStyles({});
  return (
    <RACTable
      {...rest}
      className={composeTwRenderProps(className, slots.table())}
    />
  );
}

export interface TableHeaderProps<T extends object = object>
  extends Omit<RACTableHeaderProps<T>, "className"> {
  className?: string;
}

export function TableHeader<T extends object = object>({
  className,
  ...rest
}: TableHeaderProps<T>) {
  const slots = tableStyles({});
  return (
    <RACTableHeader
      {...(rest as RACTableHeaderProps<T>)}
      className={composeTwRenderProps(className, slots.header())}
    />
  );
}

export interface TableBodyProps<T extends object>
  extends Omit<RACTableBodyProps<T>, "className"> {
  className?: string;
}

export function TableBody<T extends object>({
  className,
  ...rest
}: TableBodyProps<T>) {
  const slots = tableStyles({});
  return (
    <RACTableBody
      {...(rest as RACTableBodyProps<T>)}
      className={composeTwRenderProps(className, slots.body())}
    />
  );
}

export interface ColumnProps extends Omit<RACColumnProps, "className" | "children"> {
  className?: string;
  children?: React.ReactNode;
}

export function Column({ className, children, ...rest }: ColumnProps) {
  const slots = tableStyles({});
  return (
    <RACColumn
      {...rest}
      className={composeTwRenderProps(className, slots.column())}
    >
      {({ allowsSorting, sortDirection }) => (
        <span className="inline-flex items-center">
          {children as React.ReactNode}
          {allowsSorting ? (
            <span
              aria-hidden
              className={slots.sortIndicator()}
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
      )}
    </RACColumn>
  );
}

export interface RowProps<T extends object = object>
  extends Omit<RACRowProps<T>, "className"> {
  className?: string;
}

export function Row<T extends object = object>({
  className,
  ...rest
}: RowProps<T>) {
  const slots = tableStyles({});
  return (
    <RACRow
      {...(rest as RACRowProps<T>)}
      className={composeTwRenderProps(className, slots.row())}
    />
  );
}

export interface CellProps extends Omit<RACCellProps, "className"> {
  className?: string;
}

export function Cell({ className, ...rest }: CellProps) {
  const slots = tableStyles({});
  return (
    <RACCell
      {...rest}
      className={composeTwRenderProps(className, slots.cell())}
    />
  );
}
