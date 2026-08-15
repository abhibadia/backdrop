"use client";

import { useState } from "react";
import { Eye, EyeOff, Lock, Unlock, Trash2, GripVertical } from "lucide-react";
import clsx from "clsx";
import { Structure } from "@/lib/model/types";
import { useImageObjectUrl } from "@/lib/canvas/useImageObjectUrl";
import { useProjectStore } from "@/lib/store/projectStore";
import { useUIStore } from "@/lib/store/uiStore";
import { removeImage } from "@/lib/persistence/images";
import { Input } from "@/components/ui/Input";
import { IconButton } from "@/components/ui/IconButton";

interface StructureRowProps {
  structure: Structure;
  isDragging: boolean;
  onDragStart: (id: string) => void;
  onDragOver: (id: string) => void;
  onDrop: () => void;
}

export function StructureRow({
  structure,
  isDragging,
  onDragStart,
  onDragOver,
  onDrop,
}: StructureRowProps) {
  const thumbUrl = useImageObjectUrl(structure.image.blobKey);
  const renameStructure = useProjectStore((s) => s.renameStructure);
  const setStructureVisible = useProjectStore((s) => s.setStructureVisible);
  const setStructureLocked = useProjectStore((s) => s.setStructureLocked);
  const removeStructure = useProjectStore((s) => s.removeStructure);
  const enterBuildMode = useUIStore((s) => s.enterBuildMode);
  const selectedStructureId = useUIStore((s) => s.selectedStructureId);
  const setSelectedStructureId = useUIStore((s) => s.setSelectedStructureId);

  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(structure.name);

  const commitRename = () => {
    const trimmed = draftName.trim();
    if (trimmed) renameStructure(structure.id, trimmed);
    else setDraftName(structure.name);
    setEditing(false);
  };

  const handleDelete = async () => {
    await removeImage(structure.image.blobKey);
    removeStructure(structure.id);
    if (selectedStructureId === structure.id) setSelectedStructureId(null);
  };

  const isSelected = selectedStructureId === structure.id;

  return (
    <div
      draggable
      onDragStart={() => onDragStart(structure.id)}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver(structure.id);
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDrop();
      }}
      onClick={() => setSelectedStructureId(structure.id)}
      onDoubleClick={() => enterBuildMode(structure.id)}
      className={clsx(
        "group flex cursor-pointer items-center gap-2 rounded-md border px-2 py-2 transition-colors",
        isDragging && "opacity-40",
        isSelected
          ? "border-accent/50 bg-accent-soft"
          : "border-transparent hover:bg-surface-hover",
      )}
    >
      <GripVertical size={14} className="shrink-0 cursor-grab text-foreground-subtle" />

      <div className="h-10 w-14 shrink-0 overflow-hidden rounded bg-surface-elevated">
        {thumbUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumbUrl} alt={structure.name} className="h-full w-full object-cover" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        {editing ? (
          <Input
            autoFocus
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") {
                setDraftName(structure.name);
                setEditing(false);
              }
            }}
            onClick={(e) => e.stopPropagation()}
            className="h-6 text-xs"
          />
        ) : (
          <button
            type="button"
            className="block max-w-full truncate text-left text-xs text-foreground hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              setEditing(true);
            }}
          >
            {structure.name}
          </button>
        )}
        <p className="mt-0.5 font-mono text-[10px] text-foreground-subtle">
          {structure.image.naturalWidth} x {structure.image.naturalHeight}px
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <IconButton
          label={structure.visible ? "Hide" : "Show"}
          onClick={(e) => {
            e.stopPropagation();
            setStructureVisible(structure.id, !structure.visible);
          }}
        >
          {structure.visible ? <Eye size={14} /> : <EyeOff size={14} />}
        </IconButton>
        <IconButton
          label={structure.locked ? "Unlock" : "Lock"}
          onClick={(e) => {
            e.stopPropagation();
            setStructureLocked(structure.id, !structure.locked);
          }}
        >
          {structure.locked ? <Lock size={14} /> : <Unlock size={14} />}
        </IconButton>
        <IconButton
          label="Delete"
          onClick={(e) => {
            e.stopPropagation();
            handleDelete();
          }}
        >
          <Trash2 size={14} />
        </IconButton>
      </div>
    </div>
  );
}
