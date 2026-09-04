"use client";

import { useCallback, useEffect, useRef } from "react";
import * as THREE from "three";
import { ThreeEvent, useThree } from "@react-three/fiber";
import { useOrbitControlsToggle } from "./OrbitControlsContext";

/**
 * Drag-to-reposition helper for objects that live in a horizontal-in-screen
 * plane at a given depth (`planeZ`, world/structure-local Z — see
 * coordinates3d.ts; while dragging a pipe/connector in Build Mode, world and
 * structure-local coincide since the active structure is locked to the
 * origin). While dragging, raycasts the pointer against that plane (rather
 * than against any particular mesh) so the object tracks the cursor smoothly
 * even when the pointer moves off the (possibly small) mesh it started on.
 *
 * `planeZ` is captured once per drag (at `beginDrag` time) — it deliberately
 * does not track a live-changing value mid-drag, so a drag stays in one flat
 * plane for its whole gesture.
 */
export function useGroundDrag(
  onDragMove: (point: { x: number; y: number }) => void,
  planeZ = 0,
  onDragEnd?: () => void,
) {
  const { camera, gl } = useThree();
  const { setControlsEnabled } = useOrbitControlsToggle();
  // Refs so a fresh drag session always calls the latest callbacks/depth
  // without needing them in beginDrag's own dependency array.
  const callbacksRef = useRef({ onDragMove, onDragEnd, planeZ });
  useEffect(() => {
    callbacksRef.current = { onDragMove, onDragEnd, planeZ };
  });

  const beginDrag = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      setControlsEnabled(false);
      const raycaster = new THREE.Raycaster();
      const dragPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -callbacksRef.current.planeZ);

      const handleMove = (ev: PointerEvent) => {
        const rect = gl.domElement.getBoundingClientRect();
        const ndc = new THREE.Vector2(
          ((ev.clientX - rect.left) / rect.width) * 2 - 1,
          -((ev.clientY - rect.top) / rect.height) * 2 + 1,
        );
        raycaster.setFromCamera(ndc, camera);
        const hit = new THREE.Vector3();
        const point = raycaster.ray.intersectPlane(dragPlane, hit);
        if (point) callbacksRef.current.onDragMove({ x: point.x, y: point.y });
      };

      const handleUp = () => {
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
        setControlsEnabled(true);
        callbacksRef.current.onDragEnd?.();
      };

      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
    },
    [camera, gl, setControlsEnabled],
  );

  return beginDrag;
}
