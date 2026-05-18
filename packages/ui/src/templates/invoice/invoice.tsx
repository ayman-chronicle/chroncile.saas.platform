import * as React from "react";

import { cx } from "../../utils/cx";
import { Body } from "../../typography/body";
import { Display } from "../../typography/display";
import { Mono } from "../../typography/mono";
import { Eyebrow } from "../../primitives/eyebrow";
import { Logo } from "../../primitives/logo";
import { Separator } from "../../primitives/separator";

import type {
  InvoiceFromParty,
  InvoiceLineItem,
  InvoiceParty,
  InvoicePaymentTerms,
  InvoiceSummary,
  InvoiceValue,
  InvoiceWireInstructions,
} from "./types";

/*
 * Invoice — paper-sized, SSR-safe document template.
 *
 * The document follows a "narrative-first" hierarchy:
 *   1. Header — who is billing, what document this is
 *   2. Bill To / From — who and to where (compact, low-contrast labels)
 *   3. Services — the central anchor; rows breathe, Amount column is firm
 *   4. Total Due — the visual hero, with payment terms attached inline
 *   5. Wire / ACH — a quiet supporting block; AP can scan but it doesn't
 *      compete with the total
 *   6. Footer — legal entity + invoice reference
 *
 * Dividers are intentionally sparse. Spacing carries the visual rhythm
 * so the page reads as one composed sheet rather than a stack of strips.
 *
 * The component is pure, parametric, and SSR-safe — `react-dom/server`
 * emits the full markup which Playwright then snapshots to PDF.
 */

export interface InvoiceProps {
  value: InvoiceValue;
  className?: string;
  /**
   * Surface tone the invoice is rendered on. Drives the Chronicle Labs
   * lockup ink color because the `Logo` primitive's theme detection
   * runs in a `useEffect` that does not fire under `renderToStaticMarkup`.
   * Defaults to `light` (paper).
   */
  surface?: "light" | "dark";
}

// ─── primitives ──────────────────────────────────────────────────────

const PLACEHOLDER = "\u2014".repeat(20);

function fieldOrBlank(s: string | undefined): React.ReactNode {
  if (!s || s.trim() === "") {
    return (
      <span
        aria-hidden
        className="font-mono text-ink-faint tracking-tight select-none"
      >
        {PLACEHOLDER}
      </span>
    );
  }
  return s;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[9px] font-sans font-medium uppercase tracking-eyebrow text-ink-dim">
      {children}
    </span>
  );
}

function MetaRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <>
      <dt>
        <FieldLabel>{label}</FieldLabel>
      </dt>
      <dd className="m-0">
        {mono ? (
          <Mono as="span" size="sm" tone="hi">
            {value}
          </Mono>
        ) : (
          <Body as="span" size="sm" tone="default" className="text-ink-hi">
            {value}
          </Body>
        )}
      </dd>
    </>
  );
}

// ─── header ──────────────────────────────────────────────────────────

function InvoiceHeader({
  value,
  surface,
}: {
  value: InvoiceValue;
  surface: "light" | "dark";
}) {
  return (
    <header className="flex flex-col gap-s-4">
      <Logo
        variant="wordmark"
        theme={surface}
        aria-label="Chronicle Labs"
        className="h-s-8 w-auto self-start"
      />
      <div className="flex items-end justify-between gap-s-6">
        <Display as="h1" size="sm" className="leading-none">
          Invoice
        </Display>
        <dl className="grid grid-cols-[max-content_1fr] items-baseline gap-x-s-3 gap-y-[3px] m-0 text-right">
          <MetaRow label="Number" value={value.number} mono />
          <MetaRow label="Date Issued" value={value.date} />
          <MetaRow label="Billing Period" value={value.billingPeriod} />
          {value.paymentTerms.dueDate ? (
            <MetaRow
              label="Due Date"
              value={`${value.paymentTerms.dueDate} (${value.paymentTerms.dueText})`}
            />
          ) : null}
        </dl>
      </div>
    </header>
  );
}

// ─── parties ─────────────────────────────────────────────────────────

function BillToBlock({ party }: { party: InvoiceParty }) {
  return (
    <div className="flex flex-col gap-[2px]">
      <Eyebrow className="mb-s-1">Bill To</Eyebrow>
      <Body as="p" size="md" className="m-0 font-medium text-ink-hi">
        {fieldOrBlank(party.company)}
      </Body>
      {party.name ? (
        <Body as="p" size="sm" tone="lo" className="m-0">
          <FieldLabel>Department</FieldLabel>{" "}
          <span className="text-ink-hi">{party.name}</span>
        </Body>
      ) : null}
      {party.email ? (
        <Body as="p" size="sm" tone="lo" className="m-0">
          <FieldLabel>Email</FieldLabel>{" "}
          <span className="text-ink-hi">{party.email}</span>
        </Body>
      ) : null}
      {party.address ? (
        <Body
          as="p"
          size="sm"
          tone="lo"
          className="m-0 mt-[2px] leading-snug"
        >
          {party.address}
        </Body>
      ) : null}
    </div>
  );
}

