import { ConnectorInstance, Point3D, Structure } from "./types";
import { CONNECTOR_PORT_ANGLES } from "./catalog";
import { distance } from "@/lib/utils/geometry";

/** How close a pipe endpoint must be to a connector's position to count as plugged into it. */
export const CONNECTOR_ATTACH_TOLERANCE = 15;
/** How close (degrees) an existing pipe's angle must be to a port's angle to count as occupying it. */
const PORT_ANGLE_MATCH_TOLERANCE_DEG = 25;

export interface ConnectorPortInfo {
  /** Absolute angle (degrees, connector.rotation already applied), XY-plane, one per port. */
  angles: number[];
  /** Parallel to `angles` — true where an existing pipe already occupies that port. */
  occupied: boolean[];
}

function angleDelta(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

/** Direction (degrees, XY-plane, 0 = +x) from `from` to `to` — depth (z) isn't part of a connector's port geometry. */
function angleTo(from: Point3D, to: Point3D): number {
  return ((Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI + 360) % 360;
}

/** Every port's absolute angle and whether an existing pipe already occupies it. */
export function getConnectorPortInfo(structure: Structure, connector: ConnectorInstance): ConnectorPortInfo {
  const angles = (CONNECTOR_PORT_ANGLES[connector.type] ?? []).map(
    (a) => (a + connector.rotation + 360) % 360,
  );
  const occupied = angles.map(() => false);

  for (const pipe of Object.values(structure.pipes)) {
    const ends: [Point3D, Point3D][] = [
      [pipe.start, pipe.end],
      [pipe.end, pipe.start],
    ];
    for (const [end, other] of ends) {
      if (distance(end, connector.position) > CONNECTOR_ATTACH_TOLERANCE) continue;
      const angle = angleTo(connector.position, other);
      let bestIdx = -1;
      let bestDelta = PORT_ANGLE_MATCH_TOLERANCE_DEG;
      angles.forEach((a, i) => {
        const d = angleDelta(a, angle);
        if (d < bestDelta) {
          bestDelta = d;
          bestIdx = i;
        }
      });
      if (bestIdx >= 0) occupied[bestIdx] = true;
    }
  }

  return { angles, occupied };
}

export function freePortIndices(info: ConnectorPortInfo): number[] {
  return info.angles.map((_, i) => i).filter((i) => !info.occupied[i]);
}

/** The connector's free port whose angle is closest to the direction from it toward `towards`, or null if none are free. */
export function bestFreePortIndex(info: ConnectorPortInfo, connectorPos: Point3D, towards: Point3D): number | null {
  const targetAngle = angleTo(connectorPos, towards);
  let bestIdx: number | null = null;
  let bestDelta = Infinity;
  info.angles.forEach((a, i) => {
    if (info.occupied[i]) return;
    const d = angleDelta(a, targetAngle);
    if (d < bestDelta) {
      bestDelta = d;
      bestIdx = i;
    }
  });
  return bestIdx;
}

/** The exact point `distanceOut` from `connectorPos`, outward along the given port's angle (z matches the connector's own). */
export function pointAtPort(connectorPos: Point3D, portAngleDeg: number, distanceOut: number): Point3D {
  const rad = (portAngleDeg * Math.PI) / 180;
  return {
    x: connectorPos.x + Math.cos(rad) * distanceOut,
    y: connectorPos.y + Math.sin(rad) * distanceOut,
    z: connectorPos.z,
  };
}

/** Which of a structure's connectors (if any) has a port at `point`, within the attach tolerance. */
export function findNearbyConnector(structure: Structure, point: Point3D): ConnectorInstance | null {
  for (const connector of Object.values(structure.connectors)) {
    if (distance(point, connector.position) <= CONNECTOR_ATTACH_TOLERANCE) return connector;
  }
  return null;
}
