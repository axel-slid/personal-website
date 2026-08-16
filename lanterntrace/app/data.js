const frontSnapshots = [
  {
    year: 2019,
    label: '2019 · first regional signal',
    leadingEdge: 'Berks County, PA',
    cells: '18',
    confidence: '0.61',
    area: 11800,
    front: [[-75.88, 40.64], [-75.48, 40.83], [-74.92, 40.93], [-74.72, 40.64], [-75.04, 40.25], [-75.7, 40.24], [-75.88, 40.64]],
    uncertainty: [[-76.28, 40.77], [-75.52, 41.14], [-74.45, 41.08], [-74.35, 40.42], [-74.94, 40.0], [-76.22, 40.08], [-76.28, 40.77]]
  },
  {
    year: 2020,
    label: '2020 · expanding corridor',
    leadingEdge: 'Lehigh Valley, PA',
    cells: '32',
    confidence: '0.66',
    area: 19400,
    front: [[-76.24, 40.95], [-75.76, 41.27], [-74.78, 41.22], [-74.19, 40.78], [-74.32, 40.2], [-75.08, 39.94], [-76.08, 40.18], [-76.24, 40.95]],
    uncertainty: [[-76.7, 41.18], [-75.84, 41.58], [-74.48, 41.54], [-73.72, 40.8], [-74.0, 39.92], [-75.23, 39.55], [-76.58, 39.92], [-76.7, 41.18]]
  },
  {
    year: 2021,
    label: '2021 · multi-state establishment',
    leadingEdge: 'Hudson Valley, NY',
    cells: '57',
    confidence: '0.72',
    area: 31800,
    front: [[-76.38, 41.25], [-75.66, 41.64], [-74.72, 41.56], [-73.49, 42.0], [-72.87, 41.64], [-73.28, 40.79], [-74.22, 40.23], [-75.53, 40.35], [-76.38, 41.25]],
    uncertainty: [[-76.92, 41.44], [-75.78, 41.98], [-74.63, 41.98], [-73.31, 42.48], [-72.34, 41.75], [-72.83, 40.48], [-74.08, 39.75], [-75.78, 39.88], [-76.92, 41.44]]
  },
  {
    year: 2022,
    label: '2022 · northward front',
    leadingEdge: 'Capital Region, NY',
    cells: '81',
    confidence: '0.78',
    area: 47600,
    front: [[-77.05, 41.55], [-76.15, 42.0], [-75.02, 42.03], [-74.2, 42.68], [-73.28, 42.7], [-72.56, 42.12], [-72.85, 41.22], [-73.68, 40.56], [-75.22, 40.53], [-76.54, 40.85], [-77.05, 41.55]],
    uncertainty: [[-77.52, 41.78], [-76.28, 42.48], [-74.92, 42.53], [-74.01, 43.23], [-73.02, 43.28], [-71.91, 42.28], [-72.38, 40.88], [-73.45, 40.04], [-75.42, 40.03], [-77.16, 40.62], [-77.52, 41.78]]
  },
  {
    year: 2023,
    label: '2023 · observed range broadening',
    leadingEdge: 'Southern Vermont / New Hampshire',
    cells: '108',
    confidence: '0.81',
    area: 69300,
    front: [[-77.38, 41.78], [-76.44, 42.4], [-75.19, 42.52], [-74.2, 43.16], [-73.08, 43.49], [-71.67, 43.32], [-70.98, 42.63], [-71.45, 41.74], [-72.58, 41.03], [-74.16, 40.51], [-75.73, 40.65], [-77.38, 41.78]],
    uncertainty: [[-77.94, 42.08], [-76.54, 42.91], [-75.08, 43.05], [-74.0, 43.74], [-72.99, 43.96], [-71.19, 43.82], [-70.31, 42.81], [-70.89, 41.38], [-72.34, 40.54], [-74.22, 39.95], [-76.13, 40.2], [-77.94, 42.08]]
  },
  {
    year: 2024,
    label: '2024 · current modeled front',
    leadingEdge: 'Maine / New Hampshire threshold',
    cells: '139',
    confidence: '0.84',
    area: 90700,
    front: [[-77.76, 42.08], [-76.63, 42.75], [-75.32, 42.91], [-74.21, 43.53], [-72.79, 44.06], [-71.25, 44.08], [-69.8, 43.52], [-69.25, 42.68], [-70.16, 41.84], [-71.55, 41.31], [-73.42, 40.65], [-75.35, 40.77], [-77.76, 42.08]],
    uncertainty: [[-78.34, 42.45], [-76.75, 43.27], [-75.17, 43.47], [-73.98, 44.3], [-72.77, 44.76], [-70.96, 44.69], [-69.14, 44.08], [-68.66, 42.64], [-69.82, 41.35], [-71.36, 40.77], [-73.43, 40.07], [-75.66, 40.27], [-78.34, 42.45]]
  },
  {
    year: 2025,
    label: '2025 · latest evidence window',
    leadingEdge: 'New England watch zone',
    cells: '156',
    confidence: '0.67',
    area: 104200,
    front: [[-78.03, 42.3], [-76.71, 43.1], [-75.21, 43.23], [-73.98, 43.91], [-72.48, 44.47], [-70.58, 44.49], [-69.16, 43.7], [-68.73, 42.6], [-69.74, 41.72], [-71.43, 41.2], [-73.58, 40.5], [-75.65, 40.66], [-78.03, 42.3]],
    uncertainty: [[-78.75, 42.68], [-76.86, 43.71], [-75.02, 43.9], [-73.77, 44.75], [-72.36, 45.24], [-70.31, 45.17], [-68.48, 44.23], [-68.1, 42.4], [-69.48, 41.12], [-71.3, 40.45], [-73.56, 39.82], [-76.01, 40.03], [-78.75, 42.68]]
  }
];

