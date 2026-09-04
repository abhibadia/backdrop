"use client";

import { Grid } from "@react-three/drei";
import type { SceneBounds3D } from "@/lib/canvas3d/autoFrame";
import { SCENE_GRID_COLORS } from "@/lib/model/render";
import { useUIStore } from "@/lib/store/uiStore";

interface SceneGridsProps {
  bounds: SceneBounds3D;
}

const SHARED_GRID_PROPS = {
  cellSize: 50,
  cellThickness: 0.5,
  sectionSize: 250,
  sectionThickness: 1,
  fadeStrength: 1,
  infiniteGrid: true,
} as const;

/**
 * Three reference grids — one per principal plane (back/XY, floor/XZ,
 * side-wall/YZ) — giving depth cues in every direction you orbit, not just
 * parallel to a structure's face. View Mode only — Build Mode's grid comes
 * from BuildGridLattice3D instead, which actually touches the structure.
 *
 * Each is pushed out along its fixed axis to `bounds.center ± (radius +
 * margin)`, i.e. just outside the bounding sphere passed in. That guarantees
 * the grid plane never intersects/slices through any structure, however it's
 * positioned or sized — unlike a fixed world-space offset, which only avoids
 * collision by coincidence for whatever happens to be on screen.
 */
export function SceneGrids({ bounds }: SceneGridsProps) {
  const theme = useUIStore((s) => s.theme);
  const colors = SCENE_GRID_COLORS[theme];
  const [cx, cy, cz] = bounds.center;
  const offset = bounds.radius * 1.4 + 200;
  const size = Math.max(20000, bounds.radius * 6);
  const fadeDistance = Math.max(8000, offset * 3);

  return (
    <>
      {/* Back grid: parallel to structure planes (constant Z), behind them. */}
      <Grid
        {...SHARED_GRID_PROPS}
        cellColor={colors.cell}
        sectionColor={colors.section}
        position={[cx, cy, cz - offset]}
        rotation={[Math.PI / 2, 0, 0]}
        args={[size, size]}
        fadeDistance={fadeDistance}
      />
      {/* Floor grid: horizontal (constant Y), below everything. */}
      <Grid
        {...SHARED_GRID_PROPS}
        cellColor={colors.cell}
        sectionColor={colors.section}
        position={[cx, cy - offset, cz]}
        args={[size, size]}
        fadeDistance={fadeDistance}
      />
      {/* Side-wall grid: vertical (constant X), beside everything. */}
      <Grid
        {...SHARED_GRID_PROPS}
        cellColor={colors.cell}
        sectionColor={colors.section}
        position={[cx - offset, cy, cz]}
        rotation={[0, 0, Math.PI / 2]}
        args={[size, size]}
        fadeDistance={fadeDistance}
      />
    </>
  );
}
