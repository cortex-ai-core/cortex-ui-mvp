"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Display density for the chat surface.
 *   compact  - tighter spacing, smaller type, wider bubbles (default)
 *   relaxed  - roomier spacing and larger type
 *
 * Stored in this browser only (like the tone mode cache), and applied through
 * a `data-density` attribute that the CSS tokens in globals.css read.
 */
export type Density = "compact" | "relaxed";

export const DENSITY_KEY = "cortex_density";
export const DEFAULT_DENSITY: Density = "compact";

export function isDensity(value: unknown): value is Density {
  return value === "compact" || value === "relaxed";
}

function readStoredDensity(): Density {
  if (typeof window === "undefined") return DEFAULT_DENSITY;
  try {
    const stored = localStorage.getItem(DENSITY_KEY);
    return isDensity(stored) ? stored : DEFAULT_DENSITY;
  } catch {
    return DEFAULT_DENSITY;
  }
}

export function useDensity() {
  // Safe to read storage in the initializer: ChatClient is only mounted on
  // the client, after the auth token has been decoded.
  const [density, setDensityState] = useState<Density>(readStoredDensity);

  useEffect(() => {
    try {
      localStorage.setItem(DENSITY_KEY, density);
    } catch {
      /* storage unavailable; the in-memory value still applies */
    }
  }, [density]);

  const setDensity = useCallback((next: Density) => {
    if (isDensity(next)) setDensityState(next);
  }, []);

  return { density, setDensity };
}
