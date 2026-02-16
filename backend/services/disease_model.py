from pathlib import Path
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.multioutput import MultiOutputClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score
import joblib

from models.schemas import DiseaseRisk, WaterReading


MODEL_DIR = Path(__file__).parent / "model_files"
MODEL_DIR.mkdir(parents=True, exist_ok=True)
MODEL_PATH = MODEL_DIR / "disease_rf.pkl"


def _generate_synthetic(n=2500, seed: int = 42):
	np.random.seed(seed)
	# realistic ranges
	temp = np.random.normal(28, 3, n)  # C
	ph = np.random.normal(7.8, 0.4, n)
	do = np.random.normal(5.5, 1.2, n)
	nh3 = np.abs(np.random.normal(0.03, 0.03, n))
	sal = np.random.normal(20, 5, n)

	X = pd.DataFrame({
		"temperature": temp,
		"ph": ph,
		"do": do,
		"nh3": nh3,
		"salinity": sal,
	})

	# heuristic risk scoring to build labels (synthetic but realistic patterns)
	def score_row(r):
		s = 0
		# WSSV: stressed by low DO and temp extremes
		if r["do"] < 3.5:
			s += 1
		if r["temperature"] < 18 or r["temperature"] > 32:
			s += 1
		if r["nh3"] > 0.08:
			s += 1
		return 1 if s >= 2 else 0

	def score_ahpnd(r):
		s = 0
		if r["nh3"] > 0.05:
			s += 1
		if r["salinity"] > 35:
			s += 1
		if r["ph"] < 6.8 or r["ph"] > 8.3:
			s += 1
		return 1 if s >= 2 else 0

	def score_ihhnv(r):
		# IHHNV correlated with medium salinity and overcrowding proxies (simulated)
		s = 0
		if 10 < r["salinity"] < 30:
			s += 1
		if r["temperature"] > 30:
			s += 1
		return 1 if s >= 2 else 0

	y1 = X.apply(score_row, axis=1)
	y2 = X.apply(score_ahpnd, axis=1)
	y3 = X.apply(score_ihhnv, axis=1)

	Y = pd.DataFrame({"WSSV": y1, "AHPND": y2, "IHHNV": y3})
	return X, Y


def _train_and_save(path: Path = MODEL_PATH):
	X, Y = _generate_synthetic()
	X_train, X_test, y_train, y_test = train_test_split(X, Y, test_size=0.2, random_state=42)

	base = RandomForestClassifier(n_estimators=100, random_state=42)
	clf = MultiOutputClassifier(base)
	clf.fit(X_train, y_train)

	y_pred = clf.predict(X_test)
	# report per-disease
	reports = {}
	for i, col in enumerate(y_test.columns):
		reports[col] = classification_report(y_test[col], y_pred[:, i], output_dict=True)

	# Save model + feature names
	joblib.dump({"model": clf, "features": list(X.columns), "reports": reports}, path)
	return clf, reports


def _load_model(path: Path = MODEL_PATH):
	if not path.exists():
		clf, reports = _train_and_save(path)
		return clf
	data = joblib.load(path)
	return data["model"]


_MODEL = None


def _ensure_model():
	global _MODEL
	if _MODEL is None:
		_MODEL = _load_model()
	return _MODEL


def assess_disease_risk(reading: WaterReading) -> DiseaseRisk:
	"""Predict disease presence probabilities and return an overall risk level.

	Input: `reading` a `WaterReading` pydantic model with numeric fields.
	Output: `DiseaseRisk` with overall LOW/MEDIUM/HIGH and factor probabilities.
	"""
	model = _ensure_model()

	# fill missing values with conservative defaults (means from synthetic data)
	defaults = {"temperature": 28.0, "ph": 7.8, "do": 5.5, "nh3": 0.03, "salinity": 20.0}
	feat = [
		reading.temperature if reading.temperature is not None else defaults["temperature"],
		reading.ph if reading.ph is not None else defaults["ph"],
		reading.do if reading.do is not None else defaults["do"],
		reading.nh3 if reading.nh3 is not None else defaults["nh3"],
		reading.salinity if reading.salinity is not None else defaults["salinity"],
	]

	# MultiOutputClassifier doesn't expose a single vectorized predict_proba; call estimators_
	probs = []
	try:
		for est in model.estimators_:
			p = est.predict_proba([feat])
			# p is [[prob_class0, prob_class1]]
			probs.append(float(p[0][1]))
	except Exception:
		# fallback: predict then map 0/1 to probabilities
		preds = model.predict([feat])[0]
		probs = [float(p) for p in preds]

	names = ["WSSV", "AHPND", "IHHNV"]
	factors = [f"{n}:{p:.2f}" for n, p in zip(names, probs)]

	overall_p = max(probs) if probs else 0.0
	if overall_p < 0.33:
		overall = "LOW"
	elif overall_p < 0.66:
		overall = "MEDIUM"
	else:
		overall = "HIGH"

	return DiseaseRisk(risk=overall, factors=factors)


if __name__ == "__main__":
	# simple CLI to train and print reports
	clf = _ensure_model()
	print("Model is ready at:", MODEL_PATH)
