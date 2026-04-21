import type { Meta, StoryObj } from "@storybook/react";
import { Tabs, TabList, Tab, TabPanel } from "./tabs";

const meta: Meta = {
  title: "Primitives/Tabs",
  parameters: { layout: "padded" },
};
export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => (
    <div className="w-[560px]">
      <Tabs defaultSelectedKey="events">
        <TabList aria-label="Dashboard">
          <Tab id="events">Events</Tab>
          <Tab id="runs">Runs</Tab>
          <Tab id="rules">Rules</Tab>
        </TabList>
        <TabPanel id="events">
          <div className="py-s-4">Events panel content</div>
        </TabPanel>
        <TabPanel id="runs">
          <div className="py-s-4">Runs panel content</div>
        </TabPanel>
        <TabPanel id="rules">
          <div className="py-s-4">Rules panel content</div>
        </TabPanel>
      </Tabs>
    </div>
  ),
};

export const Vertical: Story = {
  render: () => (
    <div className="w-[560px]">
      <Tabs orientation="vertical" defaultSelectedKey="general">
        <TabList aria-label="Settings">
          <Tab id="general">General</Tab>
          <Tab id="billing">Billing</Tab>
          <Tab id="members">Members</Tab>
        </TabList>
        <TabPanel id="general">
          <div className="px-s-4">General settings</div>
        </TabPanel>
        <TabPanel id="billing">
          <div className="px-s-4">Billing settings</div>
        </TabPanel>
        <TabPanel id="members">
          <div className="px-s-4">Members settings</div>
        </TabPanel>
      </Tabs>
    </div>
  ),
};
