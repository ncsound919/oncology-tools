"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "oncosim:pinned-assets";

// Tiny global store so the pinned strip + pin buttons across sections stay in sync.
type Listener = (codes: string[]) => void;
let current: string[] = [];
let hydrated = false;
const listeners = new Set<Listener>();

function emit() {
  for (const l of listeners) l(current);
}

if (typeof window !== "undefined") {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) current = JSON.parse(raw);
  } catch {
    /* ignore */
  }
  hydrated = true;
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    /* ignore */
  }
  emit();
}

export function usePinnedAssets() {
  const [pinned, setPinned] = useState<string[]>(current);

  useEffect(() => {
    const l: Listener = (codes) => setPinned(codes);
    listeners.add(l);
    // sync with current on mount (in case it changed before subscribe)
    l(current);
    return () => {
      listeners.delete(l);
    };
  }, []);

  const toggle = useCallback((code: string) => {
    current = current.includes(code) ? current.filter((c) => c !== code) : [...current, code];
    persist();
  }, []);

  const isPinned = useCallback((code: string) => current.includes(code), []);

  return { pinned, toggle, isPinned, hydrated };
}
