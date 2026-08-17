#!/usr/bin/env python3
"""Build a compact 1991-2020 mean 10 m wind field for LanternTrace.

The source is the NOAA PSL NCEP/DOE Reanalysis II monthly-mean Gaussian-grid
u/v wind archive.  OPeNDAP slicing keeps the reproducible download small.
"""

from __future__ import annotations

import json
import ssl
from pathlib import Path
from urllib.request import urlopen

import numpy as np

try:
    import certifi
except ImportError:  # pragma: no cover - system Python may already trust NOAA
    certifi = None


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_PATH = ROOT / "lanterntrace/app/generated/wind-climatology.js"
BASE_URL = (
    "https://psl.noaa.gov/thredds/dodsC/Datasets/ncep.reanalysis2/"
    "Monthlies/gaussian_grid"
)

# NCEP/DOE Reanalysis II begins at 1979-01.  These inclusive indices select
# the standard 30-year 1991-2020 climate-normal period.
TIME_START = 12 * (1991 - 1979)
TIME_END = TIME_START + 30 * 12 - 1
LAT_START, LAT_END = 20, 33
LON_START, LON_END = 125, 157


def parse_section(source: str, marker: str) -> list[float]:
    lines = source.splitlines()
    start = next(index for index, line in enumerate(lines) if line.startswith(marker)) + 1
    values: list[float] = []
    for line in lines[start:]:
        if not line.strip():
            break
        payload = line.split("],", 1)[1] if line.startswith("[") else line
        values.extend(float(value.strip()) for value in payload.split(",") if value.strip())
    return values


def fetch_component(variable: str) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    query = (
        f"{variable}[{TIME_START}:1:{TIME_END}][0:1:0]"
        f"[{LAT_START}:1:{LAT_END}][{LON_START}:1:{LON_END}]"
    )
    url = f"{BASE_URL}/{variable}.10m.mon.mean.nc.ascii?{query}"
    context = ssl.create_default_context(cafile=certifi.where()) if certifi else None
    with urlopen(url, timeout=90, context=context) as response:
        source = response.read().decode("utf-8")
    latitudes = np.asarray(parse_section(source, f"{variable}.lat["), dtype=float)
    longitudes = np.asarray(parse_section(source, f"{variable}.lon["), dtype=float)
    values = np.asarray(parse_section(source, f"{variable}.{variable}["), dtype=float)
    values = values.reshape(30 * 12, 1, len(latitudes), len(longitudes))[:, 0]
    return values.mean(axis=0), latitudes, longitudes


def main() -> None:
    eastward, latitudes, longitudes = fetch_component("uwnd")
    northward, v_latitudes, v_longitudes = fetch_component("vwnd")
    if not np.allclose(latitudes, v_latitudes) or not np.allclose(longitudes, v_longitudes):
        raise ValueError("NOAA u/v wind grids do not align")
    longitudes = np.where(longitudes > 180, longitudes - 360, longitudes)
    speed = np.hypot(eastward, northward)
    payload = {
        "metadata": {
            "name": "1991-2020 mean 10 m wind",
            "period": "1991-2020",
            "units": "m s^-1",
            "direction": "u is eastward and v is northward; particles move toward the vector destination",
            "source": "NOAA Physical Sciences Laboratory NCEP/DOE Reanalysis II monthly means",
            "sourceUrl": "https://psl.noaa.gov/data/gridded/data.ncep.reanalysis2.html",
            "citation": "Kanamitsu et al. (2002), Bulletin of the American Meteorological Society 83:1631-1643",
            "doi": "10.1175/BAMS-83-11-1631",
            "grid": {
                "latitudeCount": len(latitudes),
                "longitudeCount": len(longitudes),
                "latitudeDescending": True,
            },
            "speedRange": [round(float(speed.min()), 3), round(float(speed.max()), 3)],
            "caveat": "Thirty-year annual mean near-surface reanalysis vectors; not live weather or local canopy wind.",
        },
        "latitudes": np.round(latitudes, 4).tolist(),
        "longitudes": np.round(longitudes, 4).tolist(),
        "u": np.round(eastward, 3).ravel().tolist(),
        "v": np.round(northward, 3).ravel().tolist(),
    }
    OUTPUT_PATH.write_text(
        "window.LanternTraceWindClimatology = "
        + json.dumps(payload, separators=(",", ":"))
        + ";\n"
    )
    print(
        f"Wrote {OUTPUT_PATH.relative_to(ROOT)} with "
        f"{len(latitudes)}x{len(longitudes)} vectors; "
        f"speed {speed.min():.2f}-{speed.max():.2f} m/s"
    )


if __name__ == "__main__":
    main()
