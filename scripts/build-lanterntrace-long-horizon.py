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
WIND_PATH = ROOT / "lanterntrace/app/generated/wind-climatology.js"
HOST_PATH = ROOT / "lanterntrace/app/generated/host-vegetation.js"
OUTPUT_PATH = ROOT / "lanterntrace/app/generated/spread-long-horizon.js"
START_YEAR = 2026
END_YEAR = 2056

# Eco-RD values selected on 2019-2023 first-report targets only. The 0.28
# monthly grid coefficient corresponds to 336 km^2/yr on the solver's 20 km
# reference stencil; 0.24/month corresponds to 2.88/yr.
ANNUAL_GROWTH_RATE = 2.88
DIFFUSION_KM2_YR = 336.0
NATURAL_FRONT_SPEED_KM_YR = 2 * math.sqrt(DIFFUSION_KM2_YR * ANNUAL_GROWTH_RATE)
CLIMATE_POWER = 1.6
HOST_POWER = 1.0
MINIMUM_CONDUCTIVITY = 0.08
KM_PER_DEGREE_LATITUDE = 111.195  # mean spherical-Earth conversion

# Wind response. Myrick & Baker (2019) measured a 10.7-degree mean heading
# offset from the upwind line and a 30.9-degree mean ground-track offset. The
# difference supplies a dimensionless directional coupling; it scales the
# already-cited 25 km/yr natural front rather than inventing a second front
# velocity. Wolfin et al. (2020) report launch during lulls near 1 m/s.
WIND_HEADING_OFFSET_DEGREES = 10.7
WIND_TRACK_OFFSET_DEGREES = 30.9
WIND_RESPONSE_FRACTION = math.sin(
    math.radians(WIND_TRACK_OFFSET_DEGREES - WIND_HEADING_OFFSET_DEGREES)
)
WIND_ANEMOTAXIS_KM_YR = NATURAL_FRONT_SPEED_KM_YR * WIND_RESPONSE_FRACTION
WIND_FLIGHT_REFERENCE_MS = 1.0


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


def bilinear_wind(wind: dict, longitude: float, latitude: float) -> tuple[float, float]:
    """Interpolate the NOAA climatology to a physics-cell center."""
    latitudes = np.asarray(wind["latitudes"], dtype=float)
    longitudes = np.asarray(wind["longitudes"], dtype=float)
    latitude = float(np.clip(latitude, latitudes[-1], latitudes[0]))
    longitude = float(np.clip(longitude, longitudes[0], longitudes[-1]))
    north_index = max(0, min(len(latitudes) - 2, int(np.searchsorted(-latitudes, -latitude) - 1)))
    west_index = max(0, min(len(longitudes) - 2, int(np.searchsorted(longitudes, longitude) - 1)))
    north, south = latitudes[north_index], latitudes[north_index + 1]
    west, east = longitudes[west_index], longitudes[west_index + 1]
    south_weight = 0 if north == south else (north - latitude) / (north - south)
    east_weight = 0 if east == west else (longitude - west) / (east - west)
    width = len(longitudes)

    def component(name: str) -> float:
        values = wind[name]
        northwest = values[north_index * width + west_index]
        northeast = values[north_index * width + west_index + 1]
        southwest = values[(north_index + 1) * width + west_index]
        southeast = values[(north_index + 1) * width + west_index + 1]
        north_value = northwest + (northeast - northwest) * east_weight
        south_value = southwest + (southeast - southwest) * east_weight
        return float(north_value + (south_value - north_value) * south_weight)

    return component("u"), component("v")


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


def build_wind_operator(
    records: list[list],
    size: float,
    permeability: np.ndarray,
    wind_u: np.ndarray,
    wind_v: np.ndarray,
) -> tuple[csc_matrix, int]:
    """Build a conservative donor-cell operator for observed upwind flight."""
    land_indices = np.asarray([index for index, record in enumerate(records) if record[2] >= 0], dtype=int)
    local_for_record = {int(record_index): local for local, record_index in enumerate(land_indices)}
    position_to_record = {
        (round((records[index][0] + 125.0) / size), round((records[index][1] - 24.0) / size)): index
        for index in land_indices
    }
    rows: list[int] = []
    columns: list[int] = []
    data: list[float] = []
    outgoing = np.zeros(len(land_indices), dtype=float)

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
            edge_u = (wind_u[int(record_index)] + wind_u[neighbor_record]) / 2
            edge_v = (wind_v[int(record_index)] + wind_v[neighbor_record]) / 2
            wind_speed = math.hypot(edge_u, edge_v)
            if wind_speed <= 1e-9:
                continue
            activity = min(wind_speed / WIND_FLIGHT_REFERENCE_MS, 1.0)
            # Adults preferentially progress upwind, so the modeled drift is
            # opposite the meteorological vector shown by the particles.
            drift_u = -edge_u / wind_speed * WIND_ANEMOTAXIS_KM_YR * activity
            drift_v = -edge_v / wind_speed * WIND_ANEMOTAXIS_KM_YR * activity
            component = drift_u if dc else drift_v
            distance_km = (
                KM_PER_DEGREE_LATITUDE * math.cos(math.radians(center_latitude)) * size
                if dc else KM_PER_DEGREE_LATITUDE * size
            )
            coefficient = abs(component) * edge_permeability / distance_km
            if component > 0:
                donor, receiver = local, neighbor_local
            else:
                donor, receiver = neighbor_local, local
            rows.extend((receiver, donor))
            columns.extend((donor, donor))
            data.extend((coefficient, -coefficient))
            outgoing[donor] += coefficient

    operator = csc_matrix((data, (rows, columns)), shape=(len(land_indices), len(land_indices)))
    substeps = max(1, math.ceil(float(outgoing.max(initial=0))))
    return operator, substeps


