"use client";

import Konva from "konva";
import { Circle, Group, Line, Text } from "react-konva";
import { PipeSegment, Structure } from "@/lib/model/types";
import { useProjectStore } from "@/lib/store/projectStore";
import { useUIStore } from "@/lib/store/uiStore";
import { distance, midpoint } from "@/lib/utils/geometry";
import { formatReal, pxToReal } from "@/lib/utils/units";
import { PIPE_SIZE_STROKE_WIDTH } from "@/lib/model/render";
import { resolveSnappedPoint } from "@/lib/canvas/snapping";
import { Viewport } from "@/lib/store/uiStore";

interface PipeLayerProps {
  structure: Structure;
  interactive: boolean;
  showLabels: boolean;
  viewport: Viewport;
}

export function PipeLayer({ structure, interactive, showLabels, viewport }: PipeLayerProps) {
  return (
    <>
      {Object.values(structure.pipes).map((pipe) => (
        <PipeShape
          key={pipe.id}
          pipe={pipe}
          structure={structure}
          interactive={interactive}
          showLabel={showLabels}
          viewport={viewport}
        />
      ))}
    </>
  );
}

const SNAP_TOLERANCE_SCREEN_PX = 14;

function PipeShape({
  pipe,
  structure,
  interactive,
  showLabel,
  viewport,
}: {
  pipe: PipeSegment;
  structure: Structure;
  interactive: boolean;
  showLabel: boolean;
  viewport: Viewport;
}) {
  const selectedElementIds = useUIStore((s) => s.selectedElementIds);
  const toggleSelectedElementId = useUIStore((s) => s.toggleSelectedElementId);
  const activeTool = useUIStore((s) => s.activeTool);
  const gridEnabled = useUIStore((s) => s.gridEnabled);
  const snapEnabled = useUIStore((s) => s.snapEnabled);
  const updatePipe = useProjectStore((s) => s.updatePipe);

  const isSelected = selectedElementIds.includes(pipe.id);
  const canDrag = interactive && !pipe.locked && activeTool === "select";
  const lengthPx = distance(pipe.start, pipe.end);
  const mid = midpoint(pipe.start, pipe.end);
  const strokeWidth = PIPE_SIZE_STROKE_WIDTH[pipe.size];

  const handleEndpointDrag = (
    endpoint: "start" | "end",
    e: Konva.KonvaEventObject<DragEvent>,
  ) => {
    const raw = { x: e.target.x(), y: e.target.y() };
    const tolerance = SNAP_TOLERANCE_SCREEN_PX / viewport.scale;
    const gridSpacingPx = structure.calibration
      ? structure.buildGridSpacing * structure.calibration.pixelsPerUnit
      : 20;
    const snapped = resolveSnappedPoint(raw, {
      gridSpacing: gridSpacingPx,
      gridEnabled,
      snapEnabled,
      pipes: Object.values(structure.pipes),
      connectors: Object.values(structure.connectors),
      tolerance,
      excludeIds: [pipe.id],
    });
    e.target.position(snapped);
    updatePipe(structure.id, pipe.id, {
      [endpoint]: snapped,
    } as Partial<PipeSegment>);
  };

  const label = showLabel
    ? structure.calibration
      ? formatReal(pxToReal(lengthPx, structure.calibration), structure.calibration.unit)
      : `${lengthPx.toFixed(0)}px`
    : null;

  return (
    <Group>
      {/* Wide invisible hit line makes thin pipes easy to click/select. */}
      <Line
        points={[pipe.start.x, pipe.start.y, pipe.end.x, pipe.end.y]}
        stroke="transparent"
        strokeWidth={Math.max(16, strokeWidth + 10)}
        onClick={(e) => {
          if (!interactive) return;
          e.cancelBubble = true;
          toggleSelectedElementId(pipe.id, e.evt.shiftKey);
        }}
        onTap={(e) => {
          if (!interactive) return;
          e.cancelBubble = true;
          toggleSelectedElementId(pipe.id, false);
        }}
      />
      <Line
        points={[pipe.start.x, pipe.start.y, pipe.end.x, pipe.end.y]}
        stroke={isSelected ? "#22d3ee" : pipe.locked ? "#5b616c" : "#c7ccd4"}
        strokeWidth={strokeWidth}
        lineCap="round"
        opacity={pipe.locked && !isSelected ? 0.7 : 1}
        listening={false}
      />
      {pipe.locked && (
        <Circle x={mid.x} y={mid.y} radius={3} fill="#5b616c" listening={false} />
      )}
      {isSelected && (
        <>
          <Circle
            x={pipe.start.x}
            y={pipe.start.y}
            radius={5}
            fill="#0b0d10"
            stroke="#22d3ee"
            strokeWidth={2}
            draggable={canDrag}
            onDragMove={(e) => handleEndpointDrag("start", e)}
            onDragEnd={(e) => handleEndpointDrag("start", e)}
          />
          <Circle
            x={pipe.end.x}
            y={pipe.end.y}
            radius={5}
            fill="#0b0d10"
            stroke="#22d3ee"
            strokeWidth={2}
            draggable={canDrag}
            onDragMove={(e) => handleEndpointDrag("end", e)}
            onDragEnd={(e) => handleEndpointDrag("end", e)}
          />
        </>
      )}
      {label && (
        <Text
          x={mid.x}
          y={mid.y - 14}
          text={label}
          fontSize={11}
          fontFamily="var(--font-geist-mono)"
          fill={isSelected ? "#22d3ee" : "#8a8f99"}
          listening={false}
          offsetX={label.length * 2.8}
        />
      )}
    </Group>
  );
}
