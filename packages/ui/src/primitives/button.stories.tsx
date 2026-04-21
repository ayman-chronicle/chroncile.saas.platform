import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./button";

const meta: Meta<typeof Button> = {
  title: "Primitives/Button",
  component: Button,
  parameters: { layout: "centered" },
  argTypes: {
    variant: {
      control: "select",
      options: ["primary", "secondary", "ember", "ghost", "critical"],
    },
    size: { control: "radio", options: ["sm", "md", "lg"] },
    isLoading: { control: "boolean" },
    disabled: { control: "boolean" },
  },
  args: { variant: "primary", size: "md", children: "Run replay" },
};
export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = { args: { variant: "primary" } };
export const Secondary: Story = { args: { variant: "secondary" } };
export const Ember: Story = {
  args: { variant: "ember", children: "⚡ Inject" },
};
export const Ghost: Story = {
  args: { variant: "ghost", children: "All sources" },
};
export const Critical: Story = {
  args: { variant: "critical", children: "Block deploy" },
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-s-3">
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
    </div>
  ),
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-s-3">
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ember">Ember</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="critical">Critical</Button>
      <Button variant="primary" isLoading>
        Loading…
      </Button>
      <Button variant="primary" disabled>
        Disabled
      </Button>
    </div>
  ),
};
