#!/usr/bin/env python3
"""Build the multi-resolution LanternTrace display grid with a U.S. land mask."""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
import xml.etree.ElementTree as ET
import zipfile


ROOT = Path(__file__).resolve().parents[1]
SOURCE_PATH = ROOT / "lanterntrace/app/generated/spread-explainer.js"
OUTPUT_PATH = ROOT / "lanterntrace/app/generated/spread-grid-pyramid.js"
DEFAULT_BOUNDARY_ZIP = Path(
    "/Users/alexdils/Downloads/stanford/projects/laternfly/applications/"
    "lanterntrace-explorer/.model-cache/cb_2025_us_state_500k.zip"
)
SIZES = (1.0, 0.75, 0.5, 0.25)
SAMPLE_AXIS = 5
KML_NAMESPACE = {"kml": "http://www.opengis.net/kml/2.2"}


def load_bundle() -> dict:
    source = SOURCE_PATH.read_text()
    prefix = "window.LanternTraceSpread = "
    if not source.startswith(prefix):
        raise ValueError(f"Unexpected spread bundle wrapper in {SOURCE_PATH}")
    return json.loads(source[len(prefix):].rstrip().removesuffix(";"))


def parse_coordinates(node: ET.Element | None) -> list[tuple[float, float]]:
    if node is None or not node.text:
        return []
    points = []
    for coordinate in node.text.split():
        longitude, latitude, *_ = coordinate.split(",")
        points.append((float(longitude), float(latitude)))
    return points


def load_conus_polygons(boundary_zip: Path, bounds: tuple[float, float, float, float]):
    west, south, east, north = bounds
    with zipfile.ZipFile(boundary_zip) as archive:
        kml_name = next(name for name in archive.namelist() if name.endswith(".kml"))
        root = ET.fromstring(archive.read(kml_name))

    polygons = []
    for polygon_node in root.findall(".//kml:Polygon", KML_NAMESPACE):
        outer_node = polygon_node.find(
            "./kml:outerBoundaryIs/kml:LinearRing/kml:coordinates", KML_NAMESPACE
        )
        outer = parse_coordinates(outer_node)
        if len(outer) < 4:
            continue
        polygon_west = min(point[0] for point in outer)
        polygon_east = max(point[0] for point in outer)
        polygon_south = min(point[1] for point in outer)
        polygon_north = max(point[1] for point in outer)
        if polygon_east < west or polygon_west > east or polygon_north < south or polygon_south > north:
            continue
        holes = [
            parse_coordinates(node)
            for node in polygon_node.findall(
                "./kml:innerBoundaryIs/kml:LinearRing/kml:coordinates", KML_NAMESPACE
            )
        ]
        polygons.append(
            {
                "outer": outer,
                "holes": [hole for hole in holes if len(hole) >= 4],
                "bbox": (polygon_west, polygon_south, polygon_east, polygon_north),
            }
        )
    return polygons


def point_in_ring(longitude: float, latitude: float, ring: list[tuple[float, float]]) -> bool:
    inside = False
    previous_longitude, previous_latitude = ring[-1]
    for current_longitude, current_latitude in ring:
        crosses = (current_latitude > latitude) != (previous_latitude > latitude)
        if crosses:
            intersection = (
                (previous_longitude - current_longitude)
                * (latitude - current_latitude)
                / (previous_latitude - current_latitude)
                + current_longitude
            )
            if longitude < intersection:
                inside = not inside
        previous_longitude, previous_latitude = current_longitude, current_latitude
    return inside


def polygon_index(polygons):
    index: dict[tuple[int, int], list[int]] = {}
    for polygon_index_value, polygon in enumerate(polygons):
        west, south, east, north = polygon["bbox"]
        for longitude_bin in range(math.floor(west), math.floor(east) + 1):
            for latitude_bin in range(math.floor(south), math.floor(north) + 1):
                index.setdefault((longitude_bin, latitude_bin), []).append(polygon_index_value)
    return index


def is_us_land(longitude: float, latitude: float, polygons, spatial_index) -> bool:
    candidates = spatial_index.get((math.floor(longitude), math.floor(latitude)), ())
    for polygon_index_value in candidates:
        polygon = polygons[polygon_index_value]
        west, south, east, north = polygon["bbox"]
        if not (west <= longitude <= east and south <= latitude <= north):
            continue
        if not point_in_ring(longitude, latitude, polygon["outer"]):
            continue
        if any(point_in_ring(longitude, latitude, hole) for hole in polygon["holes"]):
            continue
        return True
    return False


