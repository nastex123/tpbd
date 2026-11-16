"""Service for computing standardized seasonal Z-score anomalies against WMO reference climatologies."""
import numpy as np
from app.schemas.analytics import (
    AnomalyDetectionRequest,
    AnomalyDetectionResponse,
    MonthlyClimatology,
    AnomalyDataPoint,
    AnomalySeverity,
)
from app.core.logging import get_logger

logger = get_logger(__name__)


class AnomalyService:
    """Computes monthly climatological normals (1991-2020) and standardized Z-score departures."""

    def detect_anomalies(self, request: AnomalyDetectionRequest) -> AnomalyDetectionResponse:
        """Calculate standardized anomalies for monthly observations against baseline period."""
        # 1. Parse chronological points and organize by calendar month (1..12)
        baseline_buckets: dict[int, list[float]] = {m: [] for m in range(1, 13)}

        for p in request.points:
            if p.value is None or getattr(p, "quality", "") == "missing":
                continue
            try:
                y = int(p.date[:4])
                m = int(p.date[5:7])
            except (ValueError, IndexError):
                continue

            if request.baseline_start_year <= y <= request.baseline_end_year:
                if 1 <= m <= 12:
                    baseline_buckets[m].append(float(p.value))

        # 2. Compute 12-month baseline climatologies
        climatology_map: dict[int, tuple[float, float, int]] = {}
        monthly_climatologies: list[MonthlyClimatology] = []

        for m in range(1, 13):
            vals = baseline_buckets[m]
            n_samples = len(vals)
            if n_samples >= 5:
                mean_val = float(np.mean(vals))
                std_val = float(np.std(vals, ddof=1)) if n_samples > 1 else 0.0
            else:
                mean_val = 0.0
                std_val = 0.0

            climatology_map[m] = (mean_val, std_val, n_samples)
            monthly_climatologies.append(
                MonthlyClimatology(
                    month=m,
                    baseline_mean=round(mean_val, 3),
                    baseline_std=round(std_val, 3),
                    sample_count=n_samples,
                )
            )

        # 3. Compute standardized Z-score for all requested points
        anomalies: list[AnomalyDataPoint] = []
        severe_count = 0

        for p in request.points:
            if p.value is None or getattr(p, "quality", "") == "missing":
                anomalies.append(
                    AnomalyDataPoint(
                        date=p.date,
                        value=None,
                        anomaly_z=None,
                        severity=AnomalySeverity.NOT_EVALUABLE,
                    )
                )
                continue

            try:
                m = int(p.date[5:7])
            except (ValueError, IndexError):
                anomalies.append(
                    AnomalyDataPoint(
                        date=p.date,
                        value=p.value,
                        anomaly_z=None,
                        severity=AnomalySeverity.NOT_EVALUABLE,
                    )
                )
                continue

            mean_val, std_val, n_samples = climatology_map.get(m, (0.0, 0.0, 0))

            # Non-evaluable condition: zero standard deviation or insufficient reference baseline samples
            if std_val == 0.0 or n_samples < 5:
                anomalies.append(
                    AnomalyDataPoint(
                        date=p.date,
                        value=p.value,
                        anomaly_z=None,
                        severity=AnomalySeverity.NOT_EVALUABLE,
                    )
                )
                continue

            val_float = float(p.value)
            z_score = (val_float - mean_val) / std_val
            abs_z = abs(z_score)

            if abs_z >= 2.5:
                severity = AnomalySeverity.EXTREME_ANOMALY
                severe_count += 1
            elif abs_z >= request.threshold:
                severity = AnomalySeverity.SEVERE_ANOMALY
                severe_count += 1
            elif abs_z >= 1.0:
                severity = AnomalySeverity.MODERATE_ANOMALY
            else:
                severity = AnomalySeverity.NORMAL

            anomalies.append(
                AnomalyDataPoint(
                    date=p.date,
                    value=p.value,
                    anomaly_z=round(z_score, 3),
                    severity=severity,
                )
            )

        return AnomalyDetectionResponse(
            variable_id=request.variable_id,
            baseline_range=f"{request.baseline_start_year} to {request.baseline_end_year}",
            monthly_climatology=monthly_climatologies,
            anomalies=anomalies,
            severe_anomaly_count=severe_count,
            method=f"Standardized Monthly Climatology Z-Score ({request.baseline_start_year}-{request.baseline_end_year} Baseline)",
            scientific_caveat=(
                "Z-score anomalies quantify statistical departures from the reference climatology, "
                "but do not prove physical disaster impact (such as drought or wildfire) without in-situ ground validation."
            ),
        )
