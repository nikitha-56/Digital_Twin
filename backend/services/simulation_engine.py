from services.water_model import predict_future, evaluate_water
from services.disease_model import assess_disease_risk
from services import storage

async def run_simulation(pond_id: int, adjustments: dict, hours: int = 24):
    """Adjustments: dict like {"temperature": +2, "do": -1}

    Steps:
    - fetch latest history
    - apply adjustments to latest reading
    - run disease prediction on adjusted reading
    - predict future water using ML predictor (apply adjustments to initial values)
    - return results dict
    """
    # fetch history
    hist = await storage.get_water_history(pond_id, limit=200)
    if not hist:
        # no data: create synthetic base
        base = []
    else:
        base = list(reversed(hist))  # oldest -> newest

    # apply adjustments to newest reading
    if base:
        latest = base[-1]
        adj_reading = type(latest)(pond_id=latest.pond_id, ph=latest.ph, do=latest.do, temperature=latest.temperature, salinity=latest.salinity, nh3=latest.nh3, timestamp=latest.timestamp)
    else:
        from models.schemas import WaterReading
        adj_reading = WaterReading(ph=7.8, do=5.5, temperature=28.0, salinity=20.0, nh3=0.03)

    # apply adjustments
    for k, v in adjustments.items():
        if hasattr(adj_reading, k):
            val = getattr(adj_reading, k) or 0
            setattr(adj_reading, k, val + v)

    # disease prediction
    disease = assess_disease_risk(adj_reading)

    # prepare readings list for predictor: convert base WaterReading pydantic-like to models.services WaterReading objects
    from models.schemas import WaterReading as PydanticWR
    pyd_list = [PydanticWR(ph=r.ph, do=r.do, temperature=r.temperature, salinity=r.salinity, nh3=r.nh3, timestamp=r.timestamp) for r in base]
    pyd_list.append(adj_reading)

    forecasts = predict_future(pyd_list, hours=hours)

    results = {
        'adjusted_initial': adj_reading.dict() if hasattr(adj_reading, 'dict') else vars(adj_reading),
        'disease': disease.dict() if hasattr(disease, 'dict') else {'risk': disease.risk, 'factors': disease.factors},
        'forecasts': forecasts
    }

    # save simulation
    await storage.save_simulation(pond_id, adjustments, results)
    return results
