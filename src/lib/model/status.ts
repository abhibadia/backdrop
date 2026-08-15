import { Structure, StructureStatus } from "./types";

/**
 * Derives a structure's build status badge. Pure function of the structure
 * itself so it never drifts from the underlying pipes/connectors/calibration.
 */
export function getStructureStatus(structure: Structure): StructureStatus {
  if (structure.constructionLocked) return "complete";
  if (!structure.calibration) return "unscaled";
  const elementCount =
    Object.keys(structure.pipes).length + Object.keys(structure.connectors).length;
  if (elementCount === 0) return "ready";
  return "building";
}

export const STRUCTURE_STATUS_LABEL: Record<StructureStatus, string> = {
  unscaled: "Unscaled",
  ready: "Ready",
  building: "Building",
  complete: "Complete",
};
