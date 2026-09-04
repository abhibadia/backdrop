"use client";

import { useRef } from "react";

const DEFAULT_THRESHOLD_PX = 6;

/**
 * Distinguishes a real click from "the mouse happened to release over this
 * mesh after an OrbitControls drag." Three.js/R3F fire a click event
 * whenever pointerdown and pointerup land on the same object — regardless of
 * how far the pointer moved in between, since orbiting the camera is itself
 * a drag gesture that starts and often ends over the same big invisible
 * catcher plane. Record the screen position on pointerdown, then check the
 * distance moved before treating a click as a deliberate one.
 */
export function useClickGuard(thresholdPx = DEFAULT_THRESHOLD_PX) {
  const downPos = useRef<{ x: number; y: number } | null>(null);

  const markPointerDown = (e: { clientX: number; clientY: number }) => {
    downPos.current = { x: e.clientX, y: e.clientY };
  };

  const wasDragged = (e: { clientX: number; clientY: number }) => {
    const down = downPos.current;
    if (!down) return false;
    const dx = e.clientX - down.x;
    const dy = e.clientY - down.y;
    return Math.hypot(dx, dy) > thresholdPx;
  };

  return { markPointerDown, wasDragged };
}
