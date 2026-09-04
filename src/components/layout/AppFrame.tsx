"use client";

import { ReactNode } from "react";
import { Topbar } from "./Topbar";
import { useProjectPersistence } from "@/lib/persistence/useProjectPersistence";
import { useThemeSync } from "@/lib/workspace/useThemeSync";

export function AppFrame({ children }: { children: ReactNode }) {
  // Loads any persisted project on first mount and keeps the store autosaved.
  useProjectPersistence();
  // Restores the saved/system light-dark preference and keeps it applied.
  useThemeSync();

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <Topbar />
      <div className="flex min-h-0 flex-1">{children}</div>
    </div>
  );
}
