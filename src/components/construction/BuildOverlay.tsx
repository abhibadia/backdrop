"use client";

import { useEffect, useState } from "react";
import Konva from "konva";
import { Circle, Group, Line, Rect, Text } from "react-konva";
import { Structure, Point } from "@/lib/model/types";
import { useProjectStore } from "@/lib/store/projectStore";
import { useUIStore, Viewport } from "@/lib/store/uiStore";
import { createConnector, createPipe } from "@/lib/model/factory";
import { distance } from "@/lib/utils/geometry";
import { formatReal, pxToReal } from "@/lib/utils/units";
import { resolveSnappedPoint } from "@/lib/canvas/snapping";
import { PIPE_SIZE_STROKE_WIDTH, CONNECTOR_SIZE_ARM_LENGTH } from "@/lib/model/render";
import { ConnectorGlyph } from "./ConnectorGlyph";

interface BuildOverlayProps {
  structure: Structure;
  viewport: Viewport;
}

const SNAP_TOLERANCE_SCREEN_PX = 14;
const MIN_PIPE_LENGTH_PX = 3;
const ANGLE_SNAP_DEG = 15;

/**
 * The interactive click/drag surface for creating new pipes and connectors
 * on the active Build Mode structure. Rendered inside that structure's
 * local-space group (same coordinate frame as its pipes/connectors), mirroring
 * the pattern CalibrationOverlay already established for point-picking.
 */
