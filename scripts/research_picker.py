"""Transparent deterministic research selection and audit log.
Not a predictor of genuinely random lotteries. Requires >=30 verified draws.
"""
import datetime as dt, hashlib, json, random
from pathlib import Path
DATA=Path('data/draws.json')
OUT=Path('data/model-picks.json')
def next_draw(today):
    d=today
    while d.weekday() not in (2,5) or d<=today:
        d+=dt.timedelta(days=1)
    return d
def main():
    records=json.loads(DATA.read_text())
    verified=[r for r in records if r.get('verification')=='two-source']
    if len(verified)<30:
        print(f'Not enough verified historical records: {len(verified)}/30; no research model prediction published.')
        return
    day=next_draw(dt.datetime.now(dt.timezone(dt.timedelta(hours=13))).date()).isoformat()
    history=json.loads(OUT.read_text()) if OUT.exists() else []
    if any(r['target_date']==day for r in history):return
    seed=int.from_bytes(hashlib.sha256((day+'|lottolab-research-v1').encode()).digest()[:8],'big')
    rng=random.Random(seed)
    picks=sorted(rng.sample(range(1,41),6))
    power=rng.randint(1,14)
    history.append({'target_date':day,'numbers':picks,'powerball':power,'method':'random_baseline_v1','created_utc':dt.datetime.now(dt.timezone.utc).isoformat(),'verified_sample_size':len(verified),'status':'pending'})
    OUT.parent.mkdir(parents=True,exist_ok=True)
    OUT.write_text(json.dumps(history,indent=2)+'\n')
if __name__=='__main__':main()
