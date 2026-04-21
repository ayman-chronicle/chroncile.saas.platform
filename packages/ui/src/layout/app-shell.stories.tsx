import type { Meta, StoryObj } from "@storybook/react";
import { AppShell } from "./app-shell";

const meta: Meta<typeof AppShell> = {
  title: "Layout/AppShell",
  component: AppShell,
  parameters: { layout: "fullscreen" },
};
export default meta;
type Story = StoryObj<typeof AppShell>;

export const ThreeColumn: Story = {
  render: () => (
    <div className="p-s-10">
      <AppShell
        style={{ height: 720 }}
        topbar={
          <>
            <span className="font-display text-[13px] text-ink-hi">
              Chronicle
            </span>
            <span className="font-mono text-mono text-ink-dim">
              support-agent-v3 / <b className="text-ink-lo font-normal">Live stream</b>
            </span>
          </>
        }
        nav={
          <div className="flex flex-col gap-s-2 font-mono text-mono text-ink-lo">
            <span>Overview</span>
            <span className="text-ink-hi">Event stream</span>
            <span>Replay suite</span>
          </div>
        }
        detail={
          <div className="p-s-5">
            <div className="font-mono text-mono uppercase tracking-eyebrow text-ink-dim">
              EVENT
            </div>
            <div className="mt-s-2 font-display text-title-sm text-ink-hi">
              escalate(shipping_error)
            </div>
          </div>
        }
      >
        <div className="flex-1 p-s-5 font-mono text-mono text-ink-lo">
          Event stream area
        </div>
      </AppShell>
    </div>
  ),
};
