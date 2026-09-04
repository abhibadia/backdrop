"use client";

import { useState } from "react";
import { ThreeEvent } from "@react-three/fiber";
import { Point, Structure } from "@/lib/model/types";
import { pixelToPlaneLocal } from "@/lib/canvas3d/coordinates3d";
import { useClickGuard } from "@/lib/canvas3d/useClickGuard";
import { SELECTION_COLOR_3D } from "@/lib/model/render";
import { useUIStore } from "@/lib/store/uiStore";

interface CalibrationPicker3DProps {
  structure: Structure;
}

type Edge = "left" | "right" | "top" | "bottom";

const STRIP_Z = 1.5;
/** Fraction of the image's shorter side used for each edge strip's thickness, clamped to a sane pixel range. */
const STRIP_THICKNESS_FACTOR = 0.08;
const STRIP_THICKNESS_MIN = 14;
const STRIP_THICKNESS_MAX = 70;

interface EdgeStrip {
  edge: Edge;
  center: Point;
  size: [number, number];
}

/** The two pixel-space corners spanning a given edge, corner to corner. */
function edgeEndpoints(edge: Edge, w: number, h: number): [Point, Point] {
  switch (edge) {
    case "left":
      return [{ x: 0, y: 0 }, { x: 0, y: h }];
    case "right":
      return [{ x: w, y: 0 }, { x: w, y: h }];
    case "top":
      return [{ x: 0, y: 0 }, { x: w, y: 0 }];
    case "bottom":
      return [{ x: 0, y: h }, { x: w, y: h }];
  }
}

function buildEdgeStrips(w: number, h: number): EdgeStrip[] {
  const t = Math.min(STRIP_THICKNESS_MAX, Math.max(STRIP_THICKNESS_MIN, Math.min(w, h) * STRIP_THICKNESS_FACTOR));
  return [
    { edge: "left", center: { x: t / 2, y: h / 2 }, size: [t, h] },
    { edge: "right", center: { x: w - t / 2, y: h / 2 }, size: [t, h] },
    { edge: "top", center: { x: w / 2, y: t / 2 }, size: [w, t] },
    { edge: "bottom", center: { x: w / 2, y: h - t / 2 }, size: [w, t] },
  ];
}

/**
 * The Ruler/Scale tool's 3D interaction: all 4 edges of the image light up
 * as thick, directly-clickable bars — not a thin hairline you have to aim
 * precisely at — and clicking one selects that whole edge (corner to
 * corner) as the measured segment. Confirming the dialog that follows (see
 * CalibrationDialog) sets the structure's scale.
 */
export function CalibrationPicker3D({ structure }: CalibrationPicker3DProps) {
  const activeTool = useUIStore((s) => s.activeTool);
  const activeStructureId = useUIStore((s) => s.activeStructureId);
  const draft = useUIStore((s) => s.calibrationDraft);
  const setCalibrationDraftPoints = useUIStore((s) => s.setCalibrationDraftPoints);

  const [hoverEdge, setHoverEdge] = useState<Edge | null>(null);
  const { markPointerDown, wasDragged } = useClickGuard();

  const isActive = activeTool === "calibrate" && activeStructureId === structure.id;
  const { naturalWidth: w, naturalHeight: h } = structure.image;

  if (!isActive) return null;

  const strips = buildEdgeStrips(w, h);
  const confirmedEdge =
    draft.pointA && draft.pointB
      ? (["left", "right", "top", "bottom"] as Edge[]).find((edge) => {
          const [a, b] = edgeEndpoints(edge, w, h);
          return (
            (a.x === draft.pointA!.x && a.y === draft.pointA!.y && b.x === draft.pointB!.x && b.y === draft.pointB!.y) ||
            (a.x === draft.pointB!.x && a.y === draft.pointB!.y && b.x === draft.pointA!.x && b.y === draft.pointA!.y)
          );
        }) ?? null
      : null;

  const handleClick = (edge: Edge) => (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    // Ignore the tail end of a camera-orbit drag — see useClickGuard.
    if (wasDragged(e.nativeEvent)) return;
    const [pointA, pointB] = edgeEndpoints(edge, w, h);
    setCalibrationDraftPoints(pointA, pointB);
  };

  return (
    <group>
      {strips.map((strip) => {
        const isConfirmed = confirmedEdge === strip.edge;
        const isHovered = hoverEdge === strip.edge;
        const opacity = isConfirmed ? 0.9 : isHovered ? 0.65 : 0.35;
        return (
          <mesh
            key={strip.edge}
            position={pixelToPlaneLocal(strip.center, w, h, STRIP_Z)}
            onPointerDown={(e) => markPointerDown(e.nativeEvent)}
            onPointerEnter={(e) => {
              e.stopPropagation();
              setHoverEdge(strip.edge);
            }}
            onPointerLeave={() => setHoverEdge((current) => (current === strip.edge ? null : current))}
            onClick={handleClick(strip.edge)}
          >
            <planeGeometry args={strip.size} />
            <meshBasicMaterial color={SELECTION_COLOR_3D} transparent opacity={opacity} depthWrite={false} toneMapped={false} />
          </mesh>
        );
      })}
    </group>
  );
}
