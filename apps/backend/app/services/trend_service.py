"""Scientific statistical engine for Seasonal Mann-Kendall trend detection and Sen's slope."""
import math
import numpy as np
import pymannkendall as mk
from app.schemas.analytics import (
    TrendAnalysisRequest,
    TrendAnalysisResponse,
    TrendDirection,
    AutocorrelationDiagnostic,
    RegionalComparisonRequest,
    RegionalComparisonResponse,
)
from app.services.catalog_service import CatalogService
from app.core.exceptions import AppException
from app.core.logging import get_logger
from fastapi import status

logger = get_logger(__name__)


class TrendService:
    """Non-parametric trend evaluation service implementing Seasonal Mann-Kendall and Sen's slope."""

    def __init__(self, catalog_service: CatalogService) -> None:
        self.catalog_service = catalog_service

    def analyze_trend(self, request: TrendAnalysisRequest) -> TrendAnalysisResponse:
        """Perform robust statistical trend analysis on historical monthly observations."""
        var_meta = self.catalog_service.get_variable_by_id(request.variable_id)
        unit = var_meta.unit if var_meta else "units"
        rate_unit = f"{unit.replace('/month', '')}/decade"

        total_points = len(request.points)
        if total_points == 0:
            return self._build_not_evaluable_response(
                request.variable_id,
                rate_unit,
                request.alpha,
                sample_count=0,
                valid_count=0,
                reason="No data points provided in request.",
            )

        # 1. Parse dates and build continuous monthly series to preserve season alignment
        sorted_points = sorted(request.points, key=lambda p: p.date)
        first_date = sorted_points[0].date
        last_date = sorted_points[-1].date

        try:
            start_y, start_m = int(first_date[:4]), int(first_date[5:7])
            end_y, end_m = int(last_date[:4]), int(last_date[5:7])
        except (ValueError, IndexError):
            return self._build_not_evaluable_response(
                request.variable_id,
                rate_unit,
                request.alpha,
                sample_count=total_points,
                valid_count=0,
                reason="Invalid date format in series points. Expected YYYY-MM.",
            )

        total_months = (end_y - start_y) * 12 + (end_m - start_m) + 1
        series_array = np.full(total_months, np.nan, dtype=float)

        valid_count = 0
        for p in sorted_points:
            if p.value is not None and getattr(p, "quality", "") != "missing":
                py, pm = int(p.date[:4]), int(p.date[5:7])
                idx = (py - start_y) * 12 + (pm - start_m)
                if 0 <= idx < total_months:
                    series_array[idx] = float(p.value)
                    valid_count += 1

        # 2. Check minimal sample size and mathematical validity
        # Minimum 24 valid monthly points (2 full seasonal cycles) required for reliable inference
        valid_values = series_array[~np.isnan(series_array)]
        if valid_count < 24:
            return self._build_not_evaluable_response(
                request.variable_id,
                rate_unit,
                request.alpha,
                sample_count=total_points,
                valid_count=valid_count,
                reason=f"Insufficient sample size ({valid_count} valid observations). Minimum 24 required for seasonal trend analysis.",
            )

        # Check for zero variance
        if np.nanstd(valid_values) == 0.0 or (np.nanmax(valid_values) == np.nanmin(valid_values)):
            return self._build_not_evaluable_response(
                request.variable_id,
                rate_unit,
                request.alpha,
                sample_count=total_points,
                valid_count=valid_count,
                reason="Zero variance detected in observation values across the period.",
            )

        # 3. Autocorrelation diagnostic (lag-1 serial correlation on deseasonalized residuals)
        r1, is_autocorrelated = self._diagnose_autocorrelation(series_array)

        # 4. Execute test
        correction_method = "None"
        try:
            if request.method == "seasonal_mann_kendall":
                if is_autocorrelated:
                    test_result = mk.correlated_seasonal_test(series_array, period=12, alpha=request.alpha)
                    correction_method = "Hirsch-Slack Covariance Adjustment"
                else:
                    test_result = mk.seasonal_test(series_array, period=12, alpha=request.alpha)
                # Seasonal test slope is per year -> rate per decade = slope * 10
                rate_per_decade = float(test_result.slope) * 10.0
                ci_95 = self._compute_seasonal_ci(series_array, alpha=request.alpha)
            else:
                if is_autocorrelated:
                    test_result = mk.hamed_rao_modification_test(valid_values, alpha=request.alpha)
                    correction_method = "Hamed-Rao Variance Correction"
                else:
                    test_result = mk.original_test(valid_values, alpha=request.alpha)
                # Original test slope is per month -> rate per decade = slope * 120
                rate_per_decade = float(test_result.slope) * 120.0
                ci_95 = self._compute_nonseasonal_ci(valid_values, alpha=request.alpha)
        except Exception as exc:
            logger.warning("Statistical computation exception in trend engine: %s", exc)
            return self._build_not_evaluable_response(
                request.variable_id,
                rate_unit,
                request.alpha,
                sample_count=total_points,
                valid_count=valid_count,
                reason=f"Numerical computation error during statistical testing: {str(exc)}",
            )

        p_val = float(test_result.p)
        z_stat = float(test_result.z) if not math.isnan(test_result.z) else 0.0

        # 5. Classify trend direction
        if p_val < request.alpha:
            if rate_per_decade > 0:
                direction = TrendDirection.INCREASING_SIGNIFICANT
                verdict = (
                    f"Statistically significant increasing trend ({rate_per_decade:+.2f} {rate_unit}, "
                    f"p = {p_val:.4f} < {request.alpha})."
                )
            elif rate_per_decade < 0:
                direction = TrendDirection.DECREASING_SIGNIFICANT
                verdict = (
                    f"Statistically significant decreasing trend ({rate_per_decade:+.2f} {rate_unit}, "
                    f"p = {p_val:.4f} < {request.alpha})."
                )
            else:
                direction = TrendDirection.NO_SIGNIFICANT_TREND
                verdict = f"No significant trend detected (slope = 0.0, p = {p_val:.4f})."
        else:
            direction = TrendDirection.NO_SIGNIFICANT_TREND
            verdict = (
                f"No statistically significant trend detected (Sen's slope: {rate_per_decade:+.2f} {rate_unit}, "
                f"p = {p_val:.4f} >= {request.alpha}). Note: Lack of statistical significance does not imply absence of physical change."
            )

        caveat = (
            "Statistical significance indicates strong historical evidence of persistent change, "
            "but does not prove direct causality. Multiple spatial comparisons may increase false discovery rates."
        )

        return TrendAnalysisResponse(
            variable_id=request.variable_id,
            direction=direction,
            method=(
                "Seasonal Mann-Kendall with Sen's Slope"
                if request.method == "seasonal_mann_kendall"
                else "Mann-Kendall Trend Test with Sen's Slope"
            ),
            rate_per_decade=round(rate_per_decade, 4),
            rate_unit=rate_unit,
            confidence_interval_95=ci_95,
            p_value=round(p_val, 6),
            z_statistic=round(z_stat, 4),
            alpha=request.alpha,
            sample_count=total_points,
            valid_count=valid_count,
            autocorrelation=AutocorrelationDiagnostic(
                lag1_autocorrelation=round(r1, 4),
                is_autocorrelated=is_autocorrelated,
                correction_applied=correction_method,
            ),
            plain_language_verdict=verdict,
            scientific_caveat=caveat,
        )

    def compare_regional_trends(self, request: RegionalComparisonRequest) -> RegionalComparisonResponse:
        """Compare trends across two distinct geographical regions for the same Earth science variable."""
        # 1. Analyze both regions independently
        trend_a = self.analyze_trend(
            TrendAnalysisRequest(
                variable_id=request.variable_id,
                points=request.region_a.points,
            )
        )
        trend_b = self.analyze_trend(
            TrendAnalysisRequest(
                variable_id=request.variable_id,
                points=request.region_b.points,
            )
        )

        are_comparable = (
            trend_a.direction != TrendDirection.NOT_EVALUABLE
            and trend_b.direction != TrendDirection.NOT_EVALUABLE
            and trend_a.rate_unit == trend_b.rate_unit
        )

        # 2. Build comparative narrative
        summary = self._generate_comparative_summary(request.region_a.location_name, trend_a, request.region_b.location_name, trend_b)
        drivers = self._get_drivers_explanation(request.variable_id)

        return RegionalComparisonResponse(
            variable_id=request.variable_id,
            are_comparable=are_comparable,
            trend_region_a=trend_a,
            trend_region_b=trend_b,
            comparative_summary=summary,
            drivers_explanation=drivers,
        )

    def _diagnose_autocorrelation(self, series: np.ndarray) -> tuple[float, bool]:
        """Estimate lag-1 serial autocorrelation r1 and evaluate significance at 95% confidence."""
        # Subtract monthly seasonal means to isolate deseasonalized residuals
        residuals = np.copy(series)
        for m in range(12):
            season_vals = series[m::12]
            valid_season = season_vals[~np.isnan(season_vals)]
            if len(valid_season) > 0:
                residuals[m::12] -= np.mean(valid_season)

        valid_res = residuals[~np.isnan(residuals)]
        n = len(valid_res)
        if n < 4:
            return 0.0, False

        mean_res = np.mean(valid_res)
        denom = np.sum((valid_res - mean_res) ** 2)
        if denom == 0.0:
            return 0.0, False

        numer = np.sum((valid_res[:-1] - mean_res) * (valid_res[1:] - mean_res))
        r1 = float(numer / denom)

        # White noise two-sided 95% critical bound is ~1.96 / sqrt(n)
        crit = 1.96 / np.sqrt(n)
        is_autocorrelated = abs(r1) > crit
        return r1, is_autocorrelated

    def _compute_seasonal_ci(self, series: np.ndarray, alpha: float = 0.05) -> list[float] | None:
        """Compute exact non-parametric 95% confidence interval for seasonal Sen's slope per decade."""
        slopes: list[float] = []
        var_s = 0.0
        for m in range(12):
            season_vals = series[m::12]
            valid_s = season_vals[~np.isnan(season_vals)]
            nm = len(valid_s)
            if nm >= 2:
                for i in range(nm):
                    for j in range(i + 1, nm):
                        slopes.append((valid_s[j] - valid_s[i]) / (j - i))
                var_s += (nm * (nm - 1) * (2 * nm + 5)) / 18.0

        if not slopes or var_s <= 0.0:
            return None

        slopes.sort()
        n_prime = len(slopes)
        z_crit = 1.95996  # 95% two-tailed
        c_alpha = z_crit * np.sqrt(var_s)
        m1 = max(0, int(np.floor((n_prime - c_alpha) / 2.0)))
        m2 = min(n_prime - 1, int(np.ceil((n_prime + c_alpha) / 2.0)))

        # Seasonal slopes are per year -> multiply by 10 for rate per decade
        ci_lower = round(float(slopes[m1]) * 10.0, 4)
        ci_upper = round(float(slopes[m2]) * 10.0, 4)
        return [ci_lower, ci_upper]

    def _compute_nonseasonal_ci(self, values: np.ndarray, alpha: float = 0.05) -> list[float] | None:
        """Compute exact non-parametric 95% confidence interval for non-seasonal Sen's slope per decade."""
        n = len(values)
        if n < 2:
            return None

        slopes: list[float] = []
        for i in range(n):
            for j in range(i + 1, n):
                slopes.append((values[j] - values[i]) / (j - i))

        if not slopes:
            return None

        slopes.sort()
        n_prime = len(slopes)
        var_s = (n * (n - 1) * (2 * n + 5)) / 18.0
        z_crit = 1.95996
        c_alpha = z_crit * np.sqrt(var_s)
        m1 = max(0, int(np.floor((n_prime - c_alpha) / 2.0)))
        m2 = min(n_prime - 1, int(np.ceil((n_prime + c_alpha) / 2.0)))

        # Nonseasonal slopes are per month -> multiply by 120 for rate per decade
        ci_lower = round(float(slopes[m1]) * 120.0, 4)
        ci_upper = round(float(slopes[m2]) * 120.0, 4)
        return [ci_lower, ci_upper]

    def _build_not_evaluable_response(
        self,
        variable_id: str,
        rate_unit: str,
        alpha: float,
        sample_count: int,
        valid_count: int,
        reason: str,
    ) -> TrendAnalysisResponse:
        """Construct a standardized not-evaluable response without throwing or generating NaNs."""
        return TrendAnalysisResponse(
            variable_id=variable_id,
            direction=TrendDirection.NOT_EVALUABLE,
            method="Seasonal Mann-Kendall with Sen's Slope",
            rate_per_decade=None,
            rate_unit=rate_unit,
            confidence_interval_95=None,
            p_value=None,
            z_statistic=None,
            alpha=alpha,
            sample_count=sample_count,
            valid_count=valid_count,
            autocorrelation=AutocorrelationDiagnostic(
                lag1_autocorrelation=0.0,
                is_autocorrelated=False,
                correction_applied="None",
            ),
            plain_language_verdict=f"Trend not evaluable: {reason}",
            scientific_caveat="Prerequisites for non-parametric seasonal testing were not met.",
        )

    def _generate_comparative_summary(
        self,
        name_a: str,
        trend_a: TrendAnalysisResponse,
        name_b: str,
        trend_b: TrendAnalysisResponse,
    ) -> str:
        """Formulate a balanced scientific summary contrasting two regions."""
        if trend_a.direction == TrendDirection.NOT_EVALUABLE or trend_b.direction == TrendDirection.NOT_EVALUABLE:
            return "Comparative analysis incomplete: one or both regions could not be statistically evaluated."

        ra = f"{trend_a.rate_per_decade:+.2f} {trend_a.rate_unit}" if trend_a.rate_per_decade is not None else "N/A"
        rb = f"{trend_b.rate_per_decade:+.2f} {trend_b.rate_unit}" if trend_b.rate_per_decade is not None else "N/A"

        if (
            trend_a.direction == TrendDirection.INCREASING_SIGNIFICANT
            and trend_b.direction == TrendDirection.DECREASING_SIGNIFICANT
        ):
            return (
                f"Opposing Regional Trends: {name_a} shows significant increasing trend ({ra}, p={trend_a.p_value:.3f}), "
                f"whereas {name_b} shows significant decreasing trend ({rb}, p={trend_b.p_value:.3f})."
            )
        elif (
            trend_a.direction == TrendDirection.DECREASING_SIGNIFICANT
            and trend_b.direction == TrendDirection.INCREASING_SIGNIFICANT
        ):
            return (
                f"Opposing Regional Trends: {name_a} shows significant decreasing trend ({ra}, p={trend_a.p_value:.3f}), "
                f"whereas {name_b} shows significant increasing trend ({rb}, p={trend_b.p_value:.3f})."
            )
        elif (
            trend_a.direction == TrendDirection.INCREASING_SIGNIFICANT
            and trend_b.direction == TrendDirection.INCREASING_SIGNIFICANT
        ):
            return (
                f"Synchronous Increasing Trends: Both {name_a} ({ra}, p={trend_a.p_value:.3f}) and {name_b} "
                f"({rb}, p={trend_b.p_value:.3f}) exhibit statistically significant upward trends."
            )
        elif (
            trend_a.direction == TrendDirection.DECREASING_SIGNIFICANT
            and trend_b.direction == TrendDirection.DECREASING_SIGNIFICANT
        ):
            return (
                f"Synchronous Decreasing Trends: Both {name_a} ({ra}, p={trend_a.p_value:.3f}) and {name_b} "
                f"({rb}, p={trend_b.p_value:.3f}) exhibit statistically significant downward trends."
            )
        else:
            return (
                f"Divergent / Mixed Trends: {name_a} ({trend_a.direction.value}, {ra}) vs "
                f"{name_b} ({trend_b.direction.value}, {rb})."
            )

    def _get_drivers_explanation(self, variable_id: str) -> str:
        """Provide planetary mechanism context explaining regional disparities."""
        explanations = {
            "T2M": (
                "Global thermodynamic radiative forcing causes broad terrestrial surface warming, "
                "modulated regionally by land-atmosphere feedbacks, cloud cover dynamics, and localized sensible heat flux."
            ),
            "PRECTOTCORR": (
                "Planetary teleconnections including Hadley cell expansion and latitudinal shifts in the Intertropical "
                "Convergence Zone (ITCZ) create coupled precipitation dipoles—often intensifying rainfall deficits in "
                "subtropical zones while altering equatorial and monsoon convergence belts."
            ),
            "GWETROOT": (
                "Root-zone soil moisture trends reflect the integrated balance between anomalous precipitation patterns "
                "and heightened evaporative demand induced by rising atmospheric vapor pressure deficits."
            ),
            "GWETTOP": (
                "Surface layer soil moisture dynamics respond rapidly to synoptic rainfall intermittency and surface drying."
            ),
            "ALLSKY_SFC_SW_DWN": (
                "Trends in downward shortwave surface irradiance reflect long-term variations in regional aerosol loading, "
                "cloud optical thickness, and planetary atmospheric transmissivity."
            ),
        }
        return explanations.get(
            variable_id.upper(),
            "Interconnected Earth system feedback mechanisms and atmospheric teleconnections govern regional variations in climate parameters.",
        )
