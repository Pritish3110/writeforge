import { useCallback, useEffect, useRef, useState } from "react";
import {
  readStoredJsonValue,
  subscribeToStorage,
  writeStoredJsonValue,
} from "@/lib/backend/storageAdapter";

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const initialValueRef = useRef(initialValue);

  const [stored, setStoredState] = useState<T>(() =>
    readStoredJsonValue(key, initialValueRef.current),
  );

  useEffect(
    () =>
      subscribeToStorage((changedKey) => {
        if (changedKey === key) {
          setStoredState(readStoredJsonValue(key, initialValueRef.current));
        }
      }),
    [key],
  );

  const setStored = useCallback((value: T | ((prev: T) => T)) => {
    const current = readStoredJsonValue(key, initialValueRef.current);
    const nextValue = typeof value === "function"
      ? (value as (prev: T) => T)(current)
      : value;

    writeStoredJsonValue(key, nextValue);
  }, [key]);

  return [stored, setStored];
}
