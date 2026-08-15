import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { temporal } from "zundo";
import {
  Calibration,
  ConnectorInstance,
  Light,
  PipeSegment,
  Project,
  StructureImage,
  StudioPlacement,
  Transform2D,
  Units,
} from "@/lib/model/types";
import { createEmptyProject, createStructure, createLight } from "@/lib/model/factory";

export interface ProjectState {
  project: Project;

  // Project-level
  loadProject: (project: Project) => void;
  resetProject: () => void;
  setProjectName: (name: string) => void;
  setUnits: (units: Units) => void;

  // Structures
  addStructure: (image: StructureImage, name?: string) => string;
  removeStructure: (structureId: string) => void;
  renameStructure: (structureId: string, name: string) => void;
  setStructureTransform: (structureId: string, transform: Transform2D) => void;
  setStructureVisible: (structureId: string, visible: boolean) => void;
  setStructureLocked: (structureId: string, locked: boolean) => void;
  /** Locks/unlocks all pipes+connectors for a structure as a group and marks build complete/reopened. */
  setConstructionLocked: (structureId: string, locked: boolean) => void;
  reorderStructures: (order: string[]) => void;
  setStructureCalibration: (
    structureId: string,
    calibration: Calibration | null,
  ) => void;
  setBuildGridSpacing: (structureId: string, spacing: number) => void;

  // Pipes
  addPipe: (structureId: string, pipe: PipeSegment) => void;
  updatePipe: (
    structureId: string,
    pipeId: string,
    patch: Partial<PipeSegment>,
  ) => void;
  removePipe: (structureId: string, pipeId: string) => void;

  // Connectors
  addConnector: (structureId: string, connector: ConnectorInstance) => void;
  updateConnector: (
    structureId: string,
    connectorId: string,
    patch: Partial<ConnectorInstance>,
  ) => void;
  removeConnector: (structureId: string, connectorId: string) => void;

  // Bulk element ops (multi-select)
  removeElements: (structureId: string, elementIds: string[]) => void;
  setElementsLocked: (
    structureId: string,
    elementIds: string[],
    locked: boolean,
  ) => void;

  // Inventory
  setInventoryOverride: (partKey: string, available: number) => void;

  // Studio
  setStudioPlacement: (
    structureId: string,
    placement: Partial<Omit<StudioPlacement, "structureId">>,
  ) => void;
  removeStudioPlacement: (structureId: string) => void;
  addLight: (x: number, y: number) => string;
  updateLight: (lightId: string, patch: Partial<Light>) => void;
  removeLight: (lightId: string) => void;
  setStudioBackground: (color: string) => void;
}

function touch(project: Project) {
  project.updatedAt = Date.now();
}

