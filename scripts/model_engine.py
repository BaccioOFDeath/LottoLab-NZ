"""LottoLab NZ: 20 permanently recorded research lines per draw.

Exactly 10 adaptive-frequency and 10 deterministic random-baseline lines, never
more than 20 total for one draw. Existing line 1 of each model is preserved.
Prospective lines never change after publication; results score against verified
draws only. None of the methods predicts a fair independent lottery.
"""
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
LINES_PER_MODEL=10
LINES_PER_DRAW=20
MODELS=('adaptive_frequency_v1','random_baseline_v1')

def get_draws():
    rows=json.loads(DRAW_FILE.read_text())
    return sorted((d for d in rows if d.get('verification')=='two-source'
        and len(set(d.get('sources',[])))>=2),
        key=lambda d:(d['date'],d['draw']))

def next_draw(today):
    day=today+dt.timedelta(days=1)
    while day.weekday() not in (2,5):day+=dt.timedelta(days=1)
    return day.isoformat()

def fnv32(value):
    h=2166136261
    for c in value.encode('utf-8'):h=((h^c)*16777619)&0xffffffff
    return h or 1

def xorshift(x):
    x^=(x<<13)&0xffffffff
    x^=x>>17
    x^=(x<<5)&0xffffffff
    return x&0xffffffff

def shuffled(seed):
    pool=list(range(1,41))
    x=fnv32(seed)
    for i in range(39,0,-1):
        x=xorshift(x)
        j=x%(i+1)
        pool[i],pool[j]=pool[j],pool[i]
    return pool,x

def select(history,date,model):
    """Retain v1's first-line behaviour for existing published forecasts."""
    cap=14 if date>='2026-09-16' else 10
    if model=='random_baseline_v1':
        pool,x=shuffled('lottolab|random-v1|'+date)
        return sorted(pool[:6]),(x%cap)+1
    if model!='adaptive_frequency_v1':raise ValueError('Unknown model')
    scores=[0.0]*41
    power=[0.0]*(cap+1)
    for row in history:
        scores=[v*0.94 for v in scores]
        for n in row['numbers']:scores[n]+=1.0
        if cap==(14 if row['date']>='2026-09-16' else 10):
            power=[v*0.94 for v in power]
            if row.get('powerball') in range(1,cap+1):power[row['powerball']]+=1
    nums=sorted(range(1,41),key=lambda n:(-scores[n],n))[:6]
    pb=sorted(range(1,cap+1),key=lambda n:(-power[n],n))[0]
    return sorted(nums),pb

def select_extra(history,date,model,line_number,salt=0):
    """Reproducible diversification, not increased predictive probability."""
    if line_number<2 or line_number>LINES_PER_MODEL:raise ValueError('Invalid slot')
    seed=f'lottolab|20-lines-v2|{model}|{date}|{line_number}|{salt}'
    pool,x=shuffled(seed)
    cap=14 if date>='2026-09-16' else 10
    if model=='random_baseline_v1':
        return sorted(pool[:6]), (x%cap)+1
    if model!='adaptive_frequency_v1':raise ValueError('Unknown model')
    # Weighted sampling without replacement. Recency evidence is experimental;
    # every valid main line has the same fair-draw winning probability.
    scores=[1.0]*41
    power=[1.0]*(cap+1)
    for row in history:
        for n in range(1,41):scores[n]=1+(scores[n]-1)*0.96
        for n in row['numbers']:scores[n]+=1
        if cap==(14 if row['date']>='2026-09-16' else 10):
            for n in range(1,cap+1):power[n]=1+(power[n]-1)*0.96
            if row.get('powerball') in range(1,cap+1):power[row['powerball']]+=1
    chosen=[]
    available=list(range(1,41))
    for _ in range(6):
        x=xorshift(x)
        total=sum(scores[n] for n in available)
        threshold=(x/4294967296)*total
        j=0
        for j,n in enumerate(available):
            threshold-=scores[n]
            if threshold<0:break
        chosen.append(available.pop(j))
    x=xorshift(x)
    threshold=(x/4294967296)*sum(power[1:])
    pb=cap
    for n in range(1,cap+1):
        threshold-=power[n]
        if threshold<0:
            pb=n
            break
    return sorted(chosen),pb

