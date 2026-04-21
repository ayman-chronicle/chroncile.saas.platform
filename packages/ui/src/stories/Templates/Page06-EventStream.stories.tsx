import type { Meta, StoryObj } from "@storybook/react";
import * as React from "react";
import { AppShell } from "../../layout/app-shell";
import { PageHeader } from "../../layout/page-header";
import { ChronHeader } from "../../layout/chron-header";
import { Button } from "../../primitives/button";
import { EventStream, type EventStreamItem } from "../../product/event-stream";
import { Minimap, generateMinimapBars } from "../../product/minimap";
import { StatusDot } from "../../primitives/status-dot";
import { Eyebrow } from "../../primitives/eyebrow";
import { Display } from "../../typography/display";
import { Mono } from "../../typography/mono";

const items: EventStreamItem[] = [
  { id: "1", time: "14:04:41", lane: "teal", topic: "support.conversation", verb: "created", preview: '"My last order never arrived. It&apos;s been almost two weeks." — Sarah Chen', source: "intercom" },
  { id: "2", time: "14:06:02", lane: "amber", topic: "shopify.order", verb: "lookup", preview: '{ order_id: "8821", status: "delivered", delivered_at: "2026-02-12T16:22Z" }', source: "shopify" },
  { id: "3", time: "14:06:41", lane: "green", topic: "agent.response", verb: "generated", preview: '"Your order was delivered last Thursday. Can you confirm the shipping address?"', source: "support-ai" },
  { id: "4", time: "14:09:18", lane: "teal", topic: "support.message", verb: "received", preview: '"The address is wrong. Says \'Main St\' but I live on Maine St."', source: "intercom" },
  { id: "5", time: "14:09:41", lane: "orange", topic: "ops.alert", verb: "triggered", preview: "sentiment_drop detected · customer_health: 0.82 → 0.31 over 3 turns", source: "ops" },
  { id: "6", time: "14:10:02", lane: "pink", topic: "agent.tool.invoke → escalate", preview: "Handing off to human agent · reason: shipping_error · tier: priority", source: "support-ai" },
  { id: "7", time: "14:10:22", lane: "pink", topic: "slack.channel", verb: "post", preview: "#shipping-issues · new priority escalation from support-ai", source: "slack" },
  { id: "8", time: "14:11:08", lane: "green", topic: "stripe.refund", verb: "created", preview: "re_3Nf8q2L · $84.00 · order_id=8821 · initiated_by=agent_maria", source: "stripe" },
];

