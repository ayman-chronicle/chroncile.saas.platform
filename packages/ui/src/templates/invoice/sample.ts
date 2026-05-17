import type { InvoiceValue } from "./types";

/*
 * Reference invoice — mirrors the canonical INV-2026-04-10 example
 * (three weeks of professional services at 40 hr/wk x $100/hr).
 *
 * Used as the default payload for `yarn workspace ui invoice:pdf`
 * and as the visual fixture for the Templates/Invoice Storybook
 * story. Override by passing `--input <invoice.json>` to the PDF
 * script.
 */
export const sampleInvoice: InvoiceValue = {
  number: "INV-2026-04-10",
  date: "April 30, 2026",
  billingPeriod: "April 10 – April 30, 2026",
  billTo: {
    // The `name` field is treated as the AP department / contact role
    // in the renderer. Use a person's name here if you have one.
    name: "Accounts Payable",
    company: "Red Cat Holdings, Inc.",
    email: "accountspayable@redcat.red",
    address: "15 Av. Luis Muñoz Rivera Ste 5, San Juan, 00901, Puerto Rico",
  },
  from: {
    name: "Chronicle AI Labs, Inc.",
    address: "1301 North Broadway, Los Angeles, CA 90012, US",
    email: "ayman@chronicle-labs.com",
    phone: "+1 (732) 215-5454",
  },
  lineItems: [
    {
      description: "Enterprise Subscription Plan",
      period: "Apr 10 – Apr 16, 2026",
      amount: "$4,000",
    },
    {
      description: "Enterprise Subscription Plan",
      period: "Apr 17 – Apr 23, 2026",
      amount: "$4,000",
    },
    {
      description: "Enterprise Subscription Plan",
      period: "Apr 24 – Apr 30, 2026",
      amount: "$4,000",
    },
  ],
  summary: {
    totalDue: "$12,000",
  },
  paymentTerms: {
    dueText: "Net 15",
    dueDate: "May 15, 2026",
    methods: "Bank Transfer, ACH",
    paymentMemo: "INV-2026-04-10",
    remittanceEmail: "ayman@chronicle-labs.com",
  },
  wire: {
    beneficiaryName: "Chronicle AI Labs, Inc.",
    beneficiaryAddress: "1301 North Broadway, Los Angeles, CA 90012, US",
    accountNumber: "200002505641",
    abaRoutingNumber: "064209588",
    accountType: "Business Checking",
    bankName: "Thread Bank",
    bankAddress: "210 E Main St, Rogersville TN 37857",
  },
};
