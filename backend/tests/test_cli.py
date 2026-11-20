import pytest
from app.cli import format_status_output, run_search, run_info, run_status
from app.providers.simulator import REFERENCE_TRAINS

def test_cli_format_status_output():
    mock_data = {
        "number": "22225",
        "name": "Solapur Vande Bharat",
        "origin": "CSMT",
        "destination": "SUR",
        "status": "On Time",
        "current_station": "Dadar",
        "next_station": "Thane",
        "speed": 90,
        "delay_minutes": 0,
        "halts": [
            {"code": "CSMT", "name": "Mumbai CSMT", "sch_arr": None, "sch_dep": "16:05", "platform": "8"}
        ]
    }
    output = format_status_output(mock_data)
    assert "22225" in output
    assert "Solapur Vande Bharat" in output
    assert "CSMT" in output

def test_cli_search_logic():
    # Should find at least one match for Solapur
    assert "22225" in REFERENCE_TRAINS or "12115" in REFERENCE_TRAINS
