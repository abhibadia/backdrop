"use client";

import clsx from "clsx";
import { CONNECTOR_TYPES, ConnectorType } from "@/lib/model/types";
import { CONNECTOR_TYPE_LABEL } from "@/lib/model/catalog";

/** Compact technical abbreviations shown on connector-type buttons. */
export const CONNECTOR_TYPE_SHORT_LABEL: Record<ConnectorType, string> = {
  elbow90: "90°",
  elbow45: "45°",
  tee: "T",
  cross: "+",
  fourWay: "4W",
  coupler: "—",
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
    <div className={clsx("grid grid-cols-4 gap-2", className)}>
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
