"use client";

import { Copy, Lock, Trash2, Unlock } from "lucide-react";
import { PipeSegment, Structure } from "@/lib/model/types";
import { Panel } from "@/components/ui/Panel";
import { IconButton } from "@/components/ui/IconButton";
import { useProjectStore } from "@/lib/store/projectStore";
import { useUIStore } from "@/lib/store/uiStore";
import { distance } from "@/lib/utils/geometry";
import { convertUnits, formatReal, pxToReal } from "@/lib/utils/units";
import { classifyPipeLengthIn, PIPE_SIZE_NOMINAL_LENGTH_IN } from "@/lib/model/catalog";
import { PipeTypeSelector } from "./PipeTypeSelector";
import { createPipe } from "@/lib/model/factory";

interface PipeInspectorProps {
  structure: Structure;
  pipe: PipeSegment;
}

export function PipeInspector({ structure, pipe }: PipeInspectorProps) {
  const updatePipe = useProjectStore((s) => s.updatePipe);
  const removeElements = useProjectStore((s) => s.removeElements);
  const addPipe = useProjectStore((s) => s.addPipe);
  const clearSelection = useUIStore((s) => s.clearSelection);
  const setSelectedElementIds = useUIStore((s) => s.setSelectedElementIds);

  const lengthPx = distance(pipe.start, pipe.end);
  const lengthReal = structure.calibration ? pxToReal(lengthPx, structure.calibration) : null;
  const lengthIn = structure.calibration
    ? convertUnits(lengthReal!, structure.calibration.unit, "in")
    : null;
  const classified = lengthIn !== null ? classifyPipeLengthIn(lengthIn) : null;
  const nominalIn = PIPE_SIZE_NOMINAL_LENGTH_IN[pipe.size];

  return (
    <Panel
      title="Pipe"
      action={
        <div className="flex items-center gap-0.5">
          <IconButton
            label={pipe.locked ? "Unlock" : "Lock"}
            onClick={() => updatePipe(structure.id, pipe.id, { locked: !pipe.locked })}
          >
            {pipe.locked ? <Lock size={13} /> : <Unlock size={13} />}
          </IconButton>
          <IconButton
            label="Duplicate"
            onClick={() => {
              const offset = 16;
              const copy = createPipe(
                pipe.size,
                { x: pipe.start.x + offset, y: pipe.start.y + offset },
                { x: pipe.end.x + offset, y: pipe.end.y + offset },
              );
              addPipe(structure.id, copy);
              setSelectedElementIds([copy.id]);
            }}
          >
            <Copy size={13} />
          </IconButton>
          <IconButton
            label="Delete"
            onClick={() => {
              removeElements(structure.id, [pipe.id]);
              clearSelection();
            }}
          >
            <Trash2 size={13} />
          </IconButton>
        </div>
      }
    >
      <div className="mb-2">
        <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-foreground-subtle">
          Type / size
        </p>
        <PipeTypeSelector
          value={pipe.size}
          onChange={(size) => updatePipe(structure.id, pipe.id, { size })}
          className="w-full [&>button]:flex-1"
        />
      </div>

      <div className="mb-2 grid grid-cols-2 gap-2 rounded-md bg-surface-elevated px-2 py-1.5 font-mono text-[11px]">
        <div>
          <p className="text-foreground-subtle">Measured</p>
          <p className="text-foreground">
            {lengthReal !== null
              ? formatReal(lengthReal, structure.calibration!.unit)
              : `${lengthPx.toFixed(1)}px`}
          </p>
        </div>
        <div>
          <p className="text-foreground-subtle">Nominal</p>
          <p className="text-foreground">{nominalIn}&quot;</p>
        </div>
      </div>

      {lengthIn !== null && (
        <p className="mb-2 text-xs">
          {classified === pipe.size ? (
            <span className="text-success">Matches {pipe.size} nominal length</span>
          ) : classified ? (
            <span className="text-warning">Closer to {classified} nominal length</span>
          ) : (
            <span className="text-warning">Custom length — no standard size matches</span>
          )}
        </p>
      )}

      <div className="grid grid-cols-2 gap-2 font-mono text-[10px] text-foreground-subtle">
        <span>
          Start {pipe.start.x.toFixed(0)}, {pipe.start.y.toFixed(0)}
        </span>
        <span>
          End {pipe.end.x.toFixed(0)}, {pipe.end.y.toFixed(0)}
        </span>
      </div>
    </Panel>
  );
}