function NavItem({
  children,
  lane,
  count,
  active = false,
}: {
  children: React.ReactNode;
  lane?: React.ComponentProps<typeof StatusDot>["variant"];
  count?: React.ReactNode;
  active?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-s-3 rounded-xs px-s-3 py-s-2 font-mono text-mono ${active ? "bg-surface-03 text-ink-hi" : "text-ink-lo"}`}
    >
      <StatusDot
        variant={lane ?? "offline"}
        className="opacity-100"
      />
      <span>{children}</span>
      {count ? (
        <span className="ml-auto text-mono-sm text-ink-dim">{count}</span>
      ) : null}
    </div>
  );
}

function TopBar() {
  return (
    <>
      <span className="flex items-center gap-s-2 px-s-2 font-display text-[13px] text-ink-hi">
        <span
          className="h-[6px] w-[6px] rounded-full"
          style={{ background: "var(--grad-lightsource)" }}
        />
        Chronicle
      </span>
      <Mono size="md" tone="dim" tactical className="flex items-center gap-s-3">
        <span>support-agent-v3</span>
        <span className="text-ink-dim">/</span>
        <b className="text-ink-lo font-normal">Live stream</b>
        <span className="text-ink-dim">/</span>
        <span>trace_9f8a22</span>
      </Mono>
      <div className="ml-auto flex items-center gap-s-4">
        <span className="chron-status-live">LIVE · 1,248 ev/s</span>
        <Button variant="secondary" size="sm">
          Pause capture
        </Button>
        <Button variant="primary" size="sm">
          ▶ Run replay
        </Button>
        <div
          className="h-[28px] w-[28px] rounded-full"
          style={{ background: "var(--grad-lightsource-45)" }}
        />
      </div>
    </>
  );
}

function Nav() {
  return (
    <div className="flex flex-col gap-s-3">
      <Eyebrow className="px-s-3">Workspace</Eyebrow>
      <NavItem>Overview</NavItem>
      <NavItem active count="12.8k">
        Event stream
      </NavItem>
      <NavItem count="24">Replay suite</NavItem>
      <NavItem count={<span className="text-event-red">2</span>}>
        Divergences
      </NavItem>
      <NavItem count="8">Scenarios</NavItem>
      <Eyebrow className="mt-s-5 px-s-3">Streams</Eyebrow>
      <NavItem lane="teal" count="412">intercom</NavItem>
      <NavItem lane="amber" count="308">shopify</NavItem>
      <NavItem lane="green" count="221">stripe</NavItem>
      <NavItem lane="orange" count="89">ops</NavItem>
      <NavItem lane="pink" count="140">slack</NavItem>
      <NavItem lane="violet" count="18">sandbox</NavItem>
    </div>
  );
}

function Detail() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-hairline p-s-5">
        <Eyebrow className="mb-s-2 block">EVENT · agent.tool.invoke</Eyebrow>
        <Display size="sm" muted={false}>
          escalate(<em className="italic font-normal text-ember">"shipping_error"</em>)
        </Display>
        <div className="mt-s-4 flex flex-wrap gap-s-4">
          {[
            ["at", "14:10:02.418"],
            ["source", "support-ai"],
            ["trace", "cus_demo_01"],
            ["version", "v3.0.4"],
          ].map(([k, v]) => (
            <Mono key={k} size="sm" tactical uppercase tone="dim">
              {k} <b className="text-ink-lo font-normal">{v}</b>
            </Mono>
          ))}
        </div>
      </div>
      <nav className="flex gap-s-6 border-b border-hairline px-s-5">
        {["Trace", "Payload", "Causality", "Diff"].map((t, i) => (
          <button
            key={t}
            className={`py-s-3 font-mono text-mono uppercase tracking-tactical ${i === 0 ? "border-b border-ember text-ink-hi" : "text-ink-dim"} border-b`}
          >
            {t}
          </button>
        ))}
      </nav>
      <div className="flex-1 overflow-auto p-s-5">
        <pre className="m-0 whitespace-pre-wrap rounded-xs border border-hairline bg-surface-00 p-s-4 font-mono text-[11.5px] leading-[1.7] text-ink-lo">
{`// resolved context at call-site
{
  "tool": "escalate",
  "args": {
    "reason": "shipping_error",
    "tier": "priority",
    "trace_id": "cus_demo_01"
  },
  "prompt_tokens": 1842,
  "emitted_by": support-agent-v3.reasoner
}`}
        </pre>
      </div>
    </div>
  );
}

function Page06() {
  const [sel, setSel] = React.useState("6");
  const [playing, setPlaying] = React.useState(false);

  return (
    <div className="min-h-screen bg-page">
      <ChronHeader />
      <div className="px-[72px] pb-[80px] pt-[16px] text-ink">
        <PageHeader
          eyebrow="06 / 07"
          title="Product — Event Stream"
          lede="The core surface. Heterogeneous events from every source land on one rail, colored by stream. Selecting an event opens the full causal trace on the right."
        />
        <AppShell
          topbar={<TopBar />}
          nav={<Nav />}
          detail={<Detail />}
          footer={
            <Minimap
              bars={generateMinimapBars()}
              playhead={38}
              range={[22, 56]}
              onPlay={() => setPlaying((p) => !p)}
              playing={playing}
              readoutLeft={
                <>
                  Replay · <b className="text-ink-hi font-normal">turn 06 / 11</b>
                </>
              }
              readoutRight={
                <>
                  <b className="text-ink-hi font-normal">14:10:02</b> → 14:12:04
                </>
              }
            />
          }
          style={{ height: 820 }}
        >
          <EventStream
            items={items}
            selectedId={sel}
            onSelect={setSel}
            daySeparator="Today · Feb 18 2026"
          />
        </AppShell>
      </div>
    </div>
  );
}

const meta: Meta<typeof Page06> = {
  title: "Templates/Page 06 — Event Stream",
  component: Page06,
  parameters: { layout: "fullscreen" },
};
export default meta;
type Story = StoryObj<typeof Page06>;

export const Canvas: Story = { render: () => <Page06 /> };
