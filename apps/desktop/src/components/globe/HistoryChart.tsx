import { useEffect, useRef } from 'react';
import type { DataPoint } from './globeData';

export function HistoryChart({ points, dates, date, bounds, name, color, highlighted, onHover, onDate }: {
  points: DataPoint[];
  dates: string[];
  date: string;
  bounds: readonly [number, number];
  name: string;
  color: string;
  highlighted: boolean;
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
    const x = (index: number) => 8 + index * (width - 16) / Math.max(1, dates.length - 1);
    const y = (value: number) => height - 8 - (value - low) * (height - 16) / (high - low || 1);
    context.clearRect(0, 0, width, height);
    context.strokeStyle = color;
    context.lineWidth = highlighted ? 4 : 2;
    context.beginPath();
    let connected = false;
    dates.forEach((at, index) => {
      const value = values.get(at);
      if (value === undefined || value === null) {
        connected = false;
        return;
      }
      if (connected) context.lineTo(x(index), y(value));
      else context.moveTo(x(index), y(value));
      connected = true;
    });
    context.stroke();
    const index = dates.indexOf(date);
    if (index >= 0) {
      context.strokeStyle = '#a6c2d9';
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(x(index), 0);
      context.lineTo(x(index), height);
      context.stroke();
      const value = values.get(date);
      if (value !== null && value !== undefined) {
        context.fillStyle = color;
        context.beginPath();
        context.arc(x(index), y(value), 4, 0, Math.PI * 2);
        context.fill();
      }
    }
  }, [bounds, color, date, dates, highlighted, points]);

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
