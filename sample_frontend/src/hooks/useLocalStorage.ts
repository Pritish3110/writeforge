import { useCallback, useEffect, useState } from "react";
import { useOptionalWriteForgeData } from "@/contexts/WriteForgeDataContext";
import { isWriteForgeStorageKey } from "@/lib/storageKeys";
import {
  readBrowserStorageValue,
  writeBrowserStorageValue,
} from "@/lib/writeforgeStorage";

const readFallbackStorageValue = <T,>(key: string, initialValue: T): T => {
  try {
    if (isWriteForgeStorageKey(key)) {
      const item = readBrowserStorageValue(key);
      return (item === undefined ? initialValue : item) as T;
    }

    const item = localStorage.getItem(key);
    return item ? (JSON.parse(item) as T) : initialValue;
  } catch {
    return initialValue;
  }
};

const writeFallbackStorageValue = <T,>(key: string, value: T) => {
  try {
    if (isWriteForgeStorageKey(key)) {
      writeBrowserStorageValue(key, value);
      return;
    }

    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage write failures, such as private mode quotas.
  }
};

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, (value: T | ((prev: T) => T)) => void] {
  const writeForgeData = useOptionalWriteForgeData();
  const canUseWriteForgeContext =
    Boolean(writeForgeData) && isWriteForgeStorageKey(key);
  const [stored, setStored] = useState<T>(() =>
    readFallbackStorageValue(key, initialValue),
  );

  useEffect(() => {
    if (canUseWriteForgeContext) return;
    writeFallbackStorageValue(key, stored);
  }, [canUseWriteForgeContext, key, stored]);

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      if (canUseWriteForgeContext && writeForgeData && isWriteForgeStorageKey(key)) {
        writeForgeData.setItem(key, value, initialValue);
        return;
      }

      setStored((prev) =>
        typeof value === "function"
          ? (value as (prev: T) => T)(prev)
          : value,
      );
    },
    [canUseWriteForgeContext, initialValue, key, writeForgeData],
  );

  if (canUseWriteForgeContext && writeForgeData && isWriteForgeStorageKey(key)) {
    return [writeForgeData.getItem(key, initialValue), setValue];
  }

  return [stored, setValue];
}
