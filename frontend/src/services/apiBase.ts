const configuredApiUrl = import.meta.env.VITE_API_URL?.trim() || "";

export const API_BASE_URL = configuredApiUrl.replace(/\/$/, "");

export const buildApiUrl = (path: string) =>
  API_BASE_URL ? `${API_BASE_URL}${path}` : path;
