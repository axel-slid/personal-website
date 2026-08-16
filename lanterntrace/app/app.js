const { timelineSnapshots: snapshots, surveillanceSites: sentinelSites, corridors: transportCorridors, citySearch: placeSearch } = window.LanternTraceData;
const observationBundle = window.LanternTraceObservations || { metadata: {}, observations: [] };
const observationPoints = observationBundle.observations;
const observationMetadata = observationBundle.metadata;
const previewObservationPoints = observationPoints.filter((_, index) => index % 20 === 0);
const modelBundle = window.LanternTraceModels || { metadata: {}, variants: [], topFive: [], models: {} };
const benchmarkBundle = window.LanternTraceBenchmark || { metadata: {}, models: [], years: {} };
const embedMode = new URLSearchParams(window.location.search).get('embed');
const physicsEmbedMode = embedMode === 'physics' || embedMode === 'hero';
const heroMapEmbedMode = embedMode === 'hero';
let selectedModelId = modelBundle.defaultModel || modelBundle.topFive?.[0] || null;
let selectedBenchmarkModelId = benchmarkBundle.models.find((model) => model.id === 'og_rde')?.id || benchmarkBundle.models[0]?.id || null;
let benchmarkYear = 2025;
let activeLabMode = 'benchmark';
let benchmarkComparisonEnabled = false;
let benchmarkExplainEnabled = true;
let selectedExplainCellIndex = null;
let physicsViewEnabled = false;
let physicsAnimationPlaying = true;
let physicsDisplayMode = 'height';
let physicsPhase = .42;
let physicsAnimationFrame;
let physicsAnimationLast = 0;

const layers = { heatmap: true, reports: true, front: true, interpolation: true, uncertainty: false, corridors: false, sites: false };
const latestObservedSnapshotIndex = snapshots.reduce((latest, snapshot, index) => snapshot.isProjection ? latest : index, 0);
const forecastSettings = { projectionsEnabled: false, comparisonEnabled: false };
const PLAYBACK_INTERVAL_MS = 120;
const REDUCED_MOTION_PLAYBACK_INTERVAL_MS = 500;
const modelColors = ['#78efb5', '#f2c96d', '#73b9ff', '#dd91f3', '#ff907d'];
const benchmarkColors = {
  covariate_hazard: '#73c9d5', og_rde: '#78efb5', transport_rd: '#f2c96d', climate_rd: '#73b9ff',
  fisher_kpp: '#a8d98b', full_mechanistic: '#d79b70', cook_2021_kernel: '#b18be3', distance_kernel: '#9ca8a2'
};
const benchmarkOwnership = {
  covariate_hazard: { label: 'OURS · CONTROL', className: 'ours', detail: 'study-built no-physics control' },
  og_rde: { label: 'OURS · PRIMARY', className: 'ours primary', detail: 'primary observation-guided model' },
  transport_rd: { label: 'OURS · PHYSICS', className: 'ours', detail: 'study-built mechanistic variant' },
  climate_rd: { label: 'OURS · PHYSICS', className: 'ours', detail: 'study-built mechanistic variant' },
  full_mechanistic: { label: 'OURS · PHYSICS', className: 'ours', detail: 'study-built mechanistic variant' },
  fisher_kpp: { label: 'CLASSIC BASELINE', className: 'baseline', detail: 'classical reaction-diffusion baseline' },
  cook_2021_kernel: { label: 'PAST LITERATURE', className: 'literature', detail: 'transferred Cook et al. 2021 comparator' },
  distance_kernel: { label: 'SIMPLE BASELINE', className: 'baseline', detail: 'distance-only baseline' }
};
const benchmarkComparisonIds = ['covariate_hazard', 'og_rde', 'transport_rd', 'cook_2021_kernel'];
const benchmarkExplainModels = { past: 'cook_2021_kernel', ours: 'og_rde', diffusion: 'fisher_kpp', climate: 'climate_rd' };
const physicsModelIds = ['fisher_kpp', 'climate_rd', 'transport_rd', 'full_mechanistic', 'og_rde'];
const physicsProfiles = {
  fisher_kpp: { short: 'FISHER–KPP', mechanism: 'local diffusion + logistic growth', terms: 'D∇u + ru(1−u)' },
  climate_rd: { short: 'CLIMATE RD', mechanism: 'climate-varying diffusion and growth', terms: 'D(x)∇u + r(x)u(1−u)' },
  transport_rd: { short: 'TRANSPORT RD', mechanism: 'local diffusion + directional transport', terms: 'D∇u + J + A' },
  full_mechanistic: { short: 'FULL MECHANISTIC', mechanism: 'climate, barriers, satellites, and transport', terms: 'D(x)∇u + r(x)u(1−u) + J + A' },
  og_rde: { short: 'OG-RDE · OURS', mechanism: 'observation-guided fusion of mechanistic fields', terms: 'f(front, habitat, Fisher–KPP, Climate RD)' }
};
const benchmarkExplainRegions = [
  { id: 'great-lakes', name: 'Great Lakes + western NY', short: 'GREAT LAKES', bounds: [[-82, 41], [-76.5, 47]], contains: (longitude, latitude) => longitude < -76.5 && latitude >= 41 },
  { id: 'appalachia', name: 'Central Appalachia', short: 'APPALACHIA', bounds: [[-82, 37], [-76.5, 41]], contains: (longitude, latitude) => longitude < -76.5 && latitude < 41 },
  { id: 'mid-atlantic', name: 'Mid-Atlantic', short: 'MID-ATLANTIC', bounds: [[-76.5, 37], [-68, 41]], contains: (longitude, latitude) => longitude >= -76.5 && latitude < 41 },
  { id: 'northeast', name: 'Northeast + New England', short: 'NORTHEAST', bounds: [[-76.5, 41], [-68, 47]], contains: (longitude, latitude) => longitude >= -76.5 && latitude >= 41 }
];
let snapshotIndex = latestObservedSnapshotIndex;
let activeSection = 'front';
let map;
let playing = false;
let timer;
let animationLastFrame = 0;
let lastReportStep = -1;
let pendingSliderFrame;
let pendingSliderReportTimer;
let lastSliderReportUpdate = 0;
let isTimelineScrubbing = false;
let corridorAnimationFrame;
let corridorAnimationLast = 0;
let usingReportPreview = false;
let settingsReturnFocus = null;
let mapLayersAdded = false;
const timelineOverviewZoom = 4.75;

function timelineMaxIndex() {
  return forecastSettings.projectionsEnabled && !benchmarkActive() ? snapshots.length - 1 : latestObservedSnapshotIndex;
}

function modelColor(modelId) {
  const index = Math.max(0, modelBundle.topFive.indexOf(modelId));
  return modelColors[index % modelColors.length];
}

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const darkStyle = {
  version: 8,
  sources: {
    cartoBase: {
      type: 'raster',
      tiles: ['https://a.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png', 'https://b.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors © CARTO'
    },
    cartoLabels: {
      type: 'raster',
      tiles: ['https://a.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png', 'https://b.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors © CARTO'
    }
  },
  layers: [
    { id: 'background', type: 'background', paint: { 'background-color': '#06172e' } },
    { id: 'carto-base', type: 'raster', source: 'cartoBase', paint: { 'raster-opacity': 0.82, 'raster-saturation': -0.25, 'raster-contrast': 0.42, 'raster-brightness-min': 0.02, 'raster-brightness-max': 0.5 } },
    { id: 'carto-labels', type: 'raster', source: 'cartoLabels', paint: { 'raster-opacity': 0.76, 'raster-saturation': -0.2, 'raster-contrast': 0.3, 'raster-brightness-min': 0.05, 'raster-brightness-max': 0.62 } }
  ]
};

function geojsonFeature(type, coordinates, properties = {}) {
  return { type: 'Feature', geometry: { type, coordinates }, properties };
}

function pointAlongCorridor(line, progress) {
  const segments = line.slice(1).map((point, index) => {
    const start = line[index];
    const latitude = (start[1] + point[1]) / 2;
    const dx = (point[0] - start[0]) * Math.cos(latitude * Math.PI / 180);
    const dy = point[1] - start[1];
    return { start, end: point, length: Math.hypot(dx, dy), angle: Math.atan2(dy, dx) * 180 / Math.PI };
  });
  const totalLength = segments.reduce((sum, segment) => sum + segment.length, 0);
  let distance = progress * totalLength;
  for (const segment of segments) {
    if (distance <= segment.length) {
      const blend = segment.length ? distance / segment.length : 0;
      return {
        coordinates: [segment.start[0] + (segment.end[0] - segment.start[0]) * blend, segment.start[1] + (segment.end[1] - segment.start[1]) * blend],
        angle: segment.angle
      };
    }
    distance -= segment.length;
  }
  return { coordinates: line.at(-1), angle: segments.at(-1)?.angle || 0 };
}

function corridorFlowData(phase = 0) {
  const directionGlyphs = ['→', '↗', '↑', '↖', '←', '↙', '↓', '↘'];
  const features = [];
  transportCorridors.forEach((line, corridorIndex) => {
    for (let arrowIndex = 0; arrowIndex < 3; arrowIndex += 1) {
      const position = pointAlongCorridor(line, (phase + arrowIndex / 3 + corridorIndex * 0.07) % 1);
      const directionIndex = Math.round((((position.angle % 360) + 360) % 360) / 45) % 8;
      features.push(geojsonFeature('Point', position.coordinates, { corridor: corridorIndex + 1, arrow: directionGlyphs[directionIndex] }));
    }
  });
  return { type: 'FeatureCollection', features };
}

function startCorridorAnimation() {
  cancelAnimationFrame(corridorAnimationFrame);
  if (!map || document.hidden || !layers.corridors || benchmarkActive()) return;
  const animate = (timestamp) => {
    if (document.hidden || !layers.corridors || benchmarkActive()) return;
    if (timestamp - corridorAnimationLast >= (playing || isTimelineScrubbing ? 90 : 180)) {
      const source = map?.getSource('lt-corridor-flow');
      if (source) source.setData(corridorFlowData((timestamp / 10500) % 1));
      corridorAnimationLast = timestamp;
    }
    corridorAnimationFrame = requestAnimationFrame(animate);
  };
  corridorAnimationFrame = requestAnimationFrame(animate);
}

function addCorridorArrowImage() {
  if (map.hasImage('lt-flow-arrow')) return;
  const size = 32;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  context.beginPath();
  context.moveTo(4, 8);
  context.lineTo(27, 16);
  context.lineTo(4, 24);
  context.lineTo(10, 16);
  context.closePath();
  context.fillStyle = '#d9f280';
  context.shadowColor = 'rgba(90, 160, 85, .55)';
  context.shadowBlur = 4;
  context.fill();
  map.addImage('lt-flow-arrow', { width: size, height: size, data: context.getImageData(0, 0, size, size).data }, { pixelRatio: 2 });
}

const monthIndex = new Map(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month, index) => [month, index]));

function snapshotCutoff(snapshot = snapshots[snapshotIndex]) {
  const [year, month] = String(snapshot.period || `${snapshot.year} Dec`).split(' ');
  return Date.UTC(Number(year), (monthIndex.get(month) ?? 11) + 1, 0, 23, 59, 59, 999);
}

function reportCountAt(cutoff) {
  let low = 0;
  let high = observationPoints.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    const timestamp = Date.parse(`${observationPoints[middle][2]}T23:59:59Z`) || 0;
    if (timestamp <= cutoff) low = middle + 1;
    else high = middle;
  }
  return low;
}

function reportData(points = observationPoints) {
  return {
    type: 'FeatureCollection',
    features: points.map(([lng, lat, date, key, state, locality, basis, datasetKey, license, occurrenceID]) => geojsonFeature('Point', [lng, lat], {
      observedAt: Date.parse(`${date}T23:59:59Z`) || 0,
      date,
      key,
      state,
      locality,
      basis,
      datasetKey,
      license,
      occurrenceID
    }))
  };
}

const envelopeCellSize = 0.45;

function convexHull(points) {
  const unique = [...new Map(points.map(([x, y]) => [`${x},${y}`, [x, y]])).values()].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (unique.length <= 2) return unique;
  const cross = (origin, a, b) => (a[0] - origin[0]) * (b[1] - origin[1]) - (a[1] - origin[1]) * (b[0] - origin[0]);
  const lower = [];
  for (const point of unique) {
    while (lower.length >= 2 && cross(lower.at(-2), lower.at(-1), point) <= 0) lower.pop();
    lower.push(point);
  }
  const upper = [];
  for (const point of [...unique].reverse()) {
    while (upper.length >= 2 && cross(upper.at(-2), upper.at(-1), point) <= 0) upper.pop();
    upper.push(point);
  }
  const hull = lower.slice(0, -1).concat(upper.slice(0, -1));
  hull.push(hull[0]);
  return hull;
}

