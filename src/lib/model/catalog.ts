import {
  CONNECTOR_TYPES,
  ConnectorType,
  PIPE_SIZES,
  Point3D,
  PartCatalogEntry,
  PipeSize,
} from "./types";

/**
 * `PipeSize` denotes standard stock *length* — "full" is a 2m piece, and the
 * other sizes are proportional fractions of that (quarter=0.5m, half=1m,
 * threeQuarter=1.5m) — not pipe diameter. Every physical pipe/connector in
 * this system has the same diameter; what varies is how long a stock piece
 * is, which is what these labels/nominal lengths describe.
 */
export const PIPE_SIZE_LABEL: Record<PipeSize, string> = {
  quarter: "0.5m",
  half: "1m",
  threeQuarter: "1.5m",
  full: "2m",
};

/** Nominal stock length in meters, per size — see the `PipeSize` note above. */
export const PIPE_SIZE_NOMINAL_LENGTH_M: Record<PipeSize, number> = {
  quarter: 0.5,
  half: 1,
  threeQuarter: 1.5,
  full: 2,
};

const M_TO_IN = 39.3700787401575;

/**
 * Nominal stock lengths in inches (derived from the meter values above), for
 * comparison against drawn pipe lengths — see `classifyPipeLengthIn`. Used
 * only for the "≈ nearest size" classification hint shown while drawing;
 * drawn pipe length is never snapped/forced to these values.
 */
export const PIPE_SIZE_NOMINAL_LENGTH_IN: Record<PipeSize, number> = Object.fromEntries(
  PIPE_SIZES.map((size) => [size, PIPE_SIZE_NOMINAL_LENGTH_M[size] * M_TO_IN]),
) as Record<PipeSize, number>;

/** Default +/- tolerance (inches) for matching a drawn length to a nominal size. */
export const PIPE_CLASSIFICATION_TOLERANCE_IN = 0.5;

/**
 * Classifies a real-world pipe length (in inches) against the nominal
 * lengths above. Returns the closest matching size within tolerance, or
 * `null` if nothing is close enough ("Custom" length).
 */
export function classifyPipeLengthIn(
  lengthIn: number,
  tolerance = PIPE_CLASSIFICATION_TOLERANCE_IN,
): PipeSize | null {
  let best: PipeSize | null = null;
  let bestDelta = Infinity;
  for (const size of PIPE_SIZES) {
    const delta = Math.abs(lengthIn - PIPE_SIZE_NOMINAL_LENGTH_IN[size]);
    if (delta <= tolerance && delta < bestDelta) {
      best = size;
      bestDelta = delta;
    }
  }
  return best;
}

export const CONNECTOR_TYPE_LABEL: Record<ConnectorType, string> = {
  elbow90: "90deg Elbow",
  tee: "Tee",
  fourWay: "4-Way",
  coupler: "Coupler",
  triangle: "Triangular",
  triAxis: "3-Way XYZ",
  // Retired from the picker (see the ConnectorType note in types.ts) but
  // still labeled so a connector already placed with one of these renders
  // correctly instead of crashing.
  elbow45: "45deg Elbow",
  cross: "Cross",
  flange: "Flange",
  cap: "Cap",
};

/** Number of open pipe ends a connector of this type has, for reference. */
export const CONNECTOR_TYPE_PORTS: Record<ConnectorType, number> = {
  elbow90: 2,
  tee: 3,
  fourWay: 4,
  coupler: 2,
  triangle: 3,
  triAxis: 3,
  elbow45: 2,
  cross: 4,
  flange: 1,
  cap: 1,
};

/** A unit vector at `deg` degrees in the XY plane (0 = +x, counter-clockwise), z = 0. */
function xy(deg: number): Point3D {
  const rad = (deg * Math.PI) / 180;
  return { x: Math.cos(rad), y: Math.sin(rad), z: 0 };
}

/**
 * Port stub directions — unit vectors in the connector's own local space,
 * before its rotation is applied — that define each type's fitting geometry.
 * Shared by the 3D fitting mesh (ConnectorMesh3D), the placement preview
 * (BuildGridLattice3D), and the port-occupancy/attach logic
 * (connectorPorts.ts) so all three stay consistent. Every existing type's
 * ports lie flat in the local XY plane (z = 0); `triAxis` is the exception —
 * a genuinely 3D fitting with one port along each principal axis, only
 * possible now that a connector's rotation is a full 3D orientation rather
 * than a single Z-axis angle (see Rotation3D in types.ts).
 */
export const CONNECTOR_PORT_DIRECTIONS: Record<ConnectorType, Point3D[]> = {
  elbow90: [xy(180), xy(270)],
  tee: [xy(90), xy(180), xy(270)],
  fourWay: [xy(0), xy(90), xy(180), xy(270)],
  coupler: [xy(0), xy(180)],
  // Evenly spaced 120° apart (a symmetric Y), unlike the Tee's 90/180/270
  // straight-through-plus-branch layout — this is the "triangular" fitting.
  triangle: [xy(90), xy(210), xy(330)],
  triAxis: [
    { x: 1, y: 0, z: 0 },
    { x: 0, y: 1, z: 0 },
    { x: 0, y: 0, z: 1 },
  ],
  elbow45: [xy(180), xy(225)],
  cross: [xy(0), xy(90), xy(180), xy(270)],
  flange: [xy(180)],
  cap: [xy(180)],
};

export function pipePartKey(size: PipeSize): string {
  return `pipe:${size}`;
}

export function connectorPartKey(type: ConnectorType, size: PipeSize): string {
  return `connector:${type}:${size}`;
}

/** Full static catalog of every stockable part (pipes x sizes, connectors x types x sizes). */
export const PART_CATALOG: PartCatalogEntry[] = [
  ...PIPE_SIZES.map<PartCatalogEntry>((size) => ({
    partKey: pipePartKey(size),
    category: "pipe",
    label: `${PIPE_SIZE_LABEL[size]} Pipe`,
    size,
  })),
  ...CONNECTOR_TYPES.flatMap<PartCatalogEntry>((type) =>
    PIPE_SIZES.map<PartCatalogEntry>((size) => ({
      partKey: connectorPartKey(type, size),
      category: "connector",
      label: `${PIPE_SIZE_LABEL[size]} ${CONNECTOR_TYPE_LABEL[type]}`,
      size,
      connectorType: type,
    })),
  ),
];

export const PART_CATALOG_BY_KEY: Record<string, PartCatalogEntry> = Object.fromEntries(
  PART_CATALOG.map((entry) => [entry.partKey, entry]),
);
