import fs from 'node:fs/promises';
import vm from 'node:vm';

const outputPath = new URL('../lanterntrace/app/generated/host-vegetation.js', import.meta.url);
const spreadPath = new URL('../lanterntrace/app/generated/spread-explainer.js', import.meta.url);
const context = { window: {} };
vm.runInNewContext(await fs.readFile(spreadPath, 'utf8'), context);
const cells = context.window.LanternTraceSpread?.cells || [];

const bounds = { west: -125, east: -66, south: 24, north: 50, step: 1 };
const width = (bounds.east - bounds.west) / bounds.step;
const height = (bounds.north - bounds.south) / bounds.step;
const taxa = [
  { name: 'Tree-of-heaven', scientificName: 'Ailanthus altissima', taxonKey: 3190653, weight: 2, limit: 2400 },
  { name: 'Grapes', scientificName: 'Vitis', taxonKey: 7467468, weight: 1.4, limit: 1500 },
  { name: 'Black walnut', scientificName: 'Juglans nigra', taxonKey: 3054357, weight: 1, limit: 1500 },
  { name: 'Red maple', scientificName: 'Acer rubrum', taxonKey: 3189883, weight: .8, limit: 1200 },
  { name: 'Silver maple', scientificName: 'Acer saccharinum', taxonKey: 3189837, weight: .8, limit: 1200 },
  { name: 'Willows', scientificName: 'Salix', taxonKey: 3039576, weight: .8, limit: 1500 },
];

async function fetchTaxon(taxon) {
  const pageSize = 300;
  const pages = Math.ceil(taxon.limit / pageSize);
  const results = [];
  for (let page = 0; page < pages; page += 1) {
    const params = new URLSearchParams({
      taxon_key: String(taxon.taxonKey),
      country: 'US',
      has_coordinate: 'true',
      has_geospatial_issue: 'false',
      occurrence_status: 'present',
      limit: String(pageSize),
      offset: String(page * pageSize),
    });
    let response;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      response = await fetch(`https://api.gbif.org/v1/occurrence/search?${params}`, {
        headers: { 'User-Agent': 'LanternTrace research visualization' },
      });
      if (response.ok) break;
      if (response.status !== 429 || attempt === 3) throw new Error(`GBIF ${taxon.name}: ${response.status}`);
      await new Promise((resolve) => setTimeout(resolve, 700 * (attempt + 1)));
    }
    results.push(await response.json());
    await new Promise((resolve) => setTimeout(resolve, 160));
  }
  const seen = new Set();
  const points = [];
  results.forEach((page) => page.results?.forEach((record) => {
    const longitude = Number(record.decimalLongitude);
    const latitude = Number(record.decimalLatitude);
    if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return;
    if (longitude < bounds.west || longitude >= bounds.east || latitude < bounds.south || latitude >= bounds.north) return;
    const key = `${longitude.toFixed(4)}:${latitude.toFixed(4)}`;
    if (seen.has(key)) return;
    seen.add(key);
    points.push([longitude, latitude]);
  }));
  return points;
}

function blur(values, sigma = 1.35) {
  const radius = Math.ceil(sigma * 3);
  const kernel = Array.from({ length: radius * 2 + 1 }, (_, index) => Math.exp(-((index - radius) ** 2) / (2 * sigma ** 2)));
  const kernelTotal = kernel.reduce((sum, value) => sum + value, 0);
  kernel.forEach((_, index) => { kernel[index] /= kernelTotal; });
  const horizontal = new Float64Array(values.length);
  const output = new Float64Array(values.length);
  for (let row = 0; row < height; row += 1) {
    for (let column = 0; column < width; column += 1) {
      let total = 0;
      for (let offset = -radius; offset <= radius; offset += 1) {
        const sourceColumn = Math.max(0, Math.min(width - 1, column + offset));
        total += values[row * width + sourceColumn] * kernel[offset + radius];
      }
      horizontal[row * width + column] = total;
    }
  }
  for (let row = 0; row < height; row += 1) {
    for (let column = 0; column < width; column += 1) {
      let total = 0;
      for (let offset = -radius; offset <= radius; offset += 1) {
        const sourceRow = Math.max(0, Math.min(height - 1, row + offset));
        total += horizontal[sourceRow * width + column] * kernel[offset + radius];
      }
      output[row * width + column] = Math.log1p(total);
    }
  }
  return output;
}

const pointSets = await Promise.all(taxa.map(fetchTaxon));
const landOffsets = cells.map((cell) => (cell.s - bounds.south) * width + (cell.w - bounds.west));
const surfaces = pointSets.map((points) => {
  const counts = new Float64Array(width * height);
  points.forEach(([longitude, latitude]) => {
    const column = Math.floor((longitude - bounds.west) / bounds.step);
    const row = Math.floor((latitude - bounds.south) / bounds.step);
    counts[row * width + column] += 1;
  });
  const smoothed = blur(counts);
  const landValues = landOffsets.map((offset) => smoothed[offset]).sort((a, b) => a - b);
  const ceiling = landValues[Math.floor((landValues.length - 1) * .98)] || 1;
  return Array.from(smoothed, (value) => Math.min(1, value / ceiling));
});
const weightTotal = taxa.reduce((sum, taxon) => sum + taxon.weight, 0);
const values = cells.map((cell, cellIndex) => {
  const offset = landOffsets[cellIndex];
  const value = surfaces.reduce((sum, surface, taxonIndex) => sum + surface[offset] * taxa[taxonIndex].weight, 0) / weightTotal;
  return [cell.w, cell.s, Number(value.toFixed(4))];
});

const bundle = {
  metadata: {
    name: 'Spotted lanternfly host-vegetation occurrence proxy',
    generatedAt: new Date().toISOString().slice(0, 10),
    source: 'GBIF public-coordinate occurrence search',
    sourceUrl: 'https://www.gbif.org/',
    method: 'Each host taxon is gridded at 1 degree, Gaussian-smoothed, log-scaled, normalized at its U.S. land-cell 98th percentile, then combined with display emphasis weights.',
    caveat: 'Occurrence density is a host-availability proxy, not vegetation biomass or complete host coverage. Weights are visualization emphasis values, not measured feeding coefficients.',
    taxa: taxa.map((taxon, index) => ({
      name: taxon.name,
      scientificName: taxon.scientificName,
      taxonKey: taxon.taxonKey,
      weight: taxon.weight,
      recordsUsed: pointSets[index].length,
    })),
  },
  values,
};
await fs.writeFile(outputPath, `window.LanternTraceHostVegetation = ${JSON.stringify(bundle)};\n`);
console.log(`Wrote ${values.length} host-vegetation cells from ${pointSets.reduce((sum, points) => sum + points.length, 0)} records.`);
