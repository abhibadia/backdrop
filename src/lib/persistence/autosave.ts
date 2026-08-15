import { useProjectStore } from "@/lib/store/projectStore";
import { loadProjectJson, saveProjectJson } from "./db";
import { Project } from "@/lib/model/types";

const AUTOSAVE_DEBOUNCE_MS = 500;

/** Loads the persisted project (if any) into the store. Returns true if a project was loaded. */
export async function loadPersistedProject(): Promise<boolean> {
  const json = await loadProjectJson();
  if (!json) return false;
  try {
    const project = JSON.parse(json) as Project;
    useProjectStore.getState().loadProject(project);
    return true;
  } catch (error) {
    console.error("Failed to parse persisted project", error);
    return false;
  }
}

/**
 * Subscribes to project store changes and persists them to IndexedDB after a
 * short debounce. Returns an unsubscribe function.
 */
export function startAutosave(): () => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  const flush = (project: Project) => {
    saveProjectJson(JSON.stringify(project)).catch((error) => {
      console.error("Failed to autosave project", error);
    });
  };

  const unsubscribe = useProjectStore.subscribe((state) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => flush(state.project), AUTOSAVE_DEBOUNCE_MS);
  });

  return () => {
    if (timeout) clearTimeout(timeout);
    unsubscribe();
  };
}
