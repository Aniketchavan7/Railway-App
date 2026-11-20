"""Unit tests for geospatial Haversine calculations and station proximity search."""

import pytest
from app.services.geo_utils import haversine_distance_km, find_nearest_station


def test_haversine_distance_known_coordinates():
    """Verify distance between New Delhi (NDLS) and Mumbai Central (MMCT)."""
    # NDLS: 28.6143, 77.2188; MMCT: 18.9696, 72.8194
    dist = haversine_distance_km(28.6143, 77.2188, 18.9696, 72.8194)
    # Expected approximate great-circle distance is ~1150-1170 km
    assert 1140.0 < dist < 1180.0


def test_haversine_zero_distance():
    """Verify identical points return 0.0 km."""
    assert haversine_distance_km(28.6143, 77.2188, 28.6143, 77.2188) == 0.0


def test_find_nearest_station_success():
    """Verify finding the nearest station from a coordinate pair."""
    stations = [
        {"code": "NDLS", "name": "New Delhi", "latitude": 28.6143, "longitude": 77.2188},
        {"code": "NZM", "name": "Hazrat Nizamuddin", "latitude": 28.5888, "longitude": 77.2536},
        {"code": "BCT", "name": "Mumbai Central", "latitude": 18.9696, "longitude": 72.8194},
    ]

    # Query coordinate near Hazrat Nizamuddin
    query_lat, query_lon = 28.59, 77.25
    result = find_nearest_station(query_lat, query_lon, stations, max_radius_km=25.0)

    assert result is not None
    station, distance = result
    assert station["code"] == "NZM"
    assert distance < 5.0


def test_find_nearest_station_out_of_radius():
    """Verify None returned when all stations are outside max_radius_km."""
    stations = [
        {"code": "BCT", "name": "Mumbai Central", "latitude": 18.9696, "longitude": 72.8194},
    ]
    # Query coordinate in Delhi
    result = find_nearest_station(28.6143, 77.2188, stations, max_radius_km=50.0)
    assert result is None
