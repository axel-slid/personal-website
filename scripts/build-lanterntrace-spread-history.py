#!/usr/bin/env python3
"""Precompute yearly population-adjusted LanternTrace report surfaces."""

from __future__ import annotations

import json
import math
from datetime import date
from pathlib import Path

import numpy as np
from scipy.ndimage import gaussian_filter


ROOT = Path(__file__).resolve().parents[1]
SPREAD_PATH = ROOT / "lanterntrace/app/generated/spread-explainer.js"
OBSERVATIONS_PATH = ROOT / "lanterntrace/app/generated/observations.js"
OUTPUT_PATH = ROOT / "lanterntrace/app/generated/spread-history.js"
YEARS = tuple(range(2019, 2027))


def load_wrapped_json(path: Path, prefix: str) -> dict:
    source = path.read_text()
    if not source.startswith(prefix):
        raise ValueError(f"Unexpected bundle wrapper in {path}")
    return json.loads(source[len(prefix):].rstrip().removesuffix(";"))


def robust_scale(values: np.ndarray, mask: np.ndarray) -> np.ndarray:
    sample = values[mask & np.isfinite(values)]
    if not sample.size:
        return np.zeros_like(values)
    low, high = np.percentile(sample, [0, 99])
    if high <= low:
        return np.zeros_like(values)
    return np.clip((values - low) / (high - low), 0, 1) * mask


def population_adjusted_signal(
    reports: np.ndarray, population: np.ndarray, mask: np.ndarray
) -> tuple[np.ndarray, np.ndarray]:
    total_population = population[mask].sum()
    national_rate = reports[mask].sum() / total_population if total_population else 0
    prior_population = 250_000
    stabilized = (
        (reports + national_rate * prior_population)
        / (population + prior_population)
        * 100_000
    )
    baseline = national_rate * 100_000
    excess = np.maximum(stabilized - baseline, 0)
    numerator = gaussian_filter(excess * mask, 0.7)
    denominator = gaussian_filter(mask.astype(float), 0.7)
    smoothed = np.divide(
        numerator,
        denominator,
        out=np.zeros_like(numerator),
        where=denominator > 0,
    )
    return robust_scale(np.log1p(smoothed), mask), stabilized


def main() -> None:
    spread = load_wrapped_json(SPREAD_PATH, "window.LanternTraceSpread = ")
    observation_bundle = load_wrapped_json(
        OBSERVATIONS_PATH, "window.LanternTraceObservations = "
    )
    grid = spread["metadata"]["grid"]
    rows, columns = grid["rows"], grid["columns"]
    population = np.zeros((rows, columns), dtype=float)
    mask = np.zeros((rows, columns), dtype=bool)
    cell_indices: dict[tuple[int, int], int] = {}
    for index, cell in enumerate(spread["cells"]):
        row, column = cell["r"], cell["c"]
        mask[row, column] = True
        population[row, column] = cell["population"]
        cell_indices[(row, column)] = index

    dated_records: list[tuple[int, int, date]] = []
    last_observed_date: date | None = None
    for record in observation_bundle["observations"]:
        longitude, latitude, raw_date = record[:3]
        try:
            observed_date = date.fromisoformat(raw_date)
        except (TypeError, ValueError):
            continue
        row = math.floor((latitude - grid["south"]) / grid["stepDegrees"])
        column = math.floor((longitude - grid["west"]) / grid["stepDegrees"])
        if not (0 <= row < rows and 0 <= column < columns and mask[row, column]):
            continue
        dated_records.append((row, column, observed_date))
        if last_observed_date is None or observed_date > last_observed_date:
            last_observed_date = observed_date

    signals: dict[str, list[float]] = {}
    rates: dict[str, list[float]] = {}
    reports_by_year: dict[str, list[int]] = {}
    totals: dict[str, int] = {}
    ordered_cells = [(cell["r"], cell["c"]) for cell in spread["cells"]]
    for year in YEARS:
        reports = np.zeros((rows, columns), dtype=float)
        cutoff = date(year, 12, 31)
        for row, column, observed_date in dated_records:
            if observed_date <= cutoff:
                reports[row, column] += 1
        signal, stabilized = population_adjusted_signal(reports, population, mask)
        key = str(year)
        signals[key] = [round(float(signal[row, column]), 6) for row, column in ordered_cells]
        rates[key] = [round(float(stabilized[row, column]), 3) for row, column in ordered_cells]
        reports_by_year[key] = [int(reports[row, column]) for row, column in ordered_cells]
        totals[key] = int(reports.sum())
        print(f"{year}: {totals[key]:,} cumulative mapped reports")

    history = {
        "metadata": {
            "years": list(YEARS),
            "presentYear": YEARS[-1],
            "predictionStartYear": YEARS[-1] + 1,
            "lastObservedDate": last_observed_date.isoformat() if last_observed_date else None,
            "generatedAt": observation_bundle["metadata"].get("generatedAt"),
            "method": "Cumulative dated reports through each year, stabilized per 100,000 residents with a national-rate prior and locally smoothed before robust scaling.",
            "caveat": "Presence-only reports reflect observation effort as well as biological presence. The 2026 surface is partial through the last observed date.",
            "totals": totals,
        },
        "signals": signals,
        "rates": rates,
        "reports": reports_by_year,
    }
    OUTPUT_PATH.write_text(
        "window.LanternTraceSpreadHistory = "
        + json.dumps(history, separators=(",", ":"))
        + ";\n"
    )
    print(f"Wrote {OUTPUT_PATH.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
