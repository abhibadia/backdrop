"use client";

import { useEffect, useRef } from "react";
import Konva from "konva";
import { Circle, Group, Image as KonvaImage, Line, Text } from "react-konva";
import { Structure } from "@/lib/model/types";
import { useHtmlImage } from "@/lib/canvas/useHtmlImage";
import { useProjectStore } from "@/lib/store/projectStore";
import { useUIStore, Viewport } from "@/lib/store/uiStore";
import { formatReal } from "@/lib/utils/units";
import { CalibrationOverlay } from "./CalibrationOverlay";
import { PipeLayer } from "@/components/construction/PipeLayer";
import { ConnectorLayer } from "@/components/construction/ConnectorLayer";
import { BuildOverlay } from "@/components/construction/BuildOverlay";

interface StructureNodeProps {
  structure: Structure;
  registerNode: (id: string, node: Konva.Group | null) => void;
  viewport: Viewport;
}

/**
 * Renders a structure as a center-pivoting rigid body: the outer Group is
 * positioned/rotated by `structure.transform` (x/y = center point in world
 * space). The inner Group establishes "structure-local pixel space" (origin
 * at the image's top-left corner), which is the same coordinate frame Build
 * Mode pipes/connectors are stored in, so they stay glued to the image
 * through every move/rotate.
 */
export function StructureNode({ structure, registerNode, viewport }: StructureNodeProps) {
  const image = useHtmlImage(structure.image.blobKey);
  const imageRef = useRef<Konva.Image>(null);
  const setStructureTransform = useProjectStore((s) => s.setStructureTransform);
  const selectedStructureId = useUIStore((s) => s.selectedStructureId);
  const setSelectedStructureId = useUIStore((s) => s.setSelectedStructureId);
  const enterBuildMode = useUIStore((s) => s.enterBuildMode);
  const mode = useUIStore((s) => s.mode);
  const activeTool = useUIStore((s) => s.activeTool);
  const activeStructureId = useUIStore((s) => s.activeStructureId);
  const showImages = useUIStore((s) => s.showImages);
  const showConstruction = useUIStore((s) => s.showConstruction);
  const showMeasurements = useUIStore((s) => s.showMeasurements);

  const isBuildTarget = mode === "build" && activeStructureId === structure.id;
  const isDeemphasized = mode === "build" && activeStructureId !== null && !isBuildTarget;

  useEffect(() => {
    const node = imageRef.current;
    if (!node) return;
    if (isBuildTarget) {
      node.cache();
    } else {
      node.clearCache();
    }
    node.getLayer()?.batchDraw();
  }, [isBuildTarget, image]);

  if (!structure.visible) return null;

  const { naturalWidth, naturalHeight } = structure.image;
  const isSelected = selectedStructureId === structure.id;
  const isCalibrationTarget = activeTool === "calibrate" && activeStructureId === structure.id;
  const interactive = mode === "view" && !structure.locked && !isCalibrationTarget;
  const imageHidden = !showImages && !isBuildTarget;
  const constructionVisible = isBuildTarget || showConstruction;

  return (
    <Group
      ref={(node) => registerNode(structure.id, node)}
      x={structure.transform.x}
      y={structure.transform.y}
      rotation={structure.transform.rotation}
      draggable={interactive}
      opacity={isDeemphasized ? 0.32 : 1}
      onClick={() => {
        if (mode === "view") setSelectedStructureId(structure.id);
      }}
      onTap={() => {
        if (mode === "view") setSelectedStructureId(structure.id);
      }}
      onDblClick={() => enterBuildMode(structure.id)}
      onDblTap={() => enterBuildMode(structure.id)}
      onDragEnd={(e) => {
        setStructureTransform(structure.id, {
          x: e.target.x(),
          y: e.target.y(),
          rotation: structure.transform.rotation,
        });
      }}
      onTransformEnd={(e) => {
        const node = e.target as Konva.Group;
        setStructureTransform(structure.id, {
          x: node.x(),
          y: node.y(),
          rotation: node.rotation(),
        });
      }}
    >
      <Group x={-naturalWidth / 2} y={-naturalHeight / 2}>
        {image && !imageHidden && (
          <KonvaImage
            ref={imageRef}
            image={image}
            width={naturalWidth}
            height={naturalHeight}
            opacity={isBuildTarget ? 0.45 : 1}
            filters={isBuildTarget ? [Konva.Filters.Grayscale] : []}
            stroke={isSelected ? "#22d3ee" : undefined}
            strokeWidth={isSelected ? 2 : 0}
            strokeEnabled={isSelected}
          />
        )}
        {structure.calibration && isSelected && !isCalibrationTarget && (
          <>
            <Line
              points={[
                structure.calibration.pointA.x,
                structure.calibration.pointA.y,
                structure.calibration.pointB.x,
                structure.calibration.pointB.y,
              ]}
              stroke="#f5a524"
              strokeWidth={1.5}
              dash={[5, 4]}
              listening={false}
            />
            <Circle x={structure.calibration.pointA.x} y={structure.calibration.pointA.y} radius={4} fill="#f5a524" listening={false} />
            <Circle x={structure.calibration.pointB.x} y={structure.calibration.pointB.y} radius={4} fill="#f5a524" listening={false} />
            <Text
              x={(structure.calibration.pointA.x + structure.calibration.pointB.x) / 2}
              y={(structure.calibration.pointA.y + structure.calibration.pointB.y) / 2 - 16}
              text={formatReal(structure.calibration.realDistance, structure.calibration.unit)}
              fill="#f5a524"
              fontSize={12}
              fontFamily="var(--font-geist-mono)"
              listening={false}
            />
          </>
        )}
        {constructionVisible && (
          <>
            <PipeLayer
              structure={structure}
              interactive={isBuildTarget}
              showLabels={showMeasurements}
              viewport={viewport}
            />
            <ConnectorLayer structure={structure} interactive={isBuildTarget} viewport={viewport} />
          </>
        )}
        <CalibrationOverlay
          structureId={structure.id}
          width={naturalWidth}
          height={naturalHeight}
        />
        <BuildOverlay structure={structure} viewport={viewport} />
      </Group>
    </Group>
  );
}
