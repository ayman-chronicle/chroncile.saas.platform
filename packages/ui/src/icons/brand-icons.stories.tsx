import type { Meta, StoryObj } from "@storybook/react";
import {
  BrandIcon,
  BRAND_ICON_DOMAINS,
  BRAND_ICON_IDS,
  getLogoDevUrl,
} from "./brand-icons";

const STORYBOOK_LOGO_DEV_TOKEN = "pk_KUdn1PMmSYCZmOzzW8W04A";

const meta: Meta<typeof BrandIcon> = {
  title: "Icons/BrandIcon",
  component: BrandIcon,
  parameters: { layout: "padded" },
  argTypes: {
    id: { control: "select", options: BRAND_ICON_IDS },
    radius: { control: "text" },
    requestSize: { control: { type: "number", min: 16, max: 512 } },
    rounded: { control: "boolean" },
    size: { control: { type: "number", min: 12, max: 96 } },
    token: { control: "text" },
  },
  args: {
    fallbackColor: "var(--c-ink-hi)",
    id: "slack",
    requestSize: 128,
    rounded: true,
    size: 32,
    token: STORYBOOK_LOGO_DEV_TOKEN,
  },
};
export default meta;
type Story = StoryObj<typeof BrandIcon>;

export const Default: Story = {
  render: (args) => <BrandIcon {...args} />,
};

export const FallbackProof: Story = {
  render: () => (
    <div className="flex items-center gap-s-3 rounded-sm border border-hairline bg-surface-01 p-s-4 text-ink-hi">
      <BrandIcon
        id="intercom"
        size={48}
        rounded
        fallbackColor="var(--c-ink-hi)"
        fallbackBackground="var(--c-surface-03)"
      />
      <span className="font-sans text-label-sm">
        BrandIcon fallback rendered without a Logo.dev token.
      </span>
    </div>
  ),
};

export const Catalog: Story = {
  args: {
    size: 3000,
    format: "png",
    radius: "35",
  },

  render: (args) => (
    <div className="grid grid-cols-4 gap-s-4">
      {BRAND_ICON_IDS.map((id) => (
        <div
          key={id}
          className="flex flex-col items-center gap-s-2 rounded-sm border border-hairline bg-surface-01 p-s-4"
        >
          <BrandIcon
            {...args}
            id={id}
            rounded={args.rounded}
            radius={args.radius}
            size={32}
            fallbackColor="var(--c-ink-hi)"
            token={STORYBOOK_LOGO_DEV_TOKEN}
          />
          <span className="font-mono text-mono-sm uppercase tracking-tactical text-ink-dim">
            {id}
          </span>
        </div>
      ))}
    </div>
  ),
};

export const RoundedVariants: Story = {
  args: {
    size: 100,
  },

  render: (args) => (
    <div className="flex items-center gap-s-4 rounded-sm border border-hairline bg-surface-01 p-s-4">
      <BrandIcon {...args} id="intercom" rounded={false} radius={0} size={48} />
      <BrandIcon {...args} id="slack" radius={12} size={48} />
      <BrandIcon {...args} id="snowflake" rounded size={48} />
    </div>
  ),
};

export const LogoDevUrls: Story = {
  render: () => (
    <div className="space-y-s-2 font-mono text-mono-sm text-ink-dim">
      {BRAND_ICON_IDS.slice(0, 6).map((id) => (
        <div key={id}>
          {getLogoDevUrl(BRAND_ICON_DOMAINS[id], {
            requestSize: 128,
            token: STORYBOOK_LOGO_DEV_TOKEN,
          })}
        </div>
      ))}
    </div>
  ),
};
