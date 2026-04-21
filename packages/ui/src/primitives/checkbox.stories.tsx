import type { Meta, StoryObj } from "@storybook/react";
import { Checkbox } from "./checkbox";

const meta: Meta<typeof Checkbox> = {
  title: "Primitives/Checkbox",
  component: Checkbox,
  parameters: { layout: "centered" },
};
export default meta;
type Story = StoryObj<typeof Checkbox>;

export const Default: Story = {
  render: () => (
    <div className="flex flex-col gap-s-3">
      <label className="flex items-center gap-s-2 font-mono text-mono text-ink-lo">
        <Checkbox defaultChecked />
        Record scenario on live capture
      </label>
      <label className="flex items-center gap-s-2 font-mono text-mono text-ink-lo">
        <Checkbox />
        Block deploy on any divergence
      </label>
      <label className="flex items-center gap-s-2 font-mono text-mono text-ink-lo">
        <Checkbox disabled />
        Disabled option
      </label>
    </div>
  ),
};
