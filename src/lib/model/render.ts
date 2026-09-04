/**
 * `PipeSize` denotes standard stock *length* (see catalog.ts's
 * PIPE_SIZE_NOMINAL_LENGTH_IN — "full" is 2m, the others are proportional
 * fractions of that), not pipe diameter. Every pipe/connector therefore
 * renders at one fixed physical diameter regardless of size — there's no
 * per-size visual thickness to look up anymore.
 */

/** 3D pipe cylinder radius (scene units), same for every pipe regardless of size. */
export const PIPE_RADIUS_3D = 7;

/** 3D connector fitting arm length (scene units), same for every connector regardless of size. */
export const CONNECTOR_ARM_LENGTH_3D = 20;

/**
 * Depth (structure-local Z) of the build lattice's "on the image" layer —
 * negative, i.e. behind the image plane (z=0), not coincident with it. A
 * pipe is a cylinder with real radius, so a pipe centered exactly at z=0
 * pokes out in front of the (opaque) image by that radius, visually
 * bisecting it; sitting behind by more than the radius keeps the whole pipe
 * — and the connectors that snap to it — cleanly out of the image's way,
 * reading as a support structure the backdrop is mounted on rather than
 * something skewering it.
 */
export const IMAGE_BACK_LAYER_Z = -(PIPE_RADIUS_3D + 3);

/**
 * Selection/highlight color used throughout the 3D scene — matches the
 * app's brand accent (--accent in globals.css). Kept as a plain constant
 * rather than reading the CSS variable: the 3D viewport's own colors don't
 * respond to the light/dark theme toggle (see the note in globals.css), so
 * this only ever needs the one value.
 */
export const SELECTION_COLOR_3D = "#7c93c4";
