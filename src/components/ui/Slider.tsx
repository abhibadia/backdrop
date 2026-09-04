import { InputHTMLAttributes, forwardRef } from "react";
import clsx from "clsx";

export const Slider = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      type="range"
      className={clsx(
        "h-1.5 w-full cursor-pointer appearance-none rounded-full bg-border accent-[var(--accent)]",
        className,
      )}
      {...props}
    />
  ),
);
Slider.displayName = "Slider";
