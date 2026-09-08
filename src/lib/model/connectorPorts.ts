import { ConnectorInstance, Point3D, Rotation3D, Structure } from "./types";
import { CONNECTOR_PORT_DIRECTIONS } from "./catalog";
import { distance } from "@/lib/utils/geometry";

/** How close a pipe endpoint must be to a connector's position to count as plugged into it. */
export const CONNECTOR_ATTACH_TOLERANCE = 15;
/** How close (degrees) an existing pipe's direction must be to a port's direction to count as occupying it. */
const PORT_ANGLE_MATCH_TOLERANCE_DEG = 25;
/**
 * Magnet radius (scene units) for snapping a dragged connector onto a nearby
 * unconnected pipe end — a bit more forgiving than CONNECTOR_ATTACH_TOLERANCE
 * since a mouse drag is never as precise as a deliberate click.
 */
export const CONNECTOR_DRAG_SNAP_TOLERANCE = 25;

export interface ConnectorPortInfo {
  /** World-space unit direction vector (connector.rotation already applied), one per port. */
  directions: Point3D[];
  /** Parallel to `directions` — true where an existing pipe already occupies that port. */
  occupied: boolean[];
}

/**
 * Rotates a local direction vector by a connector's full 3D rotation
 * (degrees), matching THREE.js's default Euler order ("XYZ": rotate around
 * X, then the once-rotated Y, then the twice-rotated Z — equivalent to
 * applying Rz first, then Ry, then Rx, to the vector). Deliberately
 * hand-rolled rather than importing `three` here — this is pure model-layer
 * math, and ConnectorMesh3D renders the *same* rotation via a plain
 * `<group rotation={[x,y,z]}>` (R3F's default Euler order), so the two stay
 * visually and logically consistent without the model layer depending on
 * the renderer.
 */
function rotateVector(v: Point3D, rotation: Rotation3D): Point3D {
  const rx = (rotation.x * Math.PI) / 180;
  const ry = (rotation.y * Math.PI) / 180;
  const rz = (rotation.z * Math.PI) / 180;

  // Around Z
  const x1 = v.x * Math.cos(rz) - v.y * Math.sin(rz);
  const y1 = v.x * Math.sin(rz) + v.y * Math.cos(rz);
  const z1 = v.z;

  // Around Y
  const x2 = x1 * Math.cos(ry) + z1 * Math.sin(ry);
  const y2 = y1;
  const z2 = -x1 * Math.sin(ry) + z1 * Math.cos(ry);

  // Around X
  const x3 = x2;
  const y3 = y2 * Math.cos(rx) - z2 * Math.sin(rx);
  const z3 = y2 * Math.sin(rx) + z2 * Math.cos(rx);

  return { x: x3, y: y3, z: z3 };
}

function normalize(v: Point3D): Point3D {
  const len = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

/** 3D unit vector from `from` toward `to` (the zero vector, degenerate, if the two coincide). */
function directionTo(from: Point3D, to: Point3D): Point3D {
  return normalize({ x: to.x - from.x, y: to.y - from.y, z: to.z - from.z });
}

/** Angle (degrees) between two unit vectors, via the dot product. */
function angleBetween(a: Point3D, b: Point3D): number {
  const dot = Math.min(1, Math.max(-1, a.x * b.x + a.y * b.y + a.z * b.z));
  return (Math.acos(dot) * 180) / Math.PI;
}

/** Every port's world-space direction (connector.rotation applied) and whether an existing pipe already occupies it. */
export function getConnectorPortInfo(structure: Structure, connector: ConnectorInstance): ConnectorPortInfo {
  const directions = (CONNECTOR_PORT_DIRECTIONS[connector.type] ?? []).map((d) =>
    rotateVector(d, connector.rotation),
  );
  const occupied = directions.map(() => false);

  for (const pipe of Object.values(structure.pipes)) {
    const ends: [Point3D, Point3D][] = [
      [pipe.start, pipe.end],
      [pipe.end, pipe.start],
    ];
    for (const [end, other] of ends) {
      if (distance(end, connector.position) > CONNECTOR_ATTACH_TOLERANCE) continue;
      const dir = directionTo(connector.position, other);
      let bestIdx = -1;
      let bestDelta = PORT_ANGLE_MATCH_TOLERANCE_DEG;
      directions.forEach((d, i) => {
        const delta = angleBetween(d, dir);
        if (delta < bestDelta) {
          bestDelta = delta;
          bestIdx = i;
        }
      });
      if (bestIdx >= 0) occupied[bestIdx] = true;
    }
  }

  return { directions, occupied };
}

export function freePortIndices(info: ConnectorPortInfo): number[] {
  return info.directions.map((_, i) => i).filter((i) => !info.occupied[i]);
}

/** The connector's free port whose direction is closest to the direction from it toward `towards`, or null if none are free. */
export function bestFreePortIndex(info: ConnectorPortInfo, connectorPos: Point3D, towards: Point3D): number | null {
  const target = directionTo(connectorPos, towards);
  let bestIdx: number | null = null;
  let bestDelta = Infinity;
  info.directions.forEach((d, i) => {
    if (info.occupied[i]) return;
    const delta = angleBetween(d, target);
    if (delta < bestDelta) {
      bestDelta = delta;
      bestIdx = i;
    }
  });
  return bestIdx;
}

/** The exact point `distanceOut` from `connectorPos`, outward along the given port's world-space direction. */
export function pointAtPort(connectorPos: Point3D, portDirection: Point3D, distanceOut: number): Point3D {
  return {
    x: connectorPos.x + portDirection.x * distanceOut,
    y: connectorPos.y + portDirection.y * distanceOut,
    z: connectorPos.z + portDirection.z * distanceOut,
  };
}

/** Which of a structure's connectors (if any) has a port at `point`, within the attach tolerance. */
export function findNearbyConnector(structure: Structure, point: Point3D): ConnectorInstance | null {
  for (const connector of Object.values(structure.connectors)) {
    if (distance(point, connector.position) <= CONNECTOR_ATTACH_TOLERANCE) return connector;
  }
  return null;
}

/**
 * Pipe endpoints that aren't already plugged into some *other* connector,
 * restricted to the given structure-local Z — the only depth a dragged
 * connector can ever land on, since a drag gesture stays within one flat
 * plane the whole time (see useGroundDrag). `excludeConnectorId` leaves out
 * the connector being dragged itself, so the end it's already attached to
 * (if any) still counts as a valid, snappable spot rather than "occupied by
 * me". Feed the result to `snapToCandidates` to let a drag magnet onto one
 * once the pointer gets close, while still tracking the pointer freely
 * everywhere else.
 */
export function freePipeEndsOnPlane(structure: Structure, z: number, excludeConnectorId: string): Point3D[] {
  const ends: Point3D[] = [];
  const seen = new Set<string>();
  for (const pipe of Object.values(structure.pipes)) {
    for (const end of [pipe.start, pipe.end]) {
      if (Math.abs(end.z - z) > 0.01) continue;
      const key = `${end.x},${end.y},${end.z}`;
      if (seen.has(key)) continue; // two pipes can share an endpoint
      const occupant = findNearbyConnector(structure, end);
      if (occupant && occupant.id !== excludeConnectorId) continue;
      seen.add(key);
      ends.push(end);
    }
  }
  return ends;
}
