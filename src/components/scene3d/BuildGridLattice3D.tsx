"use client";

import { useEffect, useState } from "react";
import * as THREE from "three";
import { Grid, Html } from "@react-three/drei";
import { ThreeEvent } from "@react-three/fiber";
import { ConnectorInstance, Structure, Point3D } from "@/lib/model/types";
import { resolveSnappedPoint } from "@/lib/canvas/snapping";
import { useClickGuard } from "@/lib/canvas3d/useClickGuard";
import { createConnector, createPipe } from "@/lib/model/factory";
import {
  BUILD_LATTICE_CELL_COLOR,
  CONNECTOR_ARM_LENGTH_3D,
  IMAGE_BACK_LAYER_Z,
  PIPE_RADIUS_3D,
  SCENE_GRID_COLORS,
  SELECTION_COLOR_3D,
} from "@/lib/model/render";
import { CONNECTOR_PORT_DIRECTIONS, PIPE_SIZE_NOMINAL_LENGTH_M } from "@/lib/model/catalog";
import {
  bestFreePortIndex,
  findNearbyConnector,
  freePortIndices,
  getConnectorPortInfo,
  pointAtPort,
} from "@/lib/model/connectorPorts";
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
const BLOCKED_COLOR = "#e5484d";
const AXIS_KEYS: Record<string, "x" | "y" | "z"> = { "\\": "x", "/": "y", "`": "z" };

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

interface ResolvedSegment {
  start: Point3D;
  end: Point3D;
  /** Set when the aim (or the start) landed on a connector with zero free ports — nothing can be placed. */
  blockedConnector: ConnectorInstance | null;
  /** The connector a new endpoint is attaching to, if any — lets arrow keys cycle among its free ports. */
  targetConnector: ConnectorInstance | null;
  targetFreeIndices: number[];
  targetPortIndex: number | null;
  /** True if start/end effectively coincide — nothing meaningful to place/preview. */
  degenerate: boolean;
}

/**
 * Works out where a pipe segment actually ends up, given the user's raw aim.
 * Three cases, checked in order:
 *  1. The aim lands on a connector — plug into one of its free ports (or
 *     flag it as blocked if it has none), recomputing `start` so the segment
 *     is still exactly `fixedLength` long.
 *  2. `drawStart` itself was set on a connector (case 1 didn't fire, so the
 *     current aim is free space) — same idea, mirrored: `start` is pinned to
 *     the connector's port, `end` is recomputed outward from it.
 *  3. Neither end is on a connector — ordinary free-space placement, with
 *     an optional hard axis lock.
 */
