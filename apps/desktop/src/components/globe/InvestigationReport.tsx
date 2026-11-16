import type { Series, Trend } from './globeData';
import type { YearRange } from './temporalPeriod';
import { orderedReportPoints, validReportPointCount } from './investigationReportData';

export type ReportLocation = { name: string; series: Series; trend?: Trend };

export function InvestigationReport({ variableName, variable, period, locations, comparisonIssues, trendComparisonNote }: {
  variableName: string;
  variable: string;
  period: YearRange;
  locations: ReportLocation[];
  comparisonIssues?: string[];
  trendComparisonNote?: string | null;
}) {
  return <article className="pdf-report">
    <header>
      <h1>TPBD — Earth System Trend Detective</h1>
      <p>Historical investigation report</p>
      <p>Generated: {new Date().toISOString()}</p>
    </header>
    <section>
      <h2>Investigation</h2>
      <p>Variable: {variableName} ({variable}) · Selected years: {period.start}–{period.end} · Monthly observations.</p>
      {locations.length > 1 && <>
        <p>{comparisonIssues?.length
          ? `The series are not comparable as a pair: ${comparisonIssues.join('; ')}.`
          : 'The series have compatible data metadata and period boundaries.'}</p>
        <p>{trendComparisonNote ?? 'Each location keeps its own trend result. No statistical test of the difference between trends was performed; different estimates alone do not establish a significant difference or a common cause.'}</p>
      </>}
    </section>
    {locations.map(({ name, series, trend }) => {
      const points = orderedReportPoints(series.points);
      const valid = validReportPointCount(points);
      return <section className="pdf-location" key={name}>
        <h2>{name}</h2>
        <p>Source: {series.provider} · Unit: {series.unit} · Frequency: monthly · Resolution: {series.spatial_resolution || 'Not reported'}.</p>
        <p>Requested coordinates: {series.query_coordinates ? `${series.query_coordinates.latitude}, ${series.query_coordinates.longitude}` : 'Not reported'} · Representative grid cell: {series.representative_grid_cell || 'Not reported'}.</p>
        <p>Returned period: {points[0]?.date ?? 'Unavailable'} to {points.at(-1)?.date ?? 'Unavailable'} · {valid} valid values of {points.length} returned months.</p>
        <h3>Trend analysis</h3>
        {trend ? <>
          <p>{trend.plain_language_verdict}</p>
          <p>Method: {trend.method} · Direction: {trend.direction} · Rate: {trend.rate_per_decade ?? 'Not evaluable'} {trend.rate_unit} · p-value: {trend.p_value ?? 'Unavailable'} · α: {trend.alpha}.</p>
          <p>95% confidence interval: {trend.confidence_interval_95?.join(' to ') ?? 'Unavailable'} {trend.rate_unit}.</p>
          <p>{trend.scientific_caveat}</p>
        </> : <p>Trend analysis unavailable for this series.</p>}
        <h3>Monthly data</h3>
        <table>
          <thead><tr><th>Date</th><th>Value ({series.unit})</th><th>Quality</th></tr></thead>
          <tbody>{points.map(({ date, value, quality }) => <tr key={date}>
            <td>{date}</td><td>{value === null ? 'Missing' : value}</td><td>{quality}</td>
          </tr>)}</tbody>
        </table>
      </section>;
    })}
    <footer>
      <h2>Source and limitations</h2>
      <p>NASA POWER Monthly Point API: <a href="https://power.larc.nasa.gov/docs/services/api/temporal/monthly/">NASA POWER documentation</a>.</p>
      <p>Missing values remain missing and are not interpolated. Grid-cell values represent an area, not an exact point measurement. Statistical trends describe the returned observational series and do not establish a cause or a future prediction.</p>
      <p>TPBD — NASA Space Apps Challenge 2026.</p>
    </footer>
  </article>;
}
