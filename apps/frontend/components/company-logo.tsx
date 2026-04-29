"use client";

import * as React from "react";
import Image, { type ImageProps } from "next/image";
import { Building2, type LucideIcon } from "lucide-react";
import {
  getBrandIconDomain,
  getBrandIconId,
  getLogoDevUrl,
} from "ui";

export interface CompanyLogoProps
  extends Omit<ImageProps, "alt" | "height" | "src" | "width"> {
  name: string;
  domain?: string;
  alt?: string;
  fallbackIcon?: LucideIcon;
  fallbackColor?: string;
  size?: number;
  token?: string;
  rounded?: boolean;
  radius?: React.CSSProperties["borderRadius"];
}

export function CompanyLogo({
  name,
  domain,
  alt = `${name} logo`,
  fallbackIcon: FallbackIcon = Building2,
  fallbackColor = "currentColor",
  size = 128,
  token = process.env.NEXT_PUBLIC_LOGO_DEV_PUBLISHABLE_KEY,
  rounded = false,
  radius,
  className,
  onError,
  style,
  ...rest
}: CompanyLogoProps) {
  const resolvedDomain = domain ?? getBrandIconDomain(name);
  const canLoadRemoteLogo = Boolean(token && resolvedDomain);
  const [failed, setFailed] = React.useState(!canLoadRemoteLogo);
  const imageBorderRadius = radius ?? (rounded ? "999px" : undefined);
  const imageStyle = imageBorderRadius
    ? { ...style, borderRadius: imageBorderRadius }
    : style;
  const fallbackBorderRadius =
    radius ?? (rounded ? "999px" : style?.borderRadius ?? "999px");

  React.useEffect(() => {
    setFailed(!canLoadRemoteLogo);
  }, [canLoadRemoteLogo]);

  if (failed || !canLoadRemoteLogo || !resolvedDomain) {
    return (
      <span
        aria-label={alt}
        className={className}
        role="img"
        style={{
          alignItems: "center",
          background: "var(--surface-2, rgba(0, 0, 0, 0.06))",
          color: fallbackColor,
          display: "inline-flex",
          height: size,
          justifyContent: "center",
          width: size,
          ...style,
          borderRadius: fallbackBorderRadius,
        }}
      >
        <FallbackIcon aria-hidden size={size / 2} strokeWidth={1.75} />
      </span>
    );
  }

  return (
    <Image
      alt={alt}
      className={className}
      height={size}
      src={getLogoDevUrl(resolvedDomain, { token })}
      style={imageStyle}
      width={size}
      onError={(event) => {
        setFailed(true);
        onError?.(event);
      }}
      {...rest}
    />
  );
}
