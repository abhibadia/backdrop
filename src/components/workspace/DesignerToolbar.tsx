"use client";

import {
  CircleDot,
  Hand,
  ImageIcon,
  Lock,
  Maximize2,
  MinusIcon,
  MousePointer2,
  Ruler,
  Unlock,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import clsx from "clsx";
import { IconButton } from "@/components/ui/IconButton";
import { ToggleChip } from "@/components/ui/ToggleChip";
import { Button } from "@/components/ui/Button";
import { PipeTypeSelector } from "@/components/construction/PipeTypeSelector";
import { ConnectorTypeSelector } from "@/components/construction/ConnectorTypeSelector";
import { BuildTool, useUIStore } from "@/lib/store/uiStore";
import { useProjectStore } from "@/lib/store/projectStore";
import { useCanvasZoomControls } from "@/lib/canvas/useCanvasZoomControls";
import { getStructureStatus, STRUCTURE_STATUS_LABEL } from "@/lib/model/status";

const CANVAS_KEY = "workspace";

const TOOLS: { id: BuildTool; label: string; shortcut: string; icon: React.ReactNode }[] = [
  { id: "select", label: "Select", shortcut: "V", icon: <MousePointer2 size={15} /> },
  { id: "pan", label: "Pan", shortcut: "H", icon: <Hand size={15} /> },
  { id: "place-pipe", label: "Pipe", shortcut: "P", icon: <MinusIcon size={15} /> },
  { id: "place-connector", label: "Connector", shortcut: "C", icon: <CircleDot size={15} /> },
  { id: "calibrate", label: "Scale", shortcut: "S", icon: <Ruler size={15} /> },
];

export function DesignerToolbar() {
  const mode = useUIStore((s) => s.mode);
  const activeTool = useUIStore((s) => s.activeTool);
  const setActiveTool = useUIStore((s) => s.setActiveTool);
  const activePipeSize = useUIStore((s) => s.activePipeSize);
  const setActivePipeSize = useUIStore((s) => s.setActivePipeSize);
  const activeConnectorType = useUIStore((s) => s.activeConnectorType);
  const setActiveConnectorType = useUIStore((s) => s.setActiveConnectorType);
  const touchImageOnly = useUIStore((s) => s.touchImageOnly);
  const toggleTouchImageOnly = useUIStore((s) => s.toggleTouchImageOnly);
  const requestAxisView = useUIStore((s) => s.requestAxisView);
  const activeStructureId = useUIStore((s) => s.activeStructureId);
  const selectedStructureId = useUIStore((s) => s.selectedStructureId);
  const enterBuildMode = useUIStore((s) => s.enterBuildMode);
  const exitBuildMode = useUIStore((s) => s.exitBuildMode);
  const setSelectedStructureId = useUIStore((s) => s.setSelectedStructureId);
  const startCalibration = useUIStore((s) => s.startCalibration);
  const { viewport, zoomIn, zoomOut, fitToScreen } = useCanvasZoomControls(CANVAS_KEY);

  const project = useProjectStore((s) => s.project);
  const setConstructionLocked = useProjectStore((s) => s.setConstructionLocked);

  const activeStructure = activeStructureId ? project.structures[activeStructureId] : null;
  const targetStructureId = mode === "build" ? activeStructureId : selectedStructureId;
  const targetStructure = targetStructureId ? project.structures[targetStructureId] : null;

  const requiresCalibration = (tool: BuildTool) => tool === "place-pipe" || tool === "place-connector";

  const handleToolClick = (tool: BuildTool) => {
    if (tool === "calibrate") {
      if (targetStructureId) startCalibration(targetStructureId);
      return;
    }
    if (requiresCalibration(tool) && !targetStructure?.calibration) return;
    setActiveTool(tool);
  };

  const handleModeChange = (next: "view" | "build") => {
    if (next === "build") {
      if (selectedStructureId) enterBuildMode(selectedStructureId);
    } else {
      exitBuildMode();
    }
  };

  const requiresStructure = activeTool === "place-pipe" || activeTool === "place-connector";
  const constructionLocked = activeStructure?.constructionLocked ?? false;

  return (
    <div className="flex h-11 shrink-0 items-center gap-3 border-b border-border bg-surface px-3">
      <div className="flex items-center overflow-hidden rounded-md border border-border">
        {(["view", "build"] as const).map((m) => (
          <button
            key={m}
            type="button"
            disabled={m === "build" && !selectedStructureId && !activeStructureId}
            onClick={() => handleModeChange(m)}
            className={clsx(
              "h-7 px-3 font-mono text-[10px] uppercase tracking-wider transition-colors disabled:cursor-not-allowed disabled:opacity-30",
              mode === m
                ? "bg-accent text-accent-on"
                : "bg-surface-elevated text-foreground-muted hover:text-foreground",
            )}
          >
            {m}
          </button>
        ))}
      </div>

      <span className="h-5 w-px bg-border" />

      <div className="flex items-center gap-0.5">
        {TOOLS.map((tool) => (
          <IconButton
            key={tool.id}
            label={
              requiresCalibration(tool.id) && targetStructure && !targetStructure.calibration
                ? `${tool.label} (${tool.shortcut}) — calibrate this structure first`
                : `${tool.label} (${tool.shortcut})`
            }
            active={activeTool === tool.id}
            disabled={
              (tool.id !== "select" && tool.id !== "pan" && !targetStructureId) ||
              (requiresCalibration(tool.id) && !targetStructure?.calibration)
            }
            onClick={() => handleToolClick(tool.id)}
          >
            {tool.icon}
          </IconButton>
        ))}
      </div>

      {activeTool === "place-pipe" && (
        <>
          <span className="h-5 w-px bg-border" />
          <PipeTypeSelector value={activePipeSize} onChange={setActivePipeSize} />
        </>
      )}
      {activeTool === "place-connector" && (
        <>
          <span className="h-5 w-px bg-border" />
          <PipeTypeSelector value={activePipeSize} onChange={setActivePipeSize} />
          <ConnectorTypeSelector
            value={activeConnectorType}
            onChange={setActiveConnectorType}
            className="grid-cols-8"
          />
        </>
      )}
      {(activeTool === "place-pipe" || activeTool === "place-connector") && targetStructureId && (
        <>
          <span className="h-5 w-px bg-border" />
          <ToggleChip
            pressed={touchImageOnly}
            onClick={toggleTouchImageOnly}
            title="Only place points directly on the structure image — everywhere else off"
          >
            <ImageIcon size={11} className="mr-1" />
            Touch Image
          </ToggleChip>
        </>
      )}
      {requiresStructure && !targetStructureId && (
        <span className="font-mono text-[10px] uppercase tracking-wider text-warning">
          Select a structure first
        </span>
      )}
      {requiresStructure && targetStructure && !targetStructure.calibration && (
        <span className="font-mono text-[10px] uppercase tracking-wider text-warning">
          Calibrate this structure first (Scale tool)
        </span>
      )}

      <div className="flex-1" />

      {targetStructure && (
        <span className="font-mono text-[10px] uppercase tracking-wider text-foreground-subtle">
          {targetStructure.name} · {STRUCTURE_STATUS_LABEL[getStructureStatus(targetStructure)]}
        </span>
      )}

      {mode === "build" && activeStructure && (
        <Button
          size="sm"
          variant={constructionLocked ? "subtle" : "primary"}
          onClick={() => {
            setConstructionLocked(activeStructure.id, !constructionLocked);
            if (!constructionLocked) {
              exitBuildMode();
              setSelectedStructureId(activeStructure.id);
            }
          }}
        >
          {constructionLocked ? <Unlock size={13} /> : <Lock size={13} />}
          {constructionLocked ? "Unlock Construction" : "Lock Construction"}
        </Button>
      )}

      <span className="h-5 w-px bg-border" />

      <div className="flex items-center gap-0.5">
        {(["x", "y", "z"] as const).map((axis) => (
          <IconButton
            key={axis}
            label={`View along ${axis.toUpperCase()} axis`}
            onClick={() => requestAxisView(axis)}
            className="font-mono text-[11px] font-semibold"
          >
            {axis.toUpperCase()}
          </IconButton>
        ))}
      </div>

      <span className="h-5 w-px bg-border" />

      <div className="flex items-center gap-1">
        <IconButton label="Zoom out" onClick={zoomOut}>
          <ZoomOut size={15} />
        </IconButton>
        <span className="w-10 text-center font-mono text-[11px] text-foreground-muted">
          {Math.round(viewport.scale * 100)}%
        </span>
        <IconButton label="Zoom in" onClick={zoomIn}>
          <ZoomIn size={15} />
        </IconButton>
        <IconButton label="Fit to screen" onClick={fitToScreen}>
          <Maximize2 size={15} />
        </IconButton>
      </div>
    </div>
  );
}
