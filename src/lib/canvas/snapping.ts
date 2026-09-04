import { ConnectorInstance, PipeSegment, Point3D } from "@/lib/model/types";
import { snapToCandidates, snapToGrid } from "@/lib/utils/geometry";

export interface SnapContext {
  /** World/local-space grid spacing. */
  gridSpacing: number;
  gridEnabled: boolean;
  snapEnabled: boolean;
  pipes: PipeSegment[];
  connectors: ConnectorInstance[];
  /** Snap tolerance in the same units as the points (scene units), pre-divided by zoom scale. */
  tolerance: number;
  /** Ids to exclude from candidate collection, e.g. the element currently being edited. */
  excludeIds?: string[];
}

export function collectSnapCandidates(
  pipes: PipeSegment[],
  connectors: ConnectorInstance[],
  excludeIds: string[] = [],
): Point3D[] {
  const excluded = new Set(excludeIds);
  const points: Point3D[] = [];
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

/**
 * Snaps a candidate point to nearby element endpoints first, then to the
 * grid. Candidate-snapping compares full 3D distance, so a point at a very
 * different depth is never snapped to — only the on-plane grid-snap ignores
 * z (depth is controlled separately, see the Pipe tool's draw-depth control).
 */
export function resolveSnappedPoint(point: Point3D, ctx: SnapContext): Point3D {
  if (!ctx.snapEnabled) return point;

  const candidates = collectSnapCandidates(ctx.pipes, ctx.connectors, ctx.excludeIds);
  const snappedToElement = snapToCandidates(point, candidates, ctx.tolerance);
  if (snappedToElement !== point) return snappedToElement;

  if (ctx.gridEnabled && ctx.gridSpacing > 0) {
    return snapToGrid(point, ctx.gridSpacing);
  }

  return point;
}
