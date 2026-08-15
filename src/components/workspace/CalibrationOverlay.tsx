"use client";

import Konva from "konva";
import { Circle, Line, Rect } from "react-konva";
import { useUIStore } from "@/lib/store/uiStore";

interface CalibrationOverlayProps {
  structureId: string;
  width: number;
  height: number;
}

/** Renders inside a structure's local-space group; only active while calibrating that structure. */
export function CalibrationOverlay({ structureId, width, height }: CalibrationOverlayProps) {
  const activeTool = useUIStore((s) => s.activeTool);
  const activeStructureId = useUIStore((s) => s.activeStructureId);
  const draft = useUIStore((s) => s.calibrationDraft);
  const addCalibrationPoint = useUIStore((s) => s.addCalibrationPoint);

  const isActive = activeTool === "calibrate" && activeStructureId === structureId;
  if (!isActive) return null;

  const handlePick = (e: Konva.KonvaEventObject<Event>) => {
    const pos = e.target.getRelativePointerPosition();
    if (!pos) return;
    addCalibrationPoint({ x: pos.x, y: pos.y });
  };

  return (
    <>
      <Rect
        x={0}
        y={0}
        width={width}
        height={height}
        fill="rgba(34,211,238,0.04)"
        onClick={handlePick}
        onTap={handlePick}
      />
      {draft.pointA && draft.pointB && (
        <Line
          points={[draft.pointA.x, draft.pointA.y, draft.pointB.x, draft.pointB.y]}
          stroke="#22d3ee"
          strokeWidth={2}
          dash={[6, 4]}
          listening={false}
        />
      )}
      {draft.pointA && (
        <Circle x={draft.pointA.x} y={draft.pointA.y} radius={5} fill="#22d3ee" listening={false} />
      )}
      {draft.pointB && (
        <Circle x={draft.pointB.x} y={draft.pointB.y} radius={5} fill="#22d3ee" listening={false} />
      )}
    </>
  );
}
