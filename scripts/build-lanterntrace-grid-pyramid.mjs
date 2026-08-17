import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = path.join(root, 'lanterntrace/app/generated/spread-explainer.js');
const outputPath = path.join(root, 'lanterntrace/app/generated/spread-grid-pyramid.js');
const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync(sourcePath, 'utf8'), context);

const bundle = context.window.LanternTraceSpread;
const cells = bundle.cells;
const grid = bundle.metadata.grid;
const sourceByIndex = new Map(cells.map((cell, index) => [`${cell.r}:${cell.c}`, index]));
const sizes = [1, 0.75, 0.5, 0.25];
const round = (value, digits = 6) => Number(value.toFixed(digits));

function neighborsFor(longitude, latitude, parentRow, parentColumn) {
  const candidates = [];
  for (let row = parentRow - 1; row <= parentRow + 1; row += 1) {
    for (let column = parentColumn - 1; column <= parentColumn + 1; column += 1) {
      const sourceIndex = sourceByIndex.get(`${row}:${column}`);
      if (sourceIndex === undefined) continue;
      const source = cells[sourceIndex];
      const dx = (longitude - (source.w + 0.5)) * Math.cos(latitude * Math.PI / 180);
      const dy = latitude - (source.s + 0.5);
      const distanceSquared = dx * dx + dy * dy;
      candidates.push({ sourceIndex, distanceSquared });
    }
  }
  candidates.sort((a, b) => a.distanceSquared - b.distanceSquared);
  if (candidates[0]?.distanceSquared < 1e-12) return [[candidates[0].sourceIndex, 1]];
  const nearest = candidates.slice(0, 4);
  const rawWeights = nearest.map(({ distanceSquared }) => 1 / Math.max(distanceSquared, 1e-6));
  const total = rawWeights.reduce((sum, value) => sum + value, 0);
  return nearest.map(({ sourceIndex }, index) => [sourceIndex, round(rawWeights[index] / total)]);
}

const levels = {};
for (const size of sizes) {
  const records = [];
  let gridRow = 0;
  for (let south = grid.south; south < grid.north - 1e-9; south += size, gridRow += 1) {
    let gridColumn = 0;
    for (let west = grid.west; west < grid.east - 1e-9; west += size, gridColumn += 1) {
      const centerLongitude = Math.min(west + size / 2, grid.east - 1e-6);
      const centerLatitude = Math.min(south + size / 2, grid.north - 1e-6);
      const parentColumn = Math.floor((centerLongitude - grid.west) / grid.stepDegrees);
      const parentRow = Math.floor((centerLatitude - grid.south) / grid.stepDegrees);
      const parentIndex = sourceByIndex.get(`${parentRow}:${parentColumn}`);
      if (parentIndex === undefined) continue;
      const record = [round(west, 4), round(south, 4), parentIndex];
      for (const [sourceIndex, weight] of neighborsFor(centerLongitude, centerLatitude, parentRow, parentColumn)) {
        record.push(sourceIndex, weight);
      }
      records.push(record);
    }
  }
  levels[String(size)] = records;
}

const pyramid = {
  metadata: {
    sourceCellSizeDegrees: grid.stepDegrees,
    sizes,
    method: 'Inverse-distance interpolation over up to four nearby 1-degree land-cell centers.',
    caveat: 'Display resampling only. Smaller cells do not add observation precision or independent model evidence.',
    generatedAt: new Date().toISOString(),
    counts: Object.fromEntries(sizes.map((size) => [String(size), levels[String(size)].length])),
  },
  levels,
};

fs.writeFileSync(outputPath, `window.LanternTraceSpreadGridPyramid = ${JSON.stringify(pyramid)};\n`);
console.log(`Wrote ${path.relative(root, outputPath)}`);
console.log(pyramid.metadata.counts);
