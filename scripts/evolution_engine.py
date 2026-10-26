#!/usr/bin/env python3
"""LottoLab Evolution v1: leakage-free model tournament, conservative promotion.

Evaluates established Keno policies on disjoint chronological selection/validation
windows. Selection is based only on the first window; reported evidence comes from
later held-out draws. Champion remains random unless both evidence and control
checks pass. No retroactive changes to published tickets.
"""
import json
from pathlib import Path
from datetime import datetime, timezone
from math import sqrt
from collections import Counter, deque, defaultdict
from keno_model_audit import selections, MODELS

ROOT=Path(__file__).resolve().parents[1]
IN=ROOT/"data/keno-results.json"
OUT=ROOT/"data/evolution-keno.json"
CONTROL="random_control"
# We won't promise actual outperformance without strong held-out evidence.
MIN_HOLDOUT=1000
MIN_DISCOVERY=1000
Z_THRESHOLD=3.5

def evaluate(rows):
    rows=sorted(rows,key=lambda r:int(r["draw"]))
    tally=Counter()
    recent=deque()
    c_recent=Counter()
    last200=deque()
    c_200=Counter()
    slot_counts=defaultdict(Counter)
    previous={}
    evaluated=[]
    for i,r in enumerate(rows):
        ns=r.get("numbers",[])
        if len(ns)!=20 or len(set(ns))!=20 or any(not 1<=n<=80 for n in ns):
            continue
        if i>=200:
            t=r.get("time","")
            opts=selections(tally,c_recent,i,len(recent),int(r["draw"]),previous.get(t),slot_counts[t],c_200)
            actual=set(ns)
            evaluated.append({"draw":str(r["draw"]),"date":r["date"],
                "hits":{name:len(actual.intersection(picks)) for name,picks in opts.items()}})
        tally.update(ns)
        t=r.get("time","")
        slot_counts[t].update(ns)
        previous[t]=ns
        recent.append(ns);c_recent.update(ns)
        if len(recent)>80:
            for n in recent.popleft():c_recent[n]-=1
        last200.append(ns);c_200.update(ns)
        if len(last200)>200:
            for n in last200.popleft():c_200[n]-=1
    n=len(evaluated)
    # Explicit chronological selection/confirmation partition.
    boundary=int(n*.75)
    discovery=evaluated[:boundary]
    holdout=evaluated[boundary:]
    def stats(rows,name):
        values=[r["hits"][name] for r in rows]
        return {"draws":len(values),"average_matches":round(sum(values)/len(values),5) if values else None,
                "five_or_more":sum(x>=5 for x in values)}
    def compare(name):
        diffs=[r["hits"][name]-r["hits"][CONTROL] for r in holdout]
        n=len(diffs)
        mean=sum(diffs)/n if n else 0.
        var=sum((v-mean)**2 for v in diffs)/(n-1) if n>1 else 0
        se=sqrt(var/n) if n and var else 0
        z=mean/se if se else 0
        return {"delta_vs_random":round(mean,5),"paired_z":round(z,3),
                "lower_95_delta":round(mean-1.96*se,5),"upper_95_delta":round(mean+1.96*se,5)}
    metrics={}
    for name in MODELS:
        metrics[name]={"discovery":stats(discovery,name),"holdout":stats(holdout,name),
                       "comparison":compare(name)}
    candidates=[name for name in MODELS if name!=CONTROL]
    # Pick discovery winner, never choose via future (holdout) information.
    candidates.sort(key=lambda name:(-metrics[name]["discovery"]["average_matches"],name))
    candidate=candidates[0] if candidates else None
    proof=metrics[candidate]["comparison"] if candidate and holdout else {}
    validated=(bool(candidate) and len(discovery)>=MIN_DISCOVERY and
        len(holdout)>=MIN_HOLDOUT and proof.get("paired_z",0)>=Z_THRESHOLD and
        proof.get("lower_95_delta",0)>0 and
        metrics[candidate]["holdout"]["average_matches"]>2.5)
    # Never alter pick generation automatically before proof is independently reviewed.
    return {
      "version":1,"status":"experimental_evaluation_only",
      "champion":CONTROL,"candidate":candidate,
      "candidate_verified":validated,
      "promotion_policy":"Manual review required even after passing strict tests; historical champion always stays the random control until independently confirmed.",
      "reason":("Candidate passes preliminary holdout checks; independent confirmation and manual review required."
                if validated else "No independently established improvement over a random control."),
      "draws_in_database":len(rows),"evaluated_draws":n,
      "discovery_draws":len(discovery),"holdout_draws":len(holdout),
      "discovery_cutoff_draw":discovery[-1]["draw"] if discovery else None,
      "last_evaluated_draw":evaluated[-1]["draw"] if evaluated else None,
      "last_evaluated_date":evaluated[-1]["date"] if evaluated else None,
      "expected_matches_for_any_10_numbers":2.5,
      "selection_method":"Select best mean on first 75% of walk-forward evaluation; test exactly that candidate on final 25%. No future data used to create individual tickets.",
      "thresholds":{"minimum_discovery_draws":MIN_DISCOVERY,"minimum_holdout_draws":MIN_HOLDOUT,"paired_z_minimum":Z_THRESHOLD},
      "models":metrics,
      "limitations":"Multiple testing and repeated reruns on growing history reduce independence; treat the confirmation as exploratory and require frozen prospective results. All valid Keno sets have identical theoretical draw odds."
    }

def main():
    if not IN.exists():raise SystemExit("Keno results unavailable")
    data=json.loads(IN.read_text(encoding="utf-8"))
    report=evaluate(data)
    OUT.parent.mkdir(parents=True,exist_ok=True)
    content=json.dumps(report,indent=2,ensure_ascii=False)+"\n"
    if not OUT.exists() or OUT.read_text(encoding="utf-8")!=content:
        OUT.write_text(content,encoding="utf-8")
    print("Evolution:",report["evaluated_draws"],"walk-forward draws,",report["holdout_draws"],"held out; candidate:",report["candidate"],"verified:",report["candidate_verified"])

if __name__=="__main__":main()
