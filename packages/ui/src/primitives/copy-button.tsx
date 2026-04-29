"use client";

import * as React from "react";

import { cn } from "../utils/cn";
import { useResolvedChromeDensity } from "../theme/chrome-style-context";
import { copyButtonVariants } from "./shadcn";

export interface CopyButtonProps extends Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "className" | "children"
> {
  text: string;
  /** Milliseconds the "copied" confirmation stays visible. */
  confirmFor?: number;
  /** Force a density flavor. Defaults to whichever the surrounding
   * `ChromeStyleProvider` resolves to. */
  density?: "compact" | "brand";
  /** Render as an icon button (default) or a compact text action. */
  appearance?: "icon" | "text";
  label?: string;
  copiedLabel?: string;
  className?: string;
  ref?: React.Ref<HTMLButtonElement>;
}

export function CopyButton({
  text,
  confirmFor = 2000,
  density: densityProp,
  appearance = "icon",
  label = "Copy",
  copiedLabel = "Copied",
  className,
  onClick,
  ref,
  type,
  ...props
}: CopyButtonProps) {
  const [copied, setCopied] = React.useState(false);
  const density = useResolvedChromeDensity(densityProp);
  const timeoutRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleCopy = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(
        () => setCopied(false),
        confirmFor
      );
    } catch {
      // Clipboard API unavailable — silently noop. Caller can rely on the
      // button never flipping to "copied" to surface an error path.
    }
  }, [text, confirmFor]);

  return (
    <button
      {...props}
      ref={ref}
      type={type ?? "button"}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) void handleCopy();
      }}
      aria-label={copied ? "Copied" : "Copy to clipboard"}
      data-density={density}
      className={cn(copyButtonVariants({ appearance, density, copied }), className)}
    >
      {appearance === "text" ? (
        copied ? (
          copiedLabel
        ) : (
          label
        )
      ) : copied ? (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className={density === "compact" ? "h-3.5 w-3.5" : "h-4 w-4"}
        >
          <path
            d="M4.5 12.75l6 6 9-13.5"
            stroke="currentColor"
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className={density === "compact" ? "h-3.5 w-3.5" : "h-4 w-4"}
        >
          <rect
            x="8"
            y="8"
            width="12"
            height="12"
            rx="2"
            stroke="currentColor"
            strokeWidth={1.5}
          />
          <path
            d="M4 16V6a2 2 0 0 1 2-2h10"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
          />
        </svg>
      )}
    </button>
  );
}
