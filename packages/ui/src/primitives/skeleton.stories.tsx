import type { Meta, StoryObj } from "@storybook/react";
import { Skeleton } from "./skeleton";

const meta: Meta<typeof Skeleton> = {
  title: "Primitives/Skeleton",
  component: Skeleton,
  parameters: { layout: "padded" },
};
export default meta;
type Story = StoryObj<typeof Skeleton>;

export const Default: Story = {
  render: () => (
    <div className="flex flex-col gap-s-3 w-[420px]">
      <Skeleton className="h-[24px] w-3/4" />
      <Skeleton className="h-[14px] w-full" />
      <Skeleton className="h-[14px] w-5/6" />
      <Skeleton className="h-[14px] w-2/3" />
    </div>
  ),
};
