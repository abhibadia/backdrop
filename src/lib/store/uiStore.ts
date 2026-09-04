import { create } from "zustand";
import { ConnectorType, PipeSize, Point } from "@/lib/model/types";
import { useProjectStore } from "@/lib/store/projectStore";

export type AppMode = "view" | "build" | "studio" | "inventory";
export type Theme = "dark" | "light";

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

  /** Defaults to "dark"; synced with localStorage/system preference by useThemeSync. */
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;

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
  /** When on, the Pipe/Connector tools can only place points on the structure image's own plane. */
  touchImageOnly: boolean;
  toggleTouchImageOnly: () => void;

  /** Set to snap the 3D camera to look straight down one world axis; cleared once handled. */
  axisViewRequest: "x" | "y" | "z" | null;
  requestAxisView: (axis: "x" | "y" | "z") => void;
  clearAxisViewRequest: () => void;

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
  /** Sets both calibration draft points at once — the Ruler tool selects a whole image edge per click. */
  setCalibrationDraftPoints: (pointA: Point, pointB: Point) => void;
  clearCalibrationDraft: () => void;
  startCalibration: (structureId: string) => void;
  /** Increments every time a calibration session starts, used to force-remount the input form. */
  calibrationSession: number;
}

export const useUIStore = create<UIState>((set, get) => ({
  mode: "view",
  setMode: (mode) => set({ mode }),

  theme: "dark",
  setTheme: (theme) => set({ theme }),
  toggleTheme: () => set((state) => ({ theme: state.theme === "dark" ? "light" : "dark" })),

  activeStructureId: null,
  setActiveStructureId: (id) => set({ activeStructureId: id }),
  enterBuildMode: (structureId) => {
    // Strict Build Mode requirement: the structure being built on is locked
    // to the world origin with no rotation, so its structure-local frame
    // coincides with world space while building (see coordinates3d.ts) and
    // pipe/connector points don't need to account for wherever the image
    // happened to be left in View Mode.
    useProjectStore.getState().setStructureTransform(structureId, { x: 0, y: 0, rotation: 0 });
    set({
      mode: "build",
      activeStructureId: structureId,
      selectedElementIds: [],
      activeTool: "select",
    });
  },
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
  touchImageOnly: false,
  toggleTouchImageOnly: () => set((state) => ({ touchImageOnly: !state.touchImageOnly })),

  axisViewRequest: null,
  requestAxisView: (axis) => set({ axisViewRequest: axis }),
  clearAxisViewRequest: () => set({ axisViewRequest: null }),

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
  setCalibrationDraftPoints: (pointA, pointB) => set({ calibrationDraft: { pointA, pointB } }),
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
