"use client";

import { useEffect, useRef } from "react";
import { useUIStore } from "@/lib/store/uiStore";

const STORAGE_KEY = "backdrop-theme";

/**
 * Bridges the UI store's `theme` to the outside world: on mount, restores a
 * saved preference (falling back to the OS's light/dark setting), and from
 * then on keeps `<html data-theme>` and localStorage in sync with the store
 * so every themed CSS variable in globals.css picks it up. Mount once, near
 * the app root.
 */
export function useThemeSync() {
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);
  const hasRestored = useRef(false);

  // Restore once on mount — a saved choice wins, otherwise defer to the
  // system preference so a first-time visitor sees what they'd expect.
  useEffect(() => {
    if (hasRestored.current) return;
    hasRestored.current = true;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "dark" || saved === "light") {
        setTheme(saved);
        return;
      }
    } catch {
      // Storage may be unavailable (private browsing, etc.) — fall through.
    }
    if (window.matchMedia?.("(prefers-color-scheme: light)").matches) {
      setTheme("light");
    }
  }, [setTheme]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Ignore — theme still applies for this session even if it can't persist.
    }
  }, [theme]);
}
