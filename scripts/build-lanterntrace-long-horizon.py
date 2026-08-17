#!/usr/bin/env python3
"""Build the literature-parameterized LanternTrace multiresolution solver.

Each UI grid level is a separate finite-volume state space.  The smaller-cell
options therefore add actual physics degrees of freedom; they are not display
interpolations of a one-degree solution.
"""

from __future__ import annotations

import base64
import json
import math
from pathlib import Path

import numpy as np
from scipy.sparse import csc_matrix, eye
from scipy.sparse.linalg import factorized


ROOT = Path(__file__).resolve().parents[1]
SOURCE_PATH = ROOT / "lanterntrace/app/generated/spread-explainer.js"
HISTORY_PATH = ROOT / "lanterntrace/app/generated/spread-history.js"
PYRAMID_PATH = ROOT / "lanterntrace/app/generated/spread-grid-pyramid.js"
OUTPUT_PATH = ROOT / "lanterntrace/app/generated/spread-long-horizon.js"
START_YEAR = 2026
END_YEAR = 2056

# Biological values.  No fitted UI/scenario coefficients remain.
ANNUAL_GROWTH_RATE = 1.5  # yr^-1; Ladin et al. (2023), best-recall scenario
NATURAL_FRONT_SPEED_KM_YR = 25.0  # Ruzzier et al. (2025)
DIFFUSION_KM2_YR = NATURAL_FRONT_SPEED_KM_YR**2 / (4 * ANNUAL_GROWTH_RATE)
KM_PER_DEGREE_LATITUDE = 111.195  # mean spherical-Earth conversion


def load_js(path: Path, prefix: str) -> dict:
    source = path.read_text()
    if not source.startswith(prefix):
        raise ValueError(f"Unexpected bundle wrapper in {path}")
    return json.loads(source[len(prefix):].rstrip().removesuffix(";"))


def interpolated_input(record: list, values: np.ndarray) -> float:
    """Apply the pyramid's documented source-to-level remapping weights."""
    if record[2] < 0:
        return 0.0
    pairs = record[4:]
    return float(sum(values[pairs[i]] * pairs[i + 1] for i in range(0, len(pairs), 2)))


def harmonic(first: float, second: float) -> float:
    """Series conductance: either zero-permeability endpoint closes the edge."""
    return 0.0 if first <= 0 or second <= 0 else 2 * first * second / (first + second)


def build_diffusion_operator(
    records: list[list], size: float, permeability: np.ndarray
) -> tuple[np.ndarray, csc_matrix]:
    """Return land record indices and a resistance-weighted diffusion operator."""
    land_indices = np.asarray([index for index, record in enumerate(records) if record[2] >= 0], dtype=int)
    local_for_record = {int(record_index): local for local, record_index in enumerate(land_indices)}
    position_to_record = {
        (round((records[index][0] + 125.0) / size), round((records[index][1] - 24.0) / size)): index
        for index in land_indices
    }
    rows: list[int] = []
    columns: list[int] = []
    data: list[float] = []
    diagonal = np.zeros(len(land_indices), dtype=float)

    for record_index in land_indices:
        record = records[int(record_index)]
        local = local_for_record[int(record_index)]
        column = round((record[0] + 125.0) / size)
        row = round((record[1] - 24.0) / size)
        center_latitude = record[1] + size / 2
        for dc, dr in ((1, 0), (0, 1)):
            neighbor_record = position_to_record.get((column + dc, row + dr))
            if neighbor_record is None:
                continue
            neighbor_local = local_for_record[neighbor_record]
            edge_permeability = harmonic(
                float(permeability[int(record_index)]), float(permeability[neighbor_record])
            )
            if edge_permeability <= 0:
                continue
            if dc:
                distance_km = KM_PER_DEGREE_LATITUDE * math.cos(math.radians(center_latitude)) * size
            else:
                distance_km = KM_PER_DEGREE_LATITUDE * size
            coefficient = DIFFUSION_KM2_YR * edge_permeability / (distance_km**2)
            rows.extend((local, neighbor_local))
            columns.extend((neighbor_local, local))
            data.extend((coefficient, coefficient))
            diagonal[local] -= coefficient
            diagonal[neighbor_local] -= coefficient

    rows.extend(range(len(land_indices)))
    columns.extend(range(len(land_indices)))
    data.extend(diagonal.tolist())
    operator = csc_matrix((data, (rows, columns)), shape=(len(land_indices), len(land_indices)))
    return land_indices, operator


