"use client";

import { useState } from "react";
import * as THREE from "three";
import { Grid } from "@react-three/drei";
import { ThreeEvent } from "@react-three/fiber";
import { Structure, Point3D } from "@/lib/model/types";
import { resolveSnappedPoint } from "@/lib/canvas/snapping";
import { useClickGuard } from "@/lib/canvas3d/useClickGuard";
import { createConnector, createPipe } from "@/lib/model/factory";
import {
  CONNECTOR_ARM_LENGTH_3D,
  IMAGE_BACK_LAYER_Z,
  PIPE_RADIUS_3D,
  SELECTION_COLOR_3D,
} from "@/lib/model/render";
import { CONNECTOR_PORT_ANGLES, PIPE_SIZE_NOMINAL_LENGTH_M } from "@/lib/model/catalog";
import { convertUnits, realToPx } from "@/lib/utils/units";
import { useProjectStore } from "@/lib/store/projectStore";
import { useUIStore } from "@/lib/store/uiStore";

interface BuildGridLattice3DProps {
  structure: Structure;
}

const SNAP_TOLERANCE = 15;
/** Below this, a pipe's aimed direction is too degenerate to normalize (clicked back on the start point). */
const MIN_AIM_LENGTH = 1e-6;
const ANGLE_SNAP_DEG = 15;
/** Depth layers on each side of the image plane (z=0 is the image itself). */
const DEPTH_LAYERS_EACH_SIDE = 8;
/** Height/side layers stepping outward from the image's own edges. */
const EXTENT_LAYERS_EACH_SIDE = 6;

type LayerOrientation = "xy" | "xz" | "yz";

interface LayerSpec {
  key: string;
  orientation: LayerOrientation;
  /** The value held constant on this layer (z for "xy", y for "xz", x for "yz"). */
  fixed: number;
  position: [number, number, number];
  /** Rotation/size for the plain (native-XY) invisible click-catcher plane. */
  catcherRotation: [number, number, number];
  catcherSize: [number, number];
  /**
   * Rotation/size for drei's `<Grid>`. It is NOT a plain plane — its shader
   * remaps local position as `xzy`, so at rotation=[0,0,0] it renders lying
   * in the world XZ plane (a floor), not XY. That means it needs a
   * different rotation (and sometimes a different args order) than the
   * catcher plane to end up visually coincident with it.
   */
  gridRotation: [number, number, number];
  gridSize: [number, number];
}

/**
 * Builds the click-to-place grid lattice around a structure: many parallel
 * "depth" planes running through and behind/in front of the image (so you can
 * click at a chosen depth directly, instead of dialing in an abstract number),
 * plus many planes stepping outward above/below/beside the image so the
 * buildable area isn't limited to the photo's own footprint. Every plane is a
 * real, visible grid you click directly on — the "closest to the image" one
 * sits at IMAGE_BACK_LAYER_Z, just behind the image's own plane (z=0), so
 * pipes placed on it read as a support structure behind the backdrop instead
 * of a cylinder poking out through it.
 */
