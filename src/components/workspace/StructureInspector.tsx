"use client";

import { useState } from "react";
import { Eye, EyeOff, Hammer, Lock, LogOut, Unlock } from "lucide-react";
import { Structure } from "@/lib/model/types";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import { useProjectStore } from "@/lib/store/projectStore";
import { useUIStore } from "@/lib/store/uiStore";
import { formatReal, pxToReal } from "@/lib/utils/units";
import { computeStructureBom } from "@/lib/model/bom";
import { getStructureStatus, STRUCTURE_STATUS_LABEL } from "@/lib/model/status";
import { CalibrationPanel } from "./CalibrationPanel";

interface StructureInspectorProps {
  structure: Structure;
}

const STATUS_COLOR: Record<string, string> = {
  unscaled: "text-warning",
  ready: "text-foreground-muted",
  building: "text-accent",
  complete: "text-success",
};

export function StructureInspector({ structure }: StructureInspectorProps) {
  const renameStructure = useProjectStore((s) => s.renameStructure);
  const setStructureVisible = useProjectStore((s) => s.setStructureVisible);
  const setStructureLocked = useProjectStore((s) => s.setStructureLocked);
  const setConstructionLocked = useProjectStore((s) => s.setConstructionLocked);
  const mode = useUIStore((s) => s.mode);
  const enterBuildMode = useUIStore((s) => s.enterBuildMode);
  const exitBuildMode = useUIStore((s) => s.exitBuildMode);
  const setSelectedStructureId = useUIStore((s) => s.setSelectedStructureId);

  const [name, setName] = useState(structure.name);

  const status = getStructureStatus(structure);
  const bom = computeStructureBom(structure);
  const pipeLines = bom.filter((line) => line.category === "pipe");
  const connectorLines = bom.filter((line) => line.category === "connector");
  const totalPipes = pipeLines.reduce((sum, l) => sum + l.count, 0);
  const totalConnectors = connectorLines.reduce((sum, l) => sum + l.count, 0);

  const isBuildTarget = mode === "build";

  const realWidth = structure.calibration
    ? pxToReal(structure.image.naturalWidth, structure.calibration)
    : null;
  const realHeight = structure.calibration
    ? pxToReal(structure.image.naturalHeight, structure.calibration)
    : null;

  return (
    <>
      <Panel title="Structure">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => {
            const trimmed = name.trim();
            if (trimmed) renameStructure(structure.id, trimmed);
            else setName(structure.name);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
          className="mb-2"
        />
        <div className="mb-2 flex items-center justify-between">
          <span className={`font-mono text-[10px] uppercase tracking-wider ${STATUS_COLOR[status]}`}>
            {STRUCTURE_STATUS_LABEL[status]}
          </span>
          <div className="flex items-center gap-0.5">
            <IconButton
              label={structure.visible ? "Hide" : "Show"}
              onClick={() => setStructureVisible(structure.id, !structure.visible)}
            >
              {structure.visible ? <Eye size={14} /> : <EyeOff size={14} />}
            </IconButton>
            <IconButton
              label={structure.locked ? "Unlock image" : "Lock image"}
              onClick={() => setStructureLocked(structure.id, !structure.locked)}
            >
              {structure.locked ? <Lock size={14} /> : <Unlock size={14} />}
            </IconButton>
          </div>
        </div>

        <div className="mb-3 rounded-md bg-surface-elevated px-2 py-1.5 font-mono text-[11px] text-foreground-muted">
          {realWidth !== null && realHeight !== null ? (
            <>
              {formatReal(realWidth, structure.calibration!.unit)} ×{" "}
              {formatReal(realHeight, structure.calibration!.unit)}
            </>
          ) : (
            <>
              {structure.image.naturalWidth} × {structure.image.naturalHeight}px (uncalibrated)
            </>
          )}
        </div>

        {isBuildTarget ? (
          <Button size="sm" variant="subtle" onClick={exitBuildMode} className="w-full">
            <LogOut size={13} />
            Exit Build Mode
          </Button>
        ) : (
          <Button
            size="sm"
            variant="primary"
            className="w-full"
            onClick={() => enterBuildMode(structure.id)}
          >
            <Hammer size={13} />
            Enter Build Mode
          </Button>
        )}
      </Panel>

      <CalibrationPanel structureId={structure.id} />

      <Panel
        title="Materials"
        action={
          <span className="font-mono text-[10px] text-foreground-subtle">
            {totalPipes + totalConnectors} total
          </span>
        }
      >
        {bom.length === 0 ? (
          <p className="text-xs text-foreground-subtle">
            No pipes or connectors placed yet. Enter Build Mode to start construction.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {pipeLines.length > 0 && (
              <div>
                <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-foreground-subtle">
                  Pipes ({totalPipes})
                </p>
                {pipeLines.map((line) => (
                  <div key={line.partKey} className="flex items-center justify-between py-0.5 text-xs">
                    <span className="text-foreground-muted">{line.label}</span>
                    <span className="font-mono text-foreground">
                      × {line.count}
                      {line.totalLength !== undefined && line.unit && (
                        <span className="ml-1.5 text-foreground-subtle">
                          ({formatReal(line.totalLength, line.unit, 1)})
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {connectorLines.length > 0 && (
              <div>
                <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-foreground-subtle">
                  Connectors ({totalConnectors})
                </p>
                {connectorLines.map((line) => (
                  <div key={line.partKey} className="flex items-center justify-between py-0.5 text-xs">
                    <span className="text-foreground-muted">{line.label}</span>
                    <span className="font-mono text-foreground">× {line.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Panel>

      {status !== "unscaled" && bom.length > 0 && (
        <Panel title="Build Check">
          <BuildValidation structure={structure} />
        </Panel>
      )}

      <Panel title="Construction Lock">
        <Button
          size="sm"
          variant={structure.constructionLocked ? "subtle" : "primary"}
          className="w-full"
          disabled={bom.length === 0}
          onClick={() => {
            setConstructionLocked(structure.id, !structure.constructionLocked);
            if (!structure.constructionLocked) {
              exitBuildMode();
              setSelectedStructureId(structure.id);
            }
          }}
        >
          {structure.constructionLocked ? <Unlock size={13} /> : <Lock size={13} />}
          {structure.constructionLocked ? "Unlock Construction" : "Lock Construction"}
        </Button>
      </Panel>
    </>
  );
}

function BuildValidation({ structure }: { structure: Structure }) {
  const pipes = Object.values(structure.pipes);
  const connectors = Object.values(structure.connectors);
  const tolerance = 6; // local px "close enough to count as connected"

  const points = [
    ...connectors.map((c) => c.position),
    ...pipes.flatMap((p) => [p.start, p.end]),
  ];

  const isNearAny = (point: { x: number; y: number }, exclude: { x: number; y: number }) => {
    return points.some(
      (p) =>
        p !== exclude &&
        Math.hypot(p.x - point.x, p.y - point.y) <= tolerance &&
        Math.hypot(p.x - point.x, p.y - point.y) > 0,
    );
  };

  let unconnected = 0;
  for (const pipe of pipes) {
    if (!isNearAny(pipe.start, pipe.start)) unconnected += 1;
    if (!isNearAny(pipe.end, pipe.end)) unconnected += 1;
  }

  const checks: { ok: boolean; label: string }[] = [
    { ok: true, label: `${pipes.length} pipe${pipes.length === 1 ? "" : "s"} placed` },
    { ok: true, label: `${connectors.length} connector${connectors.length === 1 ? "" : "s"} placed` },
    { ok: unconnected === 0, label: unconnected === 0 ? "All pipe endpoints connected" : `${unconnected} unconnected pipe endpoint${unconnected === 1 ? "" : "s"}` },
  ];

  return (
    <div className="flex flex-col gap-1">
      {checks.map((check, i) => (
        <div key={i} className="flex items-start gap-1.5 text-xs">
          <span className={check.ok ? "text-success" : "text-warning"}>{check.ok ? "✓" : "⚠"}</span>
          <span className="text-foreground-muted">{check.label}</span>
        </div>
      ))}
    </div>
  );
}