export const useProjectStore = create<ProjectState>()(
  temporal(
    immer((set, get) => ({
      project: createEmptyProject(),

      loadProject: (project) =>
        set((state) => {
          state.project = project;
        }),
      resetProject: () =>
        set((state) => {
          state.project = createEmptyProject();
        }),
      setProjectName: (name) =>
        set((state) => {
          state.project.name = name;
          touch(state.project);
        }),
      setUnits: (units) =>
        set((state) => {
          state.project.units = units;
          touch(state.project);
        }),

      addStructure: (image, name) => {
        const structure = createStructure(
          image,
          get().project.structureOrder.length,
          name,
        );
        set((state) => {
          state.project.structures[structure.id] = structure;
          state.project.structureOrder.push(structure.id);
          touch(state.project);
        });
        return structure.id;
      },
      removeStructure: (structureId) =>
        set((state) => {
          delete state.project.structures[structureId];
          state.project.structureOrder = state.project.structureOrder.filter(
            (id) => id !== structureId,
          );
          delete state.project.studio.placements[structureId];
          touch(state.project);
        }),
      renameStructure: (structureId, name) =>
        set((state) => {
          const structure = state.project.structures[structureId];
          if (!structure) return;
          structure.name = name;
          structure.updatedAt = Date.now();
          touch(state.project);
        }),
      setStructureTransform: (structureId, transform) =>
        set((state) => {
          const structure = state.project.structures[structureId];
          if (!structure) return;
          structure.transform = transform;
          structure.updatedAt = Date.now();
          touch(state.project);
        }),
      setStructureVisible: (structureId, visible) =>
        set((state) => {
          const structure = state.project.structures[structureId];
          if (!structure) return;
          structure.visible = visible;
          touch(state.project);
        }),
      setStructureLocked: (structureId, locked) =>
        set((state) => {
          const structure = state.project.structures[structureId];
          if (!structure) return;
          structure.locked = locked;
          touch(state.project);
        }),
      setConstructionLocked: (structureId, locked) =>
        set((state) => {
          const structure = state.project.structures[structureId];
          if (!structure) return;
          structure.constructionLocked = locked;
          for (const pipe of Object.values(structure.pipes)) pipe.locked = locked;
          for (const connector of Object.values(structure.connectors)) connector.locked = locked;
          structure.updatedAt = Date.now();
          touch(state.project);
        }),
      reorderStructures: (order) =>
        set((state) => {
          state.project.structureOrder = order;
          order.forEach((id, index) => {
            const structure = state.project.structures[id];
            if (structure) structure.order = index;
          });
          touch(state.project);
        }),
      setStructureCalibration: (structureId, calibration) =>
        set((state) => {
          const structure = state.project.structures[structureId];
          if (!structure) return;
          structure.calibration = calibration;
          structure.updatedAt = Date.now();
          touch(state.project);
        }),
      setBuildGridSpacing: (structureId, spacing) =>
        set((state) => {
          const structure = state.project.structures[structureId];
          if (!structure) return;
          structure.buildGridSpacing = spacing;
          touch(state.project);
        }),

      addPipe: (structureId, pipe) =>
        set((state) => {
          const structure = state.project.structures[structureId];
          if (!structure || structure.constructionLocked) return;
          structure.pipes[pipe.id] = pipe;
          structure.updatedAt = Date.now();
          touch(state.project);
        }),
      updatePipe: (structureId, pipeId, patch) =>
        set((state) => {
          const pipe = state.project.structures[structureId]?.pipes[pipeId];
          if (!pipe) return;
          Object.assign(pipe, patch);
          touch(state.project);
        }),
      removePipe: (structureId, pipeId) =>
        set((state) => {
          const structure = state.project.structures[structureId];
          if (!structure) return;
          delete structure.pipes[pipeId];
          touch(state.project);
        }),

      addConnector: (structureId, connector) =>
        set((state) => {
          const structure = state.project.structures[structureId];
          if (!structure || structure.constructionLocked) return;
          structure.connectors[connector.id] = connector;
          structure.updatedAt = Date.now();
          touch(state.project);
        }),
      updateConnector: (structureId, connectorId, patch) =>
        set((state) => {
          const connector =
            state.project.structures[structureId]?.connectors[connectorId];
          if (!connector) return;
          Object.assign(connector, patch);
          touch(state.project);
        }),
      removeConnector: (structureId, connectorId) =>
        set((state) => {
          const structure = state.project.structures[structureId];
          if (!structure) return;
          delete structure.connectors[connectorId];
          touch(state.project);
        }),

      removeElements: (structureId, elementIds) =>
        set((state) => {
          const structure = state.project.structures[structureId];
          if (!structure) return;
          for (const id of elementIds) {
            delete structure.pipes[id];
            delete structure.connectors[id];
          }
          touch(state.project);
        }),
      setElementsLocked: (structureId, elementIds, locked) =>
        set((state) => {
          const structure = state.project.structures[structureId];
          if (!structure) return;
          for (const id of elementIds) {
            if (structure.pipes[id]) structure.pipes[id].locked = locked;
            if (structure.connectors[id]) structure.connectors[id].locked = locked;
          }
          touch(state.project);
        }),

      setInventoryOverride: (partKey, available) =>
        set((state) => {
          state.project.inventoryOverrides[partKey] = { partKey, available };
          touch(state.project);
        }),

      setStudioPlacement: (structureId, placement) =>
        set((state) => {
          const existing = state.project.studio.placements[structureId];
          state.project.studio.placements[structureId] = {
            structureId,
            x: placement.x ?? existing?.x ?? 0,
            y: placement.y ?? existing?.y ?? 0,
            rotation: placement.rotation ?? existing?.rotation ?? 0,
            scale: placement.scale ?? existing?.scale ?? 1,
          };
          touch(state.project);
        }),
      removeStudioPlacement: (structureId) =>
        set((state) => {
          delete state.project.studio.placements[structureId];
          touch(state.project);
        }),
      addLight: (x, y) => {
        const light = createLight(x, y);
        set((state) => {
          state.project.studio.lights[light.id] = light;
          touch(state.project);
        });
        return light.id;
      },
      updateLight: (lightId, patch) =>
        set((state) => {
          const light = state.project.studio.lights[lightId];
          if (!light) return;
          Object.assign(light, patch);
          touch(state.project);
        }),
      removeLight: (lightId) =>
        set((state) => {
          delete state.project.studio.lights[lightId];
          touch(state.project);
        }),
      setStudioBackground: (color) =>
        set((state) => {
          state.project.studio.backgroundColor = color;
          touch(state.project);
        }),
    })),
    {
      limit: 100,
      partialize: (state) => ({ project: state.project }),
      equality: (a, b) => a.project.updatedAt === b.project.updatedAt,
    },
  ),
);

export const useTemporalProjectStore = useProjectStore.temporal;
