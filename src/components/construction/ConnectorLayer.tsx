"use client";

import Konva from "konva";
import { Circle, Group, Line } from "react-konva";
import { ConnectorInstance, Structure } from "@/lib/model/types";
import { useProjectStore } from "@/lib/store/projectStore";
import { useUIStore, Viewport } from "@/lib/store/uiStore";
import { angleDeg, degToRad } from "@/lib/utils/geometry";
import { CONNECTOR_SIZE_ARM_LENGTH } from "@/lib/model/render";
import { resolveSnappedPoint } from "@/lib/canvas/snapping";
import { ConnectorGlyph } from "./ConnectorGlyph";

interface ConnectorLayerProps {
  structure: Structure;
  interactive: boolean;
  viewport: Viewport;
}

export function ConnectorLayer({ structure, interactive, viewport }: ConnectorLayerProps) {
  return (
    <>
      {Object.values(structure.connectors).map((connector) => (
        <ConnectorShape
          key={connector.id}
          connector={connector}
          structure={structure}
          interactive={interactive}
          viewport={viewport}
        />
      ))}
    </>
  );
}

const SNAP_TOLERANCE_SCREEN_PX = 14;

function ConnectorShape({
  connector,
  structure,
  interactive,
  viewport,
}: {
  connector: ConnectorInstance;
  structure: Structure;
  interactive: boolean;
  viewport: Viewport;
}) {
  const selectedElementIds = useUIStore((s) => s.selectedElementIds);
  const toggleSelectedElementId = useUIStore((s) => s.toggleSelectedElementId);
  const activeTool = useUIStore((s) => s.activeTool);
  const gridEnabled = useUIStore((s) => s.gridEnabled);
  const snapEnabled = useUIStore((s) => s.snapEnabled);
  const updateConnector = useProjectStore((s) => s.updateConnector);

  const isSelected = selectedElementIds.includes(connector.id);
  const canDrag = interactive && !connector.locked && activeTool === "select";
  const armLength = CONNECTOR_SIZE_ARM_LENGTH[connector.size];
  const handleDistance = armLength + 16;

  const handlePositionDrag = (e: Konva.KonvaEventObject<DragEvent>) => {
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
      excludeIds: [connector.id],
    });
    e.target.position(snapped);
    updateConnector(structure.id, connector.id, { position: snapped });
  };

  const handleRotateDrag = (e: Konva.KonvaEventObject<DragEvent>) => {
    const pointer = { x: e.target.x(), y: e.target.y() };
    const deg = angleDeg({ x: 0, y: 0 }, pointer);
    e.target.position({
      x: Math.cos(degToRad(deg)) * handleDistance,
      y: Math.sin(degToRad(deg)) * handleDistance,
    });
    updateConnector(structure.id, connector.id, { rotation: deg });
  };

  return (
    <Group
      x={connector.position.x}
      y={connector.position.y}
      draggable={canDrag}
      onDragMove={handlePositionDrag}
      onDragEnd={handlePositionDrag}
      onClick={(e) => {
        if (!interactive) return;
        e.cancelBubble = true;
        toggleSelectedElementId(connector.id, e.evt.shiftKey);
      }}
      onTap={(e) => {
        if (!interactive) return;
        e.cancelBubble = true;
        toggleSelectedElementId(connector.id, false);
      }}
    >
      {/* Larger invisible hit circle for easy selection. */}
      <Circle radius={Math.max(16, armLength + 6)} fill="transparent" />
      <Group rotation={connector.rotation}>
        <ConnectorGlyph
          type={connector.type}
          stroke={isSelected ? "#22d3ee" : connector.locked ? "#5b616c" : "#e7e9ec"}
          strokeWidth={2.5}
          armLength={armLength}
        />
      </Group>
      {isSelected && !connector.locked && (
        <>
          <Line
            points={[
              0,
              0,
              Math.cos(degToRad(connector.rotation)) * handleDistance,
              Math.sin(degToRad(connector.rotation)) * handleDistance,
            ]}
            stroke="#22d3ee"
            strokeWidth={1}
            dash={[3, 3]}
            listening={false}
          />
          <Circle
            x={Math.cos(degToRad(connector.rotation)) * handleDistance}
            y={Math.sin(degToRad(connector.rotation)) * handleDistance}
            radius={5}
            fill="#0b0d10"
            stroke="#22d3ee"
            strokeWidth={2}
            draggable
            onDragMove={handleRotateDrag}
            onDragEnd={handleRotateDrag}
          />
        </>
      )}
    </Group>
  );
}