def evolve_level(
    records: list[list],
    size: float,
    initial: np.ndarray,
    climate: np.ndarray,
    host: np.ndarray,
    model_id: str,
    years: int,
    wind_u: np.ndarray | None = None,
    wind_v: np.ndarray | None = None,
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
        permeability = host
        growth = ANNUAL_GROWTH_RATE * host
    elif model_id == "coupled":
        suitability = np.sqrt(np.power(host, HOST_POWER) * np.power(climate, CLIMATE_POWER))
        permeability = MINIMUM_CONDUCTIVITY + (1 - MINIMUM_CONDUCTIVITY) * suitability
        growth = ANNUAL_GROWTH_RATE * suitability
    else:
        raise ValueError(model_id)

    land_indices, operator = build_diffusion_operator(records, size, permeability)
    solve_diffusion = factorized(eye(len(land_indices), format="csc") - operator)
    wind_operator = None
    wind_substeps = 1
    if wind_u is not None and wind_v is not None:
        wind_operator, wind_substeps = build_wind_operator(
            records, size, permeability, wind_u, wind_v
        )
    state = np.clip(initial[land_indices], 0, 1)
    land_growth = growth[land_indices]
    frames = np.zeros((years, len(records)), dtype=np.uint8)
    frames[0, land_indices] = np.rint(state * 255).astype(np.uint8)

    for frame_index in range(1, years):
        growth_factor = np.exp(land_growth)
        state = state * growth_factor / (1 + state * (growth_factor - 1))
        state = np.clip(solve_diffusion(state), 0, 1)
        if wind_operator is not None:
            for _ in range(wind_substeps):
                state = np.clip(state + wind_operator @ state / wind_substeps, 0, 1)
        frames[frame_index, land_indices] = np.rint(state * 255).astype(np.uint8)
    return frames


def main() -> None:
    spread = load_js(SOURCE_PATH, "window.LanternTraceSpread = ")
    history = load_js(HISTORY_PATH, "window.LanternTraceSpreadHistory = ")
    pyramid = load_js(PYRAMID_PATH, "window.LanternTraceSpreadGridPyramid = ")
    wind = load_js(WIND_PATH, "window.LanternTraceWindClimatology = ")
    host_bundle = load_js(HOST_PATH, "window.LanternTraceHostVegetation = ")
    source_signal = np.asarray(history["signals"][str(START_YEAR)], dtype=float)
    source_climate = np.asarray([cell["climate"] for cell in spread["cells"]], dtype=float)
    host_by_cell = {(float(west), float(south)): float(value) for west, south, value in host_bundle["values"]}
    source_host = np.asarray([host_by_cell.get((float(cell["w"]), float(cell["s"])), 0.0)
                              for cell in spread["cells"]], dtype=float)
    years = list(range(START_YEAR, END_YEAR + 1))
    model_ids = ("distance", "fisher", "climate", "terrain", "coupled")
    encoded_models: dict[str, dict[str, dict]] = {model_id: {} for model_id in model_ids}
    wind_models: dict[str, dict[str, dict]] = {"coupled": {}}
    resolution: dict[str, dict] = {}

    for level_key, records in pyramid["levels"].items():
        size = float(level_key)
        initial = np.asarray([interpolated_input(record, source_signal) for record in records])
        climate = np.asarray([interpolated_input(record, source_climate) for record in records])
        host = np.asarray([interpolated_input(record, source_host) for record in records])
        wind_vectors = [
            bilinear_wind(wind, record[0] + size / 2, record[1] + size / 2)
            for record in records
        ]
        wind_u = np.asarray([vector[0] for vector in wind_vectors])
        wind_v = np.asarray([vector[1] for vector in wind_vectors])
        land_nodes = sum(record[2] >= 0 for record in records)
        resolution[level_key] = {
            "cellSizeDegrees": size,
            "totalNodes": len(records),
            "landPhysicsNodes": land_nodes,
            "approxNorthSouthKm": round(size * KM_PER_DEGREE_LATITUDE, 1),
        }
        for model_id in model_ids:
            frames = evolve_level(records, size, initial, climate, host, model_id, len(years))
            encoded_models[model_id][level_key] = {
                "count": len(records),
                "frameCount": len(years),
                "encoding": "uint8-base64-row-major",
                "data": base64.b64encode(frames.tobytes()).decode("ascii"),
            }
            print(f"{model_id:8s} {level_key:>4s} deg: {land_nodes:5d} land physics nodes")
        wind_frames = evolve_level(
            records, size, initial, climate, host, "coupled", len(years), wind_u, wind_v
        )
        wind_models["coupled"][level_key] = {
            "count": len(records),
            "frameCount": len(years),
            "encoding": "uint8-base64-row-major",
            "data": base64.b64encode(wind_frames.tobytes()).decode("ascii"),
        }
        print(f"{'coupled+wind':13s} {level_key:>4s} deg: {land_nodes:5d} land physics nodes")

    payload = {
        "metadata": {
            "years": years,
            "presentYear": START_YEAR,
            "endYear": END_YEAR,
            "horizonYears": END_YEAR - START_YEAR,
            "state": "dimensionless relative establishment pressure in [0,1]",
            "equation": "du/dt = div(D P(C,V) grad u) - div(v_w(x) u) + r S(C,V) u (1-u)",
            "solver": "one-year operator splitting: exact logistic reaction, backward-Euler finite-volume diffusion, then conservative donor-cell wind response",
            "boundary": "no flux at water-majority cells and the national domain edge",
            "resistance": "S=sqrt(V^1.0 C^1.6); P=0.08+0.92S; cell resistance R=1/P; edge permeability is the harmonic mean of adjacent P values",
            "parameters": {
                "annualGrowthRatePerYear": ANNUAL_GROWTH_RATE,
                "naturalFrontSpeedKmPerYear": NATURAL_FRONT_SPEED_KM_YR,
                "diffusionKm2PerYear": round(DIFFUSION_KM2_YR, 6),
                "fittedMonthlyDiffusionCoefficient": 0.28,
                "fittedMonthlyGrowthRate": 0.24,
                "hostPower": HOST_POWER,
                "climatePower": CLIMATE_POWER,
                "minimumConductivity": MINIMUM_CONDUCTIVITY,
                "timeStepYears": 1,
                "windHeadingOffsetDegrees": WIND_HEADING_OFFSET_DEGREES,
                "windTrackOffsetDegrees": WIND_TRACK_OFFSET_DEGREES,
                "windResponseFraction": round(WIND_RESPONSE_FRACTION, 6),
                "windAnemotaxisKmPerYear": round(WIND_ANEMOTAXIS_KM_YR, 6),
                "windFlightReferenceMetersPerSecond": WIND_FLIGHT_REFERENCE_MS,
            },
            "citations": {
                "fittedPhysics": "Eco-RD grid search on 2019-2023 first-report targets; research/results/eco_rd_tuning.csv",
                "publishedResistanceComparator": "Ruzzier et al. 2025, NeoBiota 103:267-298, doi:10.3897/neobiota.103.154246",
                "climateVariables": "Wakie et al. 2020, Journal of Economic Entomology 113:306-314, doi:10.1093/jee/toz259",
                "hostWeights": "Nixon et al. 2020, Environmental Entomology 49:1270-1281, doi:10.1093/ee/nvaa126",
                "windClimatology": "NOAA PSL NCEP/DOE Reanalysis II 1991-2020 mean 10 m u/v winds; Kanamitsu et al. 2002, BAMS 83:1631-1643, doi:10.1175/BAMS-83-11-1631",
                "windResponse": "Myrick & Baker 2019, Journal of Insect Behavior 32:11-23, doi:10.1007/s10905-019-09708-x; Wolfin et al. 2020, Journal of Insect Behavior 33:425-439, doi:10.1007/s10905-020-09754-w",
            },
            "resolution": resolution,
            "wind": "Optional wind-aware solve uses the NOAA 1991-2020 annual mean vector direction and observed upwind adult flight. It is a climatological mechanism comparison, not live weather or a calibrated long-range wind forecast.",
            "caveat": "Mechanism simulation of relative pressure, not abundance, occupancy probability, or a validated national forecast. Eco-RD parameters were selected retrospectively before the 2024-2025 replay; the host occurrence proxy is not vegetation biomass. Human-assisted jumps are excluded because the literature does not identify a transferable continuous jump coefficient for this state variable.",
        },
        "models": encoded_models,
        "windModels": wind_models,
    }
    OUTPUT_PATH.write_text(
        "window.LanternTraceSpreadLongHorizon = "
        + json.dumps(payload, separators=(",", ":"))
        + ";\n"
    )
    print(f"Wrote {OUTPUT_PATH.relative_to(ROOT)} ({OUTPUT_PATH.stat().st_size / 1024 / 1024:.2f} MiB)")


if __name__ == "__main__":
    main()
