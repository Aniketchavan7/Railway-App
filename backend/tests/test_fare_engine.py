from app.services.fare_engine import TelescopicFareEngine


def test_telescopic_fare_calculation():
    # Distance between CSMT and PUNE is approx 192 km
    result = TelescopicFareEngine.calculate_all_classes(
        train_number="12101",
        train_name="Jnaneswari Super Deluxe Express",
        origin="CSMT",
        destination="PUNE",
        quota="GN",
    )

    assert result.distance_km == 192.0
    assert result.origin_station == "CSMT"
    assert result.destination_station == "PUNE"
    assert len(result.classes) == 7

    # Check that Sleeper fare is realistic (Base ~₹92.16 clamped to min ₹100 + ₹20 res + ₹30 superfast = ~₹150)
    sl_class = next(c for c in result.classes if c.class_code == "SL")
    assert sl_class.total_fare >= 140.0
    assert sl_class.gst == 0.0  # No GST on sleeper

    # Check 3A has 5% GST
    ac3_class = next(c for c in result.classes if c.class_code == "3A")
    assert ac3_class.gst > 0.0
    assert ac3_class.total_fare > sl_class.total_fare


def test_tatkal_quota_calculation():
    # Tatkal surcharge applied
    gn_result = TelescopicFareEngine.compute_fare_for_class("3A", 500.0, quota="GN")
    tq_result = TelescopicFareEngine.compute_fare_for_class("3A", 500.0, quota="TQ")

    assert tq_result.tatkal_surcharge >= 300.0
    assert tq_result.total_fare > gn_result.total_fare
