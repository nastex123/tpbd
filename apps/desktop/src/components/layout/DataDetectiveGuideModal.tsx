import { useState, useEffect } from 'react';
import './data-detective-guide.css';

export interface DataDetectiveGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type GuideTab = 'variables' | 'methodology' | 'teleconnections';

export function DataDetectiveGuideModal({ isOpen, onClose }: DataDetectiveGuideModalProps) {
  const [activeTab, setActiveTab] = useState<GuideTab>('variables');

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="guide-modal-overlay" onClick={onClose} role="presentation">
      <div
        className="guide-modal-container"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="guide-title"
      >
        {/* Modal Header */}
        <div className="guide-modal-header">
          <div className="guide-header-title">
            <svg className="guide-svg-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <div>
              <h2 id="guide-title">NASA Data Detective Field Manual</h2>
              <span className="guide-subtitle">Earth System Observation & Analysis Protocol · Space Apps 2026</span>
            </div>
          </div>
          <button
            type="button"
            className="guide-close-button"
            onClick={onClose}
            aria-label="Close Guide"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Navigation Tabs (Zero Emojis, Clean SVG Icons) */}
        <nav className="guide-tabs-nav" aria-label="Field Manual Sections">
          <button
            type="button"
            className={`guide-tab-btn ${activeTab === 'variables' ? 'active' : ''}`}
            onClick={() => setActiveTab('variables')}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
            <span>Variables Catalog</span>
          </button>
          <button
            type="button"
            className={`guide-tab-btn ${activeTab === 'methodology' ? 'active' : ''}`}
            onClick={() => setActiveTab('methodology')}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
            <span>Trend Methodology</span>
          </button>
          <button
            type="button"
            className={`guide-tab-btn ${activeTab === 'teleconnections' ? 'active' : ''}`}
            onClick={() => setActiveTab('teleconnections')}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            <span>Teleconnections Primer</span>
          </button>
        </nav>

        {/* Tab Content */}
        <div className="guide-modal-body">
          {activeTab === 'variables' && (
            <section className="guide-section">
              <p className="guide-lead-text">
                NASA Earth Observing System satellites and MERRA-2 meteorological reanalysis measure continuous physical cycles of energy, moisture, and atmosphere across global 0.5° grid cells.
              </p>
              <div className="guide-cards-grid">
                <article className="guide-card">
                  <div className="guide-card-head">
                    <span className="var-badge">T2M</span>
                    <h3>Surface Air Temperature (2 Meters)</h3>
                  </div>
                  <p><strong>Physical Measurement:</strong> Kinetic temperature of air at 2 meters above surface level, expressed in degrees Celsius (°C).</p>
                  <p><strong>Why Scientists Track It:</strong> Fundamental indicator of radiative forcing, thermodynamic atmospheric energy content, and surface heat accumulation.</p>
                  <span className="source-tag">Source: MERRA-2 / NASA POWER · Resolution: 0.5°</span>
                </article>

                <article className="guide-card">
                  <div className="guide-card-head">
                    <span className="var-badge">PRECTOTCORR</span>
                    <h3>Corrected Total Precipitation</h3>
                  </div>
                  <p><strong>Physical Measurement:</strong> Bias-corrected monthly total rainfall and snowfall rate in millimeters per day (mm/day).</p>
                  <p><strong>Why Scientists Track It:</strong> Crucial for identifying hydrological intensification, shifting monsoons, and progressive aridification across biomes.</p>
                  <span className="source-tag">Source: MERRA-2 / GPM Integrated · Resolution: 0.5°</span>
                </article>

                <article className="guide-card">
                  <div className="guide-card-head">
                    <span className="var-badge">ALLSKY_SFC_SW_DWN</span>
                    <h3>All-Sky Surface Downward Solar Irradiance</h3>
                  </div>
                  <p><strong>Physical Measurement:</strong> Solar radiative flux reaching the Earth&apos;s surface under all sky conditions in Megajoules per square meter per day (MJ/m²/day).</p>
                  <p><strong>Why Scientists Track It:</strong> Gauges cloud cover changes, aerosol loading, and radiative energy available for surface evaporation and photosynthetically active radiation.</p>
                  <span className="source-tag">Source: CERES / NASA POWER · Resolution: 0.5°</span>
                </article>

                <article className="guide-card">
                  <div className="guide-card-head">
                    <span className="var-badge">RH2M</span>
                    <h3>Relative Humidity (2 Meters)</h3>
                  </div>
                  <p><strong>Physical Measurement:</strong> Ratio of actual atmospheric vapor pressure to saturation vapor pressure at surface ambient temperature (%).</p>
                  <p><strong>Why Scientists Track It:</strong> Measures atmospheric moisture deficit; critical for agricultural stress and wildfire risk assessment.</p>
                  <span className="source-tag">Source: MERRA-2 · Resolution: 0.5°</span>
                </article>

                <article className="guide-card">
                  <div className="guide-card-head">
                    <span className="var-badge">PS</span>
                    <h3>Surface Atmospheric Pressure</h3>
                  </div>
                  <p><strong>Physical Measurement:</strong> Absolute atmospheric barometric pressure exerted at the local terrain elevation in Kilopascals (kPa).</p>
                  <p><strong>Why Scientists Track It:</strong> Tracks synoptic-scale circulation shifts, anti-cyclonic blocking patterns, and persistent high-pressure atmospheric domes.</p>
                  <span className="source-tag">Source: MERRA-2 · Resolution: 0.5°</span>
                </article>

                <article className="guide-card">
                  <div className="guide-card-head">
                    <span className="var-badge">WS10M</span>
                    <h3>Wind Speed (10 Meters)</h3>
                  </div>
                  <p><strong>Physical Measurement:</strong> Anemometric horizontal vector magnitude of wind velocity at 10 meters above terrain (m/s).</p>
                  <p><strong>Why Scientists Track It:</strong> Governs surface turbulent heat flux, evapotranspiration rates, and dust/moisture advection corridors.</p>
                  <span className="source-tag">Source: MERRA-2 · Resolution: 0.5°</span>
                </article>
              </div>
            </section>
          )}

          {activeTab === 'methodology' && (
            <section className="guide-section">
              <p className="guide-lead-text">
                Real environmental time series contain seasonal oscillations, missing data, and non-normal outliers. Standard ordinary least squares (OLS) regression produces false positives. TPBD implements non-parametric deterministic tests:
              </p>
              
              <div className="method-step-card">
                <div className="step-number">01</div>
                <div>
                  <h3>Seasonal Mann-Kendall Test (Hirsch et al., 1982)</h3>
                  <p>
                    Compares observations within the same calendar month across successive years. It calculates the sign of all pairwise differences:
                    <code>S = sum(sgn(x_j - x_i))</code> for all <code>j &gt; i</code> in month <code>m</code>.
                    This completely eliminates false trend signals caused by regular annual seasonality.
                  </p>
                </div>
              </div>

              <div className="method-step-card">
                <div className="step-number">02</div>
                <div>
                  <h3>Sen&apos;s Non-Parametric Slope Estimator (Sen, 1968)</h3>
                  <p>
                    Computes slopes between all valid pairs within each month: <code>Q = (x_j - x_i) / (j - i)</code>.
                    The Sen slope is the exact mathematical median of all computed slopes: <code>Q_med = median(Q)</code>.
                    Because it uses the median rather than the mean, a single extreme storm or heatwave cannot distort the trend.
                  </p>
                </div>
              </div>

              <div className="method-step-card">
                <div className="step-number">03</div>
                <div>
                  <h3>Statistical Significance: The P-Value Threshold</h3>
                  <p>
                    The null hypothesis (H₀) states that observations are independent and randomly distributed over time (no monotonic trend).
                    The resulting <code>p-value</code> represents the probability of observing the trend purely by chance.
                    Under NASA scientific standards, only results with <code>p &lt; 0.05</code> are classified as statistically significant (95%+ certainty).
                  </p>
                </div>
              </div>

              <div className="method-step-card">
                <div className="step-number">04</div>
                <div>
                  <h3>Exact 95% Confidence Interval (Gilbert, 1987)</h3>
                  <p>
                    Calculates variance <code>Var(S)</code> and applies the two-sided normal quantile <code>Z_0.975 = 1.95996</code> to select the exact rank order slopes:
                    <code>M₁ = floor((N - C_alpha)/2)</code> and <code>M₂ = ceil((N + C_alpha)/2)</code>.
                    This establishes an uncompromising, mathematically deterministic range for decadal change.
                  </p>
                </div>
              </div>
            </section>
          )}

          {activeTab === 'teleconnections' && (
            <section className="guide-section">
              <p className="guide-lead-text">
                The Earth is a unified, coupled thermodynamic system. A single planetary climate driver (such as El Niño Southern Oscillation, Walker Circulation shifts, or polar jet stream waviness) can generate equal and opposite regional trends on opposite sides of the globe.
              </p>

              <div className="teleconnection-archetypes">
                <article className="archetype-card">
                  <h3>Opposing Moisture Regimes: Amazon vs. Sahel</h3>
                  <p>
                    <strong>Mechanism:</strong> Changes in the Atlantic Intertropical Convergence Zone (ITCZ) and tropical sea surface temperature gradients alter planetary Hadley cell ascent and subsidence.
                  </p>
                  <p>
                    <strong>Observation:</strong> While the eastern Amazon Basin has experienced severe precipitation deficits and drying (-0.23 mm/day/decade), portions of the western Sahel exhibit seasonal greening and rainfall recovery (+0.42 mm/day/decade).
                  </p>
                </article>

                <article className="archetype-card">
                  <h3>Polar Amplification vs. Mid-Latitude Blocking</h3>
                  <p>
                    <strong>Mechanism:</strong> Rapid sea ice loss in the Arctic diminishes the equator-to-pole temperature gradient, causing the polar jet stream to meander in slow, high-amplitude planetary Rossby waves.
                  </p>
                  <p>
                    <strong>Observation:</strong> Svalbard experiences extreme Arctic warming (+1.12 °C/decade), which locks persistent anticyclonic high-pressure heat domes over Southern Europe and drought over the Mediterranean.
                  </p>
                </article>

                <article className="archetype-card">
                  <h3>The Data Detective Rule: Distinguish Observation from Attribution</h3>
                  <p>
                    Observing simultaneous opposing trends across two biomes establishes a spatial teleconnection hypothesis. Formal attribution requires cross-referencing multiple variables (temperature, humidity, surface pressure, and solar irradiance) and conducting multivariate climate model fingerprinting.
                  </p>
                </article>
              </div>
            </section>
          )}
        </div>

        {/* Modal Footer */}
        <div className="guide-modal-footer">
          <span className="footer-status-text">Verified against peer-reviewed atmospheric methodology (Hirsch 1982, Sen 1968, Gilbert 1987).</span>
          <button type="button" className="btn-guide-dismiss" onClick={onClose}>
            Acknowledge & Close
          </button>
        </div>
      </div>
    </div>
  );
}