def land_fraction(west: float, south: float, size: float, polygons, spatial_index) -> float:
    land_samples = 0
    for row in range(SAMPLE_AXIS):
        latitude = south + (row + 0.5) * size / SAMPLE_AXIS
        for column in range(SAMPLE_AXIS):
            longitude = west + (column + 0.5) * size / SAMPLE_AXIS
            land_samples += is_us_land(longitude, latitude, polygons, spatial_index)
    return land_samples / (SAMPLE_AXIS * SAMPLE_AXIS)


def nearest_weights(longitude: float, latitude: float, cells, source_by_grid, grid):
    parent_column = math.floor((longitude - grid["west"]) / grid["stepDegrees"])
    parent_row = math.floor((latitude - grid["south"]) / grid["stepDegrees"])
    candidates = []
    for row in range(parent_row - 2, parent_row + 3):
        for column in range(parent_column - 2, parent_column + 3):
            source_index = source_by_grid.get((row, column))
            if source_index is None:
                continue
            source = cells[source_index]
            dx = (longitude - (source["w"] + 0.5)) * math.cos(math.radians(latitude))
            dy = latitude - (source["s"] + 0.5)
            candidates.append((dx * dx + dy * dy, source_index))
    if not candidates:
        for source_index, source in enumerate(cells):
            dx = (longitude - (source["w"] + 0.5)) * math.cos(math.radians(latitude))
            dy = latitude - (source["s"] + 0.5)
            candidates.append((dx * dx + dy * dy, source_index))
    candidates.sort()
    nearest = candidates[:4]
    if nearest[0][0] < 1e-12:
        return nearest[0][1], ((nearest[0][1], 1.0),)
    raw_weights = [1 / max(distance_squared, 1e-6) for distance_squared, _ in nearest]
    total = sum(raw_weights)
    weights = tuple(
        (source_index, round(raw_weight / total, 6))
        for raw_weight, (_, source_index) in zip(raw_weights, nearest)
    )
    return nearest[0][1], weights


def build_level(size, cells, source_by_grid, grid, polygons, spatial_index):
    records = []
    land_count = 0
    south = grid["south"]
    while south < grid["north"] - 1e-9:
        west = grid["west"]
        while west < grid["east"] - 1e-9:
            fraction = land_fraction(west, south, size, polygons, spatial_index)
            record = [round(west, 4), round(south, 4)]
            if fraction > 0.5:
                center_longitude = min(west + size / 2, grid["east"] - 1e-6)
                center_latitude = min(south + size / 2, grid["north"] - 1e-6)
                parent_index, weights = nearest_weights(
                    center_longitude, center_latitude, cells, source_by_grid, grid
                )
                record.extend((parent_index, round(fraction, 3)))
                for source_index, weight in weights:
                    record.extend((source_index, weight))
                land_count += 1
            else:
                record.extend((-1, round(fraction, 3)))
            records.append(record)
            west += size
        south += size
    return records, land_count


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--boundary-zip", type=Path, default=DEFAULT_BOUNDARY_ZIP)
    args = parser.parse_args()
    bundle = load_bundle()
    cells = bundle["cells"]
    grid = bundle["metadata"]["grid"]
    bounds = (grid["west"], grid["south"], grid["east"], grid["north"])
    polygons = load_conus_polygons(args.boundary_zip, bounds)
    spatial_index = polygon_index(polygons)
    source_by_grid = {(cell["r"], cell["c"]): index for index, cell in enumerate(cells)}

    levels = {}
    counts = {}
    for size in SIZES:
        records, land_count = build_level(
            size, cells, source_by_grid, grid, polygons, spatial_index
        )
        key = str(size).rstrip("0").rstrip(".")
        levels[key] = records
        counts[key] = {
            "total": len(records),
            "landMajority": land_count,
            "zeroEnforced": len(records) - land_count,
        }
        print(f"{key}°: {counts[key]}")

    pyramid = {
        "metadata": {
            "sourceCellSizeDegrees": grid["stepDegrees"],
            "sizes": list(SIZES),
            "landThreshold": 0.5,
            "landFractionSamplesPerCell": SAMPLE_AXIS * SAMPLE_AXIS,
            "method": "Inverse-distance remapping of observations and environmental inputs over up to four nearby 1-degree land-cell centers; each level is then solved as its own finite-volume physics grid.",
            "waterRule": "Cells with 50% or less U.S. land are retained in the grid and forced to zero.",
            "boundarySource": "U.S. Census Bureau 2025 1:500,000 state cartographic boundaries.",
            "caveat": "Smaller cells add physics nodes and resolve resistance boundaries more finely, but do not create new observations or independent environmental evidence.",
            "counts": counts,
        },
        "levels": levels,
    }
    OUTPUT_PATH.write_text(
        "window.LanternTraceSpreadGridPyramid = "
        + json.dumps(pyramid, separators=(",", ":"))
        + ";\n"
    )
    print(f"Wrote {OUTPUT_PATH.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
