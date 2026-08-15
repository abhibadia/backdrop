import { PipeSize } from "./types";

/** Visual stroke width (local px) per pipe size — proportional, for on-canvas legibility only. */
export const PIPE_SIZE_STROKE_WIDTH: Record<PipeSize, number> = {
  quarter: 2,
  half: 3,
  threeQuarter: 4.5,
  full: 6,
};

/** Visual connector glyph arm length (local px) per pipe size. */
export const CONNECTOR_SIZE_ARM_LENGTH: Record<PipeSize, number> = {
  quarter: 10,
  half: 13,
  threeQuarter: 16,
  full: 20,
};
