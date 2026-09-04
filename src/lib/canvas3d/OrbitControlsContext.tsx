"use client";

import { createContext, useContext } from "react";

interface OrbitControlsContextValue {
  /** Temporarily disables/re-enables the scene's OrbitControls (used while dragging an object). */
  setControlsEnabled: (enabled: boolean) => void;
}

const OrbitControlsCtx = createContext<OrbitControlsContextValue>({
  setControlsEnabled: () => {},
});

export const OrbitControlsProvider = OrbitControlsCtx.Provider;

export function useOrbitControlsToggle(): OrbitControlsContextValue {
  return useContext(OrbitControlsCtx);
}
