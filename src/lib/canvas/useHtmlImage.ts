"use client";

import { useEffect, useState } from "react";
import { getImageObjectUrl } from "@/lib/persistence/images";

/** Loads and caches an HTMLImageElement for the given stored image blob key. */
export function useHtmlImage(blobKey: string | undefined): HTMLImageElement | undefined {
  const [image, setImage] = useState<HTMLImageElement | undefined>(undefined);
  const [loadedKey, setLoadedKey] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!blobKey) return;
    let cancelled = false;

    getImageObjectUrl(blobKey).then((url) => {
      if (cancelled || !url) return;
      const img = new window.Image();
      img.onload = () => {
        if (cancelled) return;
        setImage(img);
        setLoadedKey(blobKey);
      };
      img.src = url;
    });

    return () => {
      cancelled = true;
    };
  }, [blobKey]);

  return loadedKey === blobKey ? image : undefined;
}