def bonus_forecast(numbers, date, model, line_number):
    """Research-only guess of the *seventh drawn ball*. Not a ticket choice.

    Choose deterministically from the 34 numbers outside this line's main six.
    Store it separately with its own publication time.
    """
    if len(numbers)!=6 or len(set(numbers))!=6:
        raise ValueError('Expected six unique main numbers')
    choices, _ = shuffled('lottolab|bonus-v1|'+date+'|'+model+'|'+str(line_number))
    return next(n for n in choices if n not in numbers)

def line_id(p):
    """Migration: original 2026-10-28 records without line_number are slot 1."""
    return int(p.get('line_number',1))

def validate_set(picks,day):
    group=[p for p in picks if p.get('target_date')==day]
    if len(group)>LINES_PER_DRAW:raise ValueError('More than 20 lines for '+day)
    identifiers=[(p.get('model'),line_id(p)) for p in group]
    if len(set(identifiers))!=len(identifiers):raise ValueError('Duplicate model/slot on '+day)
    combos=[(tuple(sorted(p['numbers'])),p['powerball']) for p in group]
    if len(set(combos))!=len(combos):raise ValueError('Duplicate Lotto line on '+day)
    for p in group:
        if p['model'] not in MODELS or not 1<=line_id(p)<=LINES_PER_MODEL:
            raise ValueError('Unknown model/line slot')
        ns=p['numbers']
        cap=14 if day>='2026-09-16' else 10
        if len(ns)!=6 or len(set(ns))!=6 or not all(1<=n<=40 for n in ns):
            raise ValueError('Invalid main balls')
        if not 1<=p['powerball']<=cap:raise ValueError('Invalid Powerball')
        if p.get('bonus_prediction') is not None:
            if not isinstance(p['bonus_prediction'],int) or not 1<=p['bonus_prediction']<=40 or p['bonus_prediction'] in ns:
                raise ValueError('Invalid research-only bonus forecast')
            if not p.get('bonus_prediction_created_at') or not p.get('bonus_prediction_method'):
                raise ValueError('Undated research-only bonus forecast')
    return group

def backtest(draws):
    # Historical method comparison is one line per model per draw, not 20
    # invented 'predictions' after the fact.
    result={m:{'tested':0,'total_hits':0,'match_distribution':{str(i):0 for i in range(7)},'powerball_hits':0} for m in MODELS}
    for i,row in enumerate(draws):
        if i<MIN_TRAIN:continue
        for model in MODELS:
            balls,pb=select(draws[:i],row['date'],model)
            hits=len(set(balls)&set(row['numbers']))
            stats=result[model]
            stats['tested']+=1
            stats['total_hits']+=hits
            stats['match_distribution'][str(hits)]+=1
            stats['powerball_hits']+=int(pb==row['powerball'])
    for stats in result.values():
        stats['average_matches']=round(stats['total_hits']/stats['tested'],3) if stats['tested'] else None
    return result,max(0,len(draws)-MIN_TRAIN)

def prospective_summary(picks):
    result={}
    for model in MODELS:
        entries=[p for p in picks if p['model']==model]
        scored=[p for p in entries if p['status']=='scored']
        result[model]={
            'predictions_recorded':len(entries),
            'lines_scored':len(scored),
            'draws_scored':len({p['target_date'] for p in scored}),
            'total_matches':sum(p['main_matches'] for p in scored),
            'average_matches':round(sum(p['main_matches'] for p in scored)/len(scored),3) if scored else None,
            'powerball_matches':sum(int(p.get('powerball_match',False)) for p in scored),
            'bonus_forecasts_scored':sum('bonus_prediction_match' in p for p in scored),
            'bonus_forecasts_matched':sum(int(p.get('bonus_prediction_match',False)) for p in scored)
        }
    return result

