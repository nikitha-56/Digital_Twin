from models.schemas import DiseaseRisk, WaterStatus

def assess_disease_risk(water_status: WaterStatus) -> DiseaseRisk:
	"""Map water status to disease risk simply:
	GOOD -> LOW, WARNING -> MEDIUM, DANGER -> HIGH
	"""
	mapping = {
		"GOOD": "LOW",
		"WARNING": "MEDIUM",
		"DANGER": "HIGH",
	}

	risk = mapping.get(water_status.status, "LOW")
	factors = water_status.reasons or []
	return DiseaseRisk(risk=risk, factors=factors)
