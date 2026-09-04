"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { ThreeEvent } from "@react-three/fiber";
import { PipeSegment, Structure } from "@/lib/model/types";
import { useGroundDrag } from "@/lib/canvas3d/useGroundDrag";
import { useClickGuard } from "@/lib/canvas3d/useClickGuard";
import { PIPE_RADIUS_3D, SELECTION_COLOR_3D } from "@/lib/model/render";
import { useProjectStore } from "@/lib/store/projectStore";
import { useUIStore } from "@/lib/store/uiStore";

interface PipeMesh3DProps {
  structure: Structure;
  pipe: PipeSegment;
  interactive: boolean;
}

const UP = new THREE.Vector3(0, 1, 0);

export function PipeMesh3D({ structure, pipe, interactive }: PipeMesh3DProps) {
  const selectedElementIds = useUIStore((s) => s.selectedElementIds);
  const toggleSelectedElementId = useUIStore((s) => s.toggleSelectedElementId);
  const activeTool = useUIStore((s) => s.activeTool);
  const updatePipe = useProjectStore((s) => s.updatePipe);

  const isSelected = selectedElementIds.includes(pipe.id);
  const canDrag = interactive && !pipe.locked && activeTool === "select";
  const { markPointerDown, wasDragged } = useClickGuard();

  // Pipes are free 3D geometry — start/end are stored directly as
  // structure-local scene-unit vectors (see coordinates3d.ts), no plane
  // projection needed.
  const start = useMemo(
    () => new THREE.Vector3(pipe.start.x, pipe.start.y, pipe.start.z),
    [pipe.start],
  );
  const end = useMemo(() => new THREE.Vector3(pipe.end.x, pipe.end.y, pipe.end.z), [pipe.end]);

  const { position, quaternion, length } = useMemo(() => {
    const dir = new THREE.Vector3().subVectors(end, start);
    const len = dir.length() || 0.001;
    const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    const quat = new THREE.Quaternion().setFromUnitVectors(UP, dir.clone().normalize());
    return { position: mid, quaternion: quat, length: len };
  }, [start, end]);

  const radius = PIPE_RADIUS_3D;

  // Each endpoint drags within a plane at its own current depth, so moving
  // one end doesn't disturb the pipe's depth — only its x/y at that depth.
  const beginStartDrag = useGroundDrag((point) => {
    updatePipe(structure.id, pipe.id, { start: { x: point.x, y: point.y, z: pipe.start.z } });
  }, pipe.start.z);
  const beginEndDrag = useGroundDrag((point) => {
    updatePipe(structure.id, pipe.id, { end: { x: point.x, y: point.y, z: pipe.end.z } });
  }, pipe.end.z);

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    // Only the Select tool treats a click here as "select/toggle this pipe"
    // and swallows it. A placement tool needs the same click to fall through
    // to the build lattice behind it (e.g. to attach a new pipe's other end
    // to a connector standing right next to this one).
    if (!interactive || activeTool !== "select") return;
    e.stopPropagation();
    if (wasDragged(e.nativeEvent)) return;
    toggleSelectedElementId(pipe.id, e.nativeEvent.shiftKey);
  };

  const color = isSelected ? SELECTION_COLOR_3D : pipe.locked ? "#5b616c" : "#c7ccd4";

  // A generously-sized invisible hit cylinder handles clicks/selection —
  // a thin pipe is an easy miss otherwise, especially at a distance or
  // steep viewing angle. The visible pipe itself opts out of raycasting so
  // the two don't fight over the same click.
  const hitRadius = Math.max(radius + 8, radius * 2.5);

  return (
    <group>
      <mesh
        position={position}
        quaternion={quaternion}
        onPointerDown={(e) => markPointerDown(e.nativeEvent)}
        onClick={handleClick}
      >
        <cylinderGeometry args={[hitRadius, hitRadius, length, 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <mesh position={position} quaternion={quaternion} raycast={() => null}>
        <cylinderGeometry args={[radius, radius, length, 16]} />
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.15} />
      </mesh>
      {isSelected && (
        <>
          <mesh
            position={start}
            onPointerDown={(e) => canDrag && beginStartDrag(e)}
          >
            <sphereGeometry args={[radius + 3, 16, 16]} />
            <meshStandardMaterial color={SELECTION_COLOR_3D} />
          </mesh>
          <mesh
            position={end}
            onPointerDown={(e) => canDrag && beginEndDrag(e)}
          >
            <sphereGeometry args={[radius + 3, 16, 16]} />
            <meshStandardMaterial color={SELECTION_COLOR_3D} />
          </mesh>
        </>
      )}
    </group>
  );
}
