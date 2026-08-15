import { Point } from "@/lib/model/types";
import { Viewport } from "@/lib/store/uiStore";
import { clamp } from "@/lib/utils/geometry";

export const MIN_VIEWPORT_SCALE = 0.08;
export const MAX_VIEWPORT_SCALE = 8;

/**
 * The canvas coordinate model: object coordinates stored in state are always
 * in "world space" (or, inside a structure's group, "structure-local pixel
 * space"). Zoom/pan only ever change the Konva Stage's own scale/position
 * (the `Viewport`); stored coordinates are never rescaled. These helpers
 * translate between world space and on-screen pixel space for UI concerns
 * like cursor readouts and pointer-to-world hit testing.
 */

export function worldToScreen(point: Point, viewport: Viewport): Point {
  return {
    x: point.x * viewport.scale + viewport.x,
    y: point.y * viewport.scale + viewport.y,
  };
}

export function screenToWorld(point: Point, viewport: Viewport): Point {
  return {
    x: (point.x - viewport.x) / viewport.scale,
    y: (point.y - viewport.y) / viewport.scale,
  };
}

/** Returns a new viewport zoomed by `scaleFactor`, keeping `pointerScreen` fixed on screen. */
export function zoomViewportAtPoint(
  viewport: Viewport,
  pointerScreen: Point,
  scaleFactor: number,
  minScale: number,
  maxScale: number,
): Viewport {
  const newScale = clamp(viewport.scale * scaleFactor, minScale, maxScale);
  const worldPoint = screenToWorld(pointerScreen, viewport);
  return {
    scale: newScale,
    x: pointerScreen.x - worldPoint.x * newScale,
    y: pointerScreen.y - worldPoint.y * newScale,
  };
}

/** Returns a viewport that centers and fits `bounds` (world space) within `containerSize`. */
export function fitViewportToBounds(
  bounds: { x: number; y: number; width: number; height: number },
  containerSize: { width: number; height: number },
  padding = 48,
  maxScale = 4,
): Viewport {
  if (bounds.width <= 0 || bounds.height <= 0 || containerSize.width <= 0) {
    return { scale: 1, x: containerSize.width / 2, y: containerSize.height / 2 };
  }
  const scaleX = (containerSize.width - padding * 2) / bounds.width;
  const scaleY = (containerSize.height - padding * 2) / bounds.height;
  const scale = clamp(Math.min(scaleX, scaleY), 0.01, maxScale);
  return {
    scale,
    x: containerSize.width / 2 - (bounds.x + bounds.width / 2) * scale,
    y: containerSize.height / 2 - (bounds.y + bounds.height / 2) * scale,
  };
}

/** Picks a grid spacing (world units) whose on-screen spacing stays within a comfortable range. */
export function adaptiveGridSpacing(
  baseSpacing: number,
  scale: number,
  minScreenSpacing = 24,
): number {
  let spacing = baseSpacing;
  if (spacing <= 0) return baseSpacing;
  while (spacing * scale < minScreenSpacing) spacing *= 2;
  while (spacing * scale > minScreenSpacing * 2) spacing /= 2;
  return spacing;
}
