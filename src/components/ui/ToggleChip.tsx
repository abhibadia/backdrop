"use client";

import { ButtonHTMLAttributes } from "react";
import clsx from "clsx";

interface ToggleChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  pressed: boolean;
}

export function ToggleChip({ pressed, className, children, ...props }: ToggleChipProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={clsx(
        "inline-flex h-7 shrink-0 items-center whitespace-nowrap rounded-full border px-3 font-mono text-[10px] uppercase tracking-wider transition-colors",
        pressed
          ? "border-accent/50 bg-accent-soft text-accent"
          : "border-border text-foreground-subtle hover:text-foreground-muted",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
