from typing import List
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from datetime import timedelta
from models.schemas import WaterReading


def _create_lag_features(series: List[float], lags=3):
    X = []
    y = []
    for i in range(lags, len(series)):
        X.append([series[i - j - 1] for j in range(lags)])
        y.append(series[i])
    return np.array(X), np.array(y)


def predict_future(readings: List[WaterReading], hours: int = 24):
    """Simple ML-based predictor using lag features + RandomForest per-parameter.

    readings: chronological list (oldest->newest)
    returns: list of predicted dicts for next `hours` steps (hourly)
    """
    # extract time series for each parameter
    temps = [r.temperature if r.temperature is not None else 28.0 for r in readings]
    phs = [r.ph if r.ph is not None else 7.8 for r in readings]
    dos = [r.do if r.do is not None else 5.5 for r in readings]

    preds = []
    params = {
        'temperature': temps,
        'ph': phs,
        'do': dos,
    }

    models = {}
    for k, series in params.items():
        if len(series) < 6:
            models[k] = None
            continue
        X, y = _create_lag_features(series, lags=3)
        rf = RandomForestRegressor(n_estimators=50, random_state=42)
        rf.fit(X, y)
        models[k] = rf

    # iterative forecasting using last known values
    last = {k: list(v)[-3:] if len(v) >= 3 else list(v) + [v[-1]]*(3-len(v)) for k, v in params.items()}

    for h in range(hours):
        step = {}
        for k, model in models.items():
            if model is None:
                val = last[k][-1]
            else:
                feat = np.array(last[k][-3:][::-1]).reshape(1, -1)
                val = float(model.predict(feat)[0])
            step[k] = val
            last[k].append(val)
            if len(last[k]) > 10:
                last[k].pop(0)
        preds.append(step)

    return preds


def evaluate_water(reading: WaterReading):
    """Keep the earlier rule-based evaluation but use thresholds.
    Returns a simple WaterStatus-like dict
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

    return {"status": status, "reasons": reasons}
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

