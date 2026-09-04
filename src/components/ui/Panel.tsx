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
    <div className={clsx("px-4 py-5", className)}>
      {title && (
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-medium text-foreground">{title}</h3>
          {action}
        </div>
      )}
      <div>{children}</div>
    </div>
  );
}
