import type { Meta, StoryObj } from "@storybook/react";
import { Avatar } from "./avatar";

const meta: Meta<typeof Avatar> = {
  title: "Primitives/Avatar",
  component: Avatar,
  parameters: { layout: "centered" },
  argTypes: {
    size: { control: "radio", options: ["xs", "sm", "md", "lg", "xl"] },
    shape: { control: "radio", options: ["circle", "square"] },
    tone: { control: "radio", options: ["neutral", "ember", "teal", "violet"] },
  },
  args: { name: "Ayman Saleh", size: "md", shape: "circle", tone: "neutral" },
};
export default meta;
type Story = StoryObj<typeof Avatar>;

export const Initials: Story = {};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-end gap-s-3">
      <Avatar name="Ayman Saleh" size="xs" />
      <Avatar name="Ayman Saleh" size="sm" />
      <Avatar name="Ayman Saleh" size="md" />
      <Avatar name="Ayman Saleh" size="lg" />
      <Avatar name="Ayman Saleh" size="xl" />
    </div>
  ),
};

export const Tones: Story = {
  render: () => (
    <div className="flex items-center gap-s-3">
      <Avatar name="Acme Inc" tone="neutral" />
      <Avatar name="Ember Inc" tone="ember" />
      <Avatar name="Teal Co" tone="teal" />
      <Avatar name="Violet Lab" tone="violet" />
    </div>
  ),
};
