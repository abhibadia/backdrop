import { loadImageBlob, saveImageBlob, deleteImageBlob } from "./db";
import { generateImageId } from "@/lib/utils/id";
import { StructureImage } from "@/lib/model/types";

const objectUrlCache = new Map<string, string>();
const pending = new Map<string, Promise<string | undefined>>();

/** Stores an uploaded file's blob and returns StructureImage metadata (without dimensions). */
export async function ingestImageFile(
  file: File,
): Promise<Omit<StructureImage, "naturalWidth" | "naturalHeight">> {
  const blobKey = generateImageId();
  await saveImageBlob(blobKey, file);
  return {
    id: blobKey,
    fileName: file.name,
    mimeType: file.type,
    blobKey,
  };
}

/**
 * Returns a cached object URL for the given image blob key, creating and
 * caching one on first access. Callers should not revoke the URL directly;
 * use `releaseImageObjectUrl` when a structure/image is deleted.
 */
export async function getImageObjectUrl(blobKey: string): Promise<string | undefined> {
  const cached = objectUrlCache.get(blobKey);
  if (cached) return cached;

  const inFlight = pending.get(blobKey);
  if (inFlight) return inFlight;

  const promise = (async () => {
    const blob = await loadImageBlob(blobKey);
    if (!blob) return undefined;
    const url = URL.createObjectURL(blob);
    objectUrlCache.set(blobKey, url);
    return url;
  })();

  pending.set(blobKey, promise);
  try {
    return await promise;
  } finally {
    pending.delete(blobKey);
  }
}

export function releaseImageObjectUrl(blobKey: string): void {
  const url = objectUrlCache.get(blobKey);
  if (url) {
    URL.revokeObjectURL(url);
    objectUrlCache.delete(blobKey);
  }
}

export async function removeImage(blobKey: string): Promise<void> {
  releaseImageObjectUrl(blobKey);
  await deleteImageBlob(blobKey);
}

export async function loadImageDimensions(
  blobKey: string,
): Promise<{ width: number; height: number }> {
  const url = await getImageObjectUrl(blobKey);
  if (!url) throw new Error(`No stored image found for blobKey ${blobKey}`);
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error("Failed to load image for dimension detection"));
    img.src = url;
  });
}
