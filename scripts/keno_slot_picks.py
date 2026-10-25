#!/usr/bin/env python3
"""Publish immutable, per-time-slot NZ Keno experimental lines before their draw.

Uses only outcomes available when generated. A snapshot is never rewritten
after creation; later draw results are used only for scoring.
"""
from collections import Counter, defaultdict
from datetime import datetime, time, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo
import json
import random

NZ=ZoneInfo("Pacific/Auckland")
SOURCE=Path("data/keno-results.json")
OUT=Path("data/keno-slot-picks.json")
SLOTS=(("10:00 am",10),("1:00 pm",13),("3:00 pm",15),("6:00 pm",18))
UNIVERSE=range(1,81)

def load(path,default):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError,ValueError):
        return default

def stamp(draw):
    return (draw["date"],draw.get("time",""))

def ranked(scores,pool=UNIVERSE,amount=10):
    return sorted(pool,key=lambda n:(-scores.get(n,0),n))[:amount]

def model(name,id,rank,score,description):
    return {"id":id,"name":name,"description":description,
            "numbers":sorted(rank),"ranked_numbers":rank,
            "number_scores":{str(n):round(float(score.get(n,0)),6) for n in rank},
            "score_basis":"historical feature strength; not calibrated winning probability"}

def build_models(train,slot,draw_number):
    if len(train)<200:
        return []
    all_latest=train[-200:]
    nslot=[r for r in train if r.get("time")==slot]
    recent_slot=nslot[-120:]
    counts200=Counter(n for r in all_latest for n in r["numbers"])
    counts_slot=Counter(n for r in recent_slot for n in r["numbers"])
    lifetime_slot=Counter(n for r in nslot for n in r["numbers"])
    counts80=Counter(n for r in train[-80:] for n in r["numbers"])
    def rate(c,n,prior=64):
        return {v:(c[v]+.25*prior)/(n+prior) for v in UNIVERSE}
    p200=rate(counts200,len(all_latest),120)
    pslot=rate(counts_slot,len(recent_slot),80)
    plong=rate(lifetime_slot,len(nslot),300)
    blend={n:.50*pslot[n]+.30*p200[n]+.20*plong[n] for n in UNIVERSE}
    prev=nslot[-1]["numbers"] if nslot else list(UNIVERSE)
    repeat_score={n:.60*pslot[n]+.40*rate(counts80,min(80,len(train)),60)[n] for n in UNIVERSE}
    slot_rank=ranked(repeat_score,prev) if len(prev)>=10 else ranked(repeat_score)
    # Paired lag-one transitions across consecutive draws of the SAME time slot.
    lag_occ=Counter()
    lag_total=Counter()
    historical_pairs = nslot[-700:]
    for previous,current in zip(historical_pairs, historical_pairs[1:]):
        for predecessor in previous["numbers"]:
            lag_total[predecessor]+=1
            for following in current["numbers"]:
                lag_occ[(predecessor,following)]+=1
    recent_previous=prev
    transition={}
    for n in UNIVERSE:
        conditional=sum((lag_occ[(x,n)]+24)/(lag_total[x]+96) for x in recent_previous)/max(1,len(recent_previous))
        transition[n]=.65*conditional+.35*blend[n]
    # Pair enrichment is evaluated on earlier same-slot draws only.
    history=nslot[-700:]
    pair_count=Counter()
    for draw in history:
        ns=draw["numbers"]
        for i,a in enumerate(ns):
            for b in ns[i+1:]:
                pair_count[(min(a,b),max(a,b))]+=1
    pair_avg={}
    prior_rank=ranked(blend)
    anchors=prior_rank[:3]
    for n in UNIVERSE:
        lift=sum(pair_count[(min(n,k),max(n,k))]/max(1,len(history))-.25*.25
                 for k in anchors if k!=n)
        pair_avg[n]=blend[n]+.12*lift
    rng=random.Random(int(draw_number)*7919+17)
    control=rng.sample(list(UNIVERSE),10)
    models=[
        model("Same-time repeat","same_slot",slot_rank,repeat_score,
              "Top-ranked numbers from the previous "+slot+" draw, using earlier frequency scores"),
        model("Time-slot momentum","slot_momentum",ranked(blend),blend,
              "Blends historical "+slot+" frequency, recent 200 draws and long-run time-slot frequency"),
        model("Recent 200","recent_200",ranked(p200),p200,
              "Top frequency over the last 200 published Keno draws"),
        model("Time transition","transition",ranked(transition),transition,
              "Previous same-time draw conditioned on historical following-draw numbers"),
        model("Pair blend","pair_blend",ranked(pair_avg),pair_avg,
              "Recent slot frequencies with historical pair co-occurrence adjustments"),
        model("Random control","random",control,{n:0.25 for n in UNIVERSE},
              "Fixed random reference to measure whether patterns outperform chance")]
    return models

def main():
    now=datetime.now(NZ)
    rows=sorted(load(SOURCE,[]),key=lambda r:int(r["draw"]))
    saved=load(OUT,{"version":1,"slots":[]})
    old=saved.get("slots",[])
    known={str(x.get("draw")) for x in old}
    exists={(r["date"],r.get("time","")):int(r["draw"]) for r in rows}
    date=now.date()
    # Require a known 10am anchor (or the previous day's 6pm record before 10am).
    today_id=exists.get((date.isoformat(),"10:00 am"))
    previous_id=exists.get(((date-timedelta(days=1)).isoformat(),"6:00 pm"))
    if today_id is None and previous_id is None:
        print("No reliable current-day draw-number anchor; skipping predictions.")
        return
    first_id=today_id if today_id is not None else previous_id+1
    created=0
    for idx,(label,hour) in enumerate(SLOTS):
        cutoff=datetime.combine(date,time(hour),tzinfo=NZ)
        if not now<cutoff-timedelta(minutes=2):
            continue
        draw_id=first_id+idx
        if str(draw_id) in known or (date.isoformat(),label) in exists:
            continue
        # Records later than the publication instant may never train this model.
        train=[r for r in rows if (
            r["date"]<date.isoformat() or
            (r["date"]==date.isoformat() and (
               next((j for j,(t,_) in enumerate(SLOTS) if t==r.get("time")),-1)<idx
            ))) and
            (r["date"]<date.isoformat() or
             datetime.combine(date,time(next((h for t,h in SLOTS if t==r.get("time")),0)),tzinfo=NZ)<now)]
        models=build_models(train,label,draw_id)
        if not models:
            continue
        old.append({"date":date.isoformat(),"draw":str(draw_id),"time":label,
                    "created_at":now.isoformat(),"eligible_from":cutoff.isoformat(),
                    "training_draws":len(train),"last_training_draw":train[-1]["draw"],
                    "models":models,
                    "note":"Pre-draw experimental selections. Scores are historical feature strengths, not predictive odds."})
        known.add(str(draw_id))
        created+=1
    old.sort(key=lambda x:int(x["draw"]))
    saved["slots"]=old[-250:]
    saved["version"]=1
    value=json.dumps(saved,indent=2,ensure_ascii=False)+"\n"
    if not OUT.exists() or OUT.read_text(encoding="utf-8")!=value:
        OUT.parent.mkdir(parents=True,exist_ok=True)
        OUT.write_text(value,encoding="utf-8")
    print("Published",created,"new time-slot prediction snapshots; total",len(saved["slots"]))

if __name__=="__main__":
    main()
