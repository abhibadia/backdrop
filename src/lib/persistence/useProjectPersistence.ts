"use client";

import { useEffect, useState } from "react";
import { loadPersistedProject, startAutosave } from "./autosave";

/**
 * Loads any persisted project from IndexedDB on mount, then keeps the
 * project store autosaved thereafter. Returns true once the initial load
 * attempt has finished (whether or not a project was found).
 */
export function useProjectPersistence(): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let stopAutosave: (() => void) | null = null;

    loadPersistedProject().finally(() => {
      if (cancelled) return;
      stopAutosave = startAutosave();
      setReady(true);
    });

    return () => {
      cancelled = true;
      stopAutosave?.();
    };
  }, []);

  return ready;
}
