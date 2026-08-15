import { InputHTMLAttributes, SelectHTMLAttributes, forwardRef } from "react";
import clsx from "clsx";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={clsx(
        "h-8 w-full rounded-md border border-border bg-surface-elevated px-2 text-sm text-foreground outline-none placeholder:text-foreground-subtle focus:border-accent/60",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={clsx(
        "h-8 w-full rounded-md border border-border bg-surface-elevated px-2 text-sm text-foreground outline-none focus:border-accent/60",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  ),
);
Select.displayName = "Select";
