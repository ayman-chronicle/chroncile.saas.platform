import type { Meta, StoryObj } from "@storybook/react";
import { Switch } from "./switch";

const meta: Meta<typeof Switch> = {
  title: "Primitives/Switch",
  component: Switch,
  parameters: { layout: "centered" },
};
export default meta;
type Story = StoryObj<typeof Switch>;

export const Default: Story = {
  render: () => (
    <div className="flex flex-col gap-s-3">
      <Switch>Record scenario on live capture</Switch>
      <Switch defaultSelected>Block deploy on divergence</Switch>
      <Switch isDisabled>Disabled toggle</Switch>
    </div>
  ),
};
