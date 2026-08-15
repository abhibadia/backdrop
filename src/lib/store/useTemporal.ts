import { useStoreWithEqualityFn } from "zustand/traditional";
import type { TemporalState } from "zundo";
import { ProjectState, useProjectStore } from "./projectStore";

type PartializedProjectState = Pick<ProjectState, "project">;

export function useTemporalProjectState<T>(
  selector: (state: TemporalState<PartializedProjectState>) => T,
): T {
  return useStoreWithEqualityFn(useProjectStore.temporal, selector);
}

export function undoProject(): void {
  useProjectStore.temporal.getState().undo();
}

export function redoProject(): void {
  useProjectStore.temporal.getState().redo();
}
