/** Safely extract a single string from a query param (handles string | string[] | undefined) */
export function qstr(v: unknown): string | undefined {
  if (!v) return undefined;
  return Array.isArray(v) ? String(v[0]) : String(v);
}
