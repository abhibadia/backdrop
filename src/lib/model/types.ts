/**
 * Core domain types shared across View Mode, Build Mode, Inventory, and
 * Studio Mode. Flat 2D content (calibration points, which are measured
 * directly on the structure image) is stored in "structure-local pixel
 * space" (see src/lib/canvas/coordinates.ts) as a `Point`. Pipes/connectors
 * are free 3D geometry and use `Point3D` (structure-local scene units — see
 * src/lib/canvas3d/coordinates3d.ts) so they aren't confined to the image's
 * flat plane.
 */

export type Units = "in" | "ft" | "cm" | "m";

export interface Point {
  x: number;
  y: number;
}

/**
 * A free 3D point (scene units, structure-local — see coordinates3d.ts).
 * Pipes/connectors are placed with one of these per endpoint/position, so a
 * pipe can run in any direction rather than being confined to a single flat
 * plane.
 */
export interface Point3D {
  x: number;
  y: number;
  z: number;
}

/**
 * A full 3D orientation, degrees per axis, applied in THREE.js's default
 * Euler order ("XYZ": rotate around X, then the once-rotated Y, then the
 * twice-rotated Z) — see rotateVector in connectorPorts.ts, which replicates
 * this exact convention without depending on `three` so the model layer
 * stays renderer-agnostic. Lets a connector's ports point any direction in
 * space, not just within the image's flat XY plane.
 */
export interface Rotation3D {
  x: number;
  y: number;
  z: number;
}

/** A 2-point real-world scale calibration for a structure image. */
export interface Calibration {
  pointA: Point;
  pointB: Point;
  /** Real-world distance between pointA and pointB, in `unit`. */
  realDistance: number;
  unit: Units;
  /** Derived: image pixels per one `unit`. */
  pixelsPerUnit: number;
}

/** Nominal pipe sizes supported by the build system. */
export type PipeSize = "quarter" | "half" | "threeQuarter" | "full";

export const PIPE_SIZES: PipeSize[] = ["quarter", "half", "threeQuarter", "full"];

/**
 * Connector/fitting kinds recognized by the build system. This includes four
 * retired types (elbow45, cross, flange, cap) alongside the six current
 * ones — kept purely so a connector of a retired type that's already saved
 * in someone's project still resolves to real geometry/labels (see
 * CONNECTOR_PORT_DIRECTIONS etc. in catalog.ts) instead of crashing the 3D
 * view. They are deliberately excluded from `CONNECTOR_TYPES` below, which is
 * what drives the type picker — so they can't be placed again, only still
 * exist where they already were.
 */
export type ConnectorType =
  | "elbow90"
  | "tee"
  | "fourWay"
  | "coupler"
  | "triangle"
  | "triAxis"
  | "elbow45"
  | "cross"
  | "flange"
  | "cap";

/** The six connector types offered for new placement — see the ConnectorType note above. */
export const CONNECTOR_TYPES: ConnectorType[] = [
  "elbow90",
  "tee",
  "fourWay",
  "coupler",
  "triangle",
  "triAxis",
];

/** A single placed pipe segment. Endpoints are free 3D points — a pipe can run in any direction. */
export interface PipeSegment {
  id: string;
  kind: "pipe";
  size: PipeSize;
  start: Point3D;
  end: Point3D;
  locked: boolean;
  label?: string;
}

/** A single placed connector/fitting, positioned at a free 3D point. */
export interface ConnectorInstance {
  id: string;
  kind: "connector";
  type: ConnectorType;
  size: PipeSize;
  position: Point3D;
  /** Full 3D orientation — lets a connector's ports point any direction, not just within one flat plane. */
  rotation: Rotation3D;
  locked: boolean;
  label?: string;
}

export type BuildElement = PipeSegment | ConnectorInstance;

/** World-space placement of a structure's image/build group in View Mode. */
export interface Transform2D {
  x: number;
  y: number;
  /** Rotation in degrees. */
  rotation: number;
}

export interface StructureImage {
  id: string;
  fileName: string;
  mimeType: string;
  /** Key used to look up the original image Blob in IndexedDB. */
  blobKey: string;
  naturalWidth: number;
  naturalHeight: number;
}

export interface Structure {
  id: string;
  name: string;
  order: number;
  image: StructureImage;
  transform: Transform2D;
  visible: boolean;
  /** Locks the image/reference itself (move/rotate/resize). */
  locked: boolean;
  /** Locks all pipes/connectors as a group ("Lock Construction"); marks the build complete. */
  constructionLocked: boolean;
  calibration: Calibration | null;
  pipes: Record<string, PipeSegment>;
  connectors: Record<string, ConnectorInstance>;
  /** Grid spacing for Build Mode snapping, in real units once calibrated. */
  buildGridSpacing: number;
  createdAt: number;
  updatedAt: number;
}

export type StructureStatus = "unscaled" | "ready" | "building" | "complete";

export type PartCategory = "pipe" | "connector";

/** Stable catalog entry describing a purchasable/stockable part. */
export interface PartCatalogEntry {
  partKey: string;
  category: PartCategory;
  label: string;
  size: PipeSize;
  connectorType?: ConnectorType;
}

/** User-entered on-hand quantity for a given part, keyed by partKey. */
export interface InventoryOverride {
  partKey: string;
  available: number;
}

export interface Light {
  id: string;
  x: number;
  y: number;
  /** Aim direction in degrees. */
  rotation: number;
  /** Cone angle in degrees. */
  beamWidth: number;
  color: string;
  /** 0 - 1 */
  intensity: number;
  /** 0 - 1, higher falls off faster. */
  falloff: number;
  locked: boolean;
  label?: string;
}

export interface StudioPlacement {
  structureId: string;
  x: number;
  y: number;
  rotation: number;
  scale: number;
}

export interface StudioScene {
  placements: Record<string, StudioPlacement>;
  lights: Record<string, Light>;
  backgroundColor: string;
}

export interface Project {
  id: string;
  name: string;
  units: Units;
  structures: Record<string, Structure>;
  structureOrder: string[];
  studio: StudioScene;
  inventoryOverrides: Record<string, InventoryOverride>;
  createdAt: number;
  updatedAt: number;
}

/** Aggregated bill-of-materials line item for a single part. */
export interface BomLine {
  partKey: string;
  category: PartCategory;
  label: string;
  size: PipeSize;
  connectorType?: ConnectorType;
  count: number;
  /** Only set for pipe lines: total real-world length required. */
  totalLength?: number;
  unit?: Units;
}

export interface InventoryLine extends BomLine {
  available: number;
  remaining: number;
}
