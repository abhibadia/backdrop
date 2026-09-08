import { ConnectorInstance, Project, Rotation3D, Structure } from "./types";

/**
 * Normalizes a connector's persisted `rotation` to the current Rotation3D
 * shape. Projects saved before connectors could rotate on more than one axis
 * stored a single Z-degree number instead — this preserves that exact
 * rotation (as pure Z, matching the old visual behavior) rather than
 * crashing when something like `connector.rotation.z` is read on data that
 * still has a bare number there.
 */
function normalizeConnectorRotation(rotation: unknown): Rotation3D {
  if (typeof rotation === "number") {
    return { x: 0, y: 0, z: rotation };
  }
  if (rotation && typeof rotation === "object") {
    const r = rotation as Partial<Rotation3D>;
    return { x: r.x ?? 0, y: r.y ?? 0, z: r.z ?? 0 };
  }
  return { x: 0, y: 0, z: 0 };
}

function migrateStructure(structure: Structure): Structure {
  let changed = false;
  const connectors = { ...structure.connectors };
  for (const [connectorId, connector] of Object.entries(connectors)) {
    if (typeof (connector as unknown as { rotation: unknown }).rotation === "number") {
      const migrated: ConnectorInstance = {
        ...connector,
        rotation: normalizeConnectorRotation(connector.rotation),
      };
      connectors[connectorId] = migrated;
      changed = true;
    }
  }
  return changed ? { ...structure, connectors } : structure;
}

/**
 * Brings a project loaded from persistence or an imported file up to the
 * current schema. So far this only covers ConnectorInstance.rotation, which
 * changed from a single Z-degree number to a full {x,y,z} Euler rotation
 * (see the Rotation3D/ConnectorInstance doc comments in types.ts) — run on
 * every load path (initial IndexedDB load and "Import project") via
 * projectStore's `loadProject`, since both funnel through it. Non-mutating;
 * returns the same `project` reference untouched if nothing needed migrating.
 */
export function migrateProject(project: Project): Project {
  let changed = false;
  const structures = { ...project.structures };
  for (const [structureId, structure] of Object.entries(structures)) {
    const migrated = migrateStructure(structure);
    if (migrated !== structure) {
      structures[structureId] = migrated;
      changed = true;
    }
  }
  return changed ? { ...project, structures } : project;
}