function buildLayers(w: number, h: number): LayerSpec[] {
  const depthSpacing = Math.max(30, Math.round(Math.max(w, h) * 0.03));
  const depthExtent = depthSpacing * (DEPTH_LAYERS_EACH_SIDE * 2 + 2);
  const layers: LayerSpec[] = [];

  // Parallel-to-image layers, stacked through depth. The middle one sits
  // right behind the image's own plane (see IMAGE_BACK_LAYER_Z) rather than
  // exactly on it.
  for (let i = -DEPTH_LAYERS_EACH_SIDE; i <= DEPTH_LAYERS_EACH_SIDE; i++) {
    const z = IMAGE_BACK_LAYER_Z + i * depthSpacing;
    layers.push({
      key: `xy:${z}`,
      orientation: "xy",
      fixed: z,
      position: [0, 0, z],
      catcherRotation: [0, 0, 0],
      catcherSize: [w * 1.15, h * 1.15],
      gridRotation: [Math.PI / 2, 0, 0],
      gridSize: [w * 1.15, h * 1.15],
    });
  }

  // Floor-like layers stepping outward above and below the image, for
  // extending structure past its top/bottom edge.
  for (let i = 0; i < EXTENT_LAYERS_EACH_SIDE; i++) {
    for (const sign of [-1, 1] as const) {
      const y = sign * (h / 2 + i * depthSpacing);
      layers.push({
        key: `xz:${y}`,
        orientation: "xz",
        fixed: y,
        position: [0, y, 0],
        catcherRotation: [-Math.PI / 2, 0, 0],
        catcherSize: [w * 1.1, depthExtent],
        gridRotation: [0, 0, 0],
        gridSize: [w * 1.1, depthExtent],
      });
    }
  }

  // Side-wall layers stepping outward left and right of the image, for
  // extending structure past its left/right edge.
  for (let i = 0; i < EXTENT_LAYERS_EACH_SIDE; i++) {
    for (const sign of [-1, 1] as const) {
      const x = sign * (w / 2 + i * depthSpacing);
      layers.push({
        key: `yz:${x}`,
        orientation: "yz",
        fixed: x,
        position: [x, 0, 0],
        catcherRotation: [0, Math.PI / 2, 0],
        catcherSize: [depthExtent, h * 1.1],
        gridRotation: [0, 0, Math.PI / 2],
        gridSize: [h * 1.1, depthExtent],
      });
    }
  }

  return layers;
}

