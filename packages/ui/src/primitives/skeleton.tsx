"use client";

import * as React from "react";
import { tv } from "../utils/tv";

const skeleton = tv({
  base: "animate-chron-pulse rounded-sm bg-surface-02",
});

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return <div className={skeleton({ className })} {...props} />;
}
