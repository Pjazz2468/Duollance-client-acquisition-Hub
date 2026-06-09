const API_BASE = import.meta.env.VITE_API_URL || "";

export function getApiUrl(path: string): string {
  const normalizedPath = path.startsWith("/api") ? path : `/api${path}`;
  return `${API_BASE}${normalizedPath}`;
}
