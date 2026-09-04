"use client";

/**
 * Imperatively drives the Three.js camera/OrbitControls in response to a
 * one-shot request from the toolbar's X/Y/Z buttons — the standard
 * react-three-fiber pattern for mutable graphics objects (see
 * AutoFrameCamera for the same rationale).
 */

import { useEffect } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { useUIStore } from "@/lib/store/uiStore";

interface AxisViewCameraProps {
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
}

const AXIS_DIRECTIONS: Record<"x" | "y" | "z", THREE.Vector3> = {
  x: new THREE.Vector3(1, 0, 0),
  y: new THREE.Vector3(0, 1, 0),
  z: new THREE.Vector3(0, 0, 1),
};

/**
 * Snaps the camera to look straight down whichever world axis the user just
 * clicked in the toolbar (X = side view, Y = top-down, Z = straight-on —
 * the structure's own facing direction), keeping the current orbit target
 * and distance so it reads as "rotate to this face" rather than a reframe.
 */
export function AxisViewCamera({ controlsRef }: AxisViewCameraProps) {
  const { camera } = useThree();
  const axisViewRequest = useUIStore((s) => s.axisViewRequest);
  const clearAxisViewRequest = useUIStore((s) => s.clearAxisViewRequest);

  useEffect(() => {
    if (!axisViewRequest) return;
    const controls = controlsRef.current;
    if (!controls) {
      clearAxisViewRequest();
      return;
    }

    const target = controls.target.clone();
    const distance = camera.position.distanceTo(target) || 500;
    const direction = AXIS_DIRECTIONS[axisViewRequest];
    camera.position.copy(target.clone().add(direction.clone().multiplyScalar(distance)));
    // The Y-axis (top-down) view puts the view direction parallel to the
    // default up vector, which would otherwise leave OrbitControls' roll
    // undefined — pick a stable "up" (world -Z) for that one case.
    camera.up.copy(axisViewRequest === "y" ? new THREE.Vector3(0, 0, -1) : new THREE.Vector3(0, 1, 0));
    camera.lookAt(target);
    controls.update();
    clearAxisViewRequest();
  }, [axisViewRequest, camera, controlsRef, clearAxisViewRequest]);

  return null;
}
