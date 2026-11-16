# TPBD — The Pale Blue Dot: 120-Second Live Demo Script

**Project:** TPBD — *Earth System Trend Detective*  
**Event:** NASA Space Apps Challenge 2026  
**Presentation Target:** 2 Minutes (120 seconds hard cutoff)  
**Presenter Roles:** 1 Presenter (Narrator + UI Navigator) or 2 Co-Presenters (Speaker + Navigator)  
**Version:** 1.0.0 (Production Master)  

---

## 1. Pre-Flight Mission Checklist (T minus 60s)

Before beginning the pitch or presentation, verify the local staging environment:

1. **System Health:** FastAPI local backend running on `http://127.0.0.1:8000` (or local cache active).
2. **Audio Status:** Audio device unmuted with volume at ~70% for the mission control AI voice debrief.
3. **Display:** Desktop app maximized at 1080p or 4K resolution; dark theme default.
4. **Initial State:** Desktop application loaded on the planetary 3D globe view centered at initial orbit (`lat: 10°, lng: 0°, altitude: 2.4`). Drawer closed, Bottom Telemetry Deck collapsed.

---

## 2. Timed Presentation Walkthrough (00:00 – 02:00)

```
00:00 ───[01. Planetary Geography]─── 00:25 ───[02. Empirical Trends]─── 00:50
00:50 ───[03. Teleconnections Arc]─── 01:15 ───[04. CMIP6 Projections]─── 01:40
01:40 ───[05. Autonomous AI Audio]─── 02:00 (Mission Complete)
```

---

### Act 1: Launch & Planetary Geography (00:00 – 00:25)
**Theme:** *From Orbit to the Surface — Scientific Context at Planetary Scale*

- **UI Actions:**
  1. *[00:02]* Start with the rotating 3D Earth rendered in WebGL with atmospheric glow, cloud layer, and day/night terminator.
  2. *[00:08]* Click the **"Study Regions & Catalog"** tactile button in the top-left to expand the aerospace slide-over drawer.
  3. *[00:15]* Click **"Amazon Basin"** (`-3.4653°, -62.2159°`). Watch the smooth camera flight arc downward across South America to altitude 1.25, bringing the 0.5° × 0.5° MERRA-2 grid cell and tropical rainforest boundary into sharp focus.
  4. *[00:22]* Click **"Open Telemetry Deck"** on the target banner to elevate the Holographic Inspector Deck.

- **Presenter Spoken Narration:**
  > *"Welcome to The Pale Blue Dot — an Earth System Trend Detective built for NASA Space Apps 2026. Rather than presenting static charts, TPBD renders Earth as an interconnected dynamical system. By opening our planetary biomes catalog, we navigate straight to the Amazon Basin, landing on a verified 0.5-degree NASA POWER and MERRA-2 reanalysis grid cell with 45 years of continuous satellite and meteorological observations."*

- **Audience Sees:**
  - Luminous 3D globe with photorealistic atmospheric Rayleigh scatter and real-time cloud kinematics.
  - Smooth camera flight trajectory framing the Amazon river basin with the representative gold study boundary and emerald grid footprint.
  - Holographic bottom telemetry deck smoothly sliding up with glowing coordinates (`-3.47°, -62.22° · 0.5° grid`).

---

### Act 2: Empirical Trend & Statistical Significance (00:25 – 00:50)
**Theme:** *Data Detective Rigor — Beyond Intuition into Non-Parametric Proof*

- **UI Actions:**
  1. *[00:26]* Select **"Trend & Statistics"** tab on the right side of the Telemetry Deck.
  2. *[00:32]* Point cursor to the non-parametric Mann-Kendall statistics badge: **"Increasing · Sen's Slope: +0.28 °C/decade · p < 0.001"**.
  3. *[00:38]* Highlight the **Pettitt Change-Point Test** card indicating a structural regime shift in **1998** (*p* = 0.0004).
  4. *[00:44]* Toggle the **"Seasonal Decomposition"** view to show the seasonal cycle stripped from the underlying empirical trend line.

- **Presenter Spoken Narration:**
  > *"Environmental data is heavily autocorrelated and non-Gaussian. That's why TPBD enforces zero hallucinations and zero fake math. We execute rigorous non-parametric statistics: Seasonal Mann-Kendall confirms a monotonic upward temperature trend of 0.28 degrees Celsius per decade with statistical significance p under 0.001. Simultaneously, Pettitt's test uncovers an abrupt climate regime shift in 1998, pinpointing the historic Super El Niño event."*

- **Audience Sees:**
  - Historical 1981–2025 time series plotted with crisp SVG rendering.
  - Dashed gold Sen's slope trendline piercing through monthly anomalies.
  - Pettitt test vertical demarcation line showing the 1998 changepoint.
  - Clean statistical metrics table: Tau, S-score, Sen's median slope, Z-score variance, and WMO 1991–2020 normal baseline.

---

### Act 3: Planetary Teleconnections & Coupled Dipoles (00:50 – 01:15)
**Theme:** *Coupled Earth Systems — Linking Tropical Rainforests to Arctic Glaciers*

- **UI Actions:**
  1. *[00:51]* Click the **"Teleconnections Radar"** tab in the Telemetry Deck.
  2. *[00:56]* In the Teleconnection Presets bar, click **"Amazon vs Svalbard (Polar Amplification)"**.
  3. *[01:02]* Click **"Frame Both Locations"** in the telemetry header. The 3D camera pulls back to a global view (altitude ~2.8) framing both the equator and the high Arctic.
  4. *[01:08]* Trace the luminous glowing geodesic radar arc spanning **10,240 km** between Manaus and the Svalbard Archipelago.

