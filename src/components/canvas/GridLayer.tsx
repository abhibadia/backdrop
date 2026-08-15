"use client";

import { Layer, Shape } from "react-konva";
import { screenToWorld, adaptiveGridSpacing } from "@/lib/canvas/coordinates";
import { Viewport } from "@/lib/store/uiStore";
import { ElementSize } from "@/lib/canvas/useResizeObserver";

interface GridLayerProps {
  viewport: Viewport;
  containerSize: ElementSize;
  /** Base world-space spacing between dots at scale 1. */
  spacing?: number;
  visible?: boolean;
  dotColor?: string;
}

export function GridLayer({
  viewport,
  containerSize,
  spacing = 32,
  visible = true,
  dotColor = "rgba(255,255,255,0.14)",
}: GridLayerProps) {
  if (!visible || containerSize.width === 0 || containerSize.height === 0) {
    return null;
  }

  const effectiveSpacing = adaptiveGridSpacing(spacing, viewport.scale);
  const topLeft = screenToWorld({ x: 0, y: 0 }, viewport);
  const bottomRight = screenToWorld(
    { x: containerSize.width, y: containerSize.height },
    viewport,
  );

  return (
    <Layer listening={false}>
      <Shape
        sceneFunc={(context) => {
          const startX = Math.floor(topLeft.x / effectiveSpacing) * effectiveSpacing;
          const startY = Math.floor(topLeft.y / effectiveSpacing) * effectiveSpacing;
          const dotRadius = Math.max(0.5, 1.1 / viewport.scale);

          context.fillStyle = dotColor;
          for (let x = startX; x <= bottomRight.x; x += effectiveSpacing) {
            for (let y = startY; y <= bottomRight.y; y += effectiveSpacing) {
              context.beginPath();
              context.arc(x, y, dotRadius, 0, Math.PI * 2);
              context.fill();
            }
          }
        }}
      />
    </Layer>
  );
}
