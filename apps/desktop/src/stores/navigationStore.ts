export type LocationSelection =
  | { kind: 'region'; id: string }
  | { kind: 'coordinates'; lat: number; lng: number; label?: string };

export function parseCoordinate(input: string, limit: number): number | null {
  const value = input.trim();
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value)) return null;
  const number = Number(value);
  return Number.isFinite(number) && Math.abs(number) <= limit ? number : null;
}
