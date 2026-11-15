"""Change-point detection and structural regime shift service (HU-26)."""
import math
import numpy as np
from scipy.stats import rankdata
import pymannkendall as pmk
from app.schemas.analytics import ChangePointRequest, ChangePointResponse, RegimeShiftType
from app.services.catalog_service import CatalogService
from app.core.logging import get_logger

logger = get_logger(__name__)


class ChangePointService:
    """Non-parametric structural break and regime shift engine using Pettitt's test."""

    def __init__(self, catalog_service: CatalogService | None = None) -> None:
        self.catalog_service = catalog_service or CatalogService()

    def detect_changepoints(self, request: ChangePointRequest) -> ChangePointResponse:
        """Execute Pettitt's rank test to detect critical structural breaks."""
        var_meta = self.catalog_service.get_variable_by_id(request.variable_id)
        unit = var_meta.unit if var_meta else "units"
        rate_unit = f"{unit.replace('/month', '')}/decade"

        # 1. Filter and sort valid points
        valid_points = [
            p for p in request.points
            if p.value is not None and getattr(p, "quality", "") != "missing"
        ]
        valid_points.sort(key=lambda p: p.date)

        n = len(valid_points)
        if n < 24:
            return ChangePointResponse(
                variable_id=request.variable_id,
                has_significant_break=False,
                change_point_date=None,
                change_point_index=None,
                statistic_k=None,
                p_value=None,
                alpha=request.alpha,
                regime_shift_type=RegimeShiftType.NOT_EVALUABLE,
                pre_break_slope=None,
                post_break_slope=None,
                unit_per_decade=rate_unit,
                scientific_notes=f"Insufficient valid monthly observations ({n} < 24). Pettitt's test requires at least 2 full years of data.",
            )

        values = np.array([p.value for p in valid_points], dtype=float)

        # Check for zero variance
        if np.isclose(np.std(values), 0.0):
            return ChangePointResponse(
                variable_id=request.variable_id,
                has_significant_break=False,
                change_point_date=None,
                change_point_index=None,
                statistic_k=None,
                p_value=None,
                alpha=request.alpha,
                regime_shift_type=RegimeShiftType.NOT_EVALUABLE,
                pre_break_slope=None,
                post_break_slope=None,
                unit_per_decade=rate_unit,
                scientific_notes="All observations have identical values (zero variance). Structural break cannot be evaluated.",
            )

        # 2. Pettitt's test via ranked cumulative sums
        # Ranks with tie handling
        ranks = rankdata(values)
        cumsum_ranks = np.cumsum(ranks)

        # U_t = 2 * sum_{i=1}^t R_i - t * (N + 1) for t in 1..N-1
        t_indices = np.arange(1, n)
        u_t = 2.0 * cumsum_ranks[:-1] - t_indices * (n + 1.0)
        abs_u = np.abs(u_t)

        k_stat = float(np.max(abs_u))
        # 1-based breakpoint index
        break_idx_1based = int(np.argmax(abs_u)) + 1
        # 0-based index in valid_points
        break_idx = break_idx_1based - 1

        # Approximate p-value: p ≈ 2 * exp(-6 * K^2 / (N^3 + N^2))
        exponent = -6.0 * (k_stat ** 2) / (n ** 3 + n ** 2)
        p_val = float(min(1.0, max(0.0, 2.0 * math.exp(exponent))))

        is_significant = p_val < request.alpha
        break_date = valid_points[break_idx].date

        if not is_significant:
            return ChangePointResponse(
                variable_id=request.variable_id,
                has_significant_break=False,
                change_point_date=break_date,
                change_point_index=break_idx,
                statistic_k=round(k_stat, 2),
                p_value=round(p_val, 4),
                alpha=request.alpha,
                regime_shift_type=RegimeShiftType.NO_SIGNIFICANT_BREAK,
                pre_break_slope=None,
                post_break_slope=None,
                unit_per_decade=rate_unit,
                scientific_notes=(
                    f"No statistically significant structural break detected at alpha={request.alpha} "
                    f"(K={k_stat:.1f}, p={p_val:.4f}). The series is consistent with a single persistent regime."
                ),
            )

        # 3. Compute Segmented Sen's Slopes
        seg1_values = values[: break_idx + 1]
        seg2_values = values[break_idx + 1 :]

        pre_slope: float | None = None
        post_slope: float | None = None

        if len(seg1_values) >= 6:
            try:
                pre_res = pmk.sens_slope(seg1_values)
                pre_slope = round(float(pre_res.slope) * 120.0, 3)
            except Exception as exc:
                logger.warning("Could not calculate pre-break Sen's slope: %s", exc)

        if len(seg2_values) >= 6:
            try:
                post_res = pmk.sens_slope(seg2_values)
                post_slope = round(float(post_res.slope) * 120.0, 3)
            except Exception as exc:
                logger.warning("Could not calculate post-break Sen's slope: %s", exc)

        # 4. Classify Regime Shift
        regime_type = self._classify_regime(pre_slope, post_slope, np.mean(seg1_values), np.mean(seg2_values))

        notes = (
            f"Statistically significant structural break identified at {break_date} (p = {p_val:.4f} < {request.alpha}, K = {k_stat:.1f}). "
            f"Pre-break rate: {pre_slope if pre_slope is not None else 'N/A'} {rate_unit}; "
            f"Post-break rate: {post_slope if post_slope is not None else 'N/A'} {rate_unit}. "
            f"Classified as '{regime_type.value}'."
        )

        return ChangePointResponse(
            variable_id=request.variable_id,
            has_significant_break=True,
            change_point_date=break_date,
            change_point_index=break_idx,
            statistic_k=round(k_stat, 2),
            p_value=round(p_val, 4),
            alpha=request.alpha,
            regime_shift_type=regime_type,
            pre_break_slope=pre_slope,
            post_break_slope=post_slope,
            unit_per_decade=rate_unit,
            scientific_notes=notes,
        )

    def _classify_regime(
        self,
        pre_slope: float | None,
        post_slope: float | None,
        mean1: float,
        mean2: float,
    ) -> RegimeShiftType:
        """Classify the physical regime shift between pre- and post-break segments."""
        if pre_slope is None or post_slope is None:
            return RegimeShiftType.ABRUPT_STEP_INCREASE if mean2 > mean1 else RegimeShiftType.ABRUPT_STEP_INCREASE

        if pre_slope > 0 and post_slope < 0:
            return RegimeShiftType.REVERSAL_TO_COOLING
        if pre_slope < 0 and post_slope > 0:
            return RegimeShiftType.REVERSAL_TO_WARMING
        if pre_slope >= 0 and post_slope > pre_slope:
            return RegimeShiftType.ACCELERATING_INCREASE
        if pre_slope > 0 and 0 <= post_slope < pre_slope:
            return RegimeShiftType.DECELERATING_INCREASE

        return RegimeShiftType.ABRUPT_STEP_INCREASE
