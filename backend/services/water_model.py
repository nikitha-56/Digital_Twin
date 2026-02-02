from models.schemas import WaterReading, WaterStatus


def evaluate_water(reading: WaterReading) -> WaterStatus:
	"""Simple rule-based evaluation returning GOOD / WARNING / DANGER and reasons.

	Rules (Phase-1):
	- DANGER if DO < 3 OR nh3 > 0.2
	- WARNING if DO between 3-5 OR nh3 between 0.02-0.2 OR pH outside 6.5-8.5
	- GOOD otherwise
	"""
	reasons = []
	status = "GOOD"

	if reading.do is not None:
		if reading.do < 3:
			reasons.append(f"Low DO: {reading.do}")
			status = "DANGER"
		elif reading.do < 5:
			reasons.append(f"Moderate DO: {reading.do}")
			if status != "DANGER":
				status = "WARNING"

	if reading.nh3 is not None:
		if reading.nh3 > 0.2:
			reasons.append(f"High NH3: {reading.nh3}")
			status = "DANGER"
		elif reading.nh3 > 0.02:
			reasons.append(f"Elevated NH3: {reading.nh3}")
			if status != "DANGER":
				status = "WARNING"

	if reading.ph is not None:
		if reading.ph < 6.5 or reading.ph > 8.5:
			reasons.append(f"pH out of optimal range: {reading.ph}")
			if status != "DANGER":
				status = "WARNING"

	if reading.temperature is not None:
		if reading.temperature < 15 or reading.temperature > 35:
			reasons.append(f"Temperature stress: {reading.temperature}")
			if status != "DANGER":
				status = "WARNING"

	return WaterStatus(status=status, reasons=reasons)

