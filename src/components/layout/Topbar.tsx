"use client";

import { useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { Redo2, Undo2, Download, Upload, Magnet, Grid3x3 } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { ToggleChip } from "@/components/ui/ToggleChip";
import { useUIStore } from "@/lib/store/uiStore";
import { useProjectStore } from "@/lib/store/projectStore";
import { useTemporalProjectState, undoProject, redoProject } from "@/lib/store/useTemporal";
import { exportProjectToJson, downloadProjectJson, importProjectFromJson } from "@/lib/persistence/importExport";

const NAV_ITEMS = [
  { href: "/", label: "View" },
  { href: "/studio", label: "Studio" },
  { href: "/inventory", label: "Inventory" },
];

export function Topbar() {
  const pathname = usePathname();
  const projectName = useProjectStore((s) => s.project.name);
  const project = useProjectStore((s) => s.project);
  const loadProject = useProjectStore((s) => s.loadProject);
  const gridEnabled = useUIStore((s) => s.gridEnabled);
  const toggleGrid = useUIStore((s) => s.toggleGrid);
  const snapEnabled = useUIStore((s) => s.snapEnabled);
  const toggleSnap = useUIStore((s) => s.toggleSnap);
  const canUndo = useTemporalProjectState((s) => s.pastStates.length > 0);
  const canRedo = useTemporalProjectState((s) => s.futureStates.length > 0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    const json = await exportProjectToJson(project);
    const safeName = project.name.trim().replace(/[^a-z0-9-_]+/gi, "-") || "project";
    downloadProjectJson(json, `${safeName}.backdrop.json`);
  };

  const handleImportFile = async (file: File) => {
    const text = await file.text();
    const imported = await importProjectFromJson(text);
    loadProject(imported);
  };

  return (
    <header className="flex h-12 shrink-0 items-center gap-4 border-b border-border bg-surface px-3">
      <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-foreground-subtle">
        <span className="h-2 w-2 rounded-sm bg-accent" />
        Backdrop
      </div>

      <span className="h-5 w-px bg-border" />

      <span className="truncate text-sm text-foreground-muted">{projectName}</span>

      <nav className="ml-2 flex items-center gap-1">
        {NAV_ITEMS.map((item) => {
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "rounded-md px-3 py-1.5 text-sm transition-colors",
                isActive
                  ? "bg-accent-soft text-accent"
                  : "text-foreground-muted hover:bg-surface-hover hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex-1" />

      <div className="flex items-center gap-1">
        <IconButton label="Undo" disabled={!canUndo} onClick={undoProject}>
          <Undo2 size={16} />
        </IconButton>
        <IconButton label="Redo" disabled={!canRedo} onClick={redoProject}>
          <Redo2 size={16} />
        </IconButton>
      </div>

      <span className="h-5 w-px bg-border" />

      <div className="flex items-center gap-1.5">
        <ToggleChip pressed={gridEnabled} onClick={toggleGrid}>
          <Grid3x3 size={11} className="mr-1" />
          Grid
        </ToggleChip>
        <ToggleChip pressed={snapEnabled} onClick={toggleSnap}>
          <Magnet size={11} className="mr-1" />
          Snap
        </ToggleChip>
      </div>

      <span className="h-5 w-px bg-border" />

      <div className="flex items-center gap-1">
        <IconButton label="Import project" onClick={() => fileInputRef.current?.click()}>
          <Upload size={16} />
        </IconButton>
        <IconButton label="Export project" onClick={handleExport}>
          <Download size={16} />
        </IconButton>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleImportFile(file);
            e.target.value = "";
          }}
        />
      </div>
    </header>
  );
}
