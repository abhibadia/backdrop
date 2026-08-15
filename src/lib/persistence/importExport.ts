import { Project } from "@/lib/model/types";
import { loadImageBlob, saveImageBlob } from "./db";

interface ExportBundle {
  formatVersion: 1;
  project: Project;
  images: Record<string, string>;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  return response.blob();
}

/** Serializes the project plus every referenced image blob into one JSON string. */
export async function exportProjectToJson(project: Project): Promise<string> {
  const images: Record<string, string> = {};
  for (const structure of Object.values(project.structures)) {
    const blobKey = structure.image.blobKey;
    if (images[blobKey]) continue;
    const blob = await loadImageBlob(blobKey);
    if (blob) {
      images[blobKey] = await blobToDataUrl(blob);
    }
  }
  const bundle: ExportBundle = { formatVersion: 1, project, images };
  return JSON.stringify(bundle);
}

/** Triggers a browser download of the exported project JSON. */
export function downloadProjectJson(json: string, fileName: string): void {
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

/** Parses an exported bundle, restores image blobs into IndexedDB, and returns the Project. */
export async function importProjectFromJson(json: string): Promise<Project> {
  const bundle = JSON.parse(json) as ExportBundle;
  await Promise.all(
    Object.entries(bundle.images).map(async ([blobKey, dataUrl]) => {
      const blob = await dataUrlToBlob(dataUrl);
      await saveImageBlob(blobKey, blob);
    }),
  );
  return bundle.project;
}
