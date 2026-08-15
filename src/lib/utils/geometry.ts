import { Point } from "@/lib/model/types";

export function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
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

/** Rounds a point to the nearest multiple of `spacing` on both axes. */
export function snapToGrid(point: Point, spacing: number): Point {
  if (spacing <= 0) return point;
  return {
    x: Math.round(point.x / spacing) * spacing,
    y: Math.round(point.y / spacing) * spacing,
  };
}

/**
 * Returns the candidate point closest to `point` within `tolerance`, or the
 * original (optionally grid-snapped) point if no candidate is close enough.
 */
export function snapToCandidates(
  point: Point,
  candidates: Point[],
  tolerance: number,
): Point {
  let closest: Point | null = null;
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
