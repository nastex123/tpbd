import type { DataPoint } from './globeData';

export function orderedReportPoints(points: DataPoint[]): DataPoint[] {
  return [...points].sort((a, b) => a.date.localeCompare(b.date));
}

export function validReportPointCount(points: DataPoint[]): number {
  return points.filter(({ value }) => value !== null && Number.isFinite(value)).length;
}