export function BuildOverlay({ structure, viewport }: BuildOverlayProps) {
  const activeTool = useUIStore((s) => s.activeTool);
  const activePipeSize = useUIStore((s) => s.activePipeSize);
  const activeConnectorType = useUIStore((s) => s.activeConnectorType);
  const gridEnabled = useUIStore((s) => s.gridEnabled);
  const snapEnabled = useUIStore((s) => s.snapEnabled);
  const setActiveTool = useUIStore((s) => s.setActiveTool);
  const addPipe = useProjectStore((s) => s.addPipe);
  const addConnector = useProjectStore((s) => s.addConnector);

  const [drawStart, setDrawStart] = useState<Point | null>(null);
  const [hover, setHover] = useState<Point | null>(null);

  // Reset the in-progress draft whenever the tool or target structure
  // changes, following React's "adjust state during render" pattern rather
  // than an effect (avoids an extra cascading render on every tool switch).
  const resetKey = `${activeTool}:${structure.id}`;
  const [prevResetKey, setPrevResetKey] = useState(resetKey);
  if (resetKey !== prevResetKey) {
    setPrevResetKey(resetKey);
    setDrawStart(null);
    setHover(null);
  }

  const isPipeTool = activeTool === "place-pipe";
  const isConnectorTool = activeTool === "place-connector";
  const active = (isPipeTool || isConnectorTool) && !structure.constructionLocked;

  useEffect(() => {
    if (!active) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDrawStart(null);
        setActiveTool("select");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [active, setActiveTool]);

  if (!active) return null;

  const gridSpacingPx = structure.calibration
    ? structure.buildGridSpacing * structure.calibration.pixelsPerUnit
    : 20;
  const tolerance = SNAP_TOLERANCE_SCREEN_PX / viewport.scale;

  const resolvePoint = (raw: Point, shiftKey: boolean): Point => {
    let point = raw;
    if (isPipeTool && drawStart && shiftKey) {
      const dx = raw.x - drawStart.x;
      const dy = raw.y - drawStart.y;
      const len = Math.hypot(dx, dy);
      const rawAngle = (Math.atan2(dy, dx) * 180) / Math.PI;
      const snappedAngle = Math.round(rawAngle / ANGLE_SNAP_DEG) * ANGLE_SNAP_DEG;
      const rad = (snappedAngle * Math.PI) / 180;
      point = { x: drawStart.x + Math.cos(rad) * len, y: drawStart.y + Math.sin(rad) * len };
    }
    return resolveSnappedPoint(point, {
      gridSpacing: gridSpacingPx,
      gridEnabled,
      snapEnabled,
      pipes: Object.values(structure.pipes),
      connectors: Object.values(structure.connectors),
      tolerance,
      excludeIds: [],
    });
  };

  // Read the pointer position relative to this Group's PARENT (structure-local
  // origin), not relative to the hit Rect itself — the Rect is offset by
  // -bounds,-bounds so it can catch clicks anywhere in a huge area, and
  // getRelativePointerPosition() on the Rect directly would return
  // coordinates relative to the Rect's own (offset) origin instead.
  const getStructureLocalPointer = (e: Konva.KonvaEventObject<Event>) => {
    const parent = e.target.getParent();
    return parent ? parent.getRelativePointerPosition() : null;
  };

  const handleMove = (e: Konva.KonvaEventObject<Event>) => {
    const pos = getStructureLocalPointer(e);
    if (!pos) return;
    const shiftKey = "shiftKey" in e.evt ? Boolean((e.evt as MouseEvent).shiftKey) : false;
    setHover(resolvePoint(pos, shiftKey));
  };

  const handleClick = (e: Konva.KonvaEventObject<Event>) => {
    const pos = getStructureLocalPointer(e);
    if (!pos) return;
    const shiftKey = "shiftKey" in e.evt ? Boolean((e.evt as MouseEvent).shiftKey) : false;
    const point = resolvePoint(pos, shiftKey);

    if (isPipeTool) {
      if (!drawStart) {
        setDrawStart(point);
        return;
      }
      if (distance(drawStart, point) >= MIN_PIPE_LENGTH_PX) {
        addPipe(structure.id, createPipe(activePipeSize, drawStart, point));
        // Chain: next segment starts where this one ended, CAD-polyline style.
        setDrawStart(point);
      } else {
        setDrawStart(null);
      }
      return;
    }

    if (isConnectorTool) {
      addConnector(structure.id, createConnector(activeConnectorType, activePipeSize, point, 0));
    }
  };

  const bounds = 3000;
  const previewLength = drawStart && hover ? distance(drawStart, hover) : 0;
  const previewLabel =
    drawStart && hover
      ? structure.calibration
        ? formatReal(pxToReal(previewLength, structure.calibration), structure.calibration.unit)
        : `${previewLength.toFixed(0)}px`
      : null;

  return (
    <Group>
      <Rect
        x={-bounds}
        y={-bounds}
        width={bounds * 2}
        height={bounds * 2}
        fill="rgba(0,0,0,0.001)"
        onMouseMove={handleMove}
        onMouseLeave={() => setHover(null)}
        onClick={handleClick}
        onTap={handleClick}
      />

      {isPipeTool && drawStart && (
        <Circle x={drawStart.x} y={drawStart.y} radius={5} fill="#22d3ee" listening={false} />
      )}
      {isPipeTool && drawStart && hover && (
        <>
          <Line
            points={[drawStart.x, drawStart.y, hover.x, hover.y]}
            stroke="#22d3ee"
            strokeWidth={PIPE_SIZE_STROKE_WIDTH[activePipeSize]}
            dash={[8, 5]}
            lineCap="round"
            listening={false}
          />
          {previewLabel && (
            <Text
              x={(drawStart.x + hover.x) / 2}
              y={(drawStart.y + hover.y) / 2 - 16}
              text={previewLabel}
              fontSize={12}
              fontFamily="var(--font-geist-mono)"
              fill="#22d3ee"
              listening={false}
              offsetX={previewLabel.length * 3}
            />
          )}
        </>
      )}
      {isConnectorTool && hover && (
        <Group x={hover.x} y={hover.y} opacity={0.6} listening={false}>
          <ConnectorGlyph
            type={activeConnectorType}
            stroke="#22d3ee"
            strokeWidth={2}
            armLength={CONNECTOR_SIZE_ARM_LENGTH[activePipeSize]}
          />
        </Group>
      )}
    </Group>
  );
}
