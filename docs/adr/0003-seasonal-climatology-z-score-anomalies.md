# 0003. Seasonal Climatology and Standardized Z-Score Anomaly Detection

**Status:** Accepted  
**Date:** 2026-11-14  
**Authors:** Daniel (Backend & Data Science)  
**Stakeholders:** Brandon (Desktop Core), Dylan (UI/UX)  

---

## 1. Context & Problem Statement

In climate science, persistent multi-decadal trends (e.g. $+0.34\text{ }^\circ\text{C/decade}$) and acute monthly anomalies (e.g. record heatwaves, prolonged dry spells) represent distinct Earth system phenomena. While Seasonal Mann-Kendall and Sen's slope (HU-25) quantify monotonic directional change over decades, investigators also need to identify months that deviate abnormally from historical expectations.

The World Meteorological Organization (WMO) defines climate normals over standardized 30-year reference periods, currently $1991\text{--}2020$. To provide scientific rigor without confusing acute variability with trends, we require a dedicated standardized anomaly detection service conforming to the project's contract-first architecture.

---

## 2. Decision

We introduce the **Seasonal Z-Score Anomaly Engine** and API contract addition:

1. **Endpoint:** `POST /api/v1/analytics/anomalies`
2. **Methodology:**
   - Observations are partitioned by calendar month ($m \in \{1, \dots, 12\}$).
   - Baseline climatological statistics—mean $\mu_m$ and sample standard deviation $\sigma_m$—are computed over the WMO reference baseline window ($1991\text{--}2020$, or user-configurable subset).
   - For every historical observation $x_{y,m}$, the standardized anomaly score is calculated:
     $$Z_{y,m} = \frac{x_{y,m} - \mu_m}{\sigma_m}$$
   - Severity classification:
     - Normal: $|Z| < 1.0$
     - Moderate departure: $1.0 \le |Z| < 2.0$
     - Severe anomaly: $2.0 \le |Z| < 2.5$
     - Extreme anomaly: $|Z| \ge 2.5$
     - Non-evaluable: $\sigma_m = 0.0$ or missing observations.
3. **Scientific Constraints & Caveats:**
   - Standardized anomalies reflect statistical deviations from the 30-year reference period; they do not substantiate ground-truth physical disasters (e.g. wildfires) without in-situ validation.
   - Zero-variance calendar months or intervals with $< 10$ baseline samples yield `not_evaluable`.

---

## 3. Consequences

### Positive
- Clearly distinguishes acute monthly shocks from long-term monotonic trends.
- Adheres to standard WMO 1991–2020 baseline methodology.
- Fully typed Pydantic v2 schemas and OpenAPI 3.1 specification.

### Trade-offs
- Requires time series covering at least part of the 1991–2020 baseline to compute meaningful climatologies.
