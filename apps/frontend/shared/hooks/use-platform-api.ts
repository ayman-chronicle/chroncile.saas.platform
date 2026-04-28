"use client";

import { useMemo } from "react";
import { createPlatformApi, type PlatformApi } from "platform-api";

import { useAuthSession } from "@/shared/auth/auth-session-provider";

export function usePlatformApi(): PlatformApi {
  const { session } = useAuthSession();

  return useMemo(
    () => createPlatformApi(() => session?.accessToken ?? null),
    [session?.accessToken],
  );
}
