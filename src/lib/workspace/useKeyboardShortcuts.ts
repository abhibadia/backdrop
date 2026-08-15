"use client";

import { useEffect } from "react";
import { useUIStore } from "@/lib/store/uiStore";
import { useProjectStore } from "@/lib/store/projectStore";
import { undoProject, redoProject } from "@/lib/store/useTemporal";
import { useCanvasZoomControls } from "@/lib/canvas/useCanvasZoomControls";

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

/**
 * Global Designer keyboard shortcuts (§47). Mounted once from WorkspaceView;
 * a no-op everywhere shortcuts would conflict with text entry.
 */
export function useKeyboardShortcuts() {
  const { zoomIn, zoomOut, fitToScreen } = useCanvasZoomControls("workspace");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;

      const mod = e.metaKey || e.ctrlKey;
      const ui = useUIStore.getState();

      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redoProject();
        else undoProject();
        return;
      }

      switch (e.key) {
        case "v":
        case "V":
          ui.setActiveTool("select");
          return;
        case "h":
        case "H":
          ui.setActiveTool("pan");
          return;
        case "p":
        case "P": {
          const structureId = ui.mode === "build" ? ui.activeStructureId : ui.selectedStructureId;
          if (structureId) ui.setActiveTool("place-pipe");
          return;
        }
        case "c":
        case "C": {
          const structureId = ui.mode === "build" ? ui.activeStructureId : ui.selectedStructureId;
          if (structureId) ui.setActiveTool("place-connector");
          return;
        }
        case "s":
        case "S": {
          const structureId = ui.mode === "build" ? ui.activeStructureId : ui.selectedStructureId;
          if (structureId) ui.startCalibration(structureId);
          return;
        }
        case "Delete":
        case "Backspace": {
          if (ui.mode === "build" && ui.activeStructureId && ui.selectedElementIds.length > 0) {
            e.preventDefault();
            useProjectStore.getState().removeElements(ui.activeStructureId, ui.selectedElementIds);
            ui.clearSelection();
          }
          return;
        }
        case "Escape": {
          if (ui.activeTool !== "select") {
            ui.setActiveTool("select");
            ui.clearCalibrationDraft();
          } else {
            ui.clearSelection();
            ui.setSelectedStructureId(null);
          }
          return;
        }
        case "+":
        case "=":
          zoomIn();
          return;
        case "-":
        case "_":
          zoomOut();
          return;
        case "0":
          fitToScreen();
          return;
        default:
          return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [zoomIn, zoomOut, fitToScreen]);
}