function occurrenceEnvelope(occupiedCells, { minimumCellCount } = {}) {
  // A single convex hull falsely fills the space between distant satellite
  // reports. Keep locally connected, higher-density clusters separate. The
  // adaptive floor prevents a chain of lightly reported cells from becoming
  // one authoritative-looking "core" as the public dataset grows.
  const counts = [...occupiedCells.values()].sort((a, b) => a - b);
  const adaptiveMinimum = minimumCellCount ?? Math.max(2, counts[Math.floor(counts.length * .70)] || 2);
  const repeatedCells = new Map([...occupiedCells].filter(([, count]) => count >= adaptiveMinimum));
  const evidenceCells = repeatedCells.size >= 3 ? repeatedCells : occupiedCells;
  const unvisited = new Set(evidenceCells.keys());
  const components = [];
  while (unvisited.size) {
    const start = unvisited.values().next().value;
    const queue = [start];
    const component = [];
    unvisited.delete(start);
    while (queue.length) {
      const key = queue.pop();
      const [x, y] = key.split(':').map(Number);
      component.push([x, y]);
      for (let dx = -1; dx <= 1; dx += 1) {
        for (let dy = -1; dy <= 1; dy += 1) {
          if (!dx && !dy) continue;
          const neighbor = `${x + dx}:${y + dy}`;
          if (unvisited.delete(neighbor)) queue.push(neighbor);
        }
      }
    }
    const corners = component.flatMap(([x, y]) => {
      const west = x * envelopeCellSize - 180;
      const south = y * envelopeCellSize - 90;
      return [[west, south], [west + envelopeCellSize, south], [west + envelopeCellSize, south + envelopeCellSize], [west, south + envelopeCellSize]];
    });
    const ring = convexHull(corners);
    if (ring.length >= 4) {
      const reportWeight = component.reduce((total, [x, y]) => total + (evidenceCells.get(`${x}:${y}`) || 0), 0);
      components.push({ ring, reportWeight, cellCount: component.length });
    }
  }
  const ranked = components.sort((a, b) => b.reportWeight - a.reportWeight || b.cellCount - a.cellCount);
  const minimumWeight = Math.max(3, (ranked[0]?.reportWeight || 0) * 0.012);
  const retained = ranked.filter((component, index) => index === 0 || (component.cellCount >= 2 && component.reportWeight >= minimumWeight)).slice(0, 18);
  return { type: 'MultiPolygon', coordinates: retained.map((component) => [component.ring]) };
}

function reportingGapInterpolation(occupiedCells) {
  const scores = new Map();
  occupiedCells.forEach((count, key) => {
    const [x, y] = key.split(':').map(Number);
    const strength = Math.min(3.2, Math.log1p(count));
    for (let dx = -2; dx <= 2; dx += 1) {
      for (let dy = -2; dy <= 2; dy += 1) {
        const distanceSquared = dx * dx + dy * dy;
        if (distanceSquared > 4) continue;
        const weight = strength * Math.exp(-distanceSquared / 2.2);
        const neighbor = `${x + dx}:${y + dy}`;
        scores.set(neighbor, (scores.get(neighbor) || 0) + weight);
      }
    }
  });
  const interpolated = new Map();
  scores.forEach((score, key) => {
    // Repeated nearby evidence can bridge a reporting gap; isolated records
    // receive only a small local halo and cannot span large empty regions.
    if (score >= 1.15) interpolated.set(key, Math.max(2, score));
  });
  return occurrenceEnvelope(interpolated, { minimumCellCount: 2 });
}

function transformEnvelope(geometry, yearsAhead, uncertainty = false) {
  const growth = 1 + yearsAhead * (uncertainty ? 0.075 : 0.04);
  const drift = [yearsAhead * 0.32, yearsAhead * 0.13];
  return {
    type: 'MultiPolygon',
    coordinates: geometry.coordinates.map(([ring]) => {
      const points = ring.slice(0, -1);
      const center = points.reduce((sum, [lng, lat]) => [sum[0] + lng / points.length, sum[1] + lat / points.length], [0, 0]);
      return [ring.map(([lng, lat]) => [center[0] + (lng - center[0]) * growth + drift[0], center[1] + (lat - center[1]) * growth + drift[1]])];
    })
  };
}

function applyOccurrenceDerivedEnvelopes() {
  const occupiedCells = new Map();
  let observationIndex = 0;
  let latestObservedGeometry = { type: 'MultiPolygon', coordinates: [] };
  for (const snapshot of snapshots) {
    const cutoff = snapshotCutoff(snapshot);
    while (observationIndex < observationPoints.length) {
      const point = observationPoints[observationIndex];
      const timestamp = Date.parse(`${point[2]}T23:59:59Z`) || 0;
      if (timestamp > cutoff) break;
      const cellX = Math.floor((point[0] + 180) / envelopeCellSize);
      const cellY = Math.floor((point[1] + 90) / envelopeCellSize);
      const key = `${cellX}:${cellY}`;
      occupiedCells.set(key, (occupiedCells.get(key) || 0) + 1);
      observationIndex += 1;
    }
    latestObservedGeometry = occurrenceEnvelope(occupiedCells);
    snapshot.frontGeometry = latestObservedGeometry;
    snapshot.interpolationGeometry = snapshot.isProjection ? { type: 'MultiPolygon', coordinates: [] } : reportingGapInterpolation(occupiedCells);
    snapshot.cells = String(occupiedCells.size);
    if (!snapshot.isProjection) {
      snapshot.uncertaintyGeometry = { type: 'MultiPolygon', coordinates: [] };
      snapshot.confidence = '—';
      snapshot.leadingEdge = 'Report-derived occurrence footprint';
    } else {
      const yearsAhead = snapshot.projectionHorizonYears || 0;
      snapshot.uncertaintyGeometry = transformEnvelope(latestObservedGeometry, yearsAhead, true);
      snapshot.leadingEdge = 'Observed core with separate prospective envelope';
    }
  }
}

function snapshotGeometryFeature(snapshot, key, step = snapshotIndex) {
  const geometryKey = `${key}Geometry`;
  const smoothKey = `${key}SmoothGeometry`;
  const geometry = snapshot[smoothKey] || (snapshot[smoothKey] = smoothBoundaryGeometry(snapshot[geometryKey]));
  return geometry
    ? { type: 'Feature', geometry, properties: { year: snapshot.year, step, isProjection: Boolean(snapshot.isProjection) } }
    : geojsonFeature('Polygon', [snapshot[key]], { year: snapshot.year, step });
}

function smoothClosedRing(ring, iterations = 2) {
  if (!ring || ring.length < 4) return ring;
  let points = ring.slice(0, -1);
  for (let pass = 0; pass < iterations; pass += 1) {
    const rounded = [];
    for (let index = 0; index < points.length; index += 1) {
      const current = points[index];
      const next = points[(index + 1) % points.length];
      rounded.push(
        [current[0] * 0.75 + next[0] * 0.25, current[1] * 0.75 + next[1] * 0.25],
        [current[0] * 0.25 + next[0] * 0.75, current[1] * 0.25 + next[1] * 0.75]
      );
    }
    points = rounded;
  }
  return [...points, points[0]];
}

function smoothBoundaryGeometry(geometry, iterations = 4) {
  if (!geometry) return geometry;
  if (geometry.type === 'Polygon') return { ...geometry, coordinates: geometry.coordinates.map((ring) => smoothClosedRing(ring, iterations)) };
  if (geometry.type === 'MultiPolygon') return { ...geometry, coordinates: geometry.coordinates.map((polygon) => polygon.map((ring) => smoothClosedRing(ring, iterations))) };
  return geometry;
}

applyOccurrenceDerivedEnvelopes();

function selectedModelRanking() {
  return modelBundle.variants.find((variant) => variant.id === selectedModelId);
}

function applySelectedProjectionModel() {
  const selected = modelBundle.models?.[selectedModelId];
  const ranking = selectedModelRanking();
  if (!selected || !ranking) return;
  const forecastFrames = selected.forecastFrames || selected.frames || [];
  const framesByPeriod = new Map(forecastFrames.map((frame) => [frame.period, frame]));
  snapshots.forEach((snapshot) => {
    if (!snapshot.isProjection) return;
    const frame = framesByPeriod.get(snapshot.period);
    if (!frame) return;
    snapshot.frontGeometry = frame.frontGeometry;
    snapshot.uncertaintyGeometry = frame.uncertaintyGeometry;
    delete snapshot.frontSmoothGeometry;
    delete snapshot.uncertaintySmoothGeometry;
    snapshot.cells = String(frame.occupiedCells);
    snapshot.confidence = 'NOT CALIBRATED';
    snapshot.leadingEdge = `Scenario · ${ranking.id} · ${ranking.name}`;
    snapshot.modelId = ranking.id;
    snapshot.modelScore = ranking.score;
    snapshot.meanDensity = frame.meanDensity;
  });
}

applySelectedProjectionModel();

function modelFrame(modelId, snapshot = snapshots[snapshotIndex]) {
  const model = modelBundle.models?.[modelId];
  if (!model || !snapshot) return null;
  const frames = snapshot.isProjection ? (model.forecastFrames || model.frames || []) : (model.backcastFrames || []);
  return frames.find((frame) => frame.period === snapshot.period);
}

function modelComparisonData(snapshot = snapshots[snapshotIndex]) {
  const modelLabVisible = activeSection === 'methods' && activeLabMode === 'scenario';
  if (!snapshot || (!modelLabVisible && !forecastSettings.comparisonEnabled)) {
    return { type: 'FeatureCollection', features: [] };
  }
  if (snapshot.isProjection && !forecastSettings.projectionsEnabled) return { type: 'FeatureCollection', features: [] };
  const comparedIds = forecastSettings.comparisonEnabled ? modelBundle.topFive : [selectedModelId];
  const features = comparedIds.map((modelId) => {
    const index = Math.max(0, modelBundle.topFive.indexOf(modelId));
    const frame = modelFrame(modelId, snapshot);
    const ranking = modelBundle.variants.find((variant) => variant.id === modelId);
    if (!frame || !ranking) return null;
    const geometry = frame.frontSmoothGeometry || (frame.frontSmoothGeometry = smoothBoundaryGeometry(frame.frontGeometry, 3));
    return {
      type: 'Feature',
      geometry,
      properties: {
        modelId,
        name: ranking.name,
        rank: ranking.rank,
        score: ranking.score,
        color: modelColors[index],
        selected: modelId === selectedModelId ? 1 : 0
      }
    };
  }).filter(Boolean);
  return { type: 'FeatureCollection', features };
}

function updateModelComparison() {
  const source = map?.getSource('lt-model-comparison');
  if (source) source.setData(modelComparisonData());
  const visible = !benchmarkActive() && (
    (activeSection === 'methods' && activeLabMode === 'scenario') || forecastSettings.comparisonEnabled
  );
  ['lt-model-comparison-glow', 'lt-model-comparison-line'].forEach((id) => {
    if (map?.getLayer(id)) map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none');
  });
  const legend = $('#model-comparison-legend');
  if (legend) {
    legend.classList.toggle('hidden', !forecastSettings.comparisonEnabled || benchmarkActive());
    const snapshot = snapshots[snapshotIndex];
    const phase = legend.querySelector(':scope > div span');
    const period = legend.querySelector(':scope > div b');
    if (phase) phase.textContent = snapshot?.isProjection ? 'FORECAST' : 'BACKCAST + REPORTS';
    if (period) period.textContent = snapshot?.period || 'model frame';
  }
}

function benchmarkModel(modelId = selectedBenchmarkModelId) {
  return benchmarkBundle.models.find((model) => model.id === modelId);
}

function benchmarkYearData(year = benchmarkYear) {
  return benchmarkBundle.years?.[String(year)];
}

function benchmarkActive() {
  return activeSection === 'methods' && activeLabMode === 'benchmark' && Boolean(benchmarkYearData());
}

function benchmarkCellPolygon(index) {
  const grid = benchmarkBundle.metadata.grid;
  const row = Math.floor(index / grid.columns);
  const column = index % grid.columns;
  const west = grid.west + column * grid.stepDegrees;
  const south = grid.south + row * grid.stepDegrees;
  const east = west + grid.stepDegrees;
  const north = south + grid.stepDegrees;
  return [[west, south], [east, south], [east, north], [west, north], [west, south]];
}

function benchmarkTopIndices(modelId, yearData = benchmarkYearData()) {
  if (!yearData?.scores?.[modelId]) return new Set();
  const ranked = yearData.eligibleIndices
    .map((index) => [index, yearData.scores[modelId][index]])
    .sort((left, right) => right[1] - left[1])
    .slice(0, yearData.top5CellCount);
  return new Set(ranked.map(([index]) => index));
}

function benchmarkCellCenter(index) {
  const grid = benchmarkBundle.metadata.grid;
  const row = Math.floor(index / grid.columns);
  const column = index % grid.columns;
  return [
    grid.west + (column + .5) * grid.stepDegrees,
    grid.south + (row + .5) * grid.stepDegrees
  ];
}

function benchmarkExplainRegion(index) {
  const [longitude, latitude] = benchmarkCellCenter(index);
  return benchmarkExplainRegions.find((region) => region.contains(longitude, latitude)) || benchmarkExplainRegions.at(-1);
}

function signedRank(value) {
  return `${value >= 0 ? '+' : ''}${value.toFixed(3)}`;
}

function benchmarkExplanationRecords(yearData = benchmarkYearData()) {
  if (!yearData) return [];
  const pastTop = benchmarkTopIndices(benchmarkExplainModels.past, yearData);
  const oursTop = benchmarkTopIndices(benchmarkExplainModels.ours, yearData);
  const truth = new Set(yearData.truthIndices);
  return yearData.eligibleIndices.map((index) => {
    const past = yearData.scores[benchmarkExplainModels.past]?.[index] || 0;
    const diffusion = yearData.scores[benchmarkExplainModels.diffusion]?.[index] || 0;
    const climate = yearData.scores[benchmarkExplainModels.climate]?.[index] || 0;
    const ours = yearData.scores[benchmarkExplainModels.ours]?.[index] || 0;
    const inPast = pastTop.has(index);
    const inOurs = oursTop.has(index);
    const category = inOurs && !inPast ? 'ours_only' : inPast && !inOurs ? 'past_only' : inOurs ? 'both' : 'neither';
    return {
      index, past, diffusion, climate, ours,
      delta: ours - past,
      magnitude: Math.abs(ours - past),
      diffusionDelta: diffusion - past,
      climateDelta: climate - diffusion,
      fusionDelta: ours - climate,
      category,
      truth: truth.has(index),
      region: benchmarkExplainRegion(index)
    };
  });
}

