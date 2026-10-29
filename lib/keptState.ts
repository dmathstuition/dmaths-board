"use client";
import { useCallback, useState, type Dispatch, type SetStateAction } from "react";

// State that outlives its component being rebuilt. The board lays itself out
// differently in full screen, so its panels (answer boards, the lab) are
// unmounted and mounted again when the teacher goes in or out of full screen —
// which used to wipe a running class exercise. The board keeps one store for
// the whole class; panels keep their state in it instead of only in React.
export type KeepStore = Map<string, unknown>;

export function useKeptState<T>(store: KeepStore | undefined, key: string, initial: T | (() => T)): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    if (store?.has(key)) return store.get(key) as T;
    const v = typeof initial === "function" ? (initial as () => T)() : initial;
    store?.set(key, v);
    return v;
  });
  const set = useCallback<Dispatch<SetStateAction<T>>>((next) => {
    setValue((prev) => {
      const v = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
      store?.set(key, v);
      return v;
    });
  }, [store, key]);
  return [value, set];
}

// A ref that lives in the store (the same object every time it's asked for).
export function useKeptRef<T>(store: KeepStore | undefined, key: string, initial: T): { current: T } {
  const [ref] = useState(() => {
    const k = `ref:${key}`;
    if (store?.has(k)) return store.get(k) as { current: T };
    const r = { current: initial };
    store?.set(k, r);
    return r;
  });
  return ref;
}
