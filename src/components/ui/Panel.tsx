import { ReactNode } from "react";
import clsx from "clsx";

interface PanelProps {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Panel({ title, action, children, className }: PanelProps) {
  return (
    <div className={clsx("border-b border-border", className)}>
      {title && (
        <div className="flex items-center justify-between px-3 py-2">
          <h3 className="font-mono text-[10px] uppercase tracking-wider text-foreground-subtle">
            {title}
          </h3>
          {action}
        </div>
      )}
      <div className={title ? "px-3 pb-3" : "p-3"}>{children}</div>
    </div>
  );
}
