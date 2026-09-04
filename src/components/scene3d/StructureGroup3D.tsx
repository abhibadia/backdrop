"use client";

import { Structure } from "@/lib/model/types";
import { structureWorldPosition, structureWorldRotationZ } from "@/lib/canvas3d/coordinates3d";
import { useUIStore } from "@/lib/store/uiStore";
import { StructurePlane3D } from "./StructurePlane3D";
import { PipeMesh3D } from "./PipeMesh3D";
import { ConnectorMesh3D } from "./ConnectorMesh3D";
import { BuildGridLattice3D } from "./BuildGridLattice3D";
import { CalibrationPicker3D } from "./CalibrationPicker3D";

interface StructureGroup3DProps {
  structure: Structure;
}

export function StructureGroup3D({ structure }: StructureGroup3DProps) {
  const mode = useUIStore((s) => s.mode);
  const activeStructureId = useUIStore((s) => s.activeStructureId);
  const selectedStructureId = useUIStore((s) => s.selectedStructureId);

  if (!structure.visible) return null;

  const isBuildTarget = mode === "build" && activeStructureId === structure.id;
  const isSelected = selectedStructureId === structure.id || isBuildTarget;
  const interactive = mode === "view" && !structure.locked;
  const constructionInteractive = isBuildTarget;
  const showBuildOverlay = isBuildTarget && !structure.constructionLocked;

  return (
    <group
      position={structureWorldPosition(structure.transform)}
      rotation={[0, 0, structureWorldRotationZ(structure.transform.rotation)]}
    >
      <StructurePlane3D
        structure={structure}
        isSelected={isSelected}
        isBuildTarget={isBuildTarget}
        interactive={interactive}
      />
      {Object.values(structure.pipes).map((pipe) => (
        <PipeMesh3D key={pipe.id} structure={structure} pipe={pipe} interactive={constructionInteractive} />
      ))}
      {Object.values(structure.connectors).map((connector) => (
        <ConnectorMesh3D
          key={connector.id}
          structure={structure}
          connector={connector}
          interactive={constructionInteractive}
        />
      ))}
      {showBuildOverlay && <BuildGridLattice3D structure={structure} />}
      <CalibrationPicker3D structure={structure} />
    </group>
  );
}
