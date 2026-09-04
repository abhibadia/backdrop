"use client";

import { Copy, Lock, Trash2, Unlock } from "lucide-react";
import { ConnectorInstance, Structure } from "@/lib/model/types";
import { Panel } from "@/components/ui/Panel";
import { IconButton } from "@/components/ui/IconButton";
import { Slider } from "@/components/ui/Slider";
import { useProjectStore } from "@/lib/store/projectStore";
import { useUIStore } from "@/lib/store/uiStore";
import { CONNECTOR_TYPE_LABEL, CONNECTOR_TYPE_PORTS } from "@/lib/model/catalog";
import { createConnector } from "@/lib/model/factory";
import { getConnectorPortInfo } from "@/lib/model/connectorPorts";
import { PipeTypeSelector } from "./PipeTypeSelector";
import { ConnectorTypeSelector } from "./ConnectorTypeSelector";
import { Vector3Fields } from "./Vector3Fields";

interface ConnectorInspectorProps {
  structure: Structure;
  connector: ConnectorInstance;
}

export function ConnectorInspector({ structure, connector }: ConnectorInspectorProps) {
  const updateConnector = useProjectStore((s) => s.updateConnector);
  const removeElements = useProjectStore((s) => s.removeElements);
  const addConnector = useProjectStore((s) => s.addConnector);
  const clearSelection = useUIStore((s) => s.clearSelection);
  const setSelectedElementIds = useUIStore((s) => s.setSelectedElementIds);

  // Which specific ports (by angle, connector.rotation applied) are occupied —
  // the same matching the Pipe tool uses to plug a new pipe into a free hole.
  const portInfo = getConnectorPortInfo(structure, connector);
  const usedPorts = portInfo.occupied.filter(Boolean).length;
  const totalPorts = CONNECTOR_TYPE_PORTS[connector.type];

  return (
    <Panel
      title="Connector"
      action={
        <div className="flex items-center gap-0.5">
          <IconButton
            label={connector.locked ? "Unlock" : "Lock"}
            onClick={() => updateConnector(structure.id, connector.id, { locked: !connector.locked })}
          >
            {connector.locked ? <Lock size={13} /> : <Unlock size={13} />}
          </IconButton>
          <IconButton
            label="Duplicate"
            onClick={() => {
              const copy = createConnector(connector.type, connector.size, {
                x: connector.position.x + 20,
                y: connector.position.y + 20,
                z: connector.position.z,
              });
              addConnector(structure.id, copy);
              setSelectedElementIds([copy.id]);
            }}
          >
            <Copy size={13} />
          </IconButton>
          <IconButton
            label="Delete"
            onClick={() => {
              removeElements(structure.id, [connector.id]);
              clearSelection();
            }}
          >
            <Trash2 size={13} />
          </IconButton>
        </div>
      }
    >
      <div className="mb-2">
        <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-foreground-subtle">
          Type
        </p>
        <ConnectorTypeSelector
          value={connector.type}
          onChange={(type) => updateConnector(structure.id, connector.id, { type })}
        />
      </div>

      <div className="mb-2">
        <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-foreground-subtle">
          Pipe size
        </p>
        <PipeTypeSelector
          value={connector.size}
          onChange={(size) => updateConnector(structure.id, connector.id, { size })}
          className="w-full [&>button]:flex-1"
        />
      </div>

      <div className="mb-2">
        <div className="mb-1 flex items-center justify-between">
          <p className="font-mono text-[10px] uppercase tracking-wider text-foreground-subtle">
            Rotation
          </p>
          <span className="font-mono text-[11px] text-foreground-muted">
            {Math.round(connector.rotation)}°
          </span>
        </div>
        <Slider
          min={-180}
          max={180}
          step={1}
          value={connector.rotation}
          onChange={(e) =>
            updateConnector(structure.id, connector.id, { rotation: Number(e.target.value) })
          }
        />
      </div>

      <div className="mb-2 rounded-md bg-surface-elevated px-2 py-1.5 font-mono text-[11px] text-foreground-muted">
        {CONNECTOR_TYPE_LABEL[connector.type]} · {usedPorts}/{totalPorts} ports connected
      </div>

      <Vector3Fields
        label="Position"
        value={connector.position}
        onChange={(next) => updateConnector(structure.id, connector.id, { position: next })}
      />
    </Panel>
  );
}
