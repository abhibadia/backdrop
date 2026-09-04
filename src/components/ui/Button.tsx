"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";
import clsx from "clsx";

type Variant = "primary" | "ghost" | "subtle" | "danger";
type Size = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  active?: boolean;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-accent text-accent-on hover:bg-accent-strong",
  ghost: "bg-transparent text-foreground-muted hover:bg-surface-hover hover:text-foreground",
  subtle: "bg-surface-elevated text-foreground hover:bg-surface-hover",
  danger: "bg-transparent text-danger hover:bg-danger/10",
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: "h-7 px-2 text-xs gap-1",
  md: "h-9 px-3 text-sm gap-1.5",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "subtle", size = "md", active, className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={clsx(
          "inline-flex items-center justify-center rounded-md border border-transparent font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40",
          VARIANT_CLASSES[variant],
          SIZE_CLASSES[size],
          active && "border-accent/50 bg-accent-soft text-accent",
          className,
        )}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
