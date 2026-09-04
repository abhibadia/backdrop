import { Point } from "@/lib/model/types";

/** Anything with at least x,y — z is optional so plain 2D `Point`s keep working. */
interface Coord2Or3 {
  x: number;
  y: number;
  z?: number;
}

/** Euclidean distance. Includes the z difference when either point has one. */
export function distance(a: Coord2Or3, b: Coord2Or3): number {
  return Math.hypot(b.x - a.x, b.y - a.y, (b.z ?? 0) - (a.z ?? 0));
}

export function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/** Angle of the vector a->b in degrees, 0 = pointing along +x axis. */
export function angleDeg(a: Point, b: Point): number {
  return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
}

export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Rounds a point to the nearest multiple of `spacing` on x and y only — z (if
 * present) passes through unchanged, since depth is controlled separately
 * (see the Pipe tool's draw-depth control) rather than by the on-plane grid.
 */
export function snapToGrid<T extends Coord2Or3>(point: T, spacing: number): T {
  if (spacing <= 0) return point;
  return {
    ...point,
    x: Math.round(point.x / spacing) * spacing,
    y: Math.round(point.y / spacing) * spacing,
  };
}

/**
 * Returns the candidate point closest to `point` within `tolerance`, or the
 * original (optionally grid-snapped) point if no candidate is close enough.
 * When points carry a z, distance (and therefore snapping) accounts for it —
 * a candidate at a very different depth won't be snapped to.
 */
export function snapToCandidates<T extends Coord2Or3>(
  point: T,
  candidates: T[],
  tolerance: number,
): T {
  let closest: T | null = null;
  let closestDist = tolerance;
  for (const candidate of candidates) {
    const d = distance(point, candidate);
    if (d <= closestDist) {
      closest = candidate;
      closestDist = d;
    }
  }
  return closest ?? point;
}

/** Rotates a point around an origin by `deg` degrees. */
export function rotatePoint(point: Point, origin: Point, deg: number): Point {
  const rad = degToRad(deg);
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = point.x - origin.x;
  const dy = point.y - origin.y;
  return {
    x: origin.x + dx * cos - dy * sin,
    y: origin.y + dx * sin + dy * cos,
  };
}
