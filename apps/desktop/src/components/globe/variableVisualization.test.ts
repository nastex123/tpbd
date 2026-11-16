import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  hexToRgba,
  getVariableProfile,
  computeRadarRangeRings,
  computeRadarCrosshairs,
  buildThematicRegionFeature,
} from './variableVisualization.ts';

test('hexToRgba translates standard hex codes into rgba with clamped alpha', () => {
  assert.equal(hexToRgba('#38bdf8', 0.5), 'rgba(56, 189, 248, 0.5)');
  assert.equal(hexToRgba('#22c55e', 1), 'rgba(34, 197, 94, 1)');
  assert.equal(hexToRgba('#ef4444', 0), 'rgba(239, 68, 68, 0)');
  assert.equal(hexToRgba('#dc2626', 1.5), 'rgba(220, 38, 38, 1)');
  assert.equal(hexToRgba('invalid', 0.5), 'rgba(56, 189, 248, 0.5)');
});

test('getVariableProfile provides scientific visual profiles for all 6 core catalog variables', () => {
  const rain = getVariableProfile('PRECTOTCORR');
  assert.equal(rain.category, 'radar');
  assert.equal(rain.unit, 'mm/month');
  assert.equal(rain.getPointColor(1.0), '#38bdf8'); // light
  assert.equal(rain.getPointColor(5.0), '#22c55e'); // moderate
  assert.equal(rain.getPointColor(15.0), '#eab308'); // high
  assert.equal(rain.getPointColor(35.0), '#ef4444'); // severe
  assert.equal(rain.getPointColor(80.0), '#d946ef'); // torrential

  const temp = getVariableProfile('T2M');
  assert.equal(temp.category, 'thermal');
  assert.equal(temp.unit, '°C');
  assert.equal(temp.getPointColor(-5), '#3b82f6'); // freezing
  assert.equal(temp.getPointColor(10), '#06b6d4'); // cool
  assert.equal(temp.getPointColor(22), '#f59e0b'); // warm
  assert.equal(temp.getPointColor(32), '#ea580c'); // hot
  assert.equal(temp.getPointColor(42), '#dc2626'); // extreme

  const hydro = getVariableProfile('GWETROOT');
  assert.equal(hydro.category, 'hydro');
  assert.equal(hydro.getPointColor(0.15), '#d97706'); // deficit
  assert.equal(hydro.getPointColor(0.45), '#06b6d4'); // adequate
  assert.equal(hydro.getPointColor(0.75), '#10b981'); // saturated

  const ndvi = getVariableProfile('MOD13Q1_NDVI');
  assert.equal(ndvi.category, 'vegetation');
  assert.equal(ndvi.getPointColor(0.10), '#71717a'); // barren
  assert.equal(ndvi.getPointColor(0.30), '#84cc16'); // sparse
  assert.equal(ndvi.getPointColor(0.55), '#16a34a'); // dense
  assert.equal(ndvi.getPointColor(0.85), '#059669'); // rainforest

  const flux = getVariableProfile('EVPTRNS');
  assert.equal(flux.category, 'flux');

  const rh = getVariableProfile('RH2M');
  assert.equal(rh.category, 'hydro');
});

test('computeRadarRangeRings generates geodesic range circles with custom base color', () => {
  const rings = computeRadarRangeRings(37.4, -5.9, [60, 160], 0.015, '#22c55e');
  assert.equal(rings.length, 2);
  assert.equal(rings[0].points.length, 65); // 64 segments + closing point
  assert.equal(rings[0].points[0].altitude, 0.015);
  assert.ok(rings[0].color.includes('34, 197, 94')); // emerald green
});

test('computeRadarCrosshairs generates orthogonal cardinal radar lines', () => {
  const crosshairs = computeRadarCrosshairs(37.4, -5.9, 175, 0.015, 'rgba(34, 197, 94, 0.40)');
  assert.equal(crosshairs.length, 2);
  assert.equal(crosshairs[0].points.length, 3); // North-South
  assert.equal(crosshairs[1].points.length, 3); // West-East
  assert.equal(crosshairs[0].points[1].lat, 37.4); // center point
  assert.equal(crosshairs[0].points[1].lng, -5.9);
  assert.equal(crosshairs[0].color, 'rgba(34, 197, 94, 0.40)');
});

test('buildThematicRegionFeature creates valid 3D GeoJSON Feature with visor styling', () => {
  const coords = [[
    [-8, 36],
    [-8, 40],
    [-3, 40],
    [-3, 36],
    [-8, 36],
  ]];

  const feature = buildThematicRegionFeature({
    regionId: 'mediterranean_spain',
    name: 'Mediterranean Basin (Seville, Spain)',
    variableId: 'PRECTOTCORR',
    coordinates: coords,
    value: 18.5,
    unit: 'mm/month',
    targetLetter: 'A',
  });

  assert.equal(feature.type, 'Feature');
  assert.equal(feature.isRegionOverlay, true);
  assert.equal(feature.properties.isRegionOverlay, true);
  assert.equal(feature.geometry.type, 'Polygon');
  assert.deepEqual(feature.geometry.coordinates, coords);
  assert.equal(feature.properties.altitude, 0.0075);
  assert.equal(feature.properties.strokeColor, '#eab308'); // High precipitation (18.5 mm)
  assert.ok(feature.properties.capColor.includes('234, 179, 8'));
  assert.ok(feature.properties.sideColor.includes('234, 179, 8'));
  assert.ok(feature.properties.tooltipHtml.includes('18.50 mm/month'));
  assert.ok(feature.properties.tooltipHtml.includes('A · Mediterranean Basin'));
});
