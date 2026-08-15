import { ReactNode } from "react";
import clsx from "clsx";

interface SidebarProps {
  children: ReactNode;
  className?: string;
}

export function Sidebar({ children, className }: SidebarProps) {
  return (
    <aside
      className={clsx(
        "scrollbar-thin flex w-80 shrink-0 flex-col overflow-y-auto border-l border-border bg-surface",
        className,
      )}
    >
      {children}
    </aside>
  );
}
