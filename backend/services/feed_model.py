from typing import Dict
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from models.schemas import FeedAdvice, WaterStatus


def suggest_feed_action_ml(water: Dict, disease_risk: Dict, pond_area: float, biomass_kg: float):
	"""Simple regression-based suggestion for feed amount (kg) per feeding.

	Uses a small heuristic model (RandomForest) trained on synthetic data.
	Returns dict with amount_kg and action.
	"""
	# create synthetic training on the fly
	rng = np.random.RandomState(42)
	n = 800
	# features: temp, ph, do, nh3, salinity, risk_level(0-2), area, biomass
	temp = rng.normal(28, 3, n)
	ph = rng.normal(7.8, 0.4, n)
	do = rng.normal(5.5, 1.2, n)
	nh3 = np.abs(rng.normal(0.03, 0.03, n))
	sal = rng.normal(20, 5, n)
	risk = rng.randint(0, 3, n)
	area = rng.normal(400, 200, n)
	biomass = rng.normal(50, 20, n)

	X = np.vstack([temp, ph, do, nh3, sal, risk, area, biomass]).T
	# target: feed amount influenced by biomass, temp, DO, and risk
	y = biomass * 0.02 + (28 - temp) * 0.01 + (5 - do) * 0.02 - risk * 0.01 + rng.normal(0, 0.5, n)
	y = np.clip(y, 0, None)

	model = RandomForestRegressor(n_estimators=60, random_state=42)
	model.fit(X, y)

	# prepare input
	rlevel = 0
	if disease_risk.get('overall') == 'MEDIUM' or disease_risk.get('overall') == 'MED':
		rlevel = 1
	if disease_risk.get('overall') == 'HIGH' or disease_risk.get('overall') == 'HIG':
		rlevel = 2

	feat = np.array([[water.get('temperature', 28.0), water.get('ph', 7.8), water.get('do', 5.5), water.get('nh3', 0.03), water.get('salinity', 20.0), rlevel, pond_area, biomass_kg]])
	amt = float(model.predict(feat)[0])
	# action mapping
	if amt <= 0.01 or disease_risk.get('overall') == 'HIGH':
		action = 'STOP'
	elif disease_risk.get('overall') == 'MEDIUM' or amt < 0.5:
		action = 'REDUCE'
	else:
		action = 'NORMAL'

	return FeedAdvice(action=action, reason=f"Suggested {amt:.2f} kg"), amt


def suggest_feed_action(water_status: WaterStatus, disease):
	# keep compatibility: simple mapping
	if hasattr(disease, 'risk'):
		overall = disease.risk
	else:
		overall = disease.get('overall') if isinstance(disease, dict) else 'LOW'

	if overall == 'HIGH' or water_status.status == 'DANGER':
		return FeedAdvice(action='STOP', reason='High disease risk or critical water conditions')
	if overall == 'MEDIUM' or water_status.status == 'WARNING':
		return FeedAdvice(action='REDUCE', reason='Moderate stress detected')
	return FeedAdvice(action='NORMAL', reason='Conditions normal')
