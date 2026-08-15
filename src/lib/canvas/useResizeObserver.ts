"use client";

import { RefObject, useEffect, useState } from "react";

export interface ElementSize {
  width: number;
  height: number;
}

export function useResizeObserver(ref: RefObject<HTMLElement | null>): ElementSize {
  const [size, setSize] = useState<ElementSize>({ width: 0, height: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    observer.observe(el);

    return () => observer.disconnect();
  }, [ref]);

  return size;
}
