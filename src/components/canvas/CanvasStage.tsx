"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import Konva from "konva";
import { Stage } from "react-konva";
import { useResizeObserver, ElementSize } from "@/lib/canvas/useResizeObserver";
import {
  screenToWorld,
  zoomViewportAtPoint,
  MIN_VIEWPORT_SCALE,
  MAX_VIEWPORT_SCALE,
} from "@/lib/canvas/coordinates";
import { DEFAULT_VIEWPORT, Viewport, useUIStore } from "@/lib/store/uiStore";
import { Point } from "@/lib/model/types";
import { GridLayer } from "./GridLayer";

const WHEEL_ZOOM_STEP = 1.06;

export interface CanvasStageRenderContext {
  viewport: Viewport;
  size: ElementSize;
}

interface CanvasStageProps {
  /** Unique key used to store/retrieve this canvas's pan/zoom viewport. */
  canvasKey: string;
  children: (ctx: CanvasStageRenderContext) => ReactNode;
  gridSpacing?: number;
  showGrid?: boolean;
  className?: string;
  /** Forces pan-drag mode regardless of spacebar/middle-mouse state (e.g. an explicit "pan" tool). */
  forcePan?: boolean;
  onBackgroundPointerDown?: (worldPoint: Point, evt: Konva.KonvaEventObject<PointerEvent>) => void;
  stageRef?: React.RefObject<Konva.Stage | null>;
}

export function CanvasStage({
  canvasKey,
  children,
  gridSpacing = 32,
  showGrid,
  className,
  forcePan = false,
  onBackgroundPointerDown,
  stageRef: externalStageRef,
}: CanvasStageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const internalStageRef = useRef<Konva.Stage | null>(null);
  const stageRef = externalStageRef ?? internalStageRef;
  const size = useResizeObserver(containerRef);

  const viewport = useUIStore(
    (state) => state.viewports[canvasKey] ?? DEFAULT_VIEWPORT,
  );
  const setViewport = useUIStore((state) => state.setViewport);
  const setCanvasSize = useUIStore((state) => state.setCanvasSize);
  const gridEnabled = useUIStore((state) => state.gridEnabled);

  useEffect(() => {
    if (size.width > 0 && size.height > 0) setCanvasSize(canvasKey, size);
  }, [canvasKey, size, setCanvasSize]);

  const [spaceHeld, setSpaceHeld] = useState(false);
  const [middleMouseDown, setMiddleMouseDown] = useState(false);
  const [pointerWorld, setPointerWorld] = useState<Point | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat) setSpaceHeld(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") setSpaceHeld(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  const isPanning = forcePan || spaceHeld || middleMouseDown;

  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    const pointer = stage?.getPointerPosition();
    if (!pointer) return;
    const scaleFactor = e.evt.deltaY < 0 ? WHEEL_ZOOM_STEP : 1 / WHEEL_ZOOM_STEP;
    const next = zoomViewportAtPoint(
      viewport,
      pointer,
      scaleFactor,
      MIN_VIEWPORT_SCALE,
      MAX_VIEWPORT_SCALE,
    );
    setViewport(canvasKey, next);
  };

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    if (e.target !== stageRef.current) return;
    setViewport(canvasKey, { ...viewport, x: e.target.x(), y: e.target.y() });
  };

  const handleMouseDown = (e: Konva.KonvaEventObject<PointerEvent>) => {
    if (e.evt.button === 1) {
      e.evt.preventDefault();
      setMiddleMouseDown(true);
      return;
    }
    if (isPanning) return;
    if (e.target === stageRef.current) {
      const pointer = stageRef.current?.getPointerPosition();
      if (pointer && onBackgroundPointerDown) {
        onBackgroundPointerDown(screenToWorld(pointer, viewport), e);
      }
    }
  };

  const handleMouseUp = (e: Konva.KonvaEventObject<PointerEvent>) => {
    if (e.evt.button === 1) setMiddleMouseDown(false);
  };

  const handleStageMouseMove = () => {
    const pointer = stageRef.current?.getPointerPosition();
    setPointerWorld(pointer ? screenToWorld(pointer, viewport) : null);
  };

  return (
    <div
      ref={containerRef}
      className={className ?? "relative h-full w-full overflow-hidden bg-[var(--canvas-bg)]"}
      style={{ cursor: isPanning ? "grab" : "default" }}
    >
      {size.width > 0 && size.height > 0 && (
        <Stage
          ref={stageRef}
          width={size.width}
          height={size.height}
          scaleX={viewport.scale}
          scaleY={viewport.scale}
          x={viewport.x}
          y={viewport.y}
          draggable={isPanning}
          onWheel={handleWheel}
          onDragEnd={handleDragEnd}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseMove={handleStageMouseMove}
          onMouseLeave={() => setPointerWorld(null)}
        >
          <GridLayer
            visible={showGrid ?? gridEnabled}
            viewport={viewport}
            containerSize={size}
            spacing={gridSpacing}
          />
          {children({ viewport, size })}
        </Stage>
      )}
      {pointerWorld && (
        <div className="pointer-events-none absolute bottom-2 left-2 rounded bg-surface/80 px-1.5 py-0.5 font-mono text-[10px] text-foreground-subtle backdrop-blur-sm">
          X {pointerWorld.x.toFixed(0)}&nbsp;&nbsp;Y {pointerWorld.y.toFixed(0)}
        </div>
      )}
    </div>
  );
}
