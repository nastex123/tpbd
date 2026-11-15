# ADR 0004: Non-Parametric Change-Point Detection and Regime Shift Analysis (HU-26)

## Status
Accepted

## Context
Earth science observational time series rarely follow single, monotonic, unbroken linear trends over multi-decade spans (e.g., 1981–2024). Atmospheric and hydrological systems frequently experience abrupt regime shifts caused by large-scale teleconnections (e.g., El Niño-Southern Oscillation phase transitions, Pacific Decadal Oscillation shifts, volcanic aerosol forcing) or ecological tipping points.

Standard linear trend models (such as single-slope Mann-Kendall or ordinary least squares) confound abrupt structural breaks with continuous gradual changes, leading to misestimated rates of change. To meet the NASA Space Apps Challenge 2026 requirement to detect *what*, *where*, *when*, and *how* trends evolve—including non-linear and step-change behavior—TPBD requires a scientifically validated, non-parametric method to detect structural break points and quantify segmented pre-shift versus post-shift rates of change.

## Decision
We implement **Pettitt's test (Pettitt, 1979)** combined with segmented **Sen's slope estimation**:

1. **Pettitt's Test Formulation:**
   Pettitt's test is a rank-based, non-parametric formulation derived from the Mann-Whitney two-sample test that identifies an unknown change point $t$ dividing a time series $X = [x_1, x_2, \dots, x_T]$ into two distinct populations:
   $$U_{t, T} = \sum_{i=1}^t \sum_{j=t+1}^T \text{sgn}(x_i - x_j) \quad \text{for } 1 \le t < T$$
   where:
   $$\text{sgn}(\theta) = \begin{cases} +1 & \text{if } \theta > 0 \\ 0 & \text{if } \theta = 0 \\ -1 & \text{if } \theta < 0 \end{cases}$$

2. **Test Statistic & Change-Point Identification:**
   The test statistic $K_T$ is the maximum absolute value of $U_{t, T}$:
   $$K_T = \max_{1 \le t < T} |U_{t, T}|$$
   The time index $t^*$ where $|U_{t, T}| = K_T$ defines the most significant structural break date.

3. **Significance Evaluation:**
   The approximate two-tailed probability for $K_T$ is evaluated as:
   $$p \approx 2 \exp\left( \frac{-6 K_T^2}{T^3 + T^2} \right)$$
   A structural break is declared statistically significant when $p < \alpha$ (default $\alpha = 0.05$).

4. **Segmented Slope & Regime Shift Classification:**
   When a significant change point is detected at $t^*$:
   - Segment A ($t \le t^*$): Evaluated with Sen's slope ($S_A$).
   - Segment B ($t > t^*$): Evaluated with Sen's slope ($S_B$).
   - The regime shift is categorized as:
     - `accelerating_warming`: $S_B > S_A \ge 0$
     - `decelerating_warming`: $0 \le S_B < S_A$
     - `reversal_to_cooling`: $S_A > 0 \text{ and } S_B < 0$
     - `reversal_to_warming`: $S_A < 0 \text{ and } S_B > 0$
     - `abrupt_level_shift`: Abrupt step jump in baseline mean.

5. **Edge Cases & Non-Evaluable States:**
   - Minimum sample requirement: $T \ge 24$ points (at least two years of monthly data).
   - Zero variance or excessive missing values produce `status: "not_evaluable"` with clear rationale rather than false change points.

## Consequences
### Positive:
- Detects non-linear shifts, tipping points, and acceleration in Earth science time series.
- Does not assume normal distribution or homoscedasticity.
- Provides frontend components with exact breakpoint dates and comparative segmented trend lines.

### Trade-offs:
- Evaluates the single most dominant change point in the series (subsequent multi-breakpoint segmentation can be added in future iterations if required).
- Computation is $O(T^2)$ for pairwise ranks; bounded to $\le 2,400$ points to guarantee execution under 25ms.
