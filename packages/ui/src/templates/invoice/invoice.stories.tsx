import type { Meta, StoryObj } from "@storybook/react";
import * as React from "react";

import { Invoice } from "./invoice";
import { sampleInvoice } from "./sample";

/*
 * Templates / Invoice
 *
 * Paper-sized invoice document — the visual reference for
 * `yarn workspace ui invoice:pdf`. Both stories force a paper-tuned
 * surface so the canvas mirrors what Playwright sees during the
 * PDF render.
 *
 *  - Default (Light, Filled)  — printable preview with all party
 *    fields populated; this is what the production PDF looks like.
 *  - Blank (Light, Empty)     — exactly the wireframe from the spec,
 *    with em-dash placeholders for the bill-to / from blocks.
 *  - Dark                     — same invoice on the product canvas,
 *    handy for confirming dark-theme rendering for in-app preview.
 */

const meta: Meta<typeof Invoice> = {
  title: "Templates/Invoice",
  component: Invoice,
  parameters: { layout: "fullscreen" },
};
export default meta;
type Story = StoryObj<typeof Invoice>;

const filled = {
  ...sampleInvoice,
  billTo: {
    name: "Jordan Avery",
    company: "Northwind Goods, Inc.",
    address: "1450 Mission Street, San Francisco, CA 94103",
  },
  from: {
    name: "Chronicle Labs",
    address: "548 Market Street #54620, San Francisco, CA 94104",
    email: "billing@chroniclelabs.com",
    phone: "+1 (415) 555-0142",
  },
};

const PaperFrame: React.FC<React.PropsWithChildren<{ light?: boolean }>> = ({
  light = true,
  children,
}) => (
  <div
    data-theme={light ? "light" : "dark"}
    className="min-h-screen w-full bg-wash-1 py-s-8 overflow-y-auto"
  >
    <div className="shadow-card mx-auto bg-page w-fit">{children}</div>
  </div>
);

export const Default: Story = {
  name: "Light (Filled)",
  render: () => (
    <PaperFrame>
      <Invoice value={filled} surface="light" />
    </PaperFrame>
  ),
};

export const Blank: Story = {
  name: "Light (Blank)",
  render: () => (
    <PaperFrame>
      <Invoice value={sampleInvoice} surface="light" />
    </PaperFrame>
  ),
};

export const Dark: Story = {
  name: "Dark",
  render: () => (
    <PaperFrame light={false}>
      <Invoice value={filled} surface="dark" />
    </PaperFrame>
  ),
};
