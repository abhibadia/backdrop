"use client";

import { Point3D } from "@/lib/model/types";

interface Vector3FieldsProps {
  label: string;
  value: Point3D;
  onChange: (next: Point3D) => void;
}

/** Compact editable X/Y/Z row for a pipe endpoint or connector position. */
export function Vector3Fields({ label, value, onChange }: Vector3FieldsProps) {
  const handle = (axis: "x" | "y" | "z") => (e: React.ChangeEvent<HTMLInputElement>) => {
    const num = Number(e.target.value);
    if (Number.isNaN(num)) return;
    onChange({ ...value, [axis]: num });
  };

  return (
    <div className="mb-2">
      <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-foreground-subtle">{label}</p>
      <div className="grid grid-cols-3 gap-1">
        {(["x", "y", "z"] as const).map((axis) => (
          <label key={axis} className="flex items-center gap-1 rounded-md bg-surface-elevated px-1.5">
            <span className="font-mono text-[10px] text-foreground-subtle">{axis}</span>
            <input
              type="number"
              value={Math.round(value[axis] * 10) / 10}
              onChange={handle(axis)}
              className="h-6 w-full min-w-0 bg-transparent font-mono text-[11px] text-foreground outline-none"
            />
          </label>
        ))}
      </div>
    </div>
  );
}
