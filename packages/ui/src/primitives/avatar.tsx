"use client";

import * as React from "react";

import type { VariantProps } from "class-variance-authority";
import { useResolvedChromeDensity } from "../theme/chrome-style-context";
import {
  avatarFallbackVariants,
  avatarImageVariants,
  avatarRootVariants,
} from "./shadcn";

/*
 * Avatar — image with fallback initials. Intentionally simple: we don't
 * need the full Radix Avatar state machine here since our use cases
 * (sidebar user card, workspace switcher) already know when they have
 * an image URL vs. when they should fall back to initials. When an
 * image is provided the component still renders initials as a fallback
 * via the `alt` + error handling.
 */

export type AvatarDensity = "compact" | "brand";

type AvatarVariantProps = VariantProps<typeof avatarRootVariants>;

export interface AvatarProps
  extends React.HTMLAttributes<HTMLSpanElement>, AvatarVariantProps {
  /** Image URL. If absent or fails to load, initials render instead. */
  src?: string | null;
  /** Accessible label for the image (or decorative alt fallback). */
  alt?: string;
  /** Explicit initials override. Otherwise computed from `name`. */
  initials?: string;
  /** Full name used to derive initials when `initials` isn't passed. */
  name?: string;
  density?: AvatarDensity;
}

function deriveInitials(
  name: string | undefined,
  override: string | undefined
): string {
  if (override) return override.slice(0, 2).toUpperCase();
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return (parts[0]?.[0] ?? "?").toUpperCase();
  return (
    (parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")
  ).toUpperCase();
}

export function Avatar({
  src,
  alt = "",
  initials,
  name,
  size,
  shape,
  tone,
  density: densityProp,
  className,
  ...props
}: AvatarProps) {
  const density = useResolvedChromeDensity(densityProp);
  const [imageFailed, setImageFailed] = React.useState(false);
  const showImage = Boolean(src) && !imageFailed;
  const resolvedInitials = deriveInitials(name, initials);

  return (
    <span
      className={avatarRootVariants({ size, shape, tone, density, className })}
      {...props}
    >
      {showImage ? (
        <img
          src={src ?? undefined}
          alt={alt}
          className={avatarImageVariants()}
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span
          className={avatarFallbackVariants({ density })}
          aria-hidden={Boolean(alt)}
        >
          {resolvedInitials}
        </span>
      )}
    </span>
  );
}