def run(now=None):
    now=now or dt.datetime.now(NZ)
    if now.tzinfo is None:raise ValueError('Timezone-aware clock required')
    draws=get_draws()
    picks=json.loads(PICK_FILE.read_text()) if PICK_FILE.exists() else []
    bydate={r['date']:r for r in draws}
    for p in picks:
        result=bydate.get(p.get('target_date'))
        if result and p.get('status')=='pending':
            p['status']='scored'
            p['result_draw']=result['draw']
            p['main_matches']=len(set(p['numbers'])&set(result['numbers']))
            p['powerball_match']=p['powerball']==result['powerball']
            if (p.get('bonus_prediction') is not None and p.get('bonus_prediction_created_at','')[:10]<p['target_date']):
                p['bonus_prediction_match']=p['bonus_prediction']==result['bonus']
            p['scored_at']=now.astimezone(dt.timezone.utc).isoformat()
    target=next_draw(now.astimezone(NZ).date())
    history=[r for r in draws if r['date']<target]
    if len(history)>=MIN_TRAIN:
        current=validate_set(picks,target)
        occupied={(p['model'],line_id(p)) for p in current}
        used={(tuple(sorted(p['numbers'])),p['powerball']) for p in current}
        for model in MODELS:
            for slot in range(1,LINES_PER_MODEL+1):
                if (model,slot) in occupied:continue
                if len(current)>=LINES_PER_DRAW:raise ValueError('Already full')
                for salt in range(250):
                    balls,pb=(select(history,target,model) if slot==1 and salt==0
                        else select_extra(history,target,model,max(slot,2),salt))
                    combo=(tuple(balls),pb)
                    if combo not in used:break
                else:raise ValueError('Unable to generate unique line')
                entry={
                    'target_date':target,
                    'created_at':now.astimezone(dt.timezone.utc).isoformat(),
                    'model':model,
                    'model_version':1 if slot==1 else 2,
                    'line_number':slot,
                    'numbers':balls,'powerball':pb,
                    'training_draws':len(history),'status':'pending'
                }
                picks.append(entry)
                current.append(entry)
                used.add(combo)
        assert len(validate_set(picks,target))==LINES_PER_DRAW
    # Bonus is NOT a playable ticket number. Add a distinctly timestamped,
    # research-only forecast without touching any original line or created_at.
    # Never add a new bonus guess to completed/past draws.
    if now.astimezone(NZ).date().isoformat()<target:
        for p in current:
            if p.get('bonus_prediction') is None:
                p['bonus_prediction']=bonus_forecast(p['numbers'],target,p['model'],line_id(p))
                p['bonus_prediction_created_at']=now.astimezone(dt.timezone.utc).isoformat()
                p['bonus_prediction_method']='research_only_deterministic_v1'
                p['bonus_is_ticket_selection']=False
    # Validate all existing days, with partial historical 2-line pilot allowed.
    for day in {p['target_date'] for p in picks}:validate_set(picks,day)
    PICK_FILE.write_text(json.dumps(picks,indent=2)+'\n')
    comparison,n_tested=backtest(draws)
    today_lines=[p for p in picks if p['target_date']==target]
    report={
        'generated_at':now.astimezone(dt.timezone.utc).isoformat(),
        'stored_draw_count':len(json.loads(DRAW_FILE.read_text())),
        'verified_draw_count':len(draws),
        'backtest':comparison,'backtest_draws':n_tested,
        'prospective':prospective_summary(picks),
        'lines_per_draw':LINES_PER_DRAW,
        'bonus_forecast_notice':'Gold Bonus is a separately timestamped research-only prediction of the drawn seventh ball, NOT a ticket selection.',
        'upcoming_date':target,
        'upcoming_picks':today_lines,
        'expected_random_main_matches':0.9,
        'statistical_claim':'No credible prediction advantage for a fair lottery has been demonstrated.',
        'methodology':'Exactly 20 prospective, precommitted selections per draw (10 experimental adaptive, 10 random baseline). Historical backtest uses one line per model on held-out draws, separate from prospective record.'
    }
    REPORT_FILE.write_text(json.dumps(report,indent=2)+'\n')
    print(f"Verified {len(draws)}; held-out {n_tested}; target {target}; frozen {len(today_lines)}/{LINES_PER_DRAW}")
    return report

if __name__=='__main__':run()