- **Presenter Spoken Narration:**
  > *"Earth is a single coupled thermodynamic machine. With one click, we engage our Teleconnection Radar, pairing the Amazon Basin with the Svalbard high-Arctic archipelago. Notice the luminous geodesic radar arc traversing over ten thousand kilometers. While the Amazon warms steadily, Svalbard experiences extreme Arctic Amplification at four times the global rate. TPBD's divergence matrix reveals how disparate biomes exhibit synchronized planetary shifts."*

- **Audience Sees:**
  - Multi-chromatic luminous arc curving above the spherical Earth from South America to northern Norway.
  - Dual radar rings pulsing simultaneously at both coordinate poles.
  - Comparative telemetry card displaying synchronized dual-trend vectors and net rate of divergence (+0.28 °C/dec vs +1.18 °C/dec).

---

### Act 4: Climate Model Projections to 2100 (01:15 – 01:40)
**Theme:** *Science-Based Scenarios — CMIP6 & IPCC SSP Pathways*

- **UI Actions:**
  1. *[01:16]* Click the **"Projections (2100)"** tab in the Telemetry Deck.
  2. *[01:21]* Click the **"SSP1-2.6"** (Aggressive Mitigation) pill button, noting the baseline vs 2100 delta (+1.2 °C).
  3. *[01:27]* Click the **"SSP3-7.0"** (High Emissions) pill button, watching the projection trajectory steepen to +4.1 °C by 2100.
  4. *[01:34]* Highlight the **Multi-Model Ensemble vs Individual GCMs** selector (CESM2, CNRM-CM6-1, CanESM5) and hover over the **Mandatory Scientific Caveat**.

- **Presenter Spoken Narration:**
  > *"To understand future trajectories, TPBD integrates NASA NEX-GDDP-CMIP6 downscaled climate models across IPCC Shared Socioeconomic Pathways. Under sustainable mitigation SSP1-2.6, warming stabilizes. Under high-forcing SSP3-7.0, projected warming exceeds four degrees Celsius. Notice our prominent scientific caveat: TPBD strictly differentiates empirical historical observations from model projections. Models are conditional policy scenarios, not deterministic predictions."*

- **Audience Sees:**
  - Seamlessly stitched chart: 1981–2025 solid historical line transitioning across 2025 into 2026–2100 dashed projection curves.
  - Instant scenario switching between low (SSP1-2.6), medium (SSP2-4.5), and high (SSP3-7.0) radiative forcing.
  - Model comparison drawer showing spread across NASA/NEX-GDDP international climate modeling groups.
  - High-visibility warning callout displaying the verbatim scientific disclaimer.

---

### Act 5: Autonomous AI Synthesis & Mission Control Audio (01:40 – 02:00)
**Theme:** *AI Copilot Grounded in Empirical Data — Voice of Mission Control*

- **UI Actions:**
  1. *[01:41]* Click the **"Copilot AI Briefing"** tab or the floating **"Ask Copilot"** trigger.
  2. *[01:45]* Click the **"Audio Playback"** (speaker icon) button to trigger live Gemini 2.5 Flash neural text-to-speech.
  3. *[01:48]* Let the crisp AI voice debrief play for 6–8 seconds while showing the structured markdown response with physical mechanisms (evapotranspiration collapse, Hadley cell expansion).
  4. *[01:57]* Deliver closing line.

- **Mission Control Audio Output (Plays through speakers):**
  > *"Diagnostic complete. Analysis for Amazon Basin indicates persistent positive thermal anomalies driven by reduced evapotranspiration and coupled tropical Atlantic sea surface gradients. Statistical confidence exceeds 99.9%."*

- **Presenter Spoken Closing (01:55 – 02:00):**
  > *"Every insight verified by NASA telemetry. No hallucinations, full accessibility, open science. This is The Pale Blue Dot. Thank you."*

---

## 3. Contingency Protocols (What if something fails live?)

| Scenario | Contingency Trigger | Immediate Action |
|---|---|---|
| **GPU / WebGL Crash** | WebGL context lost or slow projector | The app automatically displays the **"2D Accessible Mode Active"** card. Click **"Browse Planetary Biomes"** — all charts, Mann-Kendall statistics, CMIP6 projections, and AI copilot work identically in 2D. |
| **No Internet Connection** | Wi-Fi cuts out in auditorium | App runs seamlessly on bundled local offline snapshots (`demo-temperature.json`, Natural Earth boundaries, and cached CMIP6 fixtures). Source badge indicates `"Verified NASA Cache"`. |
| **Audio Device Silent** | Projector HDMI audio muted | The full synthesis text is rendered verbatim in real-time on the AI tab with physical reasoning, reference citations, and WMO baselines. |
| **Jury Cuts Time to 60s** | Pitch clock accelerated | Skip Teleconnections (Act 3); flow directly: Biomes (Act 1) → Mann-Kendall (Act 2) → CMIP6 Projections (Act 4) → 5s Audio Debrief (Act 5). |

---

## 4. Key Science & Telemetry Cheat Sheet

- **Data Sources:** NASA POWER (Prediction Of Worldwide Energy Resources) & MERRA-2 (Modern-Era Retrospective analysis for Research and Applications, Version 2).
- **Spatial Resolution:** 0.5° × 0.5° grid cells (interpolated from 0.5° × 0.625° reanalysis).
- **Baseline Period:** WMO 1991–2020 Standard Climatological Normal.
- **Statistical Tests:**
  - Trend: Seasonal Mann-Kendall test (Hirsch et al., 1982) with Sen's non-parametric slope estimator (Sen, 1968).
  - Breakpoint: Pettitt's single change-point test (Pettitt, 1979).
- **Projections Engine:** NASA Earth Exchange Global Daily Downscaled Projections (NEX-GDDP-CMIP6) across SSP1-2.6, SSP2-4.5, and SSP3-7.0.
