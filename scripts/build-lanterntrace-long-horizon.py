#!/usr/bin/env python3
"""Extend LanternTrace factor-isolation physics through a 30-year horizon."""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from scipy.ndimage import convolve, gaussian_filter


ROOT = Path(__file__).resolve().parents[1]
SOURCE_PATH = ROOT / "lanterntrace/app/generated/spread-explainer.js"
OUTPUT_PATH = ROOT / "lanterntrace/app/generated/spread-long-horizon.js"
START_YEAR = 2025
END_YEAR = 2056


def load_bundle() -> dict:
    source = SOURCE_PATH.read_text()
    prefix = "window.LanternTraceSpread = "
    if not source.startswith(prefix):
        raise ValueError(f"Unexpected spread bundle wrapper in {SOURCE_PATH}")
    return json.loads(source[len(prefix):].rstrip().removesuffix(";"))


def robust_scale(values: np.ndarray, mask: np.ndarray) -> np.ndarray:
    sample = values[mask & np.isfinite(values)]
    low, high = np.percentile(sample, [0, 99]) if sample.size else (0, 1)
    return np.clip((values - low) / max(high - low, 1e-9), 0, 1) * mask


def neighbor_mean(values: np.ndarray, mask: np.ndarray) -> np.ndarray:
    kernel = np.asarray([[0.05, 0.12, 0.05], [0.12, 0.32, 0.12], [0.05, 0.12, 0.05]])
    numerator = convolve(values * mask, kernel, mode="constant")
    denominator = convolve(mask.astype(float), kernel, mode="constant")
    return numerator / np.maximum(denominator, 1e-9)


def evolve(
    initial: np.ndarray,
    suitability: np.ndarray,
    mask: np.ndarray,
    years: int,
    transport: np.ndarray | None = None,
) -> list[np.ndarray]:
    frames = [initial.copy()]
    state = initial.copy()
    for _ in range(years):
        local = neighbor_mean(state, mask)
        state = state + 0.34 * (local - state) + 0.31 * suitability * state * (1 - state)
        if transport is not None:
            source = gaussian_filter(state * (0.2 + 0.8 * transport), 2.7, mode="constant")
            state += 0.045 * source * (0.15 + 0.85 * transport)
        state = np.clip(state, 0, 1) * mask
        frames.append(state.copy())
    return frames


def main() -> None:
    bundle = load_bundle()
    grid = bundle["metadata"]["grid"]
    shape = (grid["rows"], grid["columns"])
    mask = np.zeros(shape, dtype=bool)
    signal = np.zeros(shape, dtype=float)
    climate = np.zeros(shape, dtype=float)
    geography = np.zeros(shape, dtype=float)
    population = np.zeros(shape, dtype=float)
    ordered_cells: list[tuple[int, int]] = []
    for cell in bundle["cells"]:
        row, column = cell["r"], cell["c"]
        ordered_cells.append((row, column))
        mask[row, column] = True
        signal[row, column] = cell["signal"]
        climate[row, column] = cell["climate"]
        geography[row, column] = cell["geography"]
        population[row, column] = cell["population"]

    years = list(range(START_YEAR, END_YEAR + 1))
    distance_frames = [signal.copy()]
    for offset in range(1, len(years)):
        numerator = gaussian_filter(signal * mask, 0.42 * offset, mode="constant")
        denominator = gaussian_filter(mask.astype(float), 0.42 * offset, mode="constant")
        distance_frames.append(np.clip(numerator / np.maximum(denominator, 1e-9), 0, 1) * mask)

    population_index = robust_scale(np.log1p(population), mask)
    frame_sets = {
        "distance": distance_frames,
        "fisher": evolve(signal, np.ones(shape) * mask, mask, len(years) - 1),
        "climate": evolve(signal, 0.2 + 0.8 * climate, mask, len(years) - 1),
        "terrain": evolve(signal, 0.2 + 0.8 * geography, mask, len(years) - 1),
        "coupled": evolve(signal, 0.12 + 0.88 * climate * geography, mask, len(years) - 1, population_index),
    }
    models = {
        model_id: [
            [round(float(frame[row, column]), 5) for row, column in ordered_cells]
            for frame in frames
        ]
        for model_id, frames in frame_sets.items()
    }
    payload = {
        "metadata": {
            "years": years,
            "presentYear": 2026,
            "endYear": END_YEAR,
            "horizonYears": END_YEAR - 2026,
            "timestep": "annual frames with linear display interpolation",
            "method": "The existing factor-isolation reaction-diffusion update is continued unchanged through 2056.",
            "caveat": "Long-horizon mechanism simulation only; not calibrated abundance, probability, or a validated national forecast.",
        },
        "models": models,
    }
    OUTPUT_PATH.write_text(
        "window.LanternTraceSpreadLongHorizon = "
        + json.dumps(payload, separators=(",", ":"))
        + ";\n"
    )
    print(f"Wrote {OUTPUT_PATH.relative_to(ROOT)} ({OUTPUT_PATH.stat().st_size / 1024:.1f} KiB)")


if __name__ == "__main__":
    main()
