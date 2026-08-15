"use client";

import { Ruler } from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { useProjectStore } from "@/lib/store/projectStore";
import { useUIStore } from "@/lib/store/uiStore";
import { formatReal } from "@/lib/utils/units";

interface CalibrationPanelProps {
  structureId: string;
}

export function CalibrationPanel({ structureId }: CalibrationPanelProps) {
  const activeTool = useUIStore((s) => s.activeTool);
  const activeStructureId = useUIStore((s) => s.activeStructureId);
  const startCalibration = useUIStore((s) => s.startCalibration);
  const setActiveTool = useUIStore((s) => s.setActiveTool);
  const structure = useProjectStore((s) => s.project.structures[structureId]);

  if (!structure) return null;

  const isCalibrating = activeTool === "calibrate" && activeStructureId === structureId;

  return (
    <Panel title="Calibration">
      {structure.calibration ? (
        <div className="mb-2 flex items-center justify-between rounded-md bg-surface-elevated px-2 py-1.5 text-xs">
          <span className="text-foreground-muted">
            {formatReal(structure.calibration.realDistance, structure.calibration.unit)}
          </span>
          <span className="font-mono text-[10px] text-foreground-subtle">
            {structure.calibration.pixelsPerUnit.toFixed(2)} px/{structure.calibration.unit}
          </span>
        </div>
      ) : (
        <p className="mb-2 text-xs text-foreground-subtle">
          Not calibrated yet. Real-world dimensions and the BOM require calibration.
        </p>
      )}

      {isCalibrating ? (
        <div className="flex flex-col gap-1.5">
          <p className="font-mono text-[10px] uppercase tracking-wider text-accent">
            Click two points on the image...
          </p>
          <Button size="sm" variant="ghost" onClick={() => setActiveTool("select")}>
            Cancel
          </Button>
        </div>
      ) : (
        <Button
          size="sm"
          variant="subtle"
          disabled={structure.locked}
          onClick={() => startCalibration(structure.id)}
        >
          <Ruler size={13} />
          {structure.calibration ? "Recalibrate" : "Calibrate"}
        </Button>
      )}
    </Panel>
  );
}
