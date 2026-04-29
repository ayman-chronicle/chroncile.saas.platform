import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../utils/cn";

export const skeletonVariants = cva("animate-chron-pulse", {
  variants: {
    density: {
      brand: "rounded-sm bg-surface-02",
      compact: "rounded-l bg-l-wash-3",
    },
  },
  defaultVariants: {
    density: "brand",
  },
});

export interface ShadcnSkeletonProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof skeletonVariants> {}

export const ShadcnSkeleton = React.forwardRef<
  HTMLDivElement,
  ShadcnSkeletonProps
>(({ className, density, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(skeletonVariants({ density }), className)}
    data-density={density}
    {...props}
  />
));

ShadcnSkeleton.displayName = "ShadcnSkeleton";