function FromBlock({ party }: { party: InvoiceFromParty }) {
  return (
    <div className="flex flex-col gap-[2px]">
      <Eyebrow className="mb-s-1">From</Eyebrow>
      <Body as="p" size="md" className="m-0 font-medium text-ink-hi">
        {fieldOrBlank(party.name)}
      </Body>
      {party.address ? (
        <Body
          as="p"
          size="sm"
          tone="lo"
          className="m-0 mt-[2px] leading-snug"
        >
          {party.address}
        </Body>
      ) : null}
      {party.email ? (
        <Body as="p" size="sm" tone="lo" className="m-0">
          <FieldLabel>Email</FieldLabel>{" "}
          <span className="text-ink-hi">{party.email}</span>
        </Body>
      ) : null}
      {party.phone ? (
        <Body as="p" size="sm" tone="lo" className="m-0">
          <FieldLabel>Phone</FieldLabel>{" "}
          <span className="text-ink-hi">{party.phone}</span>
        </Body>
      ) : null}
    </div>
  );
}

// ─── services table ──────────────────────────────────────────────────

function ServicesTable({ items }: { items: InvoiceLineItem[] }) {
  const showHours = items.some((i) => i.hours !== undefined);
  const showRate = items.some((i) => i.rate !== undefined);
  const showPeriod = items.some((i) => i.period !== undefined);

  return (
    <section className="flex flex-col gap-s-2">
      <table className="w-full border-separate border-spacing-0 border border-hairline-strong rounded-sm overflow-hidden">
        <thead>
          <tr className="bg-surface-02">
            <th
              scope="col"
              className="px-s-3 py-s-2 text-left font-sans text-[10px] font-medium uppercase tracking-eyebrow text-ink-hi border-b border-hairline-strong"
            >
              Description
            </th>
            {showPeriod ? (
              <th
                scope="col"
                className="px-s-3 py-s-2 text-left font-sans text-[10px] font-medium uppercase tracking-eyebrow text-ink-hi border-b border-hairline-strong w-[180px]"
              >
                Period
              </th>
            ) : null}
            {showHours ? (
              <th
                scope="col"
                className="px-s-3 py-s-2 text-right font-sans text-[10px] font-medium uppercase tracking-eyebrow text-ink-hi border-b border-hairline-strong w-[70px]"
              >
                Hours
              </th>
            ) : null}
            {showRate ? (
              <th
                scope="col"
                className="px-s-3 py-s-2 text-right font-sans text-[10px] font-medium uppercase tracking-eyebrow text-ink-hi border-b border-hairline-strong w-[100px]"
              >
                Rate
              </th>
            ) : null}
            <th
              scope="col"
              className="px-s-3 py-s-2 text-right font-sans text-[10px] font-medium uppercase tracking-eyebrow text-ink-hi border-b border-hairline-strong w-[120px]"
            >
              Amount
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr
              key={`${item.description}-${i}`}
              className="border-b border-hairline last:border-b-0"
            >
              <td className="px-s-3 py-s-2 align-top">
                <Body as="span" size="md" tone="default">
                  {item.description}
                </Body>
              </td>
              {showPeriod ? (
                <td className="px-s-3 py-s-2 align-top">
                  <Mono as="span" size="sm" tone="lo">
                    {item.period ?? ""}
                  </Mono>
                </td>
              ) : null}
              {showHours ? (
                <td className="px-s-3 py-s-2 text-right align-top">
                  <Mono as="span" size="sm" tone="hi">
                    {item.hours ?? ""}
                  </Mono>
                </td>
              ) : null}
              {showRate ? (
                <td className="px-s-3 py-s-2 text-right align-top">
                  <Mono as="span" size="sm" tone="hi">
                    {item.rate ?? ""}
                  </Mono>
                </td>
              ) : null}
              <td className="px-s-3 py-s-2 text-right align-top">
                <Mono
                  as="span"
                  size="sm"
                  tone="hi"
                  className="font-medium text-ink-hi"
                >
                  {item.amount}
                </Mono>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

// ─── total due hero ──────────────────────────────────────────────────

function TotalDueHero({
  summary,
  paymentTerms,
}: {
  summary: InvoiceSummary;
  paymentTerms: InvoicePaymentTerms;
}) {
  const dueLine = paymentTerms.dueDate
    ? `Payment Due ${paymentTerms.dueDate} · ${paymentTerms.dueText}`
    : `${paymentTerms.dueText}`;

  return (
    <section className="rounded-md border border-hairline-strong bg-wash-2 px-s-5 py-s-3 flex items-end justify-between gap-s-4">
      <div className="flex flex-col gap-[2px]">
        <Eyebrow>Total Due</Eyebrow>
        <Body
          as="p"
          size="md"
          tone="default"
          className="m-0 text-ink-hi font-medium"
        >
          {dueLine}
        </Body>
        {summary.totalHours || summary.hourlyRate ? (
          <Body as="p" size="sm" tone="lo" className="m-0 mt-[2px]">
            {[summary.totalHours, summary.hourlyRate]
              .filter(Boolean)
              .join(" · ")}
          </Body>
        ) : null}
        <Body as="p" size="sm" tone="lo" className="m-0 mt-[2px]">
          Accepted: {paymentTerms.methods}
        </Body>
      </div>
      <Display
        as="div"
        size="md"
        className="leading-none text-ink-hi tabular-nums"
      >
        {summary.totalDue}
      </Display>
    </section>
  );
}

// ─── wire instructions (quiet, supporting) ───────────────────────────

function WireRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <>
      <dt className="self-center">
        <FieldLabel>{label}</FieldLabel>
      </dt>
      <dd className="m-0 self-center">
        {mono ? (
          <Mono as="span" size="sm" tone="hi">
            {value}
          </Mono>
        ) : (
          <Body as="span" size="sm" tone="default" className="text-ink-hi">
            {value}
          </Body>
        )}
      </dd>
    </>
  );
}

