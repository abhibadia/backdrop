"use client";

/**
 * This component's entire job is imperatively driving the Three.js camera
 * and OrbitControls instance — the standard react-three-fiber pattern, since
 * those are plain mutable graphics objects, not React-managed state. The
 * `react-hooks/immutability` rule (aimed at real React values) doesn't apply
 * here, hence the blanket disable below.
 */
/* eslint-disable react-hooks/immutability */

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { Structure } from "@/lib/model/types";
import { computeSceneBounds3D } from "@/lib/canvas3d/autoFrame";

interface AutoFrameCameraProps {
  structures: Structure[];
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
}

// A pleasant three-quarter viewing angle, scaled out to whatever distance
// frames the current content.
const VIEW_DIRECTION = new THREE.Vector3(0.4, 0.32, 1).normalize();

/**
 * Frames the camera on the current set of visible structures whenever that
 * set changes (upload, delete, show/hide) — but not on every drag/rotate, so
 * it never fights the user's manual camera control mid-edit.
 */
export function AutoFrameCamera({ structures, controlsRef }: AutoFrameCameraProps) {
  const { camera } = useThree();
  const visibleKey = structures
    .filter((s) => s.visible)
    .map((s) => s.id)
    .sort()
    .join(",");
  const lastKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (lastKeyRef.current === visibleKey) return;
    lastKeyRef.current = visibleKey;

    const bounds = computeSceneBounds3D(structures);
    const controls = controlsRef.current;
    if (!bounds || !controls) return;

    const perspective = camera as THREE.PerspectiveCamera;
    const fovRad = (perspective.fov ?? 50) * (Math.PI / 180);
    const distance = (bounds.radius / Math.sin(fovRad / 2)) * 1.15;
    const center = new THREE.Vector3(...bounds.center);
    const position = center.clone().add(VIEW_DIRECTION.clone().multiplyScalar(distance));

    camera.position.copy(position);
    controls.target.copy(center);
    perspective.near = Math.max(1, distance / 100);
    perspective.far = distance * 20;
    perspective.updateProjectionMatrix();
    controls.update();
  }, [visibleKey, structures, camera, controlsRef]);

  return null;
}
