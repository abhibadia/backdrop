"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useHtmlImage } from "@/lib/canvas/useHtmlImage";

/**
 * Loads a stored structure image as a Three.js texture, reusing the same
 * cached-object-URL pipeline the 2D canvas uses (via `useHtmlImage`) rather
 * than loading the image bytes a second time.
 */
export function useImageTexture(blobKey: string | undefined): THREE.Texture | undefined {
  const image = useHtmlImage(blobKey);

  const texture = useMemo(() => {
    if (!image) return undefined;
    const tex = new THREE.Texture(image);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    return tex;
  }, [image]);

  useEffect(() => {
    return () => texture?.dispose();
  }, [texture]);

  return texture;
}