function resolveSegment(
  drawStart: Point3D,
  rawAim: Point3D,
  structure: Structure,
  axisLock: "x" | "y" | "z" | null,
  portOverride: number | null,
  fixedLength: number,
): ResolvedSegment {
  const aimConnector = findNearbyConnector(structure, rawAim);
  if (aimConnector) {
    const info = getConnectorPortInfo(structure, aimConnector);
    const free = freePortIndices(info);
    if (free.length === 0) {
      return {
        start: drawStart,
        end: drawStart,
        blockedConnector: aimConnector,
        targetConnector: aimConnector,
        targetFreeIndices: [],
        targetPortIndex: null,
        degenerate: true,
      };
    }
    const portIndex =
      (portOverride !== null && free.includes(portOverride) ? portOverride : null) ??
      bestFreePortIndex(info, aimConnector.position, drawStart) ??
      free[0];
    const start = pointAtPort(aimConnector.position, info.directions[portIndex], fixedLength);
    return {
      start,
      end: aimConnector.position,
      blockedConnector: null,
      targetConnector: aimConnector,
      targetFreeIndices: free,
      targetPortIndex: portIndex,
      degenerate: false,
    };
  }

  const drawStartConnector = findNearbyConnector(structure, drawStart);
  if (drawStartConnector) {
    const info = getConnectorPortInfo(structure, drawStartConnector);
    const free = freePortIndices(info);
    if (free.length === 0) {
      return {
        start: drawStart,
        end: drawStart,
        blockedConnector: drawStartConnector,
        targetConnector: drawStartConnector,
        targetFreeIndices: [],
        targetPortIndex: null,
        degenerate: true,
      };
    }
    const portIndex =
      (portOverride !== null && free.includes(portOverride) ? portOverride : null) ??
      bestFreePortIndex(info, drawStartConnector.position, rawAim) ??
      free[0];
    const end = pointAtPort(drawStartConnector.position, info.directions[portIndex], fixedLength);
    return {
      start: drawStartConnector.position,
      end,
      blockedConnector: null,
      targetConnector: drawStartConnector,
      targetFreeIndices: free,
      targetPortIndex: portIndex,
      degenerate: false,
    };
  }

  let effectiveAim = rawAim;
  if (axisLock === "x") effectiveAim = { x: rawAim.x, y: drawStart.y, z: drawStart.z };
  else if (axisLock === "y") effectiveAim = { x: drawStart.x, y: rawAim.y, z: drawStart.z };
  else if (axisLock === "z") effectiveAim = { x: drawStart.x, y: drawStart.y, z: rawAim.z };

  const dx = effectiveAim.x - drawStart.x;
  const dy = effectiveAim.y - drawStart.y;
  const dz = effectiveAim.z - drawStart.z;
  const len = Math.hypot(dx, dy, dz);
  if (len < MIN_AIM_LENGTH) {
    return {
      start: drawStart,
      end: drawStart,
      blockedConnector: null,
      targetConnector: null,
      targetFreeIndices: [],
      targetPortIndex: null,
      degenerate: true,
    };
  }
  const scale = fixedLength / len;
  return {
    start: drawStart,
    end: {
      x: drawStart.x + dx * scale,
      y: drawStart.y + dy * scale,
      z: drawStart.z + dz * scale,
    },
    blockedConnector: null,
    targetConnector: null,
    targetFreeIndices: [],
    targetPortIndex: null,
    degenerate: false,
  };
}

