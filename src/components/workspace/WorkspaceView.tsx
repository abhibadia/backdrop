"use client";

import dynamic from "next/dynamic";
import { Sidebar } from "@/components/layout/Sidebar";
import { StructuresPanel } from "./StructuresPanel";
import { CalibrationDialog } from "./CalibrationDialog";
import { DesignerToolbar } from "./DesignerToolbar";
import { ContextPanel } from "./ContextPanel";
import { useKeyboardShortcuts } from "@/lib/workspace/useKeyboardShortcuts";

const WorkspaceCanvas = dynamic(() => import("./WorkspaceCanvas"), { ssr: false });

export function WorkspaceView() {
  useKeyboardShortcuts();

  return (
    <>
      <div className="relative flex min-w-0 flex-1 flex-col">
        <DesignerToolbar />
        <div className="relative min-h-0 flex-1">
          <WorkspaceCanvas />
        </div>
      </div>
      <Sidebar>
        <StructuresPanel />
        <ContextPanel />
      </Sidebar>
      <CalibrationDialog />
    </>
  );
}
