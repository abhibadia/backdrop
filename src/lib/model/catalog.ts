import {
  CONNECTOR_TYPES,
  ConnectorType,
  PIPE_SIZES,
  PartCatalogEntry,
  PipeSize,
} from "./types";

export const PIPE_SIZE_LABEL: Record<PipeSize, string> = {
  quarter: '1/4"',
  half: '1/2"',
  threeQuarter: '3/4"',
  full: 'Full (1")',
};

/** Nominal outer diameter in inches, used only for relative visual scale. */
export const PIPE_SIZE_DIAMETER_IN: Record<PipeSize, number> = {
  quarter: 0.25,
  half: 0.5,
  threeQuarter: 0.75,
  full: 1,
};

/**
 * PLACEHOLDER nominal pipe lengths, in inches. Real-world stock lengths
 * weren't specified, so these are round configurable stand-ins — edit
 * freely to match actual inventory. Used only for the "≈ nearest size"
 * classification hint shown while drawing; drawn pipe length is never
 * snapped/forced to these values.
 */
export const PIPE_SIZE_NOMINAL_LENGTH_IN: Record<PipeSize, number> = {
  quarter: 24,
  half: 48,
  threeQuarter: 72,
  full: 96,
};

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
  elbow45: "45deg Elbow",
  tee: "Tee",
  cross: "Cross",
  coupler: "Coupler",
  flange: "Flange",
  cap: "Cap",
  fourWay: "4-Way",
};

/** Number of open pipe ends a connector of this type has, for reference. */
export const CONNECTOR_TYPE_PORTS: Record<ConnectorType, number> = {
  elbow90: 2,
  elbow45: 2,
  tee: 3,
  cross: 4,
  coupler: 2,
  flange: 1,
  cap: 1,
  fourWay: 4,
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
