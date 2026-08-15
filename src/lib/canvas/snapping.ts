import { ConnectorInstance, PipeSegment, Point } from "@/lib/model/types";
import { snapToCandidates, snapToGrid } from "@/lib/utils/geometry";

export interface SnapContext {
  /** World/local-space grid spacing. */
  gridSpacing: number;
  gridEnabled: boolean;
  snapEnabled: boolean;
  pipes: PipeSegment[];
  connectors: ConnectorInstance[];
  /** Snap tolerance in the same units as the points (local px), pre-divided by zoom scale. */
  tolerance: number;
  /** Ids to exclude from candidate collection, e.g. the element currently being edited. */
  excludeIds?: string[];
}

export function collectSnapCandidates(
  pipes: PipeSegment[],
  connectors: ConnectorInstance[],
  excludeIds: string[] = [],
): Point[] {
  const excluded = new Set(excludeIds);
  const points: Point[] = [];
  for (const pipe of pipes) {
    if (excluded.has(pipe.id)) continue;
    points.push(pipe.start, pipe.end);
  }
  for (const connector of connectors) {
    if (excluded.has(connector.id)) continue;
    points.push(connector.position);
  }
  return points;
}

/** Snaps a candidate point to nearby element endpoints first, then to the grid. */
export function resolveSnappedPoint(point: Point, ctx: SnapContext): Point {
  if (!ctx.snapEnabled) return point;

  const candidates = collectSnapCandidates(ctx.pipes, ctx.connectors, ctx.excludeIds);
  const snappedToElement = snapToCandidates(point, candidates, ctx.tolerance);
  if (snappedToElement !== point) return snappedToElement;

  if (ctx.gridEnabled && ctx.gridSpacing > 0) {
    return snapToGrid(point, ctx.gridSpacing);
  }

  return point;
}
