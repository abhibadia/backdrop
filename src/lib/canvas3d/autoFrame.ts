import { Structure } from "@/lib/model/types";
import { degToRad } from "@/lib/utils/geometry";
import { structureWorldPosition } from "./coordinates3d";

export interface SceneBounds3D {
  center: [number, number, number];
  /** Bounding-sphere radius encompassing every visible structure. */
  radius: number;
}

/**
 * Computes a world-space bounding sphere over every visible structure's
 * plane, straight from store data (transform + image size) rather than the
 * live Three.js scene graph — this way framing doesn't depend on textures
 * having finished loading yet.
 */
export function computeSceneBounds3D(structures: Structure[]): SceneBounds3D | null {
  const visible = structures.filter((s) => s.visible);
  if (visible.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const structure of visible) {
    const { naturalWidth: w, naturalHeight: h } = structure.image;
    const [cx, cy] = structureWorldPosition(structure.transform);
    const rad = degToRad(structure.transform.rotation);
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const corners = [
      { x: -w / 2, y: -h / 2 },
      { x: w / 2, y: -h / 2 },
      { x: w / 2, y: h / 2 },
      { x: -w / 2, y: h / 2 },
    ];
    for (const corner of corners) {
      const worldX = cx + corner.x * cos - corner.y * sin;
      const worldY = cy + corner.x * sin + corner.y * cos;
      minX = Math.min(minX, worldX);
      minY = Math.min(minY, worldY);
      maxX = Math.max(maxX, worldX);
      maxY = Math.max(maxY, worldY);
    }
  }

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const radius = Math.max(50, Math.hypot(maxX - minX, maxY - minY) / 2);

  return { center: [centerX, centerY, 0], radius };
}
