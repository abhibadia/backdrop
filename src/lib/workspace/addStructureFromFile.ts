import { ingestImageFile, loadImageDimensions } from "@/lib/persistence/images";
import { useProjectStore } from "@/lib/store/projectStore";

export const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg"];
export const MAX_IMAGE_BYTES = 25 * 1024 * 1024; // 25MB

export function isAcceptedImageFile(file: File): boolean {
  return ACCEPTED_IMAGE_TYPES.includes(file.type) || /\.(png|jpe?g)$/i.test(file.name);
}

const PLACEMENT_STEP = 60;

/** Validates, stores, and registers an uploaded image file as a new Structure. Returns the new structure id. */
export async function addStructureFromFile(file: File): Promise<string> {
  if (!isAcceptedImageFile(file)) {
    throw new Error(`Unsupported file type: ${file.type || "unknown"}. Use PNG or JPEG.`);
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("Image is too large (max 25MB).");
  }

  const partialImage = await ingestImageFile(file);
  const { width, height } = await loadImageDimensions(partialImage.blobKey);

  const store = useProjectStore.getState();
  const existingCount = store.project.structureOrder.length;
  const structureId = store.addStructure({
    ...partialImage,
    naturalWidth: width,
    naturalHeight: height,
  });

  const stagger = existingCount * PLACEMENT_STEP;
  store.setStructureTransform(structureId, { x: stagger, y: stagger, rotation: 0 });

  return structureId;
}
