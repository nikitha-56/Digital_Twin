# Test file to verify fixes
# FIX 2: Map water params to use readings from current_water API response
water_reading_map = {
    "temperature": None,  # Would be current_water.current_readings.temperature
    "ph": None,
    "do": None,
    "ammonia": None,
    "nitrate": None,
    "turbidity": None,
    "salinity": None,
}

# FIX 3: Add override params
override_params = [
    ("bsi_override", None),
    ("risk_level_override", None),
    ("shrimp_stage", None),
    ("feed_type", None),
    ("molting_stage", None),
]
