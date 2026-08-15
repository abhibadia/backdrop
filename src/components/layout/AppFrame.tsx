"use client";

import { ReactNode } from "react";
import { Topbar } from "./Topbar";
import { useProjectPersistence } from "@/lib/persistence/useProjectPersistence";

export function AppFrame({ children }: { children: ReactNode }) {
  // Loads any persisted project on first mount and keeps the store autosaved.
  useProjectPersistence();

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <Topbar />
      <div className="flex min-h-0 flex-1">{children}</div>
    </div>
  );
}
