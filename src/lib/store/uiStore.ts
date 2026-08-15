import { create } from "zustand";
import { ConnectorType, PipeSize, Point } from "@/lib/model/types";

export type AppMode = "view" | "build" | "studio" | "inventory";

export type BuildTool =
  | "select"
  | "pan"
  | "calibrate"
  | "place-pipe"
  | "place-connector";

export interface Viewport {
  scale: number;
  x: number;
  y: number;
}

export const DEFAULT_VIEWPORT: Viewport = { scale: 1, x: 0, y: 0 };

interface UIState {
  mode: AppMode;
  setMode: (mode: AppMode) => void;

  activeStructureId: string | null;
  setActiveStructureId: (id: string | null) => void;
  enterBuildMode: (structureId: string) => void;
  exitBuildMode: () => void;

  selectedElementIds: string[];
  setSelectedElementIds: (ids: string[]) => void;
  toggleSelectedElementId: (id: string, additive: boolean) => void;
  clearSelection: () => void;

  activeTool: BuildTool;
  setActiveTool: (tool: BuildTool) => void;
  activePipeSize: PipeSize;
  setActivePipeSize: (size: PipeSize) => void;
  activeConnectorType: ConnectorType;
  setActiveConnectorType: (type: ConnectorType) => void;

  viewports: Record<string, Viewport>;
  setViewport: (canvasKey: string, viewport: Viewport) => void;
  getViewport: (canvasKey: string) => Viewport;

  /** Last measured on-screen pixel size per canvas, used for zoom-to-center/fit-to-screen. */
  canvasSizes: Record<string, { width: number; height: number }>;
  setCanvasSize: (canvasKey: string, size: { width: number; height: number }) => void;

  gridEnabled: boolean;
  toggleGrid: () => void;
  snapEnabled: boolean;
  toggleSnap: () => void;

  /** View Mode visibility toggles (§12). Build Mode always shows construction/measurements. */
  showImages: boolean;
  toggleShowImages: () => void;
  showConstruction: boolean;
  toggleShowConstruction: () => void;
  showMeasurements: boolean;
  toggleShowMeasurements: () => void;

  selectedLightId: string | null;
  setSelectedLightId: (id: string | null) => void;

  /** Structure selected on the View Mode canvas for move/rotate (distinct from Build Mode focus). */
  selectedStructureId: string | null;
  setSelectedStructureId: (id: string | null) => void;

  /** In-progress 2-point calibration click capture, in the target structure's local pixel space. */
  calibrationDraft: { pointA: Point | null; pointB: Point | null };
  addCalibrationPoint: (point: Point) => void;
  clearCalibrationDraft: () => void;
  startCalibration: (structureId: string) => void;
  /** Increments every time a calibration session starts, used to force-remount the input form. */
  calibrationSession: number;
}

export const useUIStore = create<UIState>((set, get) => ({
  mode: "view",
  setMode: (mode) => set({ mode }),

  activeStructureId: null,
  setActiveStructureId: (id) => set({ activeStructureId: id }),
  enterBuildMode: (structureId) =>
    set({
      mode: "build",
      activeStructureId: structureId,
      selectedElementIds: [],
      activeTool: "select",
    }),
  exitBuildMode: () =>
    set({ mode: "view", activeTool: "select", selectedElementIds: [] }),

  selectedElementIds: [],
  setSelectedElementIds: (ids) => set({ selectedElementIds: ids }),
  toggleSelectedElementId: (id, additive) =>
    set((state) => {
      const has = state.selectedElementIds.includes(id);
      if (!additive) {
        return { selectedElementIds: has ? [] : [id] };
      }
      return {
        selectedElementIds: has
          ? state.selectedElementIds.filter((existing) => existing !== id)
          : [...state.selectedElementIds, id],
      };
    }),
  clearSelection: () => set({ selectedElementIds: [] }),

  activeTool: "select",
  setActiveTool: (tool) => set({ activeTool: tool }),
  activePipeSize: "half",
  setActivePipeSize: (size) => set({ activePipeSize: size }),
  activeConnectorType: "elbow90",
  setActiveConnectorType: (type) => set({ activeConnectorType: type }),

  viewports: {},
  setViewport: (canvasKey, viewport) =>
    set((state) => ({ viewports: { ...state.viewports, [canvasKey]: viewport } })),
  getViewport: (canvasKey) => get().viewports[canvasKey] ?? DEFAULT_VIEWPORT,

  canvasSizes: {},
  setCanvasSize: (canvasKey, size) =>
    set((state) => {
      const existing = state.canvasSizes[canvasKey];
      if (existing && existing.width === size.width && existing.height === size.height) {
        return state;
      }
      return { canvasSizes: { ...state.canvasSizes, [canvasKey]: size } };
    }),

  gridEnabled: true,
  toggleGrid: () => set((state) => ({ gridEnabled: !state.gridEnabled })),
  snapEnabled: true,
  toggleSnap: () => set((state) => ({ snapEnabled: !state.snapEnabled })),

  showImages: true,
  toggleShowImages: () => set((state) => ({ showImages: !state.showImages })),
  showConstruction: true,
  toggleShowConstruction: () => set((state) => ({ showConstruction: !state.showConstruction })),
  showMeasurements: true,
  toggleShowMeasurements: () => set((state) => ({ showMeasurements: !state.showMeasurements })),

  selectedLightId: null,
  setSelectedLightId: (id) => set({ selectedLightId: id }),

  selectedStructureId: null,
  setSelectedStructureId: (id) => set({ selectedStructureId: id }),

  calibrationDraft: { pointA: null, pointB: null },
  addCalibrationPoint: (point) =>
    set((state) => {
      if (!state.calibrationDraft.pointA) {
        return { calibrationDraft: { pointA: point, pointB: null } };
      }
      if (!state.calibrationDraft.pointB) {
        return { calibrationDraft: { ...state.calibrationDraft, pointB: point } };
      }
      return { calibrationDraft: { pointA: point, pointB: null } };
    }),
  clearCalibrationDraft: () => set({ calibrationDraft: { pointA: null, pointB: null } }),
  startCalibration: (structureId) =>
    set((state) => ({
      activeStructureId: structureId,
      activeTool: "calibrate",
      selectedStructureId: structureId,
      calibrationDraft: { pointA: null, pointB: null },
      calibrationSession: state.calibrationSession + 1,
    })),
  calibrationSession: 0,
}));
