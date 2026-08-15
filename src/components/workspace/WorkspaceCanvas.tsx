"use client";

import { CanvasStage } from "@/components/canvas/CanvasStage";
import { useUIStore } from "@/lib/store/uiStore";
import { StructureLayer } from "./StructureLayer";

export default function WorkspaceCanvas() {
  const activeTool = useUIStore((s) => s.activeTool);

  return (
    <CanvasStage canvasKey="workspace" forcePan={activeTool === "pan"}>
      {({ viewport }) => <StructureLayer viewport={viewport} />}
    </CanvasStage>
  );
}
