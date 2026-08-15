"use client";

import clsx from "clsx";
import { PIPE_SIZES, PipeSize } from "@/lib/model/types";
import { PIPE_SIZE_LABEL } from "@/lib/model/catalog";

interface PipeTypeSelectorProps {
  value: PipeSize;
  onChange: (size: PipeSize) => void;
  className?: string;
}

export function PipeTypeSelector({ value, onChange, className }: PipeTypeSelectorProps) {
  return (
    <div className={clsx("inline-flex overflow-hidden rounded-md border border-border", className)}>
      {PIPE_SIZES.map((size) => (
        <button
          key={size}
          type="button"
          onClick={() => onChange(size)}
          className={clsx(
            "h-7 border-r border-border px-2 font-mono text-[10px] uppercase tracking-wider transition-colors last:border-r-0",
            value === size
              ? "bg-accent-soft text-accent"
              : "bg-surface-elevated text-foreground-muted hover:text-foreground",
          )}
        >
          {PIPE_SIZE_LABEL[size]}
        </button>
      ))}
    </div>
  );
}
