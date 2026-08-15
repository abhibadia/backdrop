"use client";

import { Circle, Group, Line } from "react-konva";
import { ConnectorType } from "@/lib/model/types";

interface ConnectorGlyphProps {
  type: ConnectorType;
  stroke: string;
  strokeWidth: number;
  /** Length of each port stub, in local px. */
  armLength: number;
}

/** Stub directions (degrees, 0 = +x) per connector type, defining the icon's ports. */
const PORT_ANGLES: Record<ConnectorType, number[]> = {
  elbow90: [180, 270],
  elbow45: [180, 225],
  tee: [90, 180, 270],
  cross: [0, 90, 180, 270],
  fourWay: [0, 90, 180, 270],
  coupler: [0, 180],
  flange: [180],
  cap: [180],
};

/**
 * Small technical glyph representing a connector/fitting as a hub with port
 * stubs radiating out at the angles real fittings would branch — not a
 * photorealistic render, just enough to read at a glance on the canvas.
 */
export function ConnectorGlyph({ type, stroke, strokeWidth, armLength }: ConnectorGlyphProps) {
  const angles = PORT_ANGLES[type];
  const hubRadius = Math.max(3, armLength * 0.22);

  return (
    <Group>
      {angles.map((deg, i) => {
        const rad = (deg * Math.PI) / 180;
        return (
          <Line
            key={i}
            points={[0, 0, Math.cos(rad) * armLength, Math.sin(rad) * armLength]}
            stroke={stroke}
            strokeWidth={strokeWidth}
            lineCap="round"
          />
        );
      })}
      {type === "flange" && (
        <Line
          points={[
            Math.cos((180 * Math.PI) / 180) * armLength - Math.sin((180 * Math.PI) / 180) * hubRadius * 1.6,
            Math.sin((180 * Math.PI) / 180) * armLength + Math.cos((180 * Math.PI) / 180) * hubRadius * 1.6,
            Math.cos((180 * Math.PI) / 180) * armLength + Math.sin((180 * Math.PI) / 180) * hubRadius * 1.6,
            Math.sin((180 * Math.PI) / 180) * armLength - Math.cos((180 * Math.PI) / 180) * hubRadius * 1.6,
          ]}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      )}
      {type === "cap" && (
        <Circle
          x={Math.cos(Math.PI) * armLength}
          y={Math.sin(Math.PI) * armLength}
          radius={hubRadius}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      )}
      <Circle radius={hubRadius} fill={stroke} />
    </Group>
  );
}
