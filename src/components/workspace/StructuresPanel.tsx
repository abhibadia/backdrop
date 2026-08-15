"use client";

import { useRef, useState } from "react";
import { ImagePlus } from "lucide-react";
import clsx from "clsx";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { useProjectStore } from "@/lib/store/projectStore";
import { addStructureFromFile, ACCEPTED_IMAGE_TYPES } from "@/lib/workspace/addStructureFromFile";
import { StructureRow } from "./StructureRow";

export function StructuresPanel() {
  const structureOrder = useProjectStore((s) => s.project.structureOrder);
  const structures = useProjectStore((s) => s.project.structures);
  const reorderStructures = useProjectStore((s) => s.reorderStructures);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = async (files: FileList | File[]) => {
    setError(null);
    for (const file of Array.from(files)) {
      try {
        await addStructureFromFile(file);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to add image");
      }
    }
  };

  const commitReorder = () => {
    if (!draggedId || !dragOverId || draggedId === dragOverId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }
    const next = [...structureOrder];
    const fromIndex = next.indexOf(draggedId);
    const toIndex = next.indexOf(dragOverId);
    next.splice(fromIndex, 1);
    next.splice(toIndex, 0, draggedId);
    reorderStructures(next);
    setDraggedId(null);
    setDragOverId(null);
  };

  return (
    <Panel title="Structures">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDraggingOver(true);
        }}
        onDragLeave={() => setIsDraggingOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDraggingOver(false);
          if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
        }}
        className={clsx(
          "mb-3 flex flex-col items-center justify-center gap-1.5 rounded-md border border-dashed px-3 py-4 text-center transition-colors",
          isDraggingOver ? "border-accent bg-accent-soft" : "border-border-strong",
        )}
      >
        <ImagePlus size={18} className="text-foreground-subtle" />
        <p className="text-xs text-foreground-muted">Drag &amp; drop PNG/JPG here</p>
        <Button size="sm" variant="subtle" onClick={() => fileInputRef.current?.click()}>
          Upload image
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPTED_IMAGE_TYPES.join(",")}
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {error && <p className="mb-2 text-xs text-danger">{error}</p>}

      {structureOrder.length === 0 ? (
        <p className="text-xs text-foreground-subtle">No structures yet.</p>
      ) : (
        <div className="flex flex-col gap-1">
          {structureOrder.map((id) => {
            const structure = structures[id];
            if (!structure) return null;
            return (
              <StructureRow
                key={id}
                structure={structure}
                isDragging={draggedId === id}
                onDragStart={setDraggedId}
                onDragOver={setDragOverId}
                onDrop={commitReorder}
              />
            );
          })}
        </div>
      )}
    </Panel>
  );
}
