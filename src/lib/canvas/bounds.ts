import { Structure } from "@/lib/model/types";
import { degToRad } from "@/lib/utils/geometry";

export interface WorldBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Axis-aligned world-space bounding box enclosing every visible structure (rotation-aware). */
export function computeStructuresBounds(structures: Structure[]): WorldBounds | null {
  const visible = structures.filter((s) => s.visible);
  if (visible.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const structure of visible) {
    const { naturalWidth: w, naturalHeight: h } = structure.image;
    const { x: cx, y: cy, rotation } = structure.transform;
    const rad = degToRad(rotation);
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

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}
