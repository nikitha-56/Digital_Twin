from models.schemas import DigitalTwinResponse, VisualState
from models.schemas import WaterStatus, DiseaseRisk, FeedAdvice


def combine_models(pond_id: int, water: WaterStatus, disease: DiseaseRisk, feed: FeedAdvice) -> DigitalTwinResponse:
	"""Combine model outputs into a unified digital twin state.

	overall_status is the worst-case among components.
	visual provides a simple color/hint mapping.
	"""
	# Determine overall
	worst = "GOOD"
	if water.status == "DANGER" or disease.risk == "HIGH" or feed.action == "STOP":
		worst = "DANGER"
	elif water.status == "WARNING" or disease.risk == "MEDIUM" or feed.action == "REDUCE":
		worst = "WARNING"

	color = "green"
	hint = "All good"
	if worst == "WARNING":
		color = "yellow"
		hint = "Some parameters need attention"
	if worst == "DANGER":
		color = "red"
		hint = "Immediate action recommended"

	visual = VisualState(color=color, hint=hint)

	return DigitalTwinResponse(
		pond_id=pond_id,
		overall_status=worst,
		water=water,
		disease=disease,
		feed=feed,
		visual=visual,
	)

