"use client";

import clsx from "clsx";
import { CONNECTOR_TYPES, ConnectorType } from "@/lib/model/types";
import { CONNECTOR_TYPE_LABEL } from "@/lib/model/catalog";

/**
 * Compact technical abbreviations shown on connector-type buttons. Only the
 * six current types (see CONNECTOR_TYPES in types.ts) are ever actually
 * rendered here — the retired ones are filled in just to satisfy the
 * Record<ConnectorType, ...> type.
 */
export const CONNECTOR_TYPE_SHORT_LABEL: Record<ConnectorType, string> = {
  elbow90: "90°",
  tee: "T",
  fourWay: "4W",
  coupler: "—",
  triangle: "△",
  triAxis: "XYZ",
  elbow45: "45°",
  cross: "+",
  flange: "|—",
  cap: "—◦",
};

interface ConnectorTypeSelectorProps {
  value: ConnectorType;
  onChange: (type: ConnectorType) => void;
  className?: string;
}

export function ConnectorTypeSelector({ value, onChange, className }: ConnectorTypeSelectorProps) {
  return (
    <div className={clsx("grid shrink-0 grid-cols-6 gap-2", className)}>
      {CONNECTOR_TYPES.map((type) => (
        <button
          key={type}
          type="button"
          title={CONNECTOR_TYPE_LABEL[type]}
          onClick={() => onChange(type)}
          className={clsx(
            "flex h-9 flex-col items-center justify-center rounded-lg border font-mono text-xs transition-colors",
            value === type
              ? "border-accent bg-accent-soft text-accent"
              : "border-border text-foreground-muted hover:border-border-strong hover:text-foreground",
          )}
        >
          {CONNECTOR_TYPE_SHORT_LABEL[type]}
        </button>
      ))}
    </div>
  );
}
