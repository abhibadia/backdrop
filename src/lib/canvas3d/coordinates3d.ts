import { Point } from "@/lib/model/types";

/**
 * 3D scene coordinate conventions:
 *
 * - Each structure is a flat vertical plane sitting in the scene's XY plane
 *   (facing +Z), so the camera can orbit fully around it — including behind.
 * - World placement: `structure.transform.{x,y,rotation}` (the same 2D
 *   canvas transform used previously) maps to the plane group's world
 *   position/rotation. The 2D system was Y-down; Three.js is Y-up, so the Y
 *   axis is flipped once here.
 * - Pipes/connectors (`Point3D`) are stored directly as centered, Y-up,
 *   structure-local scene units — the same frame the plane group itself
 *   lives in — so they're free 3D geometry, not confined to the image's
 *   plane or its pixel space. Build Mode locks the active structure's
 *   transform to the origin with no rotation, so while building, this
 *   structure-local frame and world space coincide.
 * - Calibration is the one place flat, image-pixel-space `Point`s (top-left
 *   origin, Y-down — see src/lib/canvas/coordinates.ts) still show up in 3D:
 *   `pixelToPlaneLocal`/`planeLocalToPixel` convert between that and the
 *   plane's own centered, Y-up local space.
 */

/** Converts a structure's 2D world transform into a Three.js world position. */
export function structureWorldPosition(transform: { x: number; y: number }): [number, number, number] {
  return [transform.x, -transform.y, 0];
}

/** Converts a structure's 2D rotation (degrees) into a Three.js Z-axis rotation (radians). */
export function structureWorldRotationZ(rotationDeg: number): number {
  return (rotationDeg * Math.PI) / 180;
}

/**
 * Converts a structure-local pixel-space point (top-left origin, Y-down)
 * into the plane's local 3D space (centered origin, Y-up). `z` lifts the
 * point off the plane surface (e.g. to avoid z-fighting/raycast ambiguity
 * with the image mesh).
 */
export function pixelToPlaneLocal(point: Point, width: number, height: number, z = 0): [number, number, number] {
  return [point.x - width / 2, height / 2 - point.y, z];
}

/** Inverse of `pixelToPlaneLocal` (ignores z) — plane-local point back to structure-local pixel space. */
export function planeLocalToPixel(
  local: { x: number; y: number },
  width: number,
  height: number,
): Point {
  return { x: local.x + width / 2, y: height / 2 - local.y };
}