const surveillanceSites = [
  [-75.98, 40.64, 'Berks sentinel'], [-74.97, 40.7, 'Lehigh sentinel'], [-74.15, 41.01, 'Hudson sentinel'],
  [-73.83, 42.7, 'Capital sentinel'], [-72.62, 43.1, 'Connecticut River sentinel'], [-71.43, 43.2, 'New Hampshire sentinel'],
  [-70.65, 43.9, 'Maine threshold sentinel']
];

const corridors = [
  [[-75.16, 39.95], [-74.64, 40.22], [-74.32, 40.74], [-73.94, 40.68], [-73.76, 41.56], [-73.76, 42.65]],
  [[-75.47, 40.34], [-75.13, 40.02], [-74.64, 40.22], [-74.01, 40.71], [-73.25, 42.45], [-72.68, 42.1]],
  [[-76.49, 42.44], [-76.15, 43.05], [-75.76, 43.15], [-73.76, 42.65], [-72.59, 44.26], [-71.54, 43.21]],
  [[-75.22, 39.95], [-78.9, 40.44], [-81.69, 41.5], [-87.63, 41.88], [-90.2, 38.63]],
  [[-75.22, 39.95], [-77.04, 38.9], [-80.19, 32.08], [-84.39, 33.75], [-86.78, 36.16]],
  [[-74.01, 40.71], [-71.06, 42.36], [-70.25, 43.66], [-66.1, 45.0]]
];

const citySearch = {
  'philadelphia': [-75.1652, 39.9526], 'new york': [-74.006, 40.7128], 'albany': [-73.7562, 42.6526],
  'boston': [-71.0589, 42.3601], 'harrisburg': [-76.8867, 40.2732], 'new england': [-71.5, 43.5],
  'pennsylvania': [-77.5, 40.8], 'new jersey': [-74.5, 40.2], 'maine': [-69.4, 45.2]
};

function resampleRing(ring, count = 32) {
  const points = ring.slice(0, -1);
  const output = [];
  for (let i = 0; i < count - 1; i += 1) {
    const position = (i / (count - 1)) * points.length;
    const index = Math.floor(position) % points.length;
    const next = (index + 1) % points.length;
    const blend = position - Math.floor(position);
    output.push([
      points[index][0] + (points[next][0] - points[index][0]) * blend,
      points[index][1] + (points[next][1] - points[index][1]) * blend
    ]);
  }
  output.push(output[0]);
  return output;
}

