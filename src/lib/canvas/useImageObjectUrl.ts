"use client";

import { useEffect, useState } from "react";
import { getImageObjectUrl } from "@/lib/persistence/images";

export function useImageObjectUrl(blobKey: string | undefined): string | undefined {
  const [url, setUrl] = useState<string | undefined>(undefined);
  const [loadedKey, setLoadedKey] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!blobKey) return;
    let cancelled = false;
    getImageObjectUrl(blobKey).then((resolved) => {
      if (cancelled) return;
      setUrl(resolved);
      setLoadedKey(blobKey);
    });
    return () => {
      cancelled = true;
    };
  }, [blobKey]);

  return loadedKey === blobKey ? url : undefined;
}
