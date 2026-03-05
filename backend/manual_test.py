import httpx, json
base='http://127.0.0.1:8000'
new={'pond_name':'Test1'}
r=httpx.post(base+'/api/v1/pond/add',json=new)
print('create',r.status_code,r.text)
if r.status_code==200:
    pid=json.loads(r.text)['id']
    print('id',pid)
    r2=httpx.get(base+f'/api/v1/pond/{pid}')
    print('get',r2.status_code,r2.text)
    r3=httpx.get(base+f'/api/v1/pond/{pid}/scores')
    print('scores',r3.status_code,r3.text)