function benchmarkExplanationData() {
  return {
    type: 'FeatureCollection',
    features: benchmarkExplanationRecords().map((record) => geojsonFeature('Polygon', [benchmarkCellPolygon(record.index)], {
      index: record.index,
      delta: record.delta,
      magnitude: record.magnitude,
      category: record.category,
      truth: record.truth ? 1 : 0,
      regionId: record.region.id,
      region: record.region.name,
      past: record.past,
      diffusion: record.diffusion,
      climate: record.climate,
      ours: record.ours
    }))
  };
}

function benchmarkExplanationSummary(records = benchmarkExplanationRecords()) {
  const yearData = benchmarkYearData();
  if (!yearData) return null;
  const truth = new Set(yearData.truthIndices);
  const pastTop = benchmarkTopIndices(benchmarkExplainModels.past, yearData);
  const oursTop = benchmarkTopIndices(benchmarkExplainModels.ours, yearData);
  const hitCount = (indices) => [...indices].filter((index) => truth.has(index)).length;
  const pastMetric = benchmarkModel(benchmarkExplainModels.past)?.metrics?.[String(benchmarkYear)];
  const oursMetric = benchmarkModel(benchmarkExplainModels.ours)?.metrics?.[String(benchmarkYear)];
  const regions = benchmarkExplainRegions.map((region) => {
    const members = records.filter((record) => record.region.id === region.id);
    const oursOnly = members.filter((record) => record.category === 'ours_only');
    const pastOnly = members.filter((record) => record.category === 'past_only');
    const gainedExample = oursOnly.filter((record) => record.truth).sort((left, right) => right.delta - left.delta)[0];
    const movedExample = [...oursOnly].sort((left, right) => right.delta - left.delta)[0];
    const largestContrast = [...members].sort((left, right) => Math.abs(right.delta) - Math.abs(left.delta))[0];
    return {
      ...region,
      eligible: members.length,
      oursOnly: oursOnly.length,
      pastOnly: pastOnly.length,
      gainedHits: oursOnly.filter((record) => record.truth).length,
      lostHits: pastOnly.filter((record) => record.truth).length,
      meanDelta: members.reduce((sum, record) => sum + record.delta, 0) / Math.max(members.length, 1),
      representativeIndex: (gainedExample || movedExample || largestContrast)?.index
    };
  });
  return {
    pastHits: hitCount(pastTop),
    oursHits: hitCount(oursTop),
    reallocated: records.filter((record) => record.category === 'ours_only').length,
    apDelta: (oursMetric?.averagePrecision || 0) - (pastMetric?.averagePrecision || 0),
    regions
  };
}

function ensureSelectedExplainCell(records) {
  if (records.some((record) => record.index === selectedExplainCellIndex)) return selectedExplainCellIndex;
  const gainedHit = records
    .filter((record) => record.category === 'ours_only' && record.truth)
    .sort((left, right) => right.delta - left.delta)[0];
  const largestGain = records.sort((left, right) => right.delta - left.delta)[0];
  selectedExplainCellIndex = (gainedHit || largestGain)?.index ?? null;
  return selectedExplainCellIndex;
}

function physicsTraceMarkup(record) {
  if (!record) return '';
  const stages = [
    { label: 'Past literature proximity', model: 'Cook-2021', score: record.past, delta: null },
    { label: 'Local diffusion wave', model: 'Fisher–KPP', score: record.diffusion, delta: record.diffusionDelta },
    { label: 'Climate-modified wave · study physics variant', model: 'Climate RD · OURS', score: record.climate, delta: record.climateDelta },
    { label: 'Observation-guided fusion · primary model', model: 'OG-RDE · OURS', score: record.ours, delta: record.fusionDelta }
  ];
  const contrasts = [
    { key: 'local diffusion', value: record.diffusionDelta },
    { key: 'climate modification', value: record.climateDelta },
    { key: 'observation-guided fusion', value: record.fusionDelta }
  ].sort((left, right) => Math.abs(right.value) - Math.abs(left.value));
  const strongest = contrasts[0];
  return `<div class="physics-trace-head"><span>SELECTED 0.2° CELL</span><b>${record.region.short}</b></div>
    <div class="cell-coordinate">${benchmarkCellCenter(record.index)[1].toFixed(2)}°N · ${Math.abs(benchmarkCellCenter(record.index)[0]).toFixed(2)}°W <em>${record.truth ? `${benchmarkYear} FIRST REPORT` : 'NO TARGET-YEAR FIRST REPORT'}</em></div>
    <div class="physics-trace">${stages.map((stage, index) => `<div class="physics-step ${index === stages.length - 1 ? 'ours' : ''}">
      <div><span>${index + 1}</span><b>${stage.model}</b><em>${stage.delta === null ? 'starting rank' : signedRank(stage.delta)}</em></div>
      <small>${stage.label}</small><i style="--rank:${Math.max(2, stage.score * 100).toFixed(1)}%"><u></u></i><strong>${stage.score.toFixed(3)}</strong>
    </div>`).join('')}</div>
    <p class="trace-reading"><b>${signedRank(record.delta)} net rank shift.</b> The largest stepwise contrast here is ${strongest.key} (${signedRank(strongest.value)}).</p>
    <p class="trace-caveat">Diagnostic rank contrasts—not causal or SHAP attribution. Each step is a separately evaluated frozen model.</p>`;
}

function renderBenchmarkExplanation() {
  const container = $('#benchmark-explanation');
  const button = $('#explain-benchmark-inline');
  if (button) {
    button.classList.toggle('active', benchmarkExplainEnabled);
    button.setAttribute('aria-pressed', String(benchmarkExplainEnabled));
    button.querySelector('em').textContent = benchmarkExplainEnabled ? 'ON' : 'OFF';
  }
  if (!container) return;
  container.classList.toggle('hidden', !benchmarkExplainEnabled);
  if (!benchmarkExplainEnabled) return;
  const records = benchmarkExplanationRecords();
  const summary = benchmarkExplanationSummary(records);
  if (!summary) return;
  ensureSelectedExplainCell(records);
  const selected = records.find((record) => record.index === selectedExplainCellIndex);
  const maxMoves = Math.max(...summary.regions.flatMap((region) => [region.oursOnly, region.pastOnly]), 1);
  container.innerHTML = `<div class="result-comparison-head">
      <span><i class="past"></i><small>PAST LITERATURE</small><b>Cook-2021</b></span>
      <strong>→</strong>
      <span><i class="ours"></i><small>OURS · PRIMARY MODEL</small><b>OG-RDE</b></span>
    </div>
    <div class="result-kpis">
      <span><small>AP CHANGE</small><b>+${summary.apDelta.toFixed(3)}</b></span>
      <span><small>TOP-5% HITS</small><b>${summary.pastHits} → ${summary.oursHits}</b></span>
      <span><small>CELLS MOVED IN</small><b>${summary.reallocated}</b></span>
    </div>
    <div class="region-change-title"><span>WHERE PRIORITIES CHANGED</span><small>click a region · then a map cell</small></div>
    <div class="region-change-list">${summary.regions.map((region) => `<button type="button" data-explain-region="${region.id}" data-explain-cell="${region.representativeIndex}">
      <span><b>${region.name}</b><small>${region.gainedHits ? `+${region.gainedHits} newly captured reports` : 'no newly captured reports'}${region.lostHits ? ` · −${region.lostHits} lost` : ''}</small></span>
      <i><u class="gain" style="--move:${(region.oursOnly / maxMoves * 100).toFixed(1)}%"></u><u class="loss" style="--move:${(region.pastOnly / maxMoves * 100).toFixed(1)}%"></u></i>
      <em><b>+${region.oursOnly}</b><small>−${region.pastOnly}</small></em>
    </button>`).join('')}</div>
    <div id="physics-trace-card" class="physics-trace-card">${physicsTraceMarkup(selected)}</div>`;
  updateBenchmarkExplainSelection();
}

function updateBenchmarkExplainSelection() {
  if (map?.getLayer('lt-benchmark-explain-selection')) {
    map.setFilter('lt-benchmark-explain-selection', ['==', ['get', 'index'], selectedExplainCellIndex ?? -1]);
  }
}

function benchmarkRiskData() {
  const yearData = benchmarkYearData();
  if (!yearData || !selectedBenchmarkModelId) return { type: 'FeatureCollection', features: [] };
  const scores = yearData.scores[selectedBenchmarkModelId] || [];
  return {
    type: 'FeatureCollection',
    features: yearData.eligibleIndices.map((index) => geojsonFeature('Polygon', [benchmarkCellPolygon(index)], {
      risk: scores[index] || 0,
      modelId: selectedBenchmarkModelId
    }))
  };
}

function benchmarkAllocationData() {
  const yearData = benchmarkYearData();
  if (!yearData) return { type: 'FeatureCollection', features: [] };
  const modelIds = benchmarkComparisonEnabled ? benchmarkComparisonIds : [selectedBenchmarkModelId];
  return {
    type: 'FeatureCollection',
    features: modelIds.flatMap((modelId) => {
      const selected = modelId === selectedBenchmarkModelId;
      return [...benchmarkTopIndices(modelId, yearData)].map((index) => geojsonFeature('Polygon', [benchmarkCellPolygon(index)], {
        modelId,
        color: benchmarkColors[modelId] || '#d9f083',
        selected: selected ? 1 : 0
      }));
    })
  };
}

function benchmarkTruthData() {
  const yearData = benchmarkYearData();
  if (!yearData) return { type: 'FeatureCollection', features: [] };
  return {
    type: 'FeatureCollection',
    features: yearData.truthIndices.map((index) => geojsonFeature('Point', benchmarkCellCenter(index), { index, year: benchmarkYear, endpoint: 'first report' }))
  };
}

function physicsThreshold() {
  return .95 - physicsPhase * .7;
}

function physicsSurfaceData() {
  const yearData = benchmarkYearData();
  const scores = yearData?.scores?.[selectedBenchmarkModelId];
  if (!yearData || !scores) return { type: 'FeatureCollection', features: [] };
  return {
    type: 'FeatureCollection',
    features: yearData.eligibleIndices.map((index) => geojsonFeature('Polygon', [benchmarkCellPolygon(index)], {
      index,
      risk: scores[index] || 0,
      modelId: selectedBenchmarkModelId,
      year: benchmarkYear
    }))
  };
}

function physicsVectorData() {
  const yearData = benchmarkYearData();
  const grid = benchmarkBundle.metadata.grid;
  const scores = yearData?.scores?.[selectedBenchmarkModelId];
  if (!yearData || !grid || !scores) return { type: 'FeatureCollection', features: [] };
  const eligible = new Set(yearData.eligibleIndices);
  const samples = [];
  const scoreAt = (index, fallback) => eligible.has(index) ? (scores[index] || 0) : fallback;
  yearData.eligibleIndices.forEach((index) => {
    const row = Math.floor(index / grid.columns);
    const column = index % grid.columns;
    if (row % 3 !== 1 || column % 3 !== 1) return;
    const center = scores[index] || 0;
    const west = column > 0 ? scoreAt(index - 1, center) : center;
    const east = column < grid.columns - 1 ? scoreAt(index + 1, center) : center;
    const south = row > 0 ? scoreAt(index - grid.columns, center) : center;
    const north = row < grid.rows - 1 ? scoreAt(index + grid.columns, center) : center;
    const dx = (east - west) / 2;
    const dy = (north - south) / 2;
    const magnitude = Math.hypot(dx, dy);
    if (magnitude < .012) return;
    const angle = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;
    const arrows = ['→', '↗', '↑', '↖', '←', '↙', '↓', '↘'];
    samples.push({ index, magnitude, arrow: arrows[Math.round(angle / 45) % 8], risk: center });
  });
  const ceiling = Math.max(...samples.map((sample) => sample.magnitude), .001);
  return {
    type: 'FeatureCollection',
    features: samples.map((sample) => geojsonFeature('Point', benchmarkCellCenter(sample.index), {
      ...sample,
      strength: sample.magnitude / ceiling
    }))
  };
}

function renderPhysicsFrame() {
  if (!map || !physicsViewEnabled) return;
  const threshold = physicsThreshold();
  const activeColor = ['interpolate', ['linear'], ['get', 'risk'], 0, '#173a35', .35, '#286a62', .62, '#45b990', .82, '#a8e875', 1, '#f0f58a'];
  const fieldColor = ['case', ['>=', ['get', 'risk'], threshold], activeColor, 'rgba(12, 45, 39, .34)'];
  if (map.getLayer('lt-physics-field')) map.setPaintProperty('lt-physics-field', 'fill-color', fieldColor);
  if (map.getLayer('lt-physics-height')) map.setPaintProperty('lt-physics-height', 'fill-extrusion-color', fieldColor);
  if (map.getLayer('lt-physics-front')) map.setFilter('lt-physics-front', [
    'all', ['>=', ['get', 'risk'], Math.max(0, threshold - .022)], ['<=', ['get', 'risk'], Math.min(1, threshold + .022)]
  ]);
  const state = $('#physics-hud-state');
  if (state) state.textContent = `Growth-style sweep ${Math.round(physicsPhase * 100)}% · active threshold ≥ ${threshold.toFixed(2)} relative rank.`;
}

