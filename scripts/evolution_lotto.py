#!/usr/bin/env python3
"""LottoLab Lotto evolution audit: observational only, no promotion of models."""
import json
from pathlib import Path
from math import sqrt
from collections import Counter, deque
from model_engine import get_draws, select

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/"data/evolution-lotto.json"
BASE="random_baseline_v1"
WARMUP=30

def evaluate(rows):
 rows=sorted(rows,key=lambda d:(d["date"],int(d["draw"])))
 evaluated=[]
 for i,row in enumerate(rows):
  if i<WARMUP:continue
  train=rows[:i]
  actual=set(row["numbers"])
  choices={}
  for name in ("adaptive_frequency_v1",BASE):
   nums,_=select(train,row["date"],name)
   choices[name]=len(set(nums)&actual)
  recent=Counter(n for d in train[-80:] for n in d["numbers"])
  nums=sorted(range(1,41),key=lambda n:(-recent[n],n))[:6]
  choices["recent_80_hot"]=len(set(nums)&actual)
  longrun=Counter(n for d in train for n in d["numbers"])
  nums=sorted(range(1,41),key=lambda n:(-longrun[n],n))[:6]
  choices["all_time_hot"]=len(set(nums)&actual)
  evaluated.append({"draw":str(row["draw"]),"date":row["date"],"hits":choices})
 cut=int(len(evaluated)*.75)
 discovery,holdout=evaluated[:cut],evaluated[cut:]
 names=["adaptive_frequency_v1","recent_80_hot","all_time_hot",BASE]
 def score(name,section):
  values=[r["hits"][name] for r in section]
  return {"draws":len(values),"average_matches":round(sum(values)/len(values),5) if values else None,"three_or_more":sum(x>=3 for x in values)}
 metrics={}
 for name in names:
  diff=[r["hits"][name]-r["hits"][BASE] for r in holdout]
  avg=sum(diff)/len(diff) if diff else 0.
  var=sum((x-avg)**2 for x in diff)/(len(diff)-1) if len(diff)>1 else 0.
  se=sqrt(var/len(diff)) if diff and var else 0.
  metrics[name]={"discovery":score(name,discovery),"holdout":score(name,holdout),
      "comparison":{"delta_vs_random":round(avg,5),"paired_z":round(avg/se,3) if se else 0,
                    "lower_95_delta":round(avg-1.96*se,5)}}
 candidates=names[:-1]
 candidates.sort(key=lambda x:(-(metrics[x]["discovery"]["average_matches"] or 0),x))
 candidate=candidates[0]
 return {"version":1,"game":"lotto","status":"experimental_evaluation_only",
   "champion":BASE,"candidate":candidate,"candidate_verified":False,
   "reason":"No independently established improvement over a random control. Future prospective confirmation is required.",
   "draws_in_database":len(rows),"evaluated_draws":len(evaluated),
   "discovery_draws":len(discovery),"holdout_draws":len(holdout),
   "discovery_cutoff_draw":discovery[-1]["draw"] if discovery else None,
   "last_evaluated_draw":evaluated[-1]["draw"] if evaluated else None,
   "last_evaluated_date":evaluated[-1]["date"] if evaluated else None,
   "expected_matches_for_any_6_numbers":0.9,
   "models":metrics,"limitations":"Exploratory walk-forward scoring only. No automated promotion. Re-testing many times can overfit the holdout; a new frozen future confirmation window is necessary."}

def main():
 report=evaluate(get_draws())
 OUT.parent.mkdir(parents=True,exist_ok=True)
 data=json.dumps(report,ensure_ascii=False,indent=2)+"\n"
 if not OUT.exists() or OUT.read_text(encoding="utf-8")!=data:OUT.write_text(data,encoding="utf-8")
 print("Lotto evolution: %d evaluated; challenger %s"%(report["evaluated_draws"],report["candidate"]))

if __name__=="__main__":main()
