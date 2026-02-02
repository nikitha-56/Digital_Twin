from models.schemas import FeedAdvice, DiseaseRisk, WaterStatus

def suggest_feed_action(water_status: WaterStatus, disease: DiseaseRisk) -> FeedAdvice:
	"""Rule-based feed suggestion:
	- STOP if disease HIGH or water DANGER
	- REDUCE if disease MEDIUM or water WARNING
	- NORMAL otherwise
	"""
	if disease.risk == "HIGH" or water_status.status == "DANGER":
		return FeedAdvice(action="STOP", reason="High disease risk or critical water conditions")

	if disease.risk == "MEDIUM" or water_status.status == "WARNING":
		return FeedAdvice(action="REDUCE", reason="Moderate stress detected")

	return FeedAdvice(action="NORMAL", reason="Conditions normal")
