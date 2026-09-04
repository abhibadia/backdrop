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
    <div className={clsx("flex flex-wrap gap-2", className)}>
      {PIPE_SIZES.map((size) => (
        <button
          key={size}
          type="button"
          onClick={() => onChange(size)}
          className={clsx(
            "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
            value === size
              ? "border-accent bg-accent-soft text-accent"
              : "border-border text-foreground-muted hover:border-border-strong hover:text-foreground",
          )}
        >
          {PIPE_SIZE_LABEL[size]}
        </button>
      ))}
    </div>
  );
}