function blendNumber(a, b, t) { return Math.round(a + (b - a) * t); }
function blendDecimal(a, b, t) { return (a + (b - a) * t).toFixed(2); }

const timelineSnapshots = [];
const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
frontSnapshots.forEach((current, yearIndex) => {
  const next = frontSnapshots[Math.min(yearIndex + 1, frontSnapshots.length - 1)];
  for (let month = 1; month <= 12; month += 1) {
    const t = yearIndex === frontSnapshots.length - 1 ? 0 : (month - 1) / 12;
    const monthName = monthNames[month - 1];
    timelineSnapshots.push({
      ...current,
      period: `${current.year} ${monthName}`,
      label: `${current.year} ${monthName} · ${month === 12 ? current.label.split(' · ')[1] : 'evidence update'}`,
      cells: String(blendNumber(Number(current.cells), Number(next.cells), t)),
      confidence: blendDecimal(Number(current.confidence), Number(next.confidence), t),
      area: blendNumber(current.area, next.area, t),
      front: resampleRing(current.front).map((point, i) => [
        point[0] + (resampleRing(next.front)[i][0] - point[0]) * t,
        point[1] + (resampleRing(next.front)[i][1] - point[1]) * t
      ]),
      uncertainty: resampleRing(current.uncertainty).map((point, i) => [
        point[0] + (resampleRing(next.uncertainty)[i][0] - point[0]) * t,
        point[1] + (resampleRing(next.uncertainty)[i][1] - point[1]) * t
      ])
    });
  }
});

// Keep the forward-looking interval visibly separate from observed evidence.
// These are model projections carried forward from the last front-estimation
// window. Public occurrence points remain independently date-filtered.
const latestEvidence = frontSnapshots[frontSnapshots.length - 1];
const projectedFront = resampleRing(latestEvidence.front);
const projectedUncertainty = resampleRing(latestEvidence.uncertainty);
function ringCenter(ring) {
  const points = ring.slice(0, -1);
  return points.reduce((center, [lng, lat]) => [center[0] + lng / points.length, center[1] + lat / points.length], [0, 0]);
}
const projectedFrontCenter = ringCenter(projectedFront);
const projectedUncertaintyCenter = ringCenter(projectedUncertainty);
const projectionMonths = 5 * 12;
for (let step = 1; step <= projectionMonths; step += 1) {
  const yearsAhead = step / 12;
  const year = 2026 + Math.floor((step - 1) / 12);
  const month = ((step - 1) % 12) + 1;
  const monthName = monthNames[month - 1];
  const frontScale = 1 + yearsAhead * .035;
  const uncertaintyScale = 1 + yearsAhead * .07;
  const drift = [.35 * yearsAhead, .14 * yearsAhead];
  timelineSnapshots.push({
    ...latestEvidence,
    year,
    period: `${year} ${monthName}`,
    label: `${year} ${monthName} · prospective front projection`,
    isProjection: true,
    projectionHorizonYears: Number(yearsAhead.toFixed(2)),
    leadingEdge: 'Projected northern watch zone',
    cells: String(Number(latestEvidence.cells) + Math.round(step * 2.5)),
    confidence: Math.max(.35, Number(latestEvidence.confidence) - yearsAhead * .06).toFixed(2),
    area: Math.round(latestEvidence.area * frontScale * frontScale),
    front: projectedFront.map(([lng, lat]) => [
      projectedFrontCenter[0] + (lng - projectedFrontCenter[0]) * frontScale + drift[0],
      projectedFrontCenter[1] + (lat - projectedFrontCenter[1]) * frontScale + drift[1]
    ]),
    uncertainty: projectedUncertainty.map(([lng, lat]) => [
      projectedUncertaintyCenter[0] + (lng - projectedUncertaintyCenter[0]) * uncertaintyScale + drift[0] * 1.12,
      projectedUncertaintyCenter[1] + (lat - projectedUncertaintyCenter[1]) * uncertaintyScale + drift[1] * 1.12
    ])
  });
}

const LanternTraceData = { frontSnapshots, timelineSnapshots, surveillanceSites, corridors, citySearch };
if (typeof window !== 'undefined') window.LanternTraceData = LanternTraceData;
if (typeof module !== 'undefined') module.exports = LanternTraceData;
