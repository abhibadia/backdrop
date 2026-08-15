"use client";

import { useProjectStore } from "@/lib/store/projectStore";
import { DEFAULT_VIEWPORT, useUIStore } from "@/lib/store/uiStore";
import { computeStructuresBounds } from "./bounds";
import {
  fitViewportToBounds,
  zoomViewportAtPoint,
  MIN_VIEWPORT_SCALE,
  MAX_VIEWPORT_SCALE,
} from "./coordinates";

const ZOOM_STEP = 1.25;

/** Shared zoom in/out/fit-to-screen logic for a named canvas, used by both the toolbar and keyboard shortcuts. */
export function useCanvasZoomControls(canvasKey: string) {
  const viewport = useUIStore((s) => s.viewports[canvasKey] ?? DEFAULT_VIEWPORT);
  const setViewport = useUIStore((s) => s.setViewport);
  const canvasSize = useUIStore((s) => s.canvasSizes[canvasKey]);
  const structures = useProjectStore((s) => s.project.structures);

  const zoom = (factor: number) => {
    const center = canvasSize
      ? { x: canvasSize.width / 2, y: canvasSize.height / 2 }
      : { x: 0, y: 0 };
    setViewport(
      canvasKey,
      zoomViewportAtPoint(viewport, center, factor, MIN_VIEWPORT_SCALE, MAX_VIEWPORT_SCALE),
    );
  };

  const fitToScreen = () => {
    if (!canvasSize) return;
    const bounds = computeStructuresBounds(Object.values(structures));
    if (!bounds) {
      setViewport(canvasKey, { scale: 1, x: canvasSize.width / 2, y: canvasSize.height / 2 });
      return;
    }
    setViewport(canvasKey, fitViewportToBounds(bounds, canvasSize));
  };

  return {
    viewport,
    zoomIn: () => zoom(ZOOM_STEP),
    zoomOut: () => zoom(1 / ZOOM_STEP),
    fitToScreen,
  };
}
