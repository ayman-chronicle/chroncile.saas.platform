import type { Meta, StoryObj } from "@storybook/react";
import { CopyButton } from "./copy-button";

const meta: Meta<typeof CopyButton> = {
  title: "Primitives/CopyButton",
  component: CopyButton,
  parameters: { layout: "centered" },
  args: { text: "trace_cus_demo_01" },
};
export default meta;
type Story = StoryObj<typeof CopyButton>;

export const Default: Story = {
  render: (args) => (
    <div className="flex items-center gap-s-3">
      <code className="font-mono text-mono-lg text-ink-hi">{args.text}</code>
      <CopyButton {...args} />
    </div>
  ),
};

export const TextAction: Story = {
  args: { appearance: "text", label: "Copy", copiedLabel: "Copied" },
  render: (args) => (
    <div className="rounded-md border border-hairline bg-surface-01 p-s-4">
      <CopyButton {...args} />
    </div>
  ),
};
