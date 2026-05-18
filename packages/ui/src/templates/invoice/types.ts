/*
 * Invoice value object — parametric input for the <Invoice /> template.
 *
 * Numeric fields (rate, amount, totalDue, totalHours, hourlyRate) are
 * intentionally `string` so the caller controls formatting (currency
 * symbol, locale, thousands separator). The template renders these
 * cells with the Mono primitive and respects whatever formatting the
 * caller chose. Internal totals are NOT recomputed by the template.
 */

export interface InvoiceParty {
  name?: string;
  company?: string;
  address?: string;
  email?: string;
}

export interface InvoiceFromParty {
  name?: string;
  address?: string;
  email?: string;
  phone?: string;
}

export interface InvoiceLineItem {
  description: string;
  /** Period the line item covers (e.g. "Apr 10 – Apr 16, 2026"). */
  period?: string;
  /** Hourly billing only — leave undefined for subscription-style lines. */
  hours?: number;
  /** Hourly billing only — leave undefined for subscription-style lines. */
  rate?: string;
  amount: string;
}

export interface InvoiceSummary {
  /** Hourly billing only. Renders a small meta row when present. */
  totalHours?: string;
  /** Hourly billing only. Renders a small meta row when present. */
  hourlyRate?: string;
  totalDue: string;
}

export interface InvoicePaymentTerms {
  /** Terms label, e.g. "Net 15". */
  dueText: string;
  /** Optional explicit due date in human form, e.g. "May 15, 2026". */
  dueDate?: string;
  /** Comma-separated list, e.g. "Bank Transfer, ACH". */
  methods: string;
  /** Optional payment memo / reference to include on the wire. */
  paymentMemo?: string;
  /** Optional AP confirmation / remittance-advice email. */
  remittanceEmail?: string;
}

export interface InvoiceWireInstructions {
  beneficiaryName: string;
  beneficiaryAddress: string;
  accountNumber: string;
  abaRoutingNumber: string;
  accountType: string;
  bankName: string;
  bankAddress: string;
  /** Optional partnership / disclosure footnote rendered beneath the grid. */
  disclosure?: string;
}

export interface InvoiceValue {
  number: string;
  date: string;
  billingPeriod: string;
  billTo: InvoiceParty;
  from: InvoiceFromParty;
  /** Optional italic note above the line items (e.g. assumption summary). */
  servicesNote?: string;
  lineItems: InvoiceLineItem[];
  summary: InvoiceSummary;
  paymentTerms: InvoicePaymentTerms;
  /** Optional wire / ACH instructions block. Rendered below payment terms. */
  wire?: InvoiceWireInstructions;
  notes?: string;
}
