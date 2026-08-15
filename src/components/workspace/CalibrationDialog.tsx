"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { useUIStore } from "@/lib/store/uiStore";
import { useProjectStore } from "@/lib/store/projectStore";
import { buildCalibration } from "@/lib/utils/units";
import { Point, Units } from "@/lib/model/types";

const UNIT_OPTIONS: Units[] = ["in", "ft", "cm", "m"];

export function CalibrationDialog() {
  const draft = useUIStore((s) => s.calibrationDraft);
  const activeStructureId = useUIStore((s) => s.activeStructureId);
  const activeTool = useUIStore((s) => s.activeTool);
  const calibrationSession = useUIStore((s) => s.calibrationSession);
  const clearCalibrationDraft = useUIStore((s) => s.clearCalibrationDraft);
  const setActiveTool = useUIStore((s) => s.setActiveTool);
  const projectUnits = useProjectStore((s) => s.project.units);
  const setStructureCalibration = useProjectStore((s) => s.setStructureCalibration);

  const open = activeTool === "calibrate" && !!draft.pointA && !!draft.pointB;

  const handleCancel = () => {
    clearCalibrationDraft();
    setActiveTool("select");
  };

  const handleConfirm = (value: number, unit: Units) => {
    if (!activeStructureId || !draft.pointA || !draft.pointB || !Number.isFinite(value) || value <= 0) {
      return;
    }
    const calibration = buildCalibration(draft.pointA, draft.pointB, value, unit);
    setStructureCalibration(activeStructureId, calibration);
    clearCalibrationDraft();
    setActiveTool("select");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) handleCancel();
      }}
      title="Calibrate scale"
      description="Enter the real-world distance between the two points you placed."
    >
      {/* Keyed by session so each calibration attempt starts with fresh, uncontrolled-feeling defaults. */}
      <CalibrationForm
        key={calibrationSession}
        defaultUnit={projectUnits}
        pointA={draft.pointA}
        pointB={draft.pointB}
        onCancel={handleCancel}
        onConfirm={handleConfirm}
      />
    </Dialog>
  );
}

interface CalibrationFormProps {
  defaultUnit: Units;
  pointA: Point | null;
  pointB: Point | null;
  onCancel: () => void;
  onConfirm: (value: number, unit: Units) => void;
}

function CalibrationForm({ defaultUnit, onCancel, onConfirm }: CalibrationFormProps) {
  const [distance, setDistance] = useState("");
  const [unit, setUnit] = useState<Units>(defaultUnit);

  const submit = () => onConfirm(parseFloat(distance), unit);

  return (
    <div>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min="0"
          step="any"
          autoFocus
          value={distance}
          onChange={(e) => setDistance(e.target.value)}
          placeholder="Distance"
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
        />
        <Select value={unit} onChange={(e) => setUnit(e.target.value as Units)} className="w-24">
          {UNIT_OPTIONS.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </Select>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" onClick={submit}>
          Set scale
        </Button>
      </div>
    </div>
  );
}
