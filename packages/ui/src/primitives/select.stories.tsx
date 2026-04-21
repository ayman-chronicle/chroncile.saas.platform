import type { Meta, StoryObj } from "@storybook/react";
import { Select, SelectItem, SelectSection } from "./select";
import { NativeSelect } from "./native-select";

const meta: Meta<typeof Select> = {
  title: "Primitives/Select",
  component: Select,
  parameters: { layout: "padded" },
};
export default meta;
type Story = StoryObj<typeof Select>;

export const Default: Story = {
  render: () => (
    <div className="w-[280px]">
      <Select defaultSelectedKey="intercom" placeholder="Pick a source">
        <SelectItem id="intercom">Intercom</SelectItem>
        <SelectItem id="shopify">Shopify</SelectItem>
        <SelectItem id="stripe">Stripe</SelectItem>
        <SelectItem id="slack">Slack</SelectItem>
        <SelectItem id="sandbox">Sandbox</SelectItem>
      </Select>
    </div>
  ),
};

export const WithSections: Story = {
  render: () => (
    <div className="w-[280px]">
      <Select placeholder="Select integration">
        <SelectSection title="Support">
          <SelectItem id="intercom">Intercom</SelectItem>
          <SelectItem id="zendesk">Zendesk</SelectItem>
        </SelectSection>
        <SelectSection title="Commerce">
          <SelectItem id="shopify">Shopify</SelectItem>
          <SelectItem id="stripe">Stripe</SelectItem>
        </SelectSection>
        <SelectSection title="Workspace">
          <SelectItem id="slack">Slack</SelectItem>
        </SelectSection>
      </Select>
    </div>
  ),
};

export const Invalid: Story = {
  render: () => (
    <div className="w-[280px]">
      <Select invalid placeholder="Required">
        <SelectItem id="a">A</SelectItem>
        <SelectItem id="b">B</SelectItem>
      </Select>
    </div>
  ),
};

export const NativeSelectLegacy: StoryObj<typeof NativeSelect> = {
  name: "NativeSelect (legacy)",
  render: () => (
    <div className="w-[280px]">
      <NativeSelect defaultValue="intercom">
        <option value="intercom">intercom</option>
        <option value="shopify">shopify</option>
        <option value="stripe">stripe</option>
      </NativeSelect>
    </div>
  ),
};