export function BuildGridLattice3D({ structure }: BuildGridLattice3DProps) {
  const activeTool = useUIStore((s) => s.activeTool);
  const activePipeSize = useUIStore((s) => s.activePipeSize);
  const activeConnectorType = useUIStore((s) => s.activeConnectorType);
  const gridEnabled = useUIStore((s) => s.gridEnabled);
  const snapEnabled = useUIStore((s) => s.snapEnabled);
  const touchImageOnly = useUIStore((s) => s.touchImageOnly);
  const theme = useUIStore((s) => s.theme);
  const addPipe = useProjectStore((s) => s.addPipe);
  const addConnector = useProjectStore((s) => s.addConnector);

  const [drawStart, setDrawStart] = useState<Point3D | null>(null);
  const [rawAim, setRawAim] = useState<Point3D | null>(null);
  const [axisLock, setAxisLock] = useState<"x" | "y" | "z" | null>(null);
  const [portOverride, setPortOverride] = useState<number | null>(null);
  const { markPointerDown, wasDragged } = useClickGuard();

  const isPipeTool = activeTool === "place-pipe";
  const isConnectorTool = activeTool === "place-connector";
  const { naturalWidth: w, naturalHeight: h } = structure.image;

  const resetKey = `${activeTool}:${structure.id}`;
  const [prevResetKey, setPrevResetKey] = useState(resetKey);
  if (resetKey !== prevResetKey) {
    setPrevResetKey(resetKey);
    setDrawStart(null);
    setRawAim(null);
    setAxisLock(null);
    setPortOverride(null);
  }

  // Building requires the structure to be calibrated first — pipe length is
  // now a real-world measurement (see PIPE_SIZE_NOMINAL_LENGTH_M below), and
  // there's no way to express "2 meters" in scene units without a scale.
  // The toolbar already disables these tools with no calibration; this is
  // the enforcement that actually matters (it can't be bypassed via a
  // keyboard shortcut or any other path that flips activeTool directly).
  const pipeLengthScene =
    isPipeTool && structure.calibration
      ? realToPx(convertUnits(PIPE_SIZE_NOMINAL_LENGTH_M[activePipeSize], "m", structure.calibration.unit), structure.calibration)
      : 0;

  // The live segment a pipe would become if you clicked right now — recomputed
  // fresh from `drawStart`/`rawAim` on every render rather than stored as its
  // own state, so it can never drift out of sync with them.
  const pipeSegment: ResolvedSegment | null =
    isPipeTool && drawStart && rawAim
      ? resolveSegment(drawStart, rawAim, structure, axisLock, portOverride, pipeLengthScene)
      : null;

  // Before a start point exists, "attaching" is simpler — just check whether
  // the hovered point is a connector with no free ports, for the same early
  // red/blocked warning.
  const preStartBlockedConnector: ConnectorInstance | null =
    isPipeTool && !drawStart && rawAim
      ? (() => {
          const c = findNearbyConnector(structure, rawAim);
          if (!c) return null;
          return freePortIndices(getConnectorPortInfo(structure, c)).length === 0 ? c : null;
        })()
      : null;

  const blockedConnector = pipeSegment?.blockedConnector ?? preStartBlockedConnector;

  // Arrow keys cycle which free port a pipe attaches to when a connector has
  // more than one available; \ / ` hard-lock the direction to the X/Y/Z axis
  // (pressing the same one again releases it). Scoped to this component's
  // lifetime, i.e. only while a placement tool is actually active.
  useEffect(() => {
    if (!isPipeTool || !drawStart) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        const free = pipeSegment?.targetFreeIndices ?? [];
        if (free.length < 2) return;
        e.preventDefault();
        const current = pipeSegment?.targetPortIndex ?? free[0];
        const currentPos = free.indexOf(current);
        const delta = e.key === "ArrowLeft" ? -1 : 1;
        const nextPos = (currentPos + delta + free.length) % free.length;
        setPortOverride(free[nextPos]);
        return;
      }
      const axis = AXIS_KEYS[e.key];
      if (axis) {
        e.preventDefault();
        setAxisLock((current) => (current === axis ? null : axis));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPipeTool, drawStart, pipeSegment]);

  // Only the placement tools need this lattice; for "select" (or anything
  // else) it must not exist at all, otherwise — since its layers sit in
  // front of/around every pipe/connector — it would silently swallow every
  // click meant for them.
  if (!isPipeTool && !isConnectorTool) return null;
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

  const handleMove = (layer: LayerSpec) => (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setRawAim(resolvePoint(eventToPoint(e, layer), e.nativeEvent.shiftKey, layer));
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
        const blocked = findNearbyConnector(structure, aim);
        if (blocked && freePortIndices(getConnectorPortInfo(structure, blocked)).length === 0) return;
        setDrawStart(aim);
        setRawAim(aim);
        setPortOverride(null);
        return;
      }
      const segment = resolveSegment(drawStart, aim, structure, axisLock, portOverride, pipeLengthScene);
      if (segment.blockedConnector || segment.degenerate) {
        if (segment.degenerate && !segment.blockedConnector) setDrawStart(null);
        return;
      }
      addPipe(structure.id, createPipe(activePipeSize, segment.start, segment.end));
      setDrawStart(segment.end);
      setPortOverride(null);
      return;
    }

    if (isConnectorTool) {
      addConnector(structure.id, createConnector(activeConnectorType, activePipeSize, aim));
    }
  };

  // "Touch image" mode restricts placement to the layer right behind the
  // image's own plane (see IMAGE_BACK_LAYER_Z) — every other layer is simply
  // not rendered/clickable while it's on.
  const allLayers = buildLayers(w, h);
  const layers = touchImageOnly
    ? allLayers.filter((layer) => layer.orientation === "xy" && layer.fixed === IMAGE_BACK_LAYER_Z)
    : allLayers;

  const previewStart3D =
    isPipeTool && pipeSegment && !pipeSegment.degenerate
      ? new THREE.Vector3(pipeSegment.start.x, pipeSegment.start.y, pipeSegment.start.z)
      : drawStart
        ? new THREE.Vector3(drawStart.x, drawStart.y, drawStart.z)
        : null;
  const previewEnd3D =
    isPipeTool && pipeSegment && !pipeSegment.degenerate
      ? new THREE.Vector3(pipeSegment.end.x, pipeSegment.end.y, pipeSegment.end.z)
      : null;
  const connectorPreviewPos = isConnectorTool && rawAim ? new THREE.Vector3(rawAim.x, rawAim.y, rawAim.z) : null;
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
            cellColor={BUILD_LATTICE_CELL_COLOR[theme]}
            sectionColor={SCENE_GRID_COLORS[theme].section}
            fadeDistance={fadeDistance}
            fadeStrength={1}
          />
          <mesh
            position={layer.position}
            rotation={layer.catcherRotation}
            onPointerDown={(e) => markPointerDown(e.nativeEvent)}
            onPointerMove={handleMove(layer)}
            onPointerLeave={() => setRawAim(null)}
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
      {isConnectorTool && connectorPreviewPos && (
        <group position={connectorPreviewPos}>
          {/* A freshly-placed connector always starts at rotation {0,0,0}
              (rotating happens afterward via the inspector), so this preview
              can render the type's base port directions directly with no
              rotation applied — same reasoning as ConnectorMesh3D's arms. */}
          {(CONNECTOR_PORT_DIRECTIONS[activeConnectorType] ?? []).map((d, i) => {
            const dir = new THREE.Vector3(d.x, d.y, d.z);
            const armLength = CONNECTOR_ARM_LENGTH_3D;
            const radius = PIPE_RADIUS_3D * 1.15;
            const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
            const mid = dir.clone().multiplyScalar(armLength / 2);
            return (
              <mesh key={i} position={mid} quaternion={quat}>
                <cylinderGeometry args={[radius, radius, armLength, 10]} />
                <meshStandardMaterial color={SELECTION_COLOR_3D} transparent opacity={0.6} />
              </mesh>
            );
          })}
        </group>
      )}

      {blockedConnector && (
        <BlockedConnectorOverlay
          connector={blockedConnector}
          multiplePorts={(pipeSegment?.targetFreeIndices.length ?? 0) > 1}
        />
      )}
    </group>
  );
}

