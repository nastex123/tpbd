import { useEffect, useRef } from 'react';
import type { DataPoint } from './globeData';
import type { Trend } from './globeData';
import { trendLine } from './trendLine';
import { calendarMonthIndex } from './historyTimeline';

export function HistoryChart({ points, dates, date, bounds, name, color, highlighted, trend, onHover, onDate }: {
  points: DataPoint[];
  dates: string[];
  date: string;
  bounds: readonly [number, number];
  name: string;
  color: string;
  highlighted: boolean;
  trend?: Trend;
  onHover: (active: boolean) => void;
  onDate: (date: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    const { width, height } = canvas;
    const [low, high] = bounds;
    const values = new Map(points.map(({ date, value }) => [date, value]));
    const firstMonth = calendarMonthIndex(dates[0] ?? '');
    const lastMonth = calendarMonthIndex(dates.at(-1) ?? '');
    const x = (date: string) => 8 + (calendarMonthIndex(date) - firstMonth) * (width - 16) / Math.max(1, lastMonth - firstMonth);
    const y = (value: number) => height - 8 - (value - low) * (height - 16) / (high - low || 1);
    context.clearRect(0, 0, width, height);
    context.strokeStyle = color;
    context.lineWidth = highlighted ? 4 : 2;
    context.beginPath();
    let connected = false;
    let previousMonth = Number.NaN;
    dates.forEach((at) => {
      const month = calendarMonthIndex(at);
      const value = values.get(at);
      if (value === undefined || value === null || month !== previousMonth + 1) {
        connected = false;
      }
      if (value !== undefined && value !== null) {
        if (connected) context.lineTo(x(at), y(value));
        else context.moveTo(x(at), y(value));
        connected = true;
      }
      previousMonth = month;
    });
    context.stroke();
    const line = trendLine(points, trend);
    if (line) {
      const first = dates.indexOf(line.startDate);
      const last = dates.indexOf(line.endDate);
      if (first >= 0 && last >= 0) {
        context.save();
        context.strokeStyle = '#303030';
        context.lineWidth = 2;
        context.setLineDash([7, 4]);
        context.beginPath();
        context.moveTo(x(line.startDate), y(line.start));
        context.lineTo(x(line.endDate), y(line.end));
        context.stroke();
        context.restore();
      }
    }
    const index = dates.indexOf(date);
    if (index >= 0) {
      context.strokeStyle = '#a6c2d9';
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(x(date), 0);
      context.lineTo(x(date), height);
      context.stroke();
      const value = values.get(date);
      if (value !== null && value !== undefined) {
        context.fillStyle = color;
        context.beginPath();
        context.arc(x(date), y(value), 4, 0, Math.PI * 2);
        context.fill();
      }
    }
  }, [bounds, color, date, dates, highlighted, points, trend]);

  return <canvas
    ref={canvasRef}
    width={420}
    height={120}
    role="img"
    aria-label={`Historical series for ${name}. Use the month slider to inspect values.`}
    onPointerMove={(event) => {
      onHover(true);
      const frame = event.currentTarget.getBoundingClientRect();
      const fraction = Math.min(1, Math.max(0, (event.clientX - frame.left) / frame.width));
      const nextDate = dates[Math.round(fraction * (dates.length - 1))];
      if (nextDate) onDate(nextDate);
    }}
    onPointerLeave={() => onHover(false)}
  />;
}
