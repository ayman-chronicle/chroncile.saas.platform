/*
 * Templates — print- and PDF-oriented document compositions.
 *
 * Templates are full-page React compositions built from the design-system
 * primitives (Display, Body, Mono, Card, Table, Separator). They are
 * pure, parametric, and SSR-safe so they can be rendered to HTML via
 * `react-dom/server` and snapshotted to PDF by Playwright (see
 * `packages/ui/scripts/render-invoice-pdf.mts`).
 *
 * Templates live separately from product surfaces because they target
 * paper sizes (Letter / A4), default to the paper-tuned light theme,
 * and intentionally avoid client-only behaviour (no popovers, no
 * portals, no event handlers).
 */

export { Invoice } from "./invoice/invoice";
export type { InvoiceProps } from "./invoice/invoice";
export type {
  InvoiceValue,
  InvoiceParty,
  InvoiceFromParty,
  InvoiceLineItem,
  InvoiceSummary,
  InvoicePaymentTerms,
  InvoiceWireInstructions,
} from "./invoice/types";
export { sampleInvoice } from "./invoice/sample";