function startPhysicsAnimation() {
  cancelAnimationFrame(physicsAnimationFrame);
  renderPhysicsFrame();
  if (!physicsViewEnabled || !benchmarkActive() || !physicsAnimationPlaying || document.hidden || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const animate = (timestamp) => {
    if (!physicsViewEnabled || !benchmarkActive() || !physicsAnimationPlaying || document.hidden) return;
    if (!physicsAnimationLast) physicsAnimationLast = timestamp;
    if (timestamp - physicsAnimationLast >= 58) {
      physicsPhase = (physicsPhase + (timestamp - physicsAnimationLast) / 9000) % 1;
      physicsAnimationLast = timestamp;
      renderPhysicsFrame();
    }
    physicsAnimationFrame = requestAnimationFrame(animate);
  };
  physicsAnimationFrame = requestAnimationFrame(animate);
}

function renderPhysicsHUD() {
  const hud = $('#physics-hud');
  const toggle = $('#physics-view-inline');
  if (toggle) {
    toggle.classList.toggle('active', physicsViewEnabled);
    toggle.setAttribute('aria-pressed', String(physicsViewEnabled));
    toggle.querySelector('em').textContent = physicsViewEnabled ? 'ON' : 'OFF';
  }
  if (!hud) return;
  $('.app-shell')?.classList.toggle('physics-mode', physicsViewEnabled && benchmarkActive());
  hud.classList.toggle('hidden', !physicsViewEnabled || !benchmarkActive());
  const model = benchmarkModel();
  const profile = physicsProfiles[selectedBenchmarkModelId];
  const modelLabel = $('#physics-hud-model');
  if (modelLabel && model && profile) modelLabel.textContent = `${profile.short} · ${benchmarkYear}`;
  const options = $('#physics-model-options');
  if (options) options.innerHTML = physicsModelIds.map((modelId) => {
    const candidate = benchmarkModel(modelId);
    const active = modelId === selectedBenchmarkModelId;
    return `<button type="button" data-physics-model="${modelId}" class="${active ? 'active' : ''}" aria-pressed="${active}">${candidate?.name || modelId}</button>`;
  }).join('');
  $$('.physics-display-options button').forEach((button) => {
    const active = button.dataset.physicsDisplay === physicsDisplayMode;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  const play = $('#physics-play');
  if (play) {
    play.textContent = physicsAnimationPlaying ? 'Ⅱ' : '▶';
    play.setAttribute('aria-label', physicsAnimationPlaying ? 'Pause physics growth sweep' : 'Play physics growth sweep');
  }
  const mechanism = hud.querySelector('p');
  if (mechanism && profile) mechanism.innerHTML = `<b>${profile.terms}</b> · ${profile.mechanism}. Diagnostic rank field—not abundance, calibrated velocity, or a literal time forecast.`;
  renderPhysicsFrame();
}

function updatePhysicsMap() {
  map?.getSource('lt-physics-surface')?.setData(physicsSurfaceData());
  map?.getSource('lt-physics-vectors')?.setData(physicsVectorData());
  renderPhysicsFrame();
}

function setPhysicsDisplay(mode) {
  physicsDisplayMode = mode === 'field' ? 'field' : 'height';
  if (map) {
    const visible = physicsViewEnabled && benchmarkActive();
    if (map.getLayer('lt-physics-field')) map.setLayoutProperty('lt-physics-field', 'visibility', visible && physicsDisplayMode === 'field' ? 'visible' : 'none');
    if (map.getLayer('lt-physics-height')) map.setLayoutProperty('lt-physics-height', 'visibility', visible && physicsDisplayMode === 'height' ? 'visible' : 'none');
    map.easeTo({ pitch: physicsDisplayMode === 'height' && visible ? 43 : 0, bearing: physicsDisplayMode === 'height' && visible ? -8 : 0, duration: 500 });
  }
  renderPhysicsHUD();
}

function togglePhysicsView(force) {
  physicsViewEnabled = typeof force === 'boolean' ? force : !physicsViewEnabled;
  if (physicsViewEnabled) {
    benchmarkExplainEnabled = false;
    benchmarkComparisonEnabled = false;
    if (!physicsModelIds.includes(selectedBenchmarkModelId)) selectedBenchmarkModelId = 'og_rde';
    physicsAnimationPlaying = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    physicsAnimationLast = 0;
  } else {
    physicsAnimationPlaying = false;
    cancelAnimationFrame(physicsAnimationFrame);
  }
  renderBenchmarkLab();
  updatePhysicsMap();
  updateBenchmarkMap();
  setPhysicsDisplay(physicsDisplayMode);
  startPhysicsAnimation();
}

function updateBenchmarkMap() {
  if (!map?.getSource('lt-benchmark-risk')) return;
  map.getSource('lt-benchmark-risk').setData(benchmarkRiskData());
  map.getSource('lt-benchmark-allocation').setData(benchmarkAllocationData());
  map.getSource('lt-benchmark-truth').setData(benchmarkTruthData());
  map.getSource('lt-benchmark-explanation')?.setData(benchmarkExplanationData());
  updatePhysicsMap();
  const visible = benchmarkActive();
  const physicsVisible = visible && physicsViewEnabled;
  const regularVisible = visible && !benchmarkExplainEnabled && !physicsViewEnabled;
  const explainVisible = visible && benchmarkExplainEnabled && !physicsViewEnabled;
  ['lt-benchmark-risk-fill', 'lt-benchmark-risk-grid', 'lt-benchmark-allocation']
    .forEach((id) => { if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', regularVisible ? 'visible' : 'none'); });
  ['lt-benchmark-explain-fill', 'lt-benchmark-explain-grid', 'lt-benchmark-explain-selection']
    .forEach((id) => { if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', explainVisible ? 'visible' : 'none'); });
  if (map.getLayer('lt-benchmark-truth')) map.setLayoutProperty('lt-benchmark-truth', 'visibility', visible && !physicsVisible ? 'visible' : 'none');
  if (map.getLayer('lt-physics-field')) map.setLayoutProperty('lt-physics-field', 'visibility', physicsVisible && physicsDisplayMode === 'field' ? 'visible' : 'none');
  if (map.getLayer('lt-physics-height')) map.setLayoutProperty('lt-physics-height', 'visibility', physicsVisible && physicsDisplayMode === 'height' ? 'visible' : 'none');
  ['lt-physics-grid', 'lt-physics-front', 'lt-physics-vectors']
    .forEach((id) => { if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', physicsVisible ? 'visible' : 'none'); });
  updateBenchmarkExplainSelection();
  const normalLayerIds = [
    'lt-heatmap', 'lt-heatmap-preview', 'lt-uncertainty-fill', 'lt-uncertainty-line',
    'lt-interpolation-fill', 'lt-interpolation-line', 'lt-front-fill', 'lt-front-line', 'lt-front-glow',
    'lt-model-comparison-glow', 'lt-model-comparison-line', 'lt-corridor-glow', 'lt-corridors',
    'lt-corridor-arrows', 'lt-reports', 'lt-report-hit', 'lt-reports-preview', 'lt-sites'
  ];
  if (visible) {
    normalLayerIds.forEach((id) => { if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', 'none'); });
  } else {
    Object.entries(layers).forEach(([layer, enabled]) => setMapLayerVisibility(layer, enabled));
    updateModelComparison();
  }
  const status = $('#benchmark-status');
  if (status) status.classList.toggle('hidden', !visible);
  renderPhysicsHUD();
  if (physicsVisible) startPhysicsAnimation();
}

function renderBenchmarkLab() {
  const ranking = $('#benchmark-ranking');
  const detail = $('#benchmark-detail');
  const yearData = benchmarkYearData();
  if (!ranking || !detail) return;
  if (!yearData || !benchmarkBundle.models.length) {
    ranking.innerHTML = '<div class="asset-state"><b>Frozen benchmark unavailable</b><span>Run <code>npm run verify:release</code> or restore <code>generated/frozen-benchmark.js</code>.</span></div>';
    detail.innerHTML = '<p>The scientific evaluation view is disabled because its versioned data artifact did not load.</p>';
    return;
  }
  const ordered = [...benchmarkBundle.models].sort((left, right) =>
    right.metrics[String(benchmarkYear)].averagePrecision - left.metrics[String(benchmarkYear)].averagePrecision
  );
  ranking.innerHTML = ordered.map((model, index) => {
    const metric = model.metrics[String(benchmarkYear)];
    const ownership = benchmarkOwnership[model.id] || { label: 'COMPARATOR', className: 'baseline' };
    return `<button class="model-choice ${model.id === selectedBenchmarkModelId ? 'active' : ''}" data-benchmark-model-id="${model.id}" style="--active-model:${benchmarkColors[model.id] || '#78efb5'}" aria-pressed="${model.id === selectedBenchmarkModelId}">
      <span class="model-rank">#${index + 1}</span>
      <span class="model-name"><b>${model.name}</b><em class="model-owner ${ownership.className}">${ownership.label}</em><small>AP ${metric.averagePrecision.toFixed(3)} · R@5% ${metric.recallAt5Pct.toFixed(3)}</small></span>
      <span class="model-score"><strong>${metric.averagePrecision.toFixed(3)}</strong><small>AP</small></span>
    </button>`;
  }).join('');
  const selected = benchmarkModel();
  if (selected) {
    const metric = selected.metrics[String(benchmarkYear)];
    const difference = selected.ogRdeDifference;
    const comparison = difference
      ? `${difference.mean >= 0 ? '+' : ''}${difference.mean.toFixed(3)} vs OG-RDE within blocks (${difference.interval[0].toFixed(3)} to ${difference.interval[1].toFixed(3)})`
      : 'Reference model for paired within-block differences';
    const ownership = benchmarkOwnership[selected.id] || { label: 'COMPARATOR', detail: 'benchmark comparator' };
    detail.innerHTML = `<div class="model-detail-head"><span>SELECTED · ${ownership.label}</span><b>${benchmarkYear}</b></div>
      <h3>${selected.name}</h3>
      <p>${ownership.detail}. Relative first-report risk rank · coefficients and specification unchanged after 2023. ${comparison}.</p>
      <div class="benchmark-stat-grid">
        <span><b>${metric.averagePrecision.toFixed(3)}</b>annual AP</span>
        <span><b>${metric.recallAt5Pct.toFixed(3)}</b>R@5%</span>
        <span><b>${selected.blockAveragePrecision.toFixed(3)}</b>block AP<br>${selected.blockInterval[0].toFixed(3)}–${selected.blockInterval[1].toFixed(3)}</span>
      </div>`;
  }
  $$('.benchmark-year button').forEach((button) => {
    const selected = Number(button.dataset.benchmarkYear) === benchmarkYear;
    button.classList.toggle('active', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  renderBenchmarkExplanation();
  const compare = $('#compare-benchmark-inline');
  if (compare) {
    compare.classList.toggle('active', benchmarkComparisonEnabled);
    compare.setAttribute('aria-pressed', String(benchmarkComparisonEnabled));
    compare.querySelector('em').textContent = benchmarkComparisonEnabled ? 'ON' : 'OFF';
  }
  const mapKey = $('.map-key');
  if (mapKey) {
    if (physicsViewEnabled) {
      mapKey.innerHTML = `<span><i class="physics-surface"></i>relative-pressure surface</span><span><i class="physics-front"></i>animated threshold front</span><span><i class="physics-vector">↗</i>local score gradient</span>`;
    } else if (benchmarkExplainEnabled) {
      mapKey.innerHTML = `<span><i class="rank-up"></i>ours ranks higher</span><span><i class="rank-down"></i>past ranks higher</span><span><i class="allocation ours-only"></i>ours-only top 5%</span><span><i class="allocation past-only"></i>past-only top 5%</span><span><i class="truth"></i>first reports</span>`;
    } else {
      const allocationLabels = benchmarkComparisonEnabled
        ? benchmarkComparisonIds.map((id) => `<span><i class="allocation" style="border-color:${benchmarkColors[id]}"></i>${benchmarkModel(id)?.name || id}</span>`).join('')
        : '<span><i class="allocation"></i>selected top 5%</span>';
      mapKey.innerHTML = `<span><i class="risk"></i>relative rank</span>${allocationLabels}<span><i class="truth"></i>first reports</span>`;
    }
  }
  const selectedModel = benchmarkModel();
  const metric = selectedModel?.metrics?.[String(benchmarkYear)];
  const status = $('#benchmark-status');
  if (status && selectedModel && metric) {
    if (physicsViewEnabled) {
      const profile = physicsProfiles[selectedModel.id];
      status.innerHTML = `<b>Physics field view · ${benchmarkYear}</b>${selectedModel.name} · ${profile?.mechanism || 'model-derived relative-pressure surface'}<br><em>surface = frozen relative rank · arrows = local finite-difference gradient · animation is diagnostic, not elapsed time</em>`;
    } else if (benchmarkExplainEnabled) {
      const summary = benchmarkExplanationSummary();
      status.innerHTML = `<b>Past literature → OURS · ${benchmarkYear}</b>Cook-2021 → OG-RDE (OURS · PRIMARY) · AP ${signedRank(summary.apDelta)} · top-5% hits ${summary.pastHits} → ${summary.oursHits}<br><em>${summary.reallocated} cells moved into our allocation · click any grid cell for its physics trace</em>`;
    } else {
      status.innerHTML = `<b>Frozen first-report replay · ${benchmarkYear}</b>${selectedModel.name} · AP ${metric.averagePrecision.toFixed(3)} · R@5% ${metric.recallAt5Pct.toFixed(3)}<br><em>${yearData.truthIndices.length} first-report cells · relative rank, not occupancy probability</em>`;
    }
  }
  renderPhysicsHUD();
}

function selectBenchmarkModel(modelId) {
  if (!benchmarkModel(modelId)) return;
  benchmarkExplainEnabled = false;
  if (physicsViewEnabled && !physicsModelIds.includes(modelId)) {
    physicsViewEnabled = false;
    physicsAnimationPlaying = false;
    cancelAnimationFrame(physicsAnimationFrame);
    map?.easeTo({ pitch: 0, bearing: 0, duration: 400 });
  }
  selectedBenchmarkModelId = modelId;
  renderBenchmarkLab();
  updatePhysicsMap();
  updateBenchmarkMap();
}

function setBenchmarkYear(year) {
  if (!benchmarkBundle.years?.[String(year)]) return;
  benchmarkYear = Number(year);
  selectedExplainCellIndex = null;
  renderBenchmarkLab();
  updatePhysicsMap();
  updateBenchmarkMap();
}

function toggleBenchmarkExplanation(enabled = !benchmarkExplainEnabled) {
  benchmarkExplainEnabled = Boolean(enabled);
  if (benchmarkExplainEnabled) {
    physicsViewEnabled = false;
    physicsAnimationPlaying = false;
    cancelAnimationFrame(physicsAnimationFrame);
    map?.easeTo({ pitch: 0, bearing: 0, duration: 400 });
    selectedBenchmarkModelId = benchmarkExplainModels.ours;
    benchmarkComparisonEnabled = false;
    selectedExplainCellIndex = null;
  }
  renderBenchmarkLab();
  updateBenchmarkMap();
}

function selectExplainCell(index, { center = true } = {}) {
  const numericIndex = Number(index);
  const record = benchmarkExplanationRecords().find((candidate) => candidate.index === numericIndex);
  if (!record) return;
  selectedExplainCellIndex = numericIndex;
  renderBenchmarkExplanation();
  if (center && map) map.easeTo({ center: benchmarkCellCenter(numericIndex), zoom: Math.max(map.getZoom(), 6.25), duration: 500 });
}

function benchmarkMapPadding() {
  return { top: 72, right: 32, bottom: 82, left: window.innerWidth <= 1180 ? 452 : 472 };
}

function focusBenchmarkOverview() {
  if (!map || !benchmarkActive()) return;
  const grid = benchmarkBundle.metadata.grid;
  map.fitBounds([[grid.west, grid.south], [grid.east, grid.north]], {
    padding: benchmarkMapPadding(), duration: 650, maxZoom: 5.25
  });
}

function setLabMode(mode) {
  activeLabMode = mode === 'scenario' ? 'scenario' : 'benchmark';
  const benchmarkMode = activeLabMode === 'benchmark';
  if (benchmarkMode) {
    stopPlayback();
    snapshotIndex = latestObservedSnapshotIndex;
  }
  $('#benchmark-lab-panel')?.classList.toggle('hidden', !benchmarkMode);
  $('#scenario-lab-panel')?.classList.toggle('hidden', benchmarkMode);
  $('#benchmark-mode')?.classList.toggle('active', benchmarkMode);
  $('#scenario-mode')?.classList.toggle('active', !benchmarkMode);
  $('#benchmark-mode')?.setAttribute('aria-selected', String(benchmarkMode));
  $('#scenario-mode')?.setAttribute('aria-selected', String(!benchmarkMode));
  $('#benchmark-mode')?.setAttribute('tabindex', benchmarkMode ? '0' : '-1');
  $('#scenario-mode')?.setAttribute('tabindex', benchmarkMode ? '-1' : '0');
  $('.app-shell')?.classList.toggle('benchmark-mode', benchmarkActive());
  renderBenchmarkLab();
  renderModelLab();
  updateBenchmarkMap();
  syncForecastSettingsUI();
  updateSnapshot();
  startCorridorAnimation();
  updatePlaybackControls();
  if (benchmarkMode && activeSection === 'methods') focusBenchmarkOverview();
}

function sourceData() {
  return {
    front: { type: 'FeatureCollection', features: snapshots.map((snapshot, step) => snapshotGeometryFeature(snapshot, 'front', step)) },
    uncertainty: { type: 'FeatureCollection', features: snapshots.map((snapshot, step) => snapshotGeometryFeature(snapshot, 'uncertainty', step)) },
    interpolation: { type: 'FeatureCollection', features: snapshots.map((snapshot, step) => snapshotGeometryFeature(snapshot, 'interpolation', step)) },
    reports: reportData(),
    corridors: { type: 'FeatureCollection', features: transportCorridors.map((line, i) => geojsonFeature('LineString', line, { corridor: i + 1 })) },
    sites: { type: 'FeatureCollection', features: sentinelSites.map(([lng, lat, label]) => geojsonFeature('Point', [lng, lat], { label })) }
  };
}

function addMapLayers() {
  const data = sourceData();
  const observationFilter = ['<=', ['get', 'observedAt'], snapshotCutoff()];
  map.addSource('lt-front', { type: 'geojson', data: { type: 'FeatureCollection', features: [data.front.features[snapshotIndex]] } });
  map.addSource('lt-uncertainty', { type: 'geojson', data: { type: 'FeatureCollection', features: [data.uncertainty.features[snapshotIndex]] } });
  map.addSource('lt-interpolation', { type: 'geojson', data: { type: 'FeatureCollection', features: [data.interpolation.features[snapshotIndex]] } });
  map.addSource('lt-model-comparison', { type: 'geojson', data: modelComparisonData() });
  map.addSource('lt-reports', { type: 'geojson', data: data.reports });
  map.addSource('lt-reports-preview', { type: 'geojson', data: reportData(previewObservationPoints) });
  map.addSource('lt-corridors', { type: 'geojson', data: data.corridors });
  map.addSource('lt-corridor-flow', { type: 'geojson', data: corridorFlowData() });
  map.addSource('lt-sites', { type: 'geojson', data: data.sites });
  map.addSource('lt-benchmark-risk', { type: 'geojson', data: benchmarkRiskData() });
  map.addSource('lt-benchmark-allocation', { type: 'geojson', data: benchmarkAllocationData() });
  map.addSource('lt-benchmark-explanation', { type: 'geojson', data: benchmarkExplanationData() });
  map.addSource('lt-benchmark-truth', { type: 'geojson', data: benchmarkTruthData() });
  map.addSource('lt-physics-surface', { type: 'geojson', data: physicsSurfaceData() });
  map.addSource('lt-physics-vectors', { type: 'geojson', data: physicsVectorData() });

  map.addLayer({ id: 'lt-heatmap', type: 'heatmap', source: 'lt-reports', maxzoom: 6.5, filter: observationFilter, paint: {
    'heatmap-weight': ['interpolate', ['linear'], ['zoom'], 0, 0.5, 8, 1.4],
    'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 0.2, 8, 0.66],
    'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 2, 7, 6, 12, 10, 19],
    'heatmap-opacity': 0.38,
    'heatmap-color': ['interpolate', ['linear'], ['heatmap-density'], 0, 'rgba(9, 41, 43, 0)', 0.12, 'rgba(20, 112, 102, .18)', 0.32, 'rgba(32, 169, 125, .34)', 0.58, 'rgba(81, 211, 148, .48)', 0.82, 'rgba(171, 237, 116, .58)', 1, 'rgba(210, 247, 151, .68)']
  } });
  map.addLayer({ id: 'lt-heatmap-preview', type: 'heatmap', source: 'lt-reports-preview', maxzoom: 6.5, filter: observationFilter, layout: { visibility: 'none' }, paint: {
    'heatmap-weight': ['interpolate', ['linear'], ['zoom'], 0, 0.5, 8, 1.4],
    'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 0.32, 8, 0.9],
    'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 2, 7, 6, 12, 10, 19],
    'heatmap-opacity': 0.42,
    'heatmap-color': ['interpolate', ['linear'], ['heatmap-density'], 0, 'rgba(9, 41, 43, 0)', 0.12, 'rgba(20, 112, 102, .18)', 0.32, 'rgba(32, 169, 125, .34)', 0.58, 'rgba(81, 211, 148, .48)', 0.82, 'rgba(171, 237, 116, .58)', 1, 'rgba(210, 247, 151, .68)']
  } });
  map.addLayer({ id: 'lt-physics-field', type: 'fill', source: 'lt-physics-surface', layout: { visibility: 'none' }, paint: {
    'fill-color': '#286a62', 'fill-opacity': .82
  } });
  map.addLayer({ id: 'lt-physics-height', type: 'fill-extrusion', source: 'lt-physics-surface', layout: { visibility: 'none' }, paint: {
    'fill-extrusion-base': 0,
    'fill-extrusion-height': ['interpolate', ['linear'], ['get', 'risk'], 0, 0, .2, 3500, .5, 18000, .75, 42000, 1, 76000],
    'fill-extrusion-color': '#286a62',
    'fill-extrusion-opacity': .78,
    'fill-extrusion-vertical-gradient': true
  } });
  map.addLayer({ id: 'lt-physics-grid', type: 'line', source: 'lt-physics-surface', layout: { visibility: 'none' }, paint: {
    'line-color': '#74d6ae', 'line-width': .38, 'line-opacity': .28
  } });
  map.addLayer({ id: 'lt-physics-front', type: 'line', source: 'lt-physics-surface', filter: ['==', ['get', 'index'], -1], layout: { visibility: 'none' }, paint: {
    'line-color': '#f2ef83', 'line-width': ['interpolate', ['linear'], ['zoom'], 3, 1.2, 7, 2.6], 'line-opacity': .96, 'line-blur': .2
  } });
  map.addLayer({ id: 'lt-physics-vectors', type: 'symbol', source: 'lt-physics-vectors', layout: {
    visibility: 'none', 'text-field': ['get', 'arrow'], 'text-size': ['interpolate', ['linear'], ['get', 'strength'], 0, 10, 1, 20],
    'text-allow-overlap': true, 'text-ignore-placement': true
  }, paint: {
    'text-color': ['interpolate', ['linear'], ['get', 'risk'], 0, '#84c9b0', .65, '#d8f58e', 1, '#fff5a8'],
    'text-halo-color': '#08231b', 'text-halo-width': 1.4, 'text-opacity': ['interpolate', ['linear'], ['get', 'strength'], 0, .3, 1, 1]
  } });
  map.addLayer({ id: 'lt-benchmark-risk-fill', type: 'fill', source: 'lt-benchmark-risk', layout: { visibility: 'none' }, paint: {
    'fill-color': ['interpolate', ['linear'], ['get', 'risk'], 0, 'rgba(4, 28, 22, 0)', .35, 'rgba(24, 112, 91, .12)', .7, 'rgba(73, 195, 139, .38)', 1, 'rgba(210, 247, 129, .72)'],
    'fill-opacity': .82
  } });
  map.addLayer({ id: 'lt-benchmark-risk-grid', type: 'line', source: 'lt-benchmark-risk', layout: { visibility: 'none' }, paint: { 'line-color': '#77b79e', 'line-width': .35, 'line-opacity': .22 } });
  map.addLayer({ id: 'lt-benchmark-allocation', type: 'line', source: 'lt-benchmark-allocation', layout: { visibility: 'none' }, paint: {
    'line-color': ['get', 'color'],
    'line-width': ['case', ['==', ['get', 'selected'], 1], 2.5, 1.4],
    'line-opacity': ['case', ['==', ['get', 'selected'], 1], .98, .76]
  } });
  map.addLayer({ id: 'lt-benchmark-explain-fill', type: 'fill', source: 'lt-benchmark-explanation', layout: { visibility: 'none' }, paint: {
    'fill-color': ['interpolate', ['linear'], ['get', 'delta'], -.65, '#b57be8', -.05, '#5c5875', 0, '#163a30', .05, '#397f6a', .65, '#52edb6'],
    'fill-opacity': ['interpolate', ['linear'], ['get', 'magnitude'], 0, .06, .04, .16, .16, .46, .45, .78]
  } });
  map.addLayer({ id: 'lt-benchmark-explain-grid', type: 'line', source: 'lt-benchmark-explanation', layout: { visibility: 'none' }, paint: {
    'line-color': ['match', ['get', 'category'], 'ours_only', '#74f4c2', 'past_only', '#d89bf4', 'both', '#e7d86e', '#638979'],
    'line-width': ['match', ['get', 'category'], 'ours_only', 2.3, 'past_only', 2.3, 'both', 1.2, .25],
    'line-opacity': ['match', ['get', 'category'], 'ours_only', .98, 'past_only', .98, 'both', .72, .22]
  } });
  map.addLayer({ id: 'lt-benchmark-explain-selection', type: 'line', source: 'lt-benchmark-explanation', filter: ['==', ['get', 'index'], -1], layout: { visibility: 'none' }, paint: {
    'line-color': '#ffffff', 'line-width': 3.5, 'line-opacity': 1, 'line-blur': .15
  } });
  map.addLayer({ id: 'lt-benchmark-truth', type: 'circle', source: 'lt-benchmark-truth', layout: { visibility: 'none' }, paint: {
    'circle-color': 'rgba(4, 18, 14, .12)', 'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 3.5, 7, 7],
    'circle-stroke-color': '#ff907d', 'circle-stroke-width': 2, 'circle-opacity': .98
  } });
  map.addLayer({ id: 'lt-uncertainty-fill', type: 'fill', source: 'lt-uncertainty', paint: { 'fill-color': '#2e8f78', 'fill-opacity': 0.22, 'fill-outline-color': '#69dcae' } });
  map.addLayer({ id: 'lt-uncertainty-line', type: 'line', source: 'lt-uncertainty', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#64d9ab', 'line-width': 2, 'line-opacity': 0.58, 'line-blur': 0.25 } });
  map.addLayer({ id: 'lt-interpolation-fill', type: 'fill', source: 'lt-interpolation', paint: { 'fill-color': '#69b8cf', 'fill-opacity': 0.075 } });
  map.addLayer({ id: 'lt-interpolation-line', type: 'line', source: 'lt-interpolation', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#7bc6d8', 'line-width': 1.25, 'line-opacity': 0.52, 'line-dasharray': [2, 2] } });
  map.addLayer({ id: 'lt-front-fill', type: 'fill', source: 'lt-front', paint: { 'fill-color': '#229b77', 'fill-opacity': 0.2 } });
  map.addLayer({ id: 'lt-front-line', type: 'line', source: 'lt-front', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#79efb4', 'line-width': 3, 'line-opacity': 0.9, 'line-blur': 0.12 } });
  map.addLayer({ id: 'lt-front-glow', type: 'line', source: 'lt-front', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#3be0a0', 'line-width': 7, 'line-opacity': 0.05, 'line-blur': 4 } });
  map.addLayer({ id: 'lt-model-comparison-glow', type: 'line', source: 'lt-model-comparison', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': ['get', 'color'], 'line-width': ['case', ['==', ['get', 'selected'], 1], 7, 4], 'line-opacity': 0.08, 'line-blur': 3 } });
  map.addLayer({ id: 'lt-model-comparison-line', type: 'line', source: 'lt-model-comparison', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': ['get', 'color'], 'line-width': ['case', ['==', ['get', 'selected'], 1], 3.2, 1.8], 'line-opacity': ['case', ['==', ['get', 'selected'], 1], 0.98, 0.74] } });
  map.addLayer({ id: 'lt-corridor-glow', type: 'line', source: 'lt-corridors', paint: { 'line-color': '#b6de6c', 'line-width': ['interpolate', ['linear'], ['zoom'], 2, 8, 7, 12], 'line-opacity': 0.1, 'line-blur': 5 } });
  map.addLayer({ id: 'lt-corridors', type: 'line', source: 'lt-corridors', paint: { 'line-color': '#b7df77', 'line-width': ['interpolate', ['linear'], ['zoom'], 2, 1.3, 7, 2.6], 'line-opacity': 0.7 } });
  map.addLayer({ id: 'lt-corridor-arrows', type: 'symbol', source: 'lt-corridor-flow', layout: { 'text-field': ['get', 'arrow'], 'text-size': ['interpolate', ['linear'], ['zoom'], 2, 11, 7, 16], 'text-allow-overlap': true, 'text-ignore-placement': true }, paint: { 'text-color': '#d9f280', 'text-halo-color': '#173926', 'text-halo-width': 1.1, 'text-opacity': 0.92 } });
  map.addLayer({ id: 'lt-reports', type: 'circle', source: 'lt-reports', minzoom: 5.5, filter: observationFilter, paint: { 'circle-color': '#74d7ad', 'circle-radius': ['interpolate', ['linear'], ['zoom'], 5.5, 1.5, 8, 2.6, 11, 4.4], 'circle-stroke-color': '#bdebd2', 'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 5.5, 0.35, 9, 0.7], 'circle-opacity': ['interpolate', ['linear'], ['zoom'], 5.5, 0.48, 9, 0.72, 11, 0.84] } });
  map.addLayer({ id: 'lt-report-hit', type: 'circle', source: 'lt-reports', minzoom: 5.5, filter: observationFilter, paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 5.5, 6, 8, 8, 11, 11], 'circle-opacity': 0.01, 'circle-color': '#ffffff' } });
  map.addLayer({ id: 'lt-reports-preview', type: 'circle', source: 'lt-reports-preview', filter: observationFilter, layout: { visibility: 'none' }, paint: { 'circle-color': '#9be7c5', 'circle-radius': ['interpolate', ['linear'], ['zoom'], 2, 0.65, 4.75, 1.2, 8, 3, 11, 4.8], 'circle-stroke-color': '#d0f4e1', 'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 2, 0, 4.75, 0.25, 8, 0.55], 'circle-opacity': ['interpolate', ['linear'], ['zoom'], 2, 0.34, 4.75, 0.62, 8, 0.8] } });
  map.addLayer({ id: 'lt-sites', type: 'circle', source: 'lt-sites', paint: { 'circle-color': '#c8ff79', 'circle-radius': 6, 'circle-stroke-color': '#e8ffd2', 'circle-stroke-width': 1.5, 'circle-opacity': 0.9 } });

  map.on('click', 'lt-benchmark-explain-fill', (event) => {
    if (!benchmarkExplainEnabled || !event.features?.length) return;
    selectExplainCell(event.features[0].properties.index, { center: false });
  });
  map.on('mouseenter', 'lt-benchmark-explain-fill', () => {
    if (benchmarkExplainEnabled) map.getCanvas().style.cursor = 'crosshair';
  });
  map.on('mouseleave', 'lt-benchmark-explain-fill', () => { map.getCanvas().style.cursor = ''; });

  map.on('click', 'lt-report-hit', async (event) => {
    const feature = event.features[0];
    const properties = feature.properties;
    const popup = document.createElement('div');
    popup.className = 'report-popup';

    const kicker = document.createElement('span');
    kicker.className = 'report-kicker';
    kicker.textContent = 'PUBLIC OCCURRENCE REPORT';
    const title = document.createElement('b');
    title.textContent = [properties.locality, properties.state].filter(Boolean).join(', ') || properties.state || 'Mapped occurrence';
    popup.append(kicker, title);

    const mediaFrame = document.createElement('div');
    mediaFrame.className = 'report-media loading';
    mediaFrame.textContent = 'Loading observation image…';
    popup.append(mediaFrame);

    const rows = [
      ['Observed', properties.date || 'Date unavailable'],
      ['Record type', String(properties.basis || 'occurrence').replaceAll('_', ' ').toLowerCase()],
      ['Coordinates', `${feature.geometry.coordinates[1].toFixed(5)}, ${feature.geometry.coordinates[0].toFixed(5)}`],
      ['GBIF ID', properties.key]
    ];
    const details = document.createElement('div');
    details.className = 'report-details';
    rows.forEach(([label, value]) => {
      const row = document.createElement('div');
      const term = document.createElement('span');
      const description = document.createElement('strong');
      term.textContent = label;
      description.textContent = value;
      row.append(term, description);
      details.append(row);
    });
    popup.append(details);

    const actions = document.createElement('div');
    actions.className = 'report-actions';
    const gbifLink = document.createElement('a');
    gbifLink.href = `https://www.gbif.org/occurrence/${properties.key}`;
    gbifLink.target = '_blank';
    gbifLink.rel = 'noopener noreferrer';
    gbifLink.textContent = 'VIEW GBIF RECORD ↗';
    actions.append(gbifLink);
    if (/^https?:\/\//.test(properties.occurrenceID || '')) {
      const originalLink = document.createElement('a');
      originalLink.href = properties.occurrenceID;
      originalLink.target = '_blank';
      originalLink.rel = 'noopener noreferrer';
      originalLink.textContent = 'ORIGINAL REPORT ↗';
      actions.append(originalLink);
    }
    popup.append(actions);
    new maplibregl.Popup({ closeButton: true, offset: 12, className: 'lt-popup', maxWidth: '410px' }).setLngLat(feature.geometry.coordinates).setDOMContent(popup).addTo(map);

    try {
      const response = await fetch(`https://api.gbif.org/v1/occurrence/${properties.key}`);
      if (!response.ok) throw new Error(`GBIF media request failed: ${response.status}`);
      const record = await response.json();
      const photo = (record.media || []).find((item) => item.type === 'StillImage' && /^https?:\/\//.test(item.identifier || ''));
      if (!photo) {
        mediaFrame.className = 'report-media empty';
        mediaFrame.textContent = 'No public image is attached to this report.';
      } else {
        const imageLink = document.createElement('a');
        imageLink.href = /^https?:\/\//.test(photo.references || '') ? photo.references : photo.identifier;
        imageLink.target = '_blank';
        imageLink.rel = 'noopener noreferrer';
        const image = document.createElement('img');
        image.src = photo.identifier.replace('/original.', '/medium.');
        image.alt = `Observation image for ${title.textContent}`;
        image.loading = 'lazy';
        imageLink.append(image);
        const credit = document.createElement('span');
        const license = String(photo.license || '').includes('by-nc') ? 'CC BY-NC'
          : String(photo.license || '').includes('/by/') ? 'CC BY'
            : String(photo.license || '').includes('zero') ? 'CC0'
              : 'source license';
        credit.textContent = [photo.creator ? `Photo: ${photo.creator}` : '', license].filter(Boolean).join(' · ');
        mediaFrame.className = 'report-media has-image';
        mediaFrame.replaceChildren(imageLink, credit);
      }
    } catch (error) {
      mediaFrame.className = 'report-media empty';
      mediaFrame.textContent = 'Image unavailable. Open the source report to view its media.';
    }
  });
  map.on('mouseenter', 'lt-report-hit', () => { map.getCanvas().style.cursor = 'pointer'; });
  map.on('mouseleave', 'lt-report-hit', () => { map.getCanvas().style.cursor = ''; });
}

function setMapLayerVisibility(layer, visible) {
  const ids = { heatmap: [usingReportPreview ? 'lt-heatmap-preview' : 'lt-heatmap'], reports: [usingReportPreview ? 'lt-reports-preview' : 'lt-reports', ...(usingReportPreview ? [] : ['lt-report-hit'])], front: ['lt-front-fill', 'lt-front-line', 'lt-front-glow'], interpolation: ['lt-interpolation-fill', 'lt-interpolation-line'], uncertainty: ['lt-uncertainty-fill', 'lt-uncertainty-line'], corridors: ['lt-corridor-glow', 'lt-corridors', 'lt-corridor-arrows'], sites: ['lt-sites'] };
  if (layer === 'heatmap') [usingReportPreview ? 'lt-heatmap' : 'lt-heatmap-preview'].forEach((id) => { if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', 'none'); });
  if (layer === 'reports') [usingReportPreview ? 'lt-reports' : 'lt-reports-preview', 'lt-report-hit'].forEach((id) => { if (map.getLayer(id) && !ids.reports.includes(id)) map.setLayoutProperty(id, 'visibility', 'none'); });
  (ids[layer] || []).forEach((id) => { if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none'); });
}

function setReportPreviewMode(active) {
  if (usingReportPreview === active || !map?.getLayer('lt-reports-preview')) return;
  usingReportPreview = active;
  setMapLayerVisibility('heatmap', layers.heatmap);
  setMapLayerVisibility('reports', layers.reports);
}

function ensureTimelineOverview() {
  if (!map || map.getZoom() <= timelineOverviewZoom) return;
  map.jumpTo({ zoom: timelineOverviewZoom });
}

function syncLayerControls() {
  $$('[data-layer]').forEach((control) => {
    if (control.tagName === 'BUTTON') {
      control.classList.toggle('on', Boolean(layers[control.dataset.layer]));
      control.setAttribute('aria-pressed', String(Boolean(layers[control.dataset.layer])));
    }
    if (control.tagName === 'INPUT') control.checked = Boolean(layers[control.dataset.layer]);
  });
  const activeCount = Object.values(layers).filter(Boolean).length;
  const count = $('.layer-control b');
  if (count) count.textContent = activeCount;
}

function updateSnapshot({ deferReports = false, previewReports = false } = {}) {
  const snapshot = snapshots[snapshotIndex];
  const reportCount = reportCountAt(snapshotCutoff(snapshot));
  $('#timeline-year').textContent = snapshot.period || snapshot.year;
  $('#timeline-phase').textContent = snapshot.isProjection ? 'prospective step' : 'evidence step';
  $('#snapshot-label').textContent = snapshot.label.toUpperCase();
  $('#leading-edge').textContent = snapshot.leadingEdge;
  $('#metric-cells').textContent = snapshot.cells;
  $('#metric-confidence').textContent = 'NOT CALIBRATED';
  $('#metric-reports').textContent = reportCount.toLocaleString();
  $('#timeline').value = snapshotIndex;
  $('#timeline-progress').style.width = `${(snapshotIndex / Math.max(timelineMaxIndex(), 1)) * 100}%`;
  updatePlaybackControls();
  if (map && map.getSource('lt-front') && benchmarkActive()) {
    updateBenchmarkMap();
  } else if (map && map.getSource('lt-front')) {
    map.getSource('lt-front').setData({ type: 'FeatureCollection', features: [snapshotGeometryFeature(snapshot, 'front')] });
    map.getSource('lt-uncertainty').setData({ type: 'FeatureCollection', features: [snapshotGeometryFeature(snapshot, 'uncertainty')] });
    map.getSource('lt-interpolation').setData({ type: 'FeatureCollection', features: [snapshotGeometryFeature(snapshot, 'interpolation')] });
    const evidenceInModelLab = !snapshot.isProjection && activeSection === 'methods';
    const activeColor = snapshot.isProjection ? modelColor(selectedModelId) : evidenceInModelLab ? '#a8c6b6' : '#79efb4';
    map.setPaintProperty('lt-front-line', 'line-color', activeColor);
    map.setPaintProperty('lt-front-line', 'line-width', evidenceInModelLab ? 1.4 : 3);
    map.setPaintProperty('lt-front-line', 'line-opacity', evidenceInModelLab ? 0.58 : 0.9);
    map.setPaintProperty('lt-front-fill', 'fill-color', activeColor);
    map.setPaintProperty('lt-front-fill', 'fill-opacity', evidenceInModelLab ? 0.1 : 0.2);
    map.setPaintProperty('lt-front-glow', 'line-color', activeColor);
    map.setPaintProperty('lt-uncertainty-line', 'line-color', activeColor);
    map.setPaintProperty('lt-uncertainty-fill', 'fill-color', activeColor);
    updateModelComparison();
    const usePreview = playing || previewReports || isTimelineScrubbing;
    if (!deferReports && (usePreview || !playing || lastReportStep < 0)) {
      const reportFilter = ['<=', ['get', 'observedAt'], snapshotCutoff(snapshot)];
      const targetIds = usePreview ? ['lt-heatmap-preview', 'lt-reports-preview'] : ['lt-heatmap', 'lt-reports', 'lt-report-hit'];
      targetIds.forEach((id) => { if (map.getLayer(id)) map.setFilter(id, reportFilter); });
      lastReportStep = snapshotIndex;
    }
  }
}

function renderModelLab() {
  const ranking = $('#model-ranking');
  const detail = $('#model-detail');
  if (!ranking || !detail || !modelBundle.topFive?.length) return;
  const topFive = modelBundle.topFive.map((id) => modelBundle.variants.find((variant) => variant.id === id)).filter(Boolean);
  ranking.innerHTML = topFive.map((variant, index) => `
    <button class="model-choice ${variant.id === selectedModelId ? 'active' : ''}" data-model-id="${variant.id}" style="--active-model:${modelColors[index]}">
      <span class="model-rank"><i style="--model-color:${modelColors[index]}"></i></span><span class="model-name"><b>${variant.id} · ${variant.name}</b><small>assimilating display contour · legacy score omitted</small></span>
    </button>`).join('');
  const selected = selectedModelRanking();
  if (selected) {
    const features = selected.features.length ? selected.features : ['diffusion'];
    detail.innerHTML = `<div class="model-detail-head"><span>ACTIVE DISPLAY VARIANT</span><b>${selected.id}</b></div><h3>${selected.name}</h3><p>Monthly evidence-assimilating scenario · not a frozen forecast benchmark</p><div class="model-feature-list">${features.map((feature) => `<em>${feature}</em>`).join('')}<em>display contour τ ${selected.threshold.toFixed(2)}</em><em>composite not calibrated</em></div>`;
  }
  const learned = modelBundle.variants.filter((variant) => variant.features.includes('learned')).sort((a, b) => a.rank - b.rank)[0];
  const learnedBaseline = modelBundle.variants.find((variant) => variant.id === 'D14');
  const learnedNote = $('#learned-model-note');
  if (learned && learnedNote) {
    learnedNote.innerHTML = `<span>LEARNED DISPLAY VARIANT</span><b>${learned.id} · ${learned.name}</b><small>Neural residual constrained to the diffusion front · exploratory playback only</small>`;
  }
  const compareButton = $('#compare-models-inline');
  if (compareButton) {
    compareButton.classList.toggle('active', forecastSettings.comparisonEnabled);
    compareButton.setAttribute('aria-pressed', String(forecastSettings.comparisonEnabled));
    const stateLabel = compareButton.querySelector('em');
    if (stateLabel) stateLabel.textContent = forecastSettings.comparisonEnabled ? 'ON' : 'OFF';
  }
  const legend = $('#model-comparison-legend');
  const activeSnapshot = snapshots[snapshotIndex];
  const phase = activeSnapshot?.isProjection ? 'FORECAST' : 'BACKCAST + REPORTS';
  if (legend) legend.innerHTML = `<div><span>${phase}</span><b>${activeSnapshot?.period || 'model frame'}</b></div>${topFive.map((variant, index) => `<button data-model-id="${variant.id}" class="${variant.id === selectedModelId ? 'active' : ''}"><i style="--model-color:${modelColors[index]}"></i><span><b>${variant.id}</b><small>display variant</small></span></button>`).join('')}`;
}

function selectDiffusionModel(modelId) {
  if (!modelBundle.models?.[modelId]) return;
  selectedModelId = modelId;
  applySelectedProjectionModel();
  renderModelLab();
  updateSnapshot();
  map?.easeTo({ center: [-75.2, 41.4], zoom: 4.3, duration: 650 });
}

function syncForecastSettingsUI() {
  $('.app-shell').classList.toggle('projections-enabled', forecastSettings.projectionsEnabled);
  $('.app-shell').classList.toggle('comparison-enabled', forecastSettings.comparisonEnabled);
  const projections = $('#setting-projections');
  const comparison = $('#setting-comparison');
  const uncertainty = $('#setting-uncertainty');
  if (projections) projections.checked = forecastSettings.projectionsEnabled;
  if (comparison) comparison.checked = forecastSettings.comparisonEnabled;
  if (uncertainty) uncertainty.disabled = !forecastSettings.projectionsEnabled;
  const scenarioControlsDisabled = benchmarkActive();
  if (projections) projections.disabled = scenarioControlsDisabled;
  if (comparison) comparison.disabled = scenarioControlsDisabled;
  renderTimelineTicks();
  renderModelLab();
  updateModelComparison();
}

function setProjectionEnabled(enabled) {
  forecastSettings.projectionsEnabled = Boolean(enabled);
  if (!forecastSettings.projectionsEnabled) {
    if (snapshotIndex > latestObservedSnapshotIndex) snapshotIndex = latestObservedSnapshotIndex;
    layers.uncertainty = false;
    setMapLayerVisibility('uncertainty', false);
    syncLayerControls();
  }
  syncForecastSettingsUI();
  updateSnapshot();
}

function setComparisonEnabled(enabled) {
  forecastSettings.comparisonEnabled = Boolean(enabled);
  syncForecastSettingsUI();
  updateSnapshot();
  if (forecastSettings.comparisonEnabled) map?.easeTo({ center: [-75.2, 41.4], zoom: 4.3, duration: 650 });
}

function toggleSettingsPanel(force) {
  const panel = $('#settings-panel');
  const shouldOpen = typeof force === 'boolean' ? force : panel.classList.contains('hidden');
  panel.classList.toggle('hidden', !shouldOpen);
  $('#settings-toggle').setAttribute('aria-expanded', String(shouldOpen));
  if (shouldOpen) {
    settingsReturnFocus = document.activeElement;
    panel.focus();
  } else if (settingsReturnFocus instanceof HTMLElement) {
    settingsReturnFocus.focus();
    settingsReturnFocus = null;
  }
}

function initMap() {
  map = new maplibregl.Map({ container: 'map', style: 'https://tiles.openfreemap.org/styles/dark', center: [-75.5, 40.7], zoom: 4.1, maxZoom: 15, minZoom: 1.6, attributionControl: false, dragRotate: false });
  map.on('styleimagemissing', ({ id }) => {
    if (!id.startsWith('circle-') || map.hasImage(id)) return;
    const size = 32;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    context.beginPath();
    context.arc(size / 2, size / 2, 10, 0, Math.PI * 2);
    context.fillStyle = '#9fb5c9';
    context.fill();
    context.strokeStyle = '#d9e8f1';
    context.lineWidth = 2;
    context.stroke();
    map.addImage(id, { width: size, height: size, data: context.getImageData(0, 0, size, size).data });
  });
  map.on('load', () => {
    if (mapLayersAdded) return;
    mapLayersAdded = true;
    map.setProjection({ type: 'globe' });
    map.jumpTo({ center: [-75.5, 40.7], zoom: 4.1 });
    tintBaseMapDarkGreen();
    updateGlobeAtmosphere();
    addMapLayers();
    startCorridorAnimation();
    Object.entries(layers).forEach(([layer, visible]) => setMapLayerVisibility(layer, visible));
    syncLayerControls();
    renderTimelineTicks();
    updateSnapshot();
    renderBenchmarkLab();
    updateBenchmarkMap();
    if (physicsEmbedMode) {
      const grid = benchmarkBundle.metadata.grid;
      map.fitBounds([[grid.west, grid.south], [grid.east, grid.north]], { padding: 22, duration: 0, maxZoom: 5.2 });
      map.jumpTo({ pitch: 43, bearing: -8 });
      startPhysicsAnimation();
    }
    $('#map-state')?.classList.add('hidden');
  });
  map.on('error', () => {
    const state = $('#map-state');
    if (!mapLayersAdded && state) {
      state.classList.remove('hidden');
      state.innerHTML = '<b>Basemap unavailable</b><span>Check the network connection, then restart. Scientific data remain unchanged.</span>';
    }
  });
  map.on('resize', updateGlobeAtmosphere);
  map.on('zoom', updateGlobeAtmosphere);
  map.on('zoomend', () => {
    if ((playing || isTimelineScrubbing) && map.getZoom() > timelineOverviewZoom) ensureTimelineOverview();
  });
}

function tintBaseMapDarkGreen() {
  const styleLayers = map.getStyle().layers || [];
  styleLayers.forEach((layer) => {
    const sourceLayer = layer['source-layer'] || '';
    if (layer.type === 'background') {
      map.setPaintProperty(layer.id, 'background-color', '#04110b');
      return;
    }
    if (layer.type === 'fill') {
      const color = sourceLayer === 'water' ? '#061712'
        : sourceLayer === 'landcover' ? '#0b2117'
          : sourceLayer === 'landuse' ? '#0a1e15'
            : sourceLayer === 'building' ? '#0d241b'
              : '#081a12';
      if (map.getPaintProperty(layer.id, 'fill-color') !== undefined) map.setPaintProperty(layer.id, 'fill-color', color);
      if (map.getPaintProperty(layer.id, 'fill-outline-color') !== undefined) map.setPaintProperty(layer.id, 'fill-outline-color', '#173c2b');
      return;
    }
    if (layer.type === 'line') {
      const color = sourceLayer === 'boundary' ? '#285642'
        : sourceLayer === 'waterway' ? '#12372c'
          : '#193629';
      if (map.getPaintProperty(layer.id, 'line-color') !== undefined) map.setPaintProperty(layer.id, 'line-color', color);
      return;
    }
    if (layer.type === 'symbol') {
      if (map.getPaintProperty(layer.id, 'text-color') !== undefined) map.setPaintProperty(layer.id, 'text-color', '#769786');
      if (map.getPaintProperty(layer.id, 'text-halo-color') !== undefined) map.setPaintProperty(layer.id, 'text-halo-color', '#06110c');
    }
  });
}

function updateGlobeAtmosphere() {
  if (!map) return;
  const stage = $('.map-stage');
  const width = stage.clientWidth;
  const height = stage.clientHeight;
  const globeDiameter = (512 * (2 ** map.getZoom())) / Math.PI;
  const contourFit = width / globeDiameter;
  const rimOpacity = stage.classList.contains('globe-mode') ? Math.max(0, Math.min(1, (contourFit - .98) / .08)) : 0;
  stage.style.setProperty('--globe-size', `${globeDiameter}px`);
  stage.style.setProperty('--globe-left', `${(width - globeDiameter) / 2}px`);
  stage.style.setProperty('--globe-top', `${(height - globeDiameter) / 2}px`);
  stage.style.setProperty('--globe-rim-opacity', rimOpacity.toFixed(3));
  stage.classList.toggle('globe-rim-visible', rimOpacity > .01);
}

function createStarfield() {
  const container = $('.starfield');
  const stars = [
    [6, 12, 7, .92], [13, 31, 3, .68], [21, 72, 5, .82], [29, 18, 3, .72], [36, 87, 4, .7],
    [43, 10, 5, .88], [51, 24, 2, .7], [58, 8, 3, .74], [65, 19, 6, .86], [74, 11, 3, .68],
    [83, 23, 5, .82], [92, 14, 3, .88], [97, 37, 4, .7], [89, 71, 6, .82], [78, 88, 3, .75],
    [67, 95, 4, .9], [54, 82, 3, .7], [47, 67, 5, .84], [34, 94, 3, .78], [24, 84, 4, .86],
    [12, 91, 6, .74], [4, 59, 3, .9], [18, 49, 2, .8], [94, 57, 3, .78], [81, 45, 2, .72]
  ];
  let seed = 17;
  for (let index = 0; index < 72; index += 1) {
    seed = (seed * 9301 + 49297) % 233280;
    const x = 3 + (seed / 233280) * 94;
    seed = (seed * 9301 + 49297) % 233280;
    const y = 3 + (seed / 233280) * 94;
    stars.push([x, y, index % 9 === 0 ? 3 : 1.5, index % 4 === 0 ? .9 : .64]);
  }
  stars.forEach(([x, y, size, opacity], index) => {
    const star = document.createElement('i');
    star.className = `star star-${index % 3}`;
    star.style.left = `${x}%`;
    star.style.top = `${y}%`;
    star.style.width = `${size}px`;
    star.style.height = `${size}px`;
    star.style.opacity = opacity;
    star.style.animationDelay = `${(index % 7) * .45}s`;
    container.appendChild(star);
  });
}

function renderTimelineTicks() {
  const maxIndex = timelineMaxIndex();
  const visibleSnapshots = snapshots.slice(0, maxIndex + 1);
  const showForecastTimeline = forecastSettings.projectionsEnabled && !benchmarkActive();
  $('#timeline-step-count').textContent = visibleSnapshots.length;
  $('#timeline-mode-label').textContent = showForecastTimeline ? 'EVIDENCE + FORECAST SCENARIOS' : 'OBSERVED EVIDENCE';
  $('#timeline').max = maxIndex;
  const years = visibleSnapshots.reduce((entries, snapshot, index) => {
    if (!entries.some((entry) => entry.year === snapshot.year)) entries.push({ year: snapshot.year, index, isProjection: Boolean(snapshot.isProjection) });
    return entries;
  }, []);
  $('.timeline-ticks').innerHTML = years.map(({ year, index, isProjection }) => `<span class="year-tick ${isProjection ? 'projection-tick' : ''}" style="left:${(index / Math.max(maxIndex, 1)) * 100}%">${year}</span>`).join('');
  const firstProjection = visibleSnapshots.findIndex((snapshot) => snapshot.isProjection);
  const evidenceShare = firstProjection === -1 ? 100 : (firstProjection / visibleSnapshots.length) * 100;
  $('.timeline-track').style.setProperty('--evidence-share', `${evidenceShare}%`);
  $('.timeline-regions').innerHTML = showForecastTimeline
    ? '<span>OBSERVED EVIDENCE <b>2019–2025</b></span><span>FORECAST SCENARIOS <b>2026–2030</b></span>'
    : '<span>OBSERVED EVIDENCE <b>2019–2025</b></span>';
  $('.timeline-regions').classList.toggle('observed-only', !showForecastTimeline);
  $('#timeline').value = Math.min(snapshotIndex, maxIndex);
}

function switchSection(section) {
  activeSection = section;
  $$('.section-tab').forEach((button) => button.classList.toggle('active', button.dataset.section === section));
  $$('.topbar-section').forEach((button) => {
    const selected = button.dataset.section === section;
    button.classList.toggle('active', selected);
    if (selected) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  ['front', 'evidence', 'actions', 'methods'].forEach((name) => $(`#${name}-panel`).classList.toggle('hidden', name !== section));
  $('.app-shell')?.classList.toggle('methods-active', section === 'methods');
  const methodsWorkspace = section === 'methods';
  $('.sidebar').style.width = methodsWorkspace ? (window.innerWidth <= 1180 ? '420px' : '440px') : '';
  $('.timeline-dock').style.left = methodsWorkspace ? (window.innerWidth <= 1180 ? '420px' : '440px') : '';
  $('.species-hero').style.display = methodsWorkspace ? 'none' : '';
  $('.app-shell')?.classList.toggle('benchmark-mode', benchmarkActive());
  if (map?.getSource('lt-front')) updateSnapshot();
  else updateModelComparison();
  updateBenchmarkMap();
  if (section === 'methods' && benchmarkActive()) focusBenchmarkOverview();
  syncForecastSettingsUI();
}

function setSnapshot(index, options) { snapshotIndex = Math.max(0, Math.min(timelineMaxIndex(), index)); updateSnapshot(options); }

function stopPlayback() {
  if (!playing) return;
  playing = false;
  cancelAnimationFrame(timer);
  animationLastFrame = 0;
  $('#timeline-play').textContent = '▶';
  $('.timeline-date')?.setAttribute('aria-live', 'polite');
  updatePlaybackControls();
}

function updatePlaybackControls() {
  const back = $('#timeline-back');
  const forward = $('#timeline-forward');
  const play = $('#timeline-play');
  if (back) back.disabled = snapshotIndex <= 0 || benchmarkActive();
  if (forward) forward.disabled = snapshotIndex >= timelineMaxIndex() || benchmarkActive();
  if (play) play.disabled = benchmarkActive();
}

function togglePlay() {
  playing = !playing;
  $('#timeline-play').textContent = playing ? 'Ⅱ' : '▶';
  $('.timeline-date')?.setAttribute('aria-live', playing ? 'off' : 'polite');
  cancelAnimationFrame(timer);
  animationLastFrame = 0;
  if (playing) {
    ensureTimelineOverview();
    setReportPreviewMode(true);
    if (snapshotIndex >= timelineMaxIndex()) setSnapshot(0, { previewReports: true });
    const animate = (timestamp) => {
      if (!playing) return;
      if (!animationLastFrame) animationLastFrame = timestamp;
      const interval = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? REDUCED_MOTION_PLAYBACK_INTERVAL_MS
        : PLAYBACK_INTERVAL_MS;
      if (timestamp - animationLastFrame >= interval) {
        animationLastFrame += interval;
        if (snapshotIndex >= timelineMaxIndex()) {
          playing = false;
          $('#timeline-play').textContent = '▶';
          $('.timeline-date')?.setAttribute('aria-live', 'polite');
          setReportPreviewMode(false);
          updateSnapshot();
          updatePlaybackControls();
          return;
        }
        setSnapshot(snapshotIndex + 1);
      }
      timer = requestAnimationFrame(animate);
    };
    timer = requestAnimationFrame(animate);
  } else {
    setReportPreviewMode(false);
    updateSnapshot();
  }
}

function toggleSidebar() {
  const shell = $('.app-shell');
  const collapsed = shell.classList.toggle('sidebar-collapsed');
  $$('.menu-button, .topbar-sidebar-icon, .collapse').forEach((button) => button.setAttribute('aria-expanded', String(!collapsed)));
  $('#sidebar-restore').setAttribute('aria-expanded', String(collapsed));
}

function downloadSnapshot() {
  const snapshot = snapshots[snapshotIndex];
  const explanationRecords = benchmarkExplainEnabled ? benchmarkExplanationRecords() : [];
  const explanationSummary = benchmarkExplainEnabled ? benchmarkExplanationSummary(explanationRecords) : null;
  const frozen = benchmarkActive() ? {
    year: benchmarkYear,
    selectedModel: benchmarkModel(),
    yearData: benchmarkYearData(),
    comparedModelIds: benchmarkComparisonEnabled ? benchmarkComparisonIds : [selectedBenchmarkModelId],
    physicsView: physicsViewEnabled ? {
      modelId: selectedBenchmarkModelId,
      display: physicsDisplayMode,
      sweepPhase: physicsPhase,
      activeThreshold: physicsThreshold(),
      vectorMeaning: 'Finite-difference gradient toward locally increasing frozen relative-rank score.',
      interpretation: 'Diagnostic growth-style sweep over a frozen pressure surface; not abundance, calibrated velocity, or elapsed forecast time.'
    } : null,
    explanation: explanationSummary ? {
      pastModelId: benchmarkExplainModels.past,
      oursModelId: benchmarkExplainModels.ours,
      apDelta: explanationSummary.apDelta,
      pastTop5Hits: explanationSummary.pastHits,
      oursTop5Hits: explanationSummary.oursHits,
      reallocatedCells: explanationSummary.reallocated,
      regions: explanationSummary.regions.map(({ id, name, eligible, oursOnly, pastOnly, gainedHits, lostHits, meanDelta }) => ({ id, name, eligible, oursOnly, pastOnly, gainedHits, lostHits, meanDelta })),
      selectedCell: explanationRecords.find((record) => record.index === selectedExplainCellIndex) || null,
      interpretation: 'Stepwise frozen-model rank contrasts; not causal or SHAP attribution.'
    } : null
  } : null;
  const payload = { app: 'LanternTrace Explorer', generatedAt: new Date().toISOString(), mode: frozen ? 'frozen-first-report-replay' : 'evidence-or-scenario-display', frozenEvaluation: frozen, snapshot: frozen ? undefined : snapshot, selectedScenarioVariant: frozen ? undefined : selectedModelRanking(), modelMetadata: frozen ? benchmarkBundle.metadata : modelBundle.metadata, layers, caveat: 'Presence-only retrospective prototype; relative risks are not occupancy probabilities; not independent field validation or operational guidance.' };
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
  link.download = frozen ? `lanterntrace-frozen-replay-${benchmarkYear}.json` : `lanterntrace-front-${snapshot.year}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
  const status = $('#export-status');
  if (status) {
    status.textContent = `Export started · ${link.download}`;
    status.classList.remove('hidden');
    window.setTimeout(() => status.classList.add('hidden'), 4200);
  }
}

function searchPlace(value) {
  const key = value.trim().toLowerCase();
  const result = Object.keys(placeSearch).find((name) => name.includes(key) || key.includes(name));
  const results = $('#search-results');
  if (!results) return;
  if (!key) { results.classList.remove('visible'); return; }
  results.innerHTML = result ? `<button data-place="${result}">${result.replace(/\b\w/g, (letter) => letter.toUpperCase())}<small>zoom to region</small></button>` : '<span>No local place match</span>';
  results.classList.add('visible');
  const button = results.querySelector('button');
  if (button) button.addEventListener('click', () => { map.flyTo({ center: placeSearch[result], zoom: 8.2, essential: true }); results.classList.remove('visible'); });
}

function setupInteractions() {
  $$('.menu-button, .collapse, #sidebar-restore').forEach((button) => button.addEventListener('click', toggleSidebar));
  $$('.section-tab').forEach((button) => button.addEventListener('click', () => switchSection(button.dataset.section)));
  $$('.topbar-section').forEach((button) => button.addEventListener('click', () => switchSection(button.dataset.section)));
  $$('button[data-layer]').forEach((button) => button.addEventListener('click', () => { const layer = button.dataset.layer; layers[layer] = !layers[layer]; setMapLayerVisibility(layer, layers[layer]); syncLayerControls(); if (layer === 'corridors') startCorridorAnimation(); }));
  $$('input[data-layer]').forEach((input) => input.addEventListener('change', () => { layers[input.dataset.layer] = input.checked; setMapLayerVisibility(input.dataset.layer, input.checked); syncLayerControls(); }));
  const timeline = $('#timeline');
  timeline.addEventListener('pointerdown', () => {
    stopPlayback();
    isTimelineScrubbing = true;
    ensureTimelineOverview();
    setReportPreviewMode(true);
    lastSliderReportUpdate = 0;
    clearTimeout(pendingSliderReportTimer);
  });
  timeline.addEventListener('input', (event) => {
    ensureTimelineOverview();
    const nextIndex = Number(event.target.value);
    cancelAnimationFrame(pendingSliderFrame);
    clearTimeout(pendingSliderReportTimer);
    pendingSliderFrame = requestAnimationFrame(() => {
      setSnapshot(nextIndex, { previewReports: true });
    });
    pendingSliderReportTimer = setTimeout(() => {
      setSnapshot(snapshotIndex, { previewReports: true });
      lastSliderReportUpdate = performance.now();
    }, 180);
  });
  timeline.addEventListener('change', (event) => {
    cancelAnimationFrame(pendingSliderFrame);
    clearTimeout(pendingSliderReportTimer);
    isTimelineScrubbing = false;
    setReportPreviewMode(false);
    setSnapshot(Number(event.target.value));
  });
  $('#timeline-back').addEventListener('click', () => { ensureTimelineOverview(); setSnapshot(snapshotIndex - 1); });
  $('#timeline-forward').addEventListener('click', () => { ensureTimelineOverview(); setSnapshot(snapshotIndex + 1); });
  $('#timeline-play').addEventListener('click', togglePlay);
  $('#settings-toggle').addEventListener('click', () => toggleSettingsPanel());
  $('#settings-close').addEventListener('click', () => toggleSettingsPanel(false));
  $('#setting-projections').addEventListener('change', (event) => setProjectionEnabled(event.target.checked));
  $('#setting-comparison').addEventListener('change', (event) => setComparisonEnabled(event.target.checked));
  $('#compare-models-inline').addEventListener('click', () => setComparisonEnabled(!forecastSettings.comparisonEnabled));
  $('#benchmark-mode')?.addEventListener('click', () => setLabMode('benchmark'));
  $('#scenario-mode')?.addEventListener('click', () => setLabMode('scenario'));
  $$('.benchmark-year button').forEach((button) => button.addEventListener('click', () => setBenchmarkYear(button.dataset.benchmarkYear)));
  $('#physics-view-inline')?.addEventListener('click', () => togglePhysicsView());
  $('#explain-benchmark-inline')?.addEventListener('click', () => toggleBenchmarkExplanation());
  $('#compare-benchmark-inline')?.addEventListener('click', () => {
    if (physicsViewEnabled) {
      physicsViewEnabled = false;
      physicsAnimationPlaying = false;
      cancelAnimationFrame(physicsAnimationFrame);
      map?.easeTo({ pitch: 0, bearing: 0, duration: 400 });
    }
    if (benchmarkExplainEnabled) {
      benchmarkExplainEnabled = false;
      benchmarkComparisonEnabled = true;
    } else {
      benchmarkComparisonEnabled = !benchmarkComparisonEnabled;
    }
    renderBenchmarkLab();
    updateBenchmarkMap();
  });
  $('#benchmark-explanation')?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-explain-region]');
    if (!button) return;
    const region = benchmarkExplainRegions.find((candidate) => candidate.id === button.dataset.explainRegion);
    selectExplainCell(button.dataset.explainCell, { center: false });
    if (region && map) map.fitBounds(region.bounds, { padding: benchmarkMapPadding(), duration: 650, maxZoom: 6.2 });
  });
  $('#benchmark-ranking')?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-benchmark-model-id]');
    if (button) selectBenchmarkModel(button.dataset.benchmarkModelId);
  });
  $('#physics-model-options')?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-physics-model]');
    if (!button) return;
    selectBenchmarkModel(button.dataset.physicsModel);
    physicsAnimationLast = 0;
    startPhysicsAnimation();
  });
  $('.physics-display-options')?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-physics-display]');
    if (button) setPhysicsDisplay(button.dataset.physicsDisplay);
  });
  $('#physics-play')?.addEventListener('click', () => {
    physicsAnimationPlaying = !physicsAnimationPlaying;
    physicsAnimationLast = 0;
    renderPhysicsHUD();
    startPhysicsAnimation();
  });
  $('#export-snapshot')?.addEventListener('click', downloadSnapshot);
  $('#place-search')?.addEventListener('input', (event) => searchPlace(event.target.value));
  $('.paper-link')?.addEventListener('click', async (event) => {
    if (!window.lanternTrace?.openPaper) return;
    event.preventDefault();
    const error = await window.lanternTrace.openPaper();
    const status = $('#export-status');
    if (status) {
      status.textContent = error ? `Paper could not open · ${error}` : 'Opened the methods paper in the system PDF viewer';
      status.classList.remove('hidden');
      window.setTimeout(() => status.classList.add('hidden'), 4200);
    }
  });
  $('#settings-panel')?.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') { event.preventDefault(); toggleSettingsPanel(false); }
  });
  $('.lab-mode-tabs')?.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    const next = activeLabMode === 'benchmark' ? 'scenario' : 'benchmark';
    setLabMode(next);
    $(`#${next}-mode`)?.focus();
  });
  document.addEventListener('visibilitychange', () => { startCorridorAnimation(); startPhysicsAnimation(); });
  $('#model-ranking')?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-model-id]');
    if (button) selectDiffusionModel(button.dataset.modelId);
  });
  $('#model-comparison-legend')?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-model-id]');
    if (button) selectDiffusionModel(button.dataset.modelId);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  if (physicsEmbedMode) {
    document.documentElement.classList.add('physics-embed');
    if (heroMapEmbedMode) document.documentElement.classList.add('hero-map-embed');
    activeSection = 'methods';
    activeLabMode = 'benchmark';
    selectedBenchmarkModelId = 'og_rde';
    benchmarkExplainEnabled = false;
    benchmarkComparisonEnabled = false;
    physicsViewEnabled = true;
    physicsDisplayMode = 'height';
  }
  const count = observationPoints.length.toLocaleString();
  const generated = observationMetadata.generatedAt ? new Date(observationMetadata.generatedAt).toLocaleDateString() : 'unavailable';
  const evidenceCount = $('#public-observation-count');
  const evidenceSource = $('#public-observation-source');
  if (evidenceCount) evidenceCount.textContent = observationPoints.length ? count : 'NOT LOADED';
  if (evidenceSource) evidenceSource.textContent = observationPoints.length ? `GBIF public-coordinate records · refreshed ${generated}` : 'Optional occurrence bundle missing; frozen benchmark remains available';
  syncForecastSettingsUI();
  renderBenchmarkLab();
  setLabMode('benchmark');
  createStarfield();
  initMap();
  setupInteractions();
});
