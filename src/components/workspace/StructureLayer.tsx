"use client";

import { useEffect, useRef } from "react";
import Konva from "konva";
import { Layer, Transformer } from "react-konva";
import { useProjectStore } from "@/lib/store/projectStore";
import { useUIStore, Viewport } from "@/lib/store/uiStore";
import { StructureNode } from "./StructureNode";

interface StructureLayerProps {
  viewport: Viewport;
}

export function StructureLayer({ viewport }: StructureLayerProps) {
  const project = useProjectStore((s) => s.project);
  const selectedStructureId = useUIStore((s) => s.selectedStructureId);
  const setSelectedStructureId = useUIStore((s) => s.setSelectedStructureId);
  const nodesRef = useRef<Map<string, Konva.Group>>(new Map());
  const transformerRef = useRef<Konva.Transformer>(null);

  const registerNode = (id: string, node: Konva.Group | null) => {
    if (node) nodesRef.current.set(id, node);
    else nodesRef.current.delete(id);
  };

  useEffect(() => {
    const transformer = transformerRef.current;
    if (!transformer) return;
    const selectedNode = selectedStructureId ? nodesRef.current.get(selectedStructureId) : null;
    const selectedStructure = selectedStructureId
      ? project.structures[selectedStructureId]
      : null;

    if (selectedNode && selectedStructure && !selectedStructure.locked) {
      transformer.nodes([selectedNode]);
    } else {
      transformer.nodes([]);
    }
    transformer.getLayer()?.batchDraw();
  }, [selectedStructureId, project.structures]);

  return (
    <Layer
      onClick={(e) => {
        if (e.target === e.target.getStage()) setSelectedStructureId(null);
      }}
    >
      {project.structureOrder.map((id) => {
        const structure = project.structures[id];
        if (!structure) return null;
        return (
          <StructureNode
            key={id}
            structure={structure}
            registerNode={registerNode}
            viewport={viewport}
          />
        );
      })}
      <Transformer
        ref={transformerRef}
        resizeEnabled={false}
        enabledAnchors={[]}
        rotateEnabled
        borderStroke="#22d3ee"
        anchorStroke="#22d3ee"
        rotateAnchorOffset={24}
      />
    </Layer>
  );
}
