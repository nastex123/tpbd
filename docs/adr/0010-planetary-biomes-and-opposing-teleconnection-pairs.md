# ADR 0010: Planetary Biomes and Opposing Teleconnection Pairs

## Status
**Accepted**

## Date
2026-11-14

## Context
The 2026 NASA Space Apps Challenge (*Be An Earth System Trend Detective!*) poses a central scientific phenomenon:
> *"Change is always occurring in the Earth’s interconnected environmental system... But a measured Earth science data variable can trend one way in one region and the opposite way in another, even when the same process drives both."*

Previously, the TPBD prototype only offered 4 pre-configured regions (Amazon, La Guajira, Sahel, and Southeast Australia). While functional for an initial MVP, this creates a limited and static user experience on the 3D WebGL globe, and does not explicitly showcase the planetary teleconnections that NASA asks participants to investigate.

---

## Decision

We expand the preset repository from 4 to **12 globally representative Earth system biomes**, structured around **3 Curated Opposing Teleconnection Pairs**:

### 1. The 12 Global Benchmark Biomes
1. **Amazon Basin (Manaus, Brazil) [Tropical Rainforest]:** Carbon sink dynamics, hydrological lengthening of dry season.
2. **La Guajira (Riohacha, Colombia) [Semi-Arid Coastal Desert]:** Extreme ENSO precipitation sensitivity and drought stress.
3. **Sahel (Niamey, Niger) [Semi-Arid Transition]:** Historical decadal monsoon recovery vs. thermal warming.
4. **Southeast Australia (Murray-Darling) [Temperate Agricultural Basin]:** Compound heatwave, drought, and agricultural water stress.
5. **Arctic Archipelago (Svalbard, Norway) [Polar Cryosphere]:** Polar amplification warming at $>3\times$ the global rate.
6. **Aral Sea Basin (Kazakhstan / Uzbekistan) [Inland Endorheic Basin]:** Historical ecological desiccation and exacerbated localized continentality.
7. **California Central Valley (Fresno, USA) [Mediterranean Agricultural Zone]:** Atmospheric river precipitation variability vs. multi-year drought.
8. **Tibetan Plateau (Lhasa, China) [Alpine "Third Pole"]:** High-altitude glacier retreat and Asian headwater hydrologic vulnerability.
9. **Congo Basin (Kisangani, DRC) [Equatorial Convective Forest]:** Tropical convective core and secondary global rainforest sink.
10. **SW Greenland (Nuuk) [Ice Sheet Margin]:** Peripheral cryosphere melting and ice-albedo positive feedback.
11. **Great Barrier Reef / Coral Sea (Australia) [Tropical Marine Ecosystem]:** Ocean warming, marine heatwaves, and reef thermal stress.
12. **Mediterranean Basin (Seville, Spain) [Subtropical Aridifying Hotspot]:** Subtropical dry-zone poleward expansion and summer heat extremes.

### 2. The 3 Opposing Teleconnection Pairs
- **Pair 1: Hadley Cell Widening (Tropical Convective Core vs. Subtropical Edge)**
  - *Locations:* Congo Basin (`congo_basin`) vs. Mediterranean Basin (`mediterranean_spain`).
  - *Phenomenon:* As greenhouse warming expands the tropical Hadley circulation, equatorial rainfall intensifies while descending dry subtropical branches shift poleward, desiccating the Mediterranean.
- **Pair 2: Asymmetric ENSO Phase Teleconnection**
  - *Locations:* La Guajira Peninsula (`guajira`) vs. California Central Valley (`california_valley`).
  - *Phenomenon:* El Niño events displace the Pacific Walker circulation, creating severe precipitation deficits in the northern Caribbean while directing intense atmospheric rivers into California.
- **Pair 3: Polar Amplification vs. Tropical Thermal Inertia**
  - *Locations:* Arctic Svalbard (`arctic_svalbard`) vs. Amazon Basin (`amazon`).
  - *Phenomenon:* Albedo reduction from vanishing Arctic sea ice accelerates Arctic winter temperature rise at more than three times the tropical warming rate.

---

## Consequences

### Positive
- **Direct NASA Challenge Alignment:** Solves the core challenge theme of exploring opposite trends driven by the same planetary mechanism.
- **Dynamic 3D Globe:** Transforms the WebGL globe into an engaging, vibrant exploration interface covering all 7 continents and major biomes.
- **100% Contract Compliance:** Derives strictly from the existing `Region` schema in `docs/openapi.yaml` with backwards-compatible coordinates and cells.
- **Instant Comparator Preset:** The frontend can load teleconnection pairs with one click, providing an immediate educational experience for students and judges.

### Negative / Trade-offs
- Additional fixture files and cache entries must be managed in the backend repository.