function BlockedConnectorOverlay({
  connector,
  multiplePorts,
}: {
  connector: ConnectorInstance;
  multiplePorts: boolean;
}) {
  const pos = new THREE.Vector3(connector.position.x, connector.position.y, connector.position.z);
  const labelPos = pos.clone().add(new THREE.Vector3(0, CONNECTOR_ARM_LENGTH_3D + 24, 0));
  return (
    <group>
      <mesh position={pos}>
        <sphereGeometry args={[(CONNECTOR_ARM_LENGTH_3D + PIPE_RADIUS_3D) * 0.9, 16, 16]} />
        <meshBasicMaterial color={BLOCKED_COLOR} transparent opacity={0.45} depthWrite={false} />
      </mesh>
      {/* A plain HTML overlay (drei's <Html>) rather than drei's <Text> —
          the latter renders via troika-three-text, which builds its glyph
          atlas through an offscreen canvas/WebGL context and can take down
          the whole renderer's context on some GPU setups the very first time
          a glyph is rasterized. A tracked DOM label sidesteps that entirely
          and is at least as crisp for a short warning string. */}
      <Html position={labelPos.toArray()} center style={{ pointerEvents: "none" }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
            fontFamily: "var(--font-sans, sans-serif)",
            whiteSpace: "nowrap",
            textShadow: "0 1px 2px #000, 0 0 4px #000",
          }}
        >
          <span style={{ color: BLOCKED_COLOR, fontSize: 13, fontWeight: 600 }}>
            Can&apos;t put component here
          </span>
          {multiplePorts && <span style={{ color: "#c7ccd4", fontSize: 11 }}>← → choose port</span>}
        </div>
      </Html>
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
