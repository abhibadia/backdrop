import {
  ConnectorInstance,
  ConnectorType,
  Light,
  PipeSegment,
  PipeSize,
  Point,
  Project,
  Structure,
  StructureImage,
} from "./types";
import {
  generateConnectorId,
  generateLightId,
  generatePipeId,
  generateProjectId,
  generateStructureId,
} from "@/lib/utils/id";

export function createEmptyProject(name = "Untitled Project"): Project {
  const now = Date.now();
  return {
    id: generateProjectId(),
    name,
    units: "in",
    structures: {},
    structureOrder: [],
    studio: {
      placements: {},
      lights: {},
      backgroundColor: "#0b0d10",
    },
    inventoryOverrides: {},
    createdAt: now,
    updatedAt: now,
  };
}

export function createStructure(
  image: StructureImage,
  order: number,
  name?: string,
): Structure {
  const now = Date.now();
  return {
    id: generateStructureId(),
    name: name ?? image.fileName.replace(/\.[^/.]+$/, ""),
    order,
    image,
    transform: { x: 0, y: 0, rotation: 0 },
    visible: true,
    locked: false,
    constructionLocked: false,
    calibration: null,
    pipes: {},
    connectors: {},
    buildGridSpacing: 6,
    createdAt: now,
    updatedAt: now,
  };
}

export function createPipe(
  size: PipeSize,
  start: Point,
  end: Point,
): PipeSegment {
  return {
    id: generatePipeId(),
    kind: "pipe",
    size,
    start,
    end,
    locked: false,
  };
}

export function createConnector(
  type: ConnectorType,
  size: PipeSize,
  position: Point,
  rotation = 0,
): ConnectorInstance {
  return {
    id: generateConnectorId(),
    kind: "connector",
    type,
    size,
    position,
    rotation,
    locked: false,
  };
}

export function createLight(x: number, y: number): Light {
  return {
    id: generateLightId(),
    x,
    y,
    rotation: -90,
    beamWidth: 40,
    color: "#ffe3a3",
    intensity: 0.8,
    falloff: 0.4,
    locked: false,
  };
}
