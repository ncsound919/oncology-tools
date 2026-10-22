"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "oncosim:recent-assets";
const MAX_RECENT = 6;

// Tiny global store so the dashboard + deep-dive opens stay in sync.
type Listener = (codes: string[]) => void;
let current: string[] = [];
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
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    /* ignore */
  }
  emit();
}

/** Track recently-viewed asset codes (most-recent-first, deduped, capped). */
export function useRecentAssets() {
  const [recent, setRecent] = useState<string[]>(current);

  useEffect(() => {
    const l: Listener = (codes) => setRecent(codes);
    listeners.add(l);
    l(current);
    return () => {
      listeners.delete(l);
    };
  }, []);

  const push = useCallback((code: string) => {
    current = [code, ...current.filter((c) => c !== code)].slice(0, MAX_RECENT);
    persist();
  }, []);

  const clear = useCallback(() => {
    current = [];
    persist();
  }, []);

  return { recent, push, clear };
}
