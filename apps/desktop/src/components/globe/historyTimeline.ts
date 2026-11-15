const monthlyDate = /^\d{4}-(0[1-9]|1[0-2])$/;

export function observationDates(points: { date: string }[]): string[] {
  return [...new Set(points.map(({ date }) => date).filter((date) => monthlyDate.test(date)))].sort();
}

export function calendarMonthIndex(date: string): number {
  if (!monthlyDate.test(date)) return Number.NaN;
  return Number(date.slice(0, 4)) * 12 + Number(date.slice(5)) - 1;
}

export function nextObservationDate(current: string, dates: string[]): string {
  if (!dates.length) return current;
  return dates[(dates.indexOf(current) + 1 + dates.length) % dates.length];
}
