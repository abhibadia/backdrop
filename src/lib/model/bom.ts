import { BomLine, Structure } from "./types";
import { connectorPartKey, PART_CATALOG_BY_KEY, pipePartKey } from "./catalog";
import { distance } from "@/lib/utils/geometry";
import { pxToReal } from "@/lib/utils/units";

/**
 * Computes the bill-of-materials for a single structure: pipe piece counts
 * and total real-world length per size, plus connector piece counts per
 * type+size. Pure function of the structure's pipes/connectors/calibration.
 */
export function computeStructureBom(structure: Structure): BomLine[] {
  const lines = new Map<string, BomLine>();

  for (const pipe of Object.values(structure.pipes)) {
    const partKey = pipePartKey(pipe.size);
    const catalogEntry = PART_CATALOG_BY_KEY[partKey];
    const lengthPx = distance(pipe.start, pipe.end);
    const lengthReal = structure.calibration
      ? pxToReal(lengthPx, structure.calibration)
      : 0;

    const existing = lines.get(partKey);
    if (existing) {
      existing.count += 1;
      existing.totalLength = (existing.totalLength ?? 0) + lengthReal;
    } else {
      lines.set(partKey, {
        partKey,
        category: "pipe",
        label: catalogEntry?.label ?? partKey,
        size: pipe.size,
        count: 1,
        totalLength: lengthReal,
        unit: structure.calibration?.unit,
      });
    }
  }

  for (const connector of Object.values(structure.connectors)) {
    const partKey = connectorPartKey(connector.type, connector.size);
    const catalogEntry = PART_CATALOG_BY_KEY[partKey];

    const existing = lines.get(partKey);
    if (existing) {
      existing.count += 1;
    } else {
      lines.set(partKey, {
        partKey,
        category: "connector",
        label: catalogEntry?.label ?? partKey,
        size: connector.size,
        connectorType: connector.type,
        count: 1,
      });
    }
  }

  return Array.from(lines.values()).sort((a, b) => a.label.localeCompare(b.label));
}

/** Merges multiple structures' BOM lines into one aggregated set, keyed by partKey. */
export function mergeBomLines(bomLineSets: BomLine[][]): BomLine[] {
  const merged = new Map<string, BomLine>();

  for (const lines of bomLineSets) {
    for (const line of lines) {
      const existing = merged.get(line.partKey);
      if (existing) {
        existing.count += line.count;
        if (line.totalLength !== undefined) {
          existing.totalLength = (existing.totalLength ?? 0) + line.totalLength;
        }
      } else {
        merged.set(line.partKey, { ...line });
      }
    }
  }

  return Array.from(merged.values()).sort((a, b) => a.label.localeCompare(b.label));
}
