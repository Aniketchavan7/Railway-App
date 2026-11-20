"""Geospatial calculations and station proximity utilities for Railway-App."""

import math
from typing import Dict, List, Optional, Tuple


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great-circle distance between two points on the Earth (Haversine formula).

    Args:
        lat1, lon1: Coordinates of the first point in decimal degrees.
        lat2, lon2: Coordinates of the second point in decimal degrees.

    Returns:
        Distance in kilometers.
    """
    earth_radius_km = 6371.0

    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))

    return round(earth_radius_km * c, 2)


def find_nearest_station(
    current_lat: float,
    current_lon: float,
    stations: List[Dict[str, any]],
    max_radius_km: float = 100.0,
) -> Optional[Tuple[Dict[str, any], float]]:
    """Find the nearest railway station within a maximum search radius.

    Args:
        current_lat, current_lon: Current geographic position.
        stations: List of station dictionaries containing 'latitude', 'longitude', and 'code'.
        max_radius_km: Upper limit on proximity in kilometers.

    Returns:
        Tuple of (station_dict, distance_km) or None if no station is within radius.
    """
    nearest = None
    min_dist = float("inf")

    for stn in stations:
        lat = stn.get("latitude")
        lon = stn.get("longitude")
        if lat is None or lon is None:
            continue

        dist = haversine_distance_km(current_lat, current_lon, float(lat), float(lon))
        if dist < min_dist and dist <= max_radius_km:
            min_dist = dist
            nearest = stn

    if nearest is not None:
        return nearest, min_dist
    return None
