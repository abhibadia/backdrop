"use client";

import { useProjectStore } from "@/lib/store/projectStore";
import { useUIStore } from "@/lib/store/uiStore";
import { StructureInspector } from "./StructureInspector";
import { PipeInspector } from "@/components/construction/PipeInspector";
import { ConnectorInspector } from "@/components/construction/ConnectorInspector";

/**
 * Right-sidebar contextual panel (§39): shows nothing with no selection,
 * a pipe/connector inspector when exactly one Build Mode element is
 * selected, otherwise the inspector for whichever structure is currently
 * selected (View Mode) or active (Build Mode).
 */
export function ContextPanel() {
  const mode = useUIStore((s) => s.mode);
  const activeStructureId = useUIStore((s) => s.activeStructureId);
  const selectedStructureId = useUIStore((s) => s.selectedStructureId);
  const selectedElementIds = useUIStore((s) => s.selectedElementIds);

  const contextStructureId = mode === "build" ? activeStructureId : selectedStructureId;
  const structure = useProjectStore((s) =>
    contextStructureId ? s.project.structures[contextStructureId] : undefined,
  );

  if (!structure) return null;

  if (mode === "build" && selectedElementIds.length === 1) {
    const id = selectedElementIds[0];
    const pipe = structure.pipes[id];
    if (pipe) return <PipeInspector key={id} structure={structure} pipe={pipe} />;
    const connector = structure.connectors[id];
    if (connector) return <ConnectorInspector key={id} structure={structure} connector={connector} />;
  }

  return <StructureInspector key={structure.id} structure={structure} />;
}
