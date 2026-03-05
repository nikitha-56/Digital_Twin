import asyncio, json
import httpx
from routers.ponds import pond_scores

base='http://127.0.0.1:8000'
r=httpx.get(base+'/api/v1/pond/all')
ponds=json.loads(r.text)
pid=ponds[-1]['id']
print('invoking pond_scores for',pid)
try:
    res=asyncio.run(pond_scores(pid))
    print('result',res)
except Exception as e:
    import traceback; traceback.print_exc()