def evolve_level(
    records: list[list],
    size: float,
    initial: np.ndarray,
    climate: np.ndarray,
    geography: np.ndarray,
    model_id: str,
    years: int,
) -> np.ndarray:
    """Advance one model with exact logistic growth and implicit annual diffusion."""
    if model_id == "distance":
        permeability = np.ones(len(records))
        growth = np.zeros(len(records))
    elif model_id == "fisher":
        permeability = np.ones(len(records))
        growth = np.full(len(records), ANNUAL_GROWTH_RATE)
    elif model_id == "climate":
        permeability = climate
        growth = ANNUAL_GROWTH_RATE * climate
    elif model_id == "terrain":
        permeability = geography
        growth = np.full(len(records), ANNUAL_GROWTH_RATE)
    elif model_id == "coupled":
        permeability = climate * geography
        growth = ANNUAL_GROWTH_RATE * climate
    else:
        raise ValueError(model_id)

    land_indices, operator = build_diffusion_operator(records, size, permeability)
    solve_diffusion = factorized(eye(len(land_indices), format="csc") - operator)
    state = np.clip(initial[land_indices], 0, 1)
    land_growth = growth[land_indices]
    frames = np.zeros((years, len(records)), dtype=np.uint8)
    frames[0, land_indices] = np.rint(state * 255).astype(np.uint8)

    for frame_index in range(1, years):
        growth_factor = np.exp(land_growth)
        state = state * growth_factor / (1 + state * (growth_factor - 1))
        state = np.clip(solve_diffusion(state), 0, 1)
        frames[frame_index, land_indices] = np.rint(state * 255).astype(np.uint8)
    return frames


def main() -> None:
    spread = load_js(SOURCE_PATH, "window.LanternTraceSpread = ")
    history = load_js(HISTORY_PATH, "window.LanternTraceSpreadHistory = ")
    pyramid = load_js(PYRAMID_PATH, "window.LanternTraceSpreadGridPyramid = ")
    source_signal = np.asarray(history["signals"][str(START_YEAR)], dtype=float)
    source_climate = np.asarray([cell["climate"] for cell in spread["cells"]], dtype=float)
    source_geography = np.asarray([cell["geography"] for cell in spread["cells"]], dtype=float)
    years = list(range(START_YEAR, END_YEAR + 1))
    model_ids = ("distance", "fisher", "climate", "terrain", "coupled")
    encoded_models: dict[str, dict[str, dict]] = {model_id: {} for model_id in model_ids}
    resolution: dict[str, dict] = {}

    for level_key, records in pyramid["levels"].items():
        size = float(level_key)
        initial = np.asarray([interpolated_input(record, source_signal) for record in records])
        climate = np.asarray([interpolated_input(record, source_climate) for record in records])
        geography = np.asarray([interpolated_input(record, source_geography) for record in records])
        land_nodes = sum(record[2] >= 0 for record in records)
        resolution[level_key] = {
            "cellSizeDegrees": size,
            "totalNodes": len(records),
            "landPhysicsNodes": land_nodes,
            "approxNorthSouthKm": round(size * KM_PER_DEGREE_LATITUDE, 1),
        }
        for model_id in model_ids:
            frames = evolve_level(records, size, initial, climate, geography, model_id, len(years))
            encoded_models[model_id][level_key] = {
                "count": len(records),
                "frameCount": len(years),
                "encoding": "uint8-base64-row-major",
                "data": base64.b64encode(frames.tobytes()).decode("ascii"),
            }
            print(f"{model_id:8s} {level_key:>4s} deg: {land_nodes:5d} land physics nodes")

    payload = {
        "metadata": {
            "years": years,
            "presentYear": START_YEAR,
            "endYear": END_YEAR,
            "horizonYears": END_YEAR - START_YEAR,
            "state": "dimensionless relative establishment pressure in [0,1]",
            "equation": "du/dt = div(D P(x) grad u) + r C(x) u (1-u)",
            "solver": "one-year operator splitting: exact logistic reaction followed by backward-Euler finite-volume diffusion",
            "boundary": "no flux at water-majority cells and the national domain edge",
            "resistance": "H=C*G; cell resistance R=1/H (R=1 is the ideal baseline, H=0 is closed); edge permeability is the harmonic mean of adjacent H values",
            "parameters": {
                "annualGrowthRatePerYear": ANNUAL_GROWTH_RATE,
                "naturalFrontSpeedKmPerYear": NATURAL_FRONT_SPEED_KM_YR,
                "diffusionKm2PerYear": round(DIFFUSION_KM2_YR, 6),
                "timeStepYears": 1,
            },
            "citations": {
                "growthAndAnnualStep": "Ladin et al. 2023, Scientific Reports 13:1098, doi:10.1038/s41598-022-25989-3",
                "naturalSpreadAndResistance": "Ruzzier et al. 2025, NeoBiota 103:267-298, doi:10.3897/neobiota.103.154246",
                "climateVariables": "Wakie et al. 2020, Journal of Economic Entomology 113:306-314, doi:10.1093/jee/toz259",
            },
            "resolution": resolution,
            "caveat": "Mechanism simulation of relative pressure, not abundance, occupancy probability, or a validated national forecast. Human-assisted jumps are excluded because the literature does not identify a transferable continuous jump coefficient for this state variable.",
        },
        "models": encoded_models,
    }
    OUTPUT_PATH.write_text(
        "window.LanternTraceSpreadLongHorizon = "
        + json.dumps(payload, separators=(",", ":"))
        + ";\n"
    )
    print(f"Wrote {OUTPUT_PATH.relative_to(ROOT)} ({OUTPUT_PATH.stat().st_size / 1024 / 1024:.2f} MiB)")


if __name__ == "__main__":
    main()
