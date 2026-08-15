import { createStore, get, set, del } from "idb-keyval";

// Separate object stores so re-saving the (potentially large) project JSON
// document never touches image blob storage and vice versa.
const projectDb = createStore("backdrop-project-db", "project");
const imageDb = createStore("backdrop-image-db", "images");

const PROJECT_KEY = "current-project";

export async function loadProjectJson(): Promise<string | undefined> {
  return get<string>(PROJECT_KEY, projectDb);
}

export async function saveProjectJson(json: string): Promise<void> {
  await set(PROJECT_KEY, json, projectDb);
}

export async function loadImageBlob(blobKey: string): Promise<Blob | undefined> {
  return get<Blob>(blobKey, imageDb);
}

export async function saveImageBlob(blobKey: string, blob: Blob): Promise<void> {
  await set(blobKey, blob, imageDb);
}

export async function deleteImageBlob(blobKey: string): Promise<void> {
  await del(blobKey, imageDb);
}