function WireInstructionsBlock({
  wire,
  paymentMemo,
  remittanceEmail,
}: {
  wire: InvoiceWireInstructions;
  paymentMemo?: string;
  remittanceEmail?: string;
}) {
  return (
    <section className="flex flex-col gap-s-2">
      <Eyebrow>Wire &amp; ACH Instructions</Eyebrow>
      <div className="bg-wash-1 px-s-4 py-s-3 rounded-sm">
        <dl className="grid grid-cols-[max-content_1fr] gap-x-s-4 gap-y-[2px] m-0">
          <WireRow label="Beneficiary" value={wire.beneficiaryName} />
          <WireRow label="Address" value={wire.beneficiaryAddress} />
          <WireRow
            label="Account Number"
            value={wire.accountNumber}
            mono
          />
          <WireRow
            label="ABA Routing"
            value={wire.abaRoutingNumber}
            mono
          />
          <WireRow label="Account Type" value={wire.accountType} />
          <WireRow label="Bank Name" value={wire.bankName} />
          <WireRow label="Bank Address" value={wire.bankAddress} />
        </dl>
      </div>
      {paymentMemo || remittanceEmail ? (
        <dl className="grid grid-cols-[max-content_1fr] gap-x-s-4 gap-y-[2px] m-0">
          {paymentMemo ? (
            <WireRow label="Payment Memo" value={paymentMemo} mono />
          ) : null}
          {remittanceEmail ? (
            <WireRow label="Remittance Email" value={remittanceEmail} />
          ) : null}
        </dl>
      ) : null}
      {wire.disclosure ? (
        <Body as="p" size="sm" tone="dim" className="italic m-0">
          {wire.disclosure}
        </Body>
      ) : null}
    </section>
  );
}

// ─── document ────────────────────────────────────────────────────────

export function Invoice({
  value,
  className,
  surface = "light",
}: InvoiceProps) {
  return (
    <div
      data-template="invoice"
      className={cx(
        "mx-auto w-[8.5in] bg-page text-ink",
        "px-[0.7in] py-[0.4in]",
        "[font-variant-numeric:tabular-nums]",
        className
      )}
    >
      <InvoiceHeader value={value} surface={surface} />

      <section className="mt-s-5 grid grid-cols-2 gap-s-8">
        <BillToBlock party={value.billTo} />
        <FromBlock party={value.from} />
      </section>

      <Separator className="my-s-5" />

      <ServicesTable items={value.lineItems} />

      <div className="mt-s-3">
        <TotalDueHero
          summary={value.summary}
          paymentTerms={value.paymentTerms}
        />
      </div>

      {value.wire ? (
        <div className="mt-s-5">
          <WireInstructionsBlock
            wire={value.wire}
            paymentMemo={value.paymentTerms.paymentMemo}
            remittanceEmail={value.paymentTerms.remittanceEmail}
          />
        </div>
      ) : null}

      {value.notes ? (
        <div className="mt-s-4">
          <Body as="p" size="sm" tone="lo" className="m-0">
            <span className="font-medium text-ink-hi">Notes:</span>{" "}
            {value.notes}
          </Body>
        </div>
      ) : null}

      <footer className="mt-s-5 pt-s-2 border-t border-hairline flex items-baseline justify-between gap-s-3">
        <Mono as="span" size="xs" tone="dim" uppercase tactical>
          {value.from.name}
        </Mono>
        <Mono as="span" size="xs" tone="dim" uppercase tactical>
          {value.number} · {value.date}
        </Mono>
      </footer>
    </div>
  );
}
