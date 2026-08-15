import { nanoid } from "nanoid";

export function createId(prefix: string): string {
  return `${prefix}_${nanoid(10)}`;
}

export const generateProjectId = () => createId("proj");
export const generateStructureId = () => createId("struct");
export const generateImageId = () => createId("img");
export const generatePipeId = () => createId("pipe");
export const generateConnectorId = () => createId("conn");
export const generateLightId = () => createId("light");
