"use client";

import * as React from "react";
import { useResolvedChromeDensity } from "../theme/chrome-style-context";
import {
  ShadcnSkeleton,
  type ShadcnSkeletonProps,
} from "./shadcn";

export type SkeletonDensity = "compact" | "brand";

export interface SkeletonProps extends Omit<ShadcnSkeletonProps, "density"> {
  density?: SkeletonDensity;
}

export function Skeleton({
  density: densityProp,
  className,
  ...props
}: SkeletonProps) {
  const density = useResolvedChromeDensity(densityProp);
  return <ShadcnSkeleton className={className} density={density} {...props} />;
}
