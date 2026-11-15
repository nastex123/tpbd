import { useState } from 'react';
import type { LocationSelection } from '../../stores/navigationStore';
import { useLocationReport } from './globeData';
import { trendComparisonIssue } from './seriesComparison';
import { periodCoverage, temporalIssues, validateRanges, type YearRange } from './temporalPeriod';

type Pair = { a: YearRange; b: YearRange };

export function TemporalComparison({ location, locationName, variable, variableName, available }: {
  location: LocationSelection;
  locationName: string;
  variable: string;
  variableName: string;
  available: YearRange;
}) {
  const [pair, setPair] = useState<Pair | null>(null);
  const [error, setError] = useState('');
  const midpoint = Math.floor((available.start + available.end) / 2);
  const a = useLocationReport(pair ? location : null, variable, false, pair?.a.start ?? available.start, pair?.a.end ?? midpoint);
  const b = useLocationReport(pair ? location : null, variable, false, pair?.b.start ?? midpoint + 1, pair?.b.end ?? available.end);
  const issues = a?.series && b?.series && pair ? temporalIssues(a.series, b.series, pair.a, pair.b) : [];
  const trendIssue = trendComparisonIssue(a?.trend, b?.trend);
  const overlap = pair && pair.a.start <= pair.b.end && pair.b.start <= pair.a.end;
  const differentLengths = pair && pair.a.end - pair.a.start !== pair.b.end - pair.b.start;

  return <details className="exploration-tools">
    <summary>Compare two time periods</summary>
    <p>Compare the same variable and location across two periods. Each period needs at least 80% valid monthly coverage for a joint description.</p>
    <form onSubmit={(event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const next = {
        a: { start: Number(form.get('startA')), end: Number(form.get('endA')) },
        b: { start: Number(form.get('startB')), end: Number(form.get('endB')) },
      };
      const issue = validateRanges(next.a, next.b, available);
      if (issue) {
        setError(issue);
        return;
      }
      setError('');
      setPair(next);
    }}>
      <label>Period A start <input name="startA" type="number" min={available.start} max={available.end} defaultValue={available.start} required /></label>
      <label>Period A end <input name="endA" type="number" min={available.start} max={available.end} defaultValue={midpoint} required /></label>
      <label>Period B start <input name="startB" type="number" min={available.start} max={available.end} defaultValue={Math.min(midpoint + 1, available.end)} required /></label>
      <label>Period B end <input name="endB" type="number" min={available.start} max={available.end} defaultValue={available.end} required /></label>
      <button type="submit">Compare periods</button>
      {error && <p role="alert">{error}</p>}
    </form>
    {pair && <>
      <p>{locationName} · {variableName} ({variable})</p>
      {overlap && <p>The periods overlap, so their observations are not independent.</p>}
      {differentLengths && <p>The periods have different durations; sampling and uncertainty may differ.</p>}
      {([['A', pair.a, a], ['B', pair.b, b]] as const).map(([label, range, report]) => {
        const series = report?.series;
        const coverage = series && periodCoverage(series, range);
        return <section className="globe-report" key={label}>
          <h3>Period {label} · {range.start}–{range.end}</h3>
          {series && coverage ? <>
            <p>{coverage.valid} of {coverage.expected} expected months have valid values · {series.provider} · {series.unit} · {series.spatial_resolution}</p>
            <p>{report.trend?.plain_language_verdict ?? 'Trend analysis unavailable.'}</p>
            {report.trend && <p>
              Method: {report.trend.method}. {report.trend.p_value === null ? 'p-value unavailable.' : `p = ${report.trend.p_value}.`}
              {report.trend.confidence_interval_95 && ` 95% interval: ${report.trend.confidence_interval_95.join(' to ')} ${report.trend.rate_unit}.`}
              {' '}{report.trend.scientific_caveat}
            </p>}
          </> : <p role="status">{report?.message ?? 'Loading historical data…'}</p>}
        </section>;
      })}
      {a?.series && b?.series && (issues.length > 0
        ? <p role="status">Periods cannot be compared: {issues.join('; ')}.</p>
        : <p>{trendIssue ?? `Sen slopes: A ${a.trend?.rate_per_decade} and B ${b.trend?.rate_per_decade} ${a.trend?.rate_unit}. Different estimates alone do not establish a statistically significant difference or a cause.`}</p>)}
    </>}
  </details>;
}
