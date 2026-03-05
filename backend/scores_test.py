import httpx, json
base='http://127.0.0.1:8000'
r=httpx.get(base+'/api/v1/pond/all')
print('all',r.status_code,r.text)
ponds=json.loads(r.text)
if ponds:
    pid=ponds[-1]['id']
    print('checking scores for',pid)
    r2=httpx.get(base+f'/api/v1/pond/{pid}/scores')
    print('scores status',r2.status_code)
    try:
        data = r2.json()
        print(data)
        # sanity check for mock endpoints; confidence should not be the old 0.0833
        if 'confidence' in data and abs(data['confidence'] - 0.0833) < 1e-6:
            print('WARNING: confidence still at 0.0833 for pond', pid)
    except Exception as e:
        print('text',r2.text)


# regression check for what-if disease helper
try:
    from routers.digital_twin import (
        _generate_hypothetical_disease_response,
        _generate_hypothetical_feed_response,
        _generate_hypothetical_water_response,
    )
    print("Running regression check for hypo disease response with None stocking")
    dummy = {"stocking_density": None}
    resp = _generate_hypothetical_disease_response(dummy, pond_id=1)
    print("disease helper output", resp)

    print("Checking feed helper with None pond_area/pond_depth")
    hypo = {"pond_area": None, "pond_depth": None}
    # need dummy water/disease objects: call the other helpers to generate
    w = _generate_hypothetical_water_response(hypo, pond_id=1)
    d = _generate_hypothetical_disease_response(hypo, pond_id=1)
    f = _generate_hypothetical_feed_response(hypo, d, w, pond_id=1)
    print("feed helper output", f)
except Exception as e:
    print("Regression helper raised error", e)