export function BuildGridLattice3D({ structure }: BuildGridLattice3DProps) {
  const activeTool = useUIStore((s) => s.activeTool);
  const activePipeSize = useUIStore((s) => s.activePipeSize);
  const activeConnectorType = useUIStore((s) => s.activeConnectorType);
  const gridEnabled = useUIStore((s) => s.gridEnabled);
  const snapEnabled = useUIStore((s) => s.snapEnabled);
  const touchImageOnly = useUIStore((s) => s.touchImageOnly);
  const addPipe = useProjectStore((s) => s.addPipe);
  const addConnector = useProjectStore((s) => s.addConnector);

  const [drawStart, setDrawStart] = useState<Point3D | null>(null);
  const [hover, setHover] = useState<Point3D | null>(null);
  const { markPointerDown, wasDragged } = useClickGuard();

  const isPipeTool = activeTool === "place-pipe";
  const isConnectorTool = activeTool === "place-connector";
  const { naturalWidth: w, naturalHeight: h } = structure.image;

  const resetKey = `${activeTool}:${structure.id}`;
  const [prevResetKey, setPrevResetKey] = useState(resetKey);
  if (resetKey !== prevResetKey) {
    setPrevResetKey(resetKey);
    setDrawStart(null);
    setHover(null);
  }

  // Only the placement tools need this lattice; for "select" (or anything
  // else) it must not exist at all, otherwise — since its layers sit in
  // front of/around every pipe/connector — it would silently swallow every
  // click meant for them.
  if (!isPipeTool && !isConnectorTool) return null;
  // Building requires the structure to be calibrated first — pipe length is
  // now a real-world measurement (see PIPE_SIZE_NOMINAL_LENGTH_M below), and
  // there's no way to express "2 meters" in scene units without a scale.
  // The toolbar already disables these tools with no calibration; this is
  // the enforcement that actually matters (it can't be bypassed via a
  // keyboard shortcut or any other path that flips activeTool directly).
  if (!structure.calibration) return null;
  const calibration = structure.calibration;

  // `buildGridSpacing` is a small number of the calibration's own unit (e.g.
  // "6" meaning 6 inches) — with a metric calibration that same "6" becomes
  // 6 *meters*, which for a typical structure is a grid coarser than the
  // whole image (every click snaps to the same single point). Clamp it to a
  // sane fraction of the structure's own size so the grid always stays
  // usably fine regardless of which unit was picked while calibrating.
  const gridSpacingPx = Math.min(structure.buildGridSpacing * calibration.pixelsPerUnit, Math.max(w, h) / 20);
  const fadeDistance = Math.max(2000, Math.max(w, h));
  // Pipes are drawn at an exact stock length, converted from real-world
  // meters into this structure's scene units — direction is the only thing
  // the user's second click controls, not distance.
  const pipeLengthScene = realToPx(convertUnits(PIPE_SIZE_NOMINAL_LENGTH_M[activePipeSize], "m", calibration.unit), calibration);

  const resolvePoint = (raw: Point3D, shiftKey: boolean, layer: LayerSpec): Point3D => {
    let point = raw;
    // Angle-snap (shift) only makes sense within a single flat plane — it's
    // scoped to the common case of drawing across the image's own layer.
    if (isPipeTool && drawStart && shiftKey && layer.orientation === "xy") {
      const dx = raw.x - drawStart.x;
      const dy = raw.y - drawStart.y;
      const len = Math.hypot(dx, dy);
      const rawAngle = (Math.atan2(dy, dx) * 180) / Math.PI;
      const snappedAngle = Math.round(rawAngle / ANGLE_SNAP_DEG) * ANGLE_SNAP_DEG;
      const rad = (snappedAngle * Math.PI) / 180;
      point = { x: drawStart.x + Math.cos(rad) * len, y: drawStart.y + Math.sin(rad) * len, z: raw.z };
    }
    const snapped = resolveSnappedPoint(point, {
      gridSpacing: gridSpacingPx,
      gridEnabled,
      snapEnabled,
      pipes: Object.values(structure.pipes),
      connectors: Object.values(structure.connectors),
      tolerance: SNAP_TOLERANCE,
      excludeIds: [],
    });
    // Re-pin the layer's fixed axis exactly — grid-snapping rounds x and y,
    // which for xz/yz layers would otherwise nudge the plane's own fixed
    // axis (y or x, respectively) off the exact value you clicked on.
    switch (layer.orientation) {
      case "xy":
        return { ...snapped, z: layer.fixed };
      case "xz":
        return { ...snapped, y: layer.fixed };
      case "yz":
        return { ...snapped, x: layer.fixed };
    }
  };

  // Converts a click/hover on a specific layer into a structure-local point.
  // The two free in-plane axes come from the real 3D intersection (so you
  // land exactly where you clicked); the one fixed axis uses the layer's own
  // known value directly, so it's exact regardless of any tiny visual-only
  // offset used elsewhere to avoid z-fighting.
  const eventToPoint = (e: ThreeEvent<PointerEvent | MouseEvent>, layer: LayerSpec): Point3D => {
    const frame = e.eventObject.parent ?? e.eventObject;
    const local = frame.worldToLocal(e.point.clone());
    switch (layer.orientation) {
      case "xy":
        return { x: local.x, y: local.y, z: layer.fixed };
      case "xz":
        return { x: local.x, y: layer.fixed, z: local.z };
      case "yz":
        return { x: layer.fixed, y: local.y, z: local.z };
    }
  };

  // Once a pipe's start point is set, the second click only *aims* — the aim
  // point (still fully grid/candidate-snapped, so it's easy to point exactly
  // horizontal/vertical/at an existing part) sets the direction from
  // `drawStart`, and the real endpoint is that direction rescaled to the
  // active size's exact stock length. Returns null if the aim is degenerate
  // (essentially back on top of the start point).
  const applyFixedPipeLength = (aim: Point3D, start: Point3D): Point3D | null => {
    const dx = aim.x - start.x;
    const dy = aim.y - start.y;
    const dz = aim.z - start.z;
    const len = Math.hypot(dx, dy, dz);
    if (len < MIN_AIM_LENGTH) return null;
    const scale = pipeLengthScene / len;
    return { x: start.x + dx * scale, y: start.y + dy * scale, z: start.z + dz * scale };
  };

  const handleMove = (layer: LayerSpec) => (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const aim = resolvePoint(eventToPoint(e, layer), e.nativeEvent.shiftKey, layer);
    setHover(isPipeTool && drawStart ? applyFixedPipeLength(aim, drawStart) : aim);
  };

  const handleClick = (layer: LayerSpec) => (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    // A camera-orbit drag starts and ends on this same huge catcher plane,
    // which otherwise looks just like a click to three.js — ignore it if
    // the pointer actually moved (see useClickGuard).
    if (wasDragged(e.nativeEvent)) return;
    const aim = resolvePoint(eventToPoint(e, layer), e.nativeEvent.shiftKey, layer);

    if (isPipeTool) {
      if (!drawStart) {
        setDrawStart(aim);
        return;
      }
      const end = applyFixedPipeLength(aim, drawStart);
      if (end) {
        addPipe(structure.id, createPipe(activePipeSize, drawStart, end));
        setDrawStart(end);
      } else {
        setDrawStart(null);
      }
      return;
    }

    if (isConnectorTool) {
      addConnector(structure.id, createConnector(activeConnectorType, activePipeSize, aim, 0));
    }
  };

  // "Touch image" mode restricts placement to the layer right behind the
  // image's own plane (see IMAGE_BACK_LAYER_Z) — every other layer is simply
  // not rendered/clickable while it's on.
  const allLayers = buildLayers(w, h);
  const layers = touchImageOnly
    ? allLayers.filter((layer) => layer.orientation === "xy" && layer.fixed === IMAGE_BACK_LAYER_Z)
    : allLayers;
  const previewStart3D = drawStart ? new THREE.Vector3(drawStart.x, drawStart.y, drawStart.z) : null;
  const previewEnd3D = hover ? new THREE.Vector3(hover.x, hover.y, hover.z) : null;
  const previewRadius = PIPE_RADIUS_3D;

  return (
    <group>
      {layers.map((layer) => (
        <group key={layer.key}>
          <Grid
            position={layer.position}
            rotation={layer.gridRotation}
            args={layer.gridSize}
            cellSize={gridSpacingPx}
            sectionSize={gridSpacingPx * 5}
            cellThickness={0.5}
            sectionThickness={1}
            cellColor="#1c2130"
            sectionColor={SELECTION_COLOR_3D}
            fadeDistance={fadeDistance}
            fadeStrength={1}
          />
          <mesh
            position={layer.position}
            rotation={layer.catcherRotation}
            onPointerDown={(e) => markPointerDown(e.nativeEvent)}
            onPointerMove={handleMove(layer)}
            onPointerLeave={() => setHover(null)}
            onClick={handleClick(layer)}
          >
            <planeGeometry args={layer.catcherSize} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}

      {isPipeTool && previewStart3D && (
        <mesh position={previewStart3D}>
          <sphereGeometry args={[previewRadius + 2, 12, 12]} />
          <meshStandardMaterial color={SELECTION_COLOR_3D} />
        </mesh>
      )}
      {isPipeTool && previewStart3D && previewEnd3D && (
        <PipePreviewCylinder start={previewStart3D} end={previewEnd3D} radius={previewRadius} />
      )}
      {isConnectorTool && previewEnd3D && (
        <group position={previewEnd3D}>
          {CONNECTOR_PORT_ANGLES[activeConnectorType].map((deg) => {
            const rad = (deg * Math.PI) / 180;
            const dir = new THREE.Vector3(Math.cos(rad), Math.sin(rad), 0);
            const armLength = CONNECTOR_ARM_LENGTH_3D;
            const radius = PIPE_RADIUS_3D * 1.15;
            const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
            const mid = dir.clone().multiplyScalar(armLength / 2);
            return (
              <mesh key={deg} position={mid} quaternion={quat}>
                <cylinderGeometry args={[radius, radius, armLength, 10]} />
                <meshStandardMaterial color={SELECTION_COLOR_3D} transparent opacity={0.6} />
              </mesh>
            );
          })}
        </group>
      )}
    </group>
  );
}

function PipePreviewCylinder({
  start,
  end,
  radius,
}: {
  start: THREE.Vector3;
  end: THREE.Vector3;
  radius: number;
}) {
  const dir = new THREE.Vector3().subVectors(end, start);
  const length = dir.length() || 0.001;
  const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
  const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  return (
    <mesh position={mid} quaternion={quat}>
      <cylinderGeometry args={[radius, radius, length, 12]} />
      <meshStandardMaterial color={SELECTION_COLOR_3D} transparent opacity={0.6} />
    </mesh>
  );
}
