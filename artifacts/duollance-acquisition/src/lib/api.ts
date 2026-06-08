export function getApiUrl(path: string): string {
  return path.startsWith("/api") ? path : `/api${path}`;
}
