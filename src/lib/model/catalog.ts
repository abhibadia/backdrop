import {
  CONNECTOR_TYPES,
  ConnectorType,
  PIPE_SIZES,
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
};

/** Number of open pipe ends a connector of this type has, for reference. */
export const CONNECTOR_TYPE_PORTS: Record<ConnectorType, number> = {
  elbow90: 2,
  tee: 3,
  fourWay: 4,
  coupler: 2,
  triangle: 3,
};

/**
 * Port stub directions (degrees, 0 = +x, counter-clockwise) that define each
 * connector type's icon/glyph — shared by the 2D canvas glyph and the 3D
 * fitting mesh so the two stay visually consistent.
 */
export const CONNECTOR_PORT_ANGLES: Record<ConnectorType, number[]> = {
  elbow90: [180, 270],
  tee: [90, 180, 270],
  fourWay: [0, 90, 180, 270],
  coupler: [0, 180],
  // Evenly spaced 120° apart (a symmetric Y), unlike the Tee's 90/180/270
  // straight-through-plus-branch layout — this is the "triangular" fitting.
  triangle: [90, 210, 330],
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
