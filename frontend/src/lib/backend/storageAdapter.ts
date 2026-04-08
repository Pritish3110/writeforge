type StorageListener = (key: string) => void;

const rawStore = new Map<string, string>();
const listeners = new Set<StorageListener>();

const notifyStorageListeners = (key: string) => {
  listeners.forEach((listener) => listener(key));
};

export const subscribeToStorage = (listener: StorageListener) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};

export const getStoredRawValue = (key: string): string | null =>
  rawStore.has(key) ? rawStore.get(key) || null : null;

export const setStoredRawValue = (key: string, value: string) => {
  rawStore.set(key, value);
  notifyStorageListeners(key);
};

export const removeStoredValue = (key: string) => {
  rawStore.delete(key);
  notifyStorageListeners(key);
};

export const resetStorageAdapter = () => {
  const keys = Array.from(rawStore.keys());
  rawStore.clear();
  keys.forEach((key) => notifyStorageListeners(key));
};

export const readStoredStringValue = (key: string, fallback = ""): string => {
  const value = getStoredRawValue(key);
  return value ?? fallback;
};

export const writeStoredStringValue = (key: string, value: string) => {
  setStoredRawValue(key, value);
};

export const readStoredJsonValue = <T,>(key: string, fallback: T): T => {
  const value = getStoredRawValue(key);
  if (value == null) return fallback;

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

export const writeStoredJsonValue = (key: string, value: unknown) => {
  setStoredRawValue(key, JSON.stringify(value));
};
