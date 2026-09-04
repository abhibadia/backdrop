"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { ThreeEvent } from "@react-three/fiber";
import { Structure } from "@/lib/model/types";
import { useImageTexture } from "@/lib/canvas3d/useImageTexture";
import { useGroundDrag } from "@/lib/canvas3d/useGroundDrag";
import { useProjectStore } from "@/lib/store/projectStore";
import { useUIStore } from "@/lib/store/uiStore";

interface StructurePlane3DProps {
  structure: Structure;
  isSelected: boolean;
  isBuildTarget: boolean;
  interactive: boolean;
}

export function StructurePlane3D({ structure, isSelected, isBuildTarget, interactive }: StructurePlane3DProps) {
  const texture = useImageTexture(structure.image.blobKey);
  const setStructureTransform = useProjectStore((s) => s.setStructureTransform);
  const setSelectedStructureId = useUIStore((s) => s.setSelectedStructureId);
  const enterBuildMode = useUIStore((s) => s.enterBuildMode);
  const mode = useUIStore((s) => s.mode);

  const { naturalWidth: w, naturalHeight: h } = structure.image;

  const beginDrag = useGroundDrag((point) => {
    setStructureTransform(structure.id, {
      x: point.x,
      y: -point.y,
      rotation: structure.transform.rotation,
    });
  });

  const borderPoints = useMemo(
    () =>
      [
        [-w / 2, -h / 2, 0.5],
        [w / 2, -h / 2, 0.5],
        [w / 2, h / 2, 0.5],
        [-w / 2, h / 2, 0.5],
        [-w / 2, -h / 2, 0.5],
      ] as [number, number, number][],
    [w, h],
  );

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (!interactive) return;
    e.stopPropagation();
    if (mode === "view") setSelectedStructureId(structure.id);
    beginDrag(e);
  };

  return (
    <group>
      {texture && (
        <mesh
          onPointerDown={handlePointerDown}
          onDoubleClick={(e) => {
            e.stopPropagation();
            enterBuildMode(structure.id);
          }}
        >
          <planeGeometry args={[w, h]} />
          <meshBasicMaterial
            map={texture}
            side={THREE.DoubleSide}
            transparent
            opacity={isBuildTarget ? 0.5 : 1}
            color={isBuildTarget ? "#9aa0aa" : "#ffffff"}
            toneMapped={false}
          />
        </mesh>
      )}
      {isSelected && (
        <line>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[new Float32Array(borderPoints.flat()), 3]}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#22d3ee" linewidth={2} />
        </line>
      )}
    </group>
  );
}
