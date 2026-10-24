"""Auditable LottoLab research models. Zero promises of predicting a fair lottery.

Every backtest uses only earlier two-source-verified draws.
Prospective picks are written once before their target date and scored only
against verified outcomes. Old picks are never regenerated or overwritten.
"""
import argparse
import datetime as dt
import json
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT=Path(__file__).resolve().parents[1]
DRAW_FILE=ROOT/'data/draws.json'
PICK_FILE=ROOT/'data/model-picks.json'
REPORT_FILE=ROOT/'data/model-performance.json'
NZ=ZoneInfo('Pacific/Auckland')
MIN_TRAIN=30
MODELS=('adaptive_frequency_v1','random_baseline_v1')

def get_draws():
    records=json.loads(DRAW_FILE.read_text())
    return sorted((r for r in records if r.get('verification')=='two-source'
        and len(set(r.get('sources',[])))>=2),key=lambda r:(r['date'],r['draw']))

def next_draw(local_day):
    day=local_day+dt.timedelta(days=1)
    while day.weekday() not in (2,5):
        day+=dt.timedelta(days=1)
    return day.isoformat()

def fnv32(s):
    h=2166136261
    for c in s.encode('utf-8'):
        h=((h^c)*16777619)&0xffffffff
    return h or 1

def shuffled(seed):
    pool=list(range(1,41))
    x=fnv32(seed)
    for i in range(39,0,-1):
        x^=(x<<13)&0xffffffff
        x^=(x>>17)
        x^=(x<<5)&0xffffffff
        x&=0xffffffff
        j=x%(i+1)
        pool[i],pool[j]=pool[j],pool[i]
    return pool,x

def select(history,date,model):
    cap=14 if date>='2026-09-16' else 10
    if model=='random_baseline_v1':
        pool,x=shuffled('lottolab|random-v1|'+date)
        return sorted(pool[:6]),(x%cap)+1
    if model!='adaptive_frequency_v1':
        raise ValueError('Unknown model')
    scores=[0.0]*41
    power=[0.0]*(cap+1)
    for row in history:
        scores=[v*0.94 for v in scores]
        for n in row['numbers']: scores[n]+=1.0
        # Never combine incompatible Powerball rule periods
        if cap==(14 if row['date']>='2026-09-16' else 10):
            power=[v*0.94 for v in power]
            if row.get('powerball') in range(1,cap+1):power[row['powerball']]+=1.0
    nums=sorted(range(1,41),key=lambda n:(-scores[n],n))[:6]
    power_num=sorted(range(1,cap+1),key=lambda n:(-power[n],n))[0]
    return sorted(nums),power_num

def backtest(draws):
    result={m:{'tested':0,'total_hits':0,'match_distribution':{str(i):0 for i in range(7)},'powerball_hits':0} for m in MODELS}
    samples=[]
    for i,row in enumerate(draws):
        history=draws[:i]
        if len(history)<MIN_TRAIN:continue
        item={'draw':row['draw'],'date':row['date'],'matches':{}}
        for model in MODELS:
            balls,pb=select(history,row['date'],model)
            hits=len(set(balls).intersection(row['numbers']))
            stats=result[model]
            stats['tested']+=1
            stats['total_hits']+=hits
            stats['match_distribution'][str(hits)]+=1
            stats['powerball_hits']+=int(pb==row['powerball'])
            item['matches'][model]=hits
        samples.append(item)
    for stats in result.values():
        stats['average_matches']=round(stats['total_hits']/stats['tested'],3) if stats['tested'] else None
    return result,samples

def prospective_summary(picks):
    summary={}
    for model in MODELS:
        items=[p for p in picks if p.get('model')==model]
        scored=[p for p in items if p.get('status')=='scored']
        summary[model]={'predictions_recorded':len(items),'draws_scored':len(scored),
            'total_matches':sum(p['main_matches'] for p in scored),
            'average_matches':round(sum(p['main_matches'] for p in scored)/len(scored),3) if scored else None,
            'powerball_matches':sum(int(p.get('powerball_match',False)) for p in scored)}
    return summary

def run(now=None):
    now=now or dt.datetime.now(NZ)
    draws=get_draws()
    picks=json.loads(PICK_FILE.read_text()) if PICK_FILE.exists() else []
    bydate={r['date']:r for r in draws}
    for p in picks:
        row=bydate.get(p.get('target_date'))
        if row and p.get('status')=='pending':
            p['status']='scored'
            p['result_draw']=row['draw']
            p['main_matches']=len(set(p['numbers'])&set(row['numbers']))
            p['powerball_match']=p['powerball']==row['powerball']
            p['scored_at']=now.astimezone(dt.timezone.utc).isoformat()
    target=next_draw(now.date())
    eligible=[r for r in draws if r['date']<target]
    if len(eligible)>=MIN_TRAIN:
        for model in MODELS:
            if any(p.get('target_date')==target and p.get('model')==model for p in picks):
                continue
            balls,pb=select(eligible,target,model)
            picks.append({'target_date':target,'created_at':now.astimezone(dt.timezone.utc).isoformat(),
                'model':model,'model_version':1,'numbers':balls,'powerball':pb,
                'training_draws':len(eligible),'status':'pending'})
    PICK_FILE.write_text(json.dumps(picks,indent=2)+'\n')
    history,samples=backtest(draws)
    report={'generated_at':now.astimezone(dt.timezone.utc).isoformat(),
        'stored_draw_count':len(json.loads(DRAW_FILE.read_text())),
        'verified_draw_count':len(draws),
        'backtest':history,'backtest_draws':len(samples),
        'prospective':prospective_summary(picks),
        'upcoming_date':target,'upcoming_picks':[p for p in picks if p.get('target_date')==target],
        'expected_random_main_matches':0.9,
        'statistical_claim':'No credible evidence of future-draw prediction advantage has been established.',
        'methodology':'Chronological walk-forward, minimum 30 earlier verified draws, fixed model versions. All historical test draws are held out.'}
    REPORT_FILE.write_text(json.dumps(report,indent=2)+'\n')
    print(f"Stored: {report['stored_draw_count']}; verified: {len(draws)}; held-out tests: {len(samples)}; next draw {target}; picks: {len(report['upcoming_picks'])}")
    return report

if __name__=='__main__':
    run()
