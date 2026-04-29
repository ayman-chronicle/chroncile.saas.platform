import type { Meta, StoryObj } from "@storybook/react";
import type * as React from "react";

import { EnvCard } from "./env-card";

const meta = {
  title: "Env Manager/EnvCard",
  component: EnvCard,
  parameters: { layout: "padded" },
  argTypes: {
    type: {
      control: "select",
      options: ["prod", "stg", "dev", "local", "ephemeral"],
    },
    title: { control: "text" },
    meta: { control: "text" },
    badgeLabel: { control: "text" },
  },
  args: {
    type: "ephemeral",
    title: "invite-flow · pr-1276",
    meta: "feature/invite-flow · 8f3a91c",
  },
} satisfies Meta<typeof EnvCard>;

export default meta;
type Story = StoryObj<typeof EnvCard>;

function CardDemo() {
  return (
    <div className="grid max-w-[900px] grid-cols-1 gap-s-4 md:grid-cols-2">
      <EnvCard type="prod" title="production" meta="main · 9f81abc">
        <EnvCard.Hosts>
          <EnvCard.HostRow label="Backend" value="api.chroniclelabs.io" />
          <EnvCard.HostRow label="Frontend" value="app.chroniclelabs.io" />
        </EnvCard.Hosts>
        <EnvCard.Footer>
          <EnvCard.Health>healthy</EnvCard.Health>
          <EnvCard.Ttl>permanent</EnvCard.Ttl>
        </EnvCard.Footer>
      </EnvCard>
      <EnvCard
        type="ephemeral"
        title="invite-flow · pr-1276"
        meta="feature/invite-flow · 8f3a91c"
      >
        <EnvCard.Hosts>
          <EnvCard.HostRow label="Backend" value="chronicle-pr-1276.fly.dev" />
          <EnvCard.HostRow label="Frontend" />
        </EnvCard.Hosts>
        <EnvCard.Footer>
          <EnvCard.Health status="warning">provisioning</EnvCard.Health>
          <EnvCard.Ttl>18h remaining</EnvCard.Ttl>
        </EnvCard.Footer>
      </EnvCard>
    </div>
  );
}

function ControlledCard(
  args: Omit<React.ComponentProps<typeof EnvCard>, "children">
) {
  return (
    <div className="max-w-[420px]">
      <EnvCard {...args}>
        <EnvCard.Hosts>
          <EnvCard.HostRow label="Backend" value="chronicle-pr-1276.fly.dev" />
          <EnvCard.HostRow label="Frontend" />
        </EnvCard.Hosts>
        <EnvCard.Footer>
          <EnvCard.Health status="warning">provisioning</EnvCard.Health>
          <EnvCard.Ttl>18h remaining</EnvCard.Ttl>
        </EnvCard.Footer>
      </EnvCard>
    </div>
  );
}

export const Default: Story = {
  render: (args) => <ControlledCard {...args} />,
};

export const Gallery: Story = {
  render: () => <CardDemo />,
};
