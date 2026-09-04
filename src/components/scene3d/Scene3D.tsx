"use client";

import { useMemo, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { useProjectStore } from "@/lib/store/projectStore";
import { useUIStore } from "@/lib/store/uiStore";
import { OrbitControlsProvider } from "@/lib/canvas3d/OrbitControlsContext";
import { computeSceneBounds3D } from "@/lib/canvas3d/autoFrame";
import { StructureGroup3D } from "./StructureGroup3D";
import { AutoFrameCamera } from "./AutoFrameCamera";
import { AxisViewCamera } from "./AxisViewCamera";
import { SceneGrids } from "./SceneGrids";

/**
 * The 3D designer workspace. Replaces the 2D Konva stage: structures are
 * flat textured planes floating in a scene you can freely orbit, pan, and
 * zoom around — including behind — while pipes/connectors render as real 3D
 * geometry on their surface.
 */
export function Scene3D() {
  const structures = useProjectStore((s) => s.project.structures);
  const structureOrder = useProjectStore((s) => s.project.structureOrder);
  const mode = useUIStore((s) => s.mode);
  const setSelectedStructureId = useUIStore((s) => s.setSelectedStructureId);
  const controlsRef = useRef<OrbitControlsImpl | null>(null);

  const structureList = useMemo(
    () => structureOrder.map((id) => structures[id]).filter((s): s is NonNullable<typeof s> => !!s),
    [structureOrder, structures],
  );

  // Bounding sphere over everything currently placed, used to push the
  // reference grid out past whatever's in the scene (see SceneGrids) so it
  // never cuts through a structure regardless of where it's positioned.
  // Build Mode's up-close grid comes from BuildGridLattice3D instead, which
  // is scoped to (and touches) the structure actually being worked on.
  const viewBounds = useMemo(
    () => computeSceneBounds3D(structureList) ?? { center: [0, 0, 0] as [number, number, number], radius: 1000 },
    [structureList],
  );

  return (
    <div className="relative h-full w-full bg-[var(--canvas-bg)]">
      <Canvas
        camera={{ position: [400, 300, 900], fov: 50, near: 1, far: 100000 }}
        onPointerMissed={() => {
          if (mode === "view") setSelectedStructureId(null);
        }}
      >
        <color attach="background" args={["#0b0d10"]} />
        <ambientLight intensity={0.7} />
        <directionalLight position={[500, 800, 600]} intensity={1.1} />
        <directionalLight position={[-400, 200, -500]} intensity={0.35} />

        {/* Distant reference grids on all three principal planes (back,
            floor, side wall) — see SceneGrids for why each is pushed out
            past everything currently placed. Only shown in View Mode; Build
            Mode's grid comes from BuildGridLattice3D instead, which actually
            touches the structure being worked on. */}
        {mode === "view" && <SceneGrids bounds={viewBounds} />}

        <OrbitControlsProvider
          value={{
            setControlsEnabled: (enabled) => {
              if (controlsRef.current) controlsRef.current.enabled = enabled;
            },
          }}
        >
          {structureList.map((structure) => (
            <StructureGroup3D key={structure.id} structure={structure} />
          ))}
        </OrbitControlsProvider>

        <OrbitControls
          ref={controlsRef}
          makeDefault
          enableDamping
          dampingFactor={0.08}
          minDistance={50}
          maxDistance={20000}
        />
        <AutoFrameCamera structures={structureList} controlsRef={controlsRef} />
        <AxisViewCamera controlsRef={controlsRef} />
      </Canvas>
    </div>
  );
}
