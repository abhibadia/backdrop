import { Calibration, Units } from "@/lib/model/types";
import { distance } from "@/lib/utils/geometry";

/** Conversion factor from each unit to inches. */
const TO_INCHES: Record<Units, number> = {
  in: 1,
  ft: 12,
  cm: 1 / 2.54,
  m: 100 / 2.54,
};

export const UNIT_LABEL: Record<Units, string> = {
  in: "in",
  ft: "ft",
  cm: "cm",
  m: "m",
};

export function convertUnits(value: number, from: Units, to: Units): number {
  if (from === to) return value;
  const inches = value * TO_INCHES[from];
  return inches / TO_INCHES[to];
}

export function buildCalibration(
  pointA: Calibration["pointA"],
  pointB: Calibration["pointB"],
  realDistance: number,
  unit: Units,
): Calibration {
  const pixelDistance = distance(pointA, pointB);
  const pixelsPerUnit = realDistance > 0 ? pixelDistance / realDistance : 0;
  return { pointA, pointB, realDistance, unit, pixelsPerUnit };
}

/** Converts a pixel length (structure-local space) to real-world units. */
export function pxToReal(px: number, calibration: Calibration | null): number {
  if (!calibration || calibration.pixelsPerUnit <= 0) return 0;
  return px / calibration.pixelsPerUnit;
}

/** Converts a real-world length to pixels (structure-local space). */
export function realToPx(real: number, calibration: Calibration | null): number {
  if (!calibration) return 0;
  return real * calibration.pixelsPerUnit;
}

export function formatReal(value: number, unit: Units, fractionDigits = 2): string {
  return `${value.toFixed(fractionDigits)} ${UNIT_LABEL[unit]}`;
}
