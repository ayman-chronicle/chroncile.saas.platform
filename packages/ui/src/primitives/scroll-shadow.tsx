"use client";

/*
 * ScrollShadow — wraps a scrollable region and shows fade gradients at
 * the leading/trailing edges only when content is clipped in that
 * direction. Pure CSS + a tiny IntersectionObserver, no RAC dependency.
 */

import * as React from "react";
import type { VariantProps } from "class-variance-authority";
import {
  scrollShadowContainerVariants,
  scrollShadowEndVariants,
  scrollShadowRootVariants,
  scrollShadowStartVariants,
} from "./shadcn";

type ScrollShadowVariantProps = VariantProps<typeof scrollShadowStartVariants>;

export interface ScrollShadowProps
  extends React.HTMLAttributes<HTMLDivElement>, ScrollShadowVariantProps {
  orientation?: "vertical" | "horizontal";
  /** Tailwind class for the scroll container (e.g. max-h-[320px]). */
  containerClassName?: string;
}

export function ScrollShadow({
  orientation = "vertical",
  className,
  containerClassName,
  children,
  ...props
}: ScrollShadowProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [showStart, setShowStart] = React.useState(false);
  const [showEnd, setShowEnd] = React.useState(false);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onScroll = () => {
      if (orientation === "vertical") {
        setShowStart(el.scrollTop > 1);
        setShowEnd(el.scrollHeight - el.clientHeight - el.scrollTop > 1);
      } else {
        setShowStart(el.scrollLeft > 1);
        setShowEnd(el.scrollWidth - el.clientWidth - el.scrollLeft > 1);
      }
    };
    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    const ro = new ResizeObserver(onScroll);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", onScroll);
      ro.disconnect();
    };
  }, [orientation]);

  return (
    <div className={scrollShadowRootVariants({ className })} {...props}>
      <div
        ref={containerRef}
        className={scrollShadowContainerVariants({
          className: containerClassName,
        })}
      >
        {children}
      </div>
      <div
        aria-hidden
        className={scrollShadowStartVariants({ orientation })}
        style={{ opacity: showStart ? 1 : 0 }}
      />
      <div
        aria-hidden
        className={scrollShadowEndVariants({ orientation })}
        style={{ opacity: showEnd ? 1 : 0 }}
      />
    </div>
  );
}
