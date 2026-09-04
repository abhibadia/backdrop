"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { ThreeEvent } from "@react-three/fiber";
import { ConnectorInstance, Structure } from "@/lib/model/types";
import { useGroundDrag } from "@/lib/canvas3d/useGroundDrag";
import { useClickGuard } from "@/lib/canvas3d/useClickGuard";
import { CONNECTOR_ARM_LENGTH_3D, PIPE_RADIUS_3D, SELECTION_COLOR_3D } from "@/lib/model/render";
import { CONNECTOR_PORT_ANGLES } from "@/lib/model/catalog";
import { useProjectStore } from "@/lib/store/projectStore";
import { useUIStore } from "@/lib/store/uiStore";

interface ConnectorMesh3DProps {
  structure: Structure;
  connector: ConnectorInstance;
  interactive: boolean;
}

const UP = new THREE.Vector3(0, 1, 0);

export function ConnectorMesh3D({ structure, connector, interactive }: ConnectorMesh3DProps) {
  const selectedElementIds = useUIStore((s) => s.selectedElementIds);
  const toggleSelectedElementId = useUIStore((s) => s.toggleSelectedElementId);
  const activeTool = useUIStore((s) => s.activeTool);
  const updateConnector = useProjectStore((s) => s.updateConnector);

  const isSelected = selectedElementIds.includes(connector.id);
  const canDrag = interactive && !connector.locked && activeTool === "select";
  const { markPointerDown, wasDragged } = useClickGuard();
  // Connectors are free 3D geometry — position is stored directly as a
  // structure-local scene-unit vector (see coordinates3d.ts).
  const position = useMemo(
    () => new THREE.Vector3(connector.position.x, connector.position.y, connector.position.z),
    [connector.position],
  );
  const armLength = CONNECTOR_ARM_LENGTH_3D;
  const radius = PIPE_RADIUS_3D * 1.15;
  const angles = CONNECTOR_PORT_ANGLES[connector.type];
  const color = isSelected ? SELECTION_COLOR_3D : connector.locked ? "#5b616c" : "#f0ead9";

  const beginDrag = useGroundDrag((point) => {
    updateConnector(structure.id, connector.id, {
      position: { x: point.x, y: point.y, z: connector.position.z },
    });
  }, connector.position.z);

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    // Only the Select tool treats a click here as "select/toggle this
    // connector" and swallows it. Any placement tool (pipe/connector) needs
    // this same click to fall through to the build lattice behind it, so it
    // can detect "aimed at this connector" and attach/block accordingly —
    // stopping propagation here would make port-attachment impossible.
    if (!interactive || activeTool !== "select") return;
    e.stopPropagation();
    if (wasDragged(e.nativeEvent)) return;
    toggleSelectedElementId(connector.id, e.nativeEvent.shiftKey);
  };

  return (
    <group
      position={position}
      rotation={[0, 0, (connector.rotation * Math.PI) / 180]}
      onClick={handleClick}
      onPointerDown={(e) => {
        markPointerDown(e.nativeEvent);
        if (canDrag) beginDrag(e);
      }}
    >
      {/* Generous invisible hit sphere, same reasoning as PipeMesh3D. */}
      <mesh>
        <sphereGeometry args={[armLength + radius, 12, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <mesh raycast={() => null}>
        <sphereGeometry args={[radius * 1.4, 16, 16]} />
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.15} />
      </mesh>
      {angles.map((deg) => {
        const rad = (deg * Math.PI) / 180;
        const dir = new THREE.Vector3(Math.cos(rad), Math.sin(rad), 0);
        const quat = new THREE.Quaternion().setFromUnitVectors(UP, dir);
        const mid = dir.clone().multiplyScalar(armLength / 2);
        return (
          <mesh key={deg} position={mid} quaternion={quat} raycast={() => null}>
            <cylinderGeometry args={[radius, radius, armLength, 12]} />
            <meshStandardMaterial color={color} roughness={0.4} metalness={0.15} />
          </mesh>
        );
      })}
    </group>
  );
}
