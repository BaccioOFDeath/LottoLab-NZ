#!/usr/bin/env python3
"""Append-only forward scorecard: locked predictions are never silently replaced."""
import argparse, hashlib, json
from datetime import datetime, time
from zoneinfo import ZoneInfo
from pathlib import Path
NZ=ZoneInfo("Pacific/Auckland")
def signature(x): return hashlib.sha256(json.dumps(x,sort_keys=True,separators=(",",":")).encode()).hexdigest()
def read(path,default):
 p=Path(path)
 return json.loads(p.read_text()) if p.exists() else default
def iso(s):
 try:
  d=datetime.fromisoformat(s.replace("Z","+00:00"))
  return d if d.tzinfo else None
 except (ValueError,TypeError,AttributeError): return None
def candidates(game,items):
 if game=="keno":
  for slot in items.get("slots",[]):
   for m in slot.get("models",[]):
    yield {"target_draw":str(slot.get("draw","")),"target_date":slot.get("date"),"model":m.get("id"),"line":1,"numbers":sorted(m.get("numbers",[])),"published_at":slot.get("created_at"),"draw_at":slot.get("eligible_from")}
 else:
  for p in items if isinstance(items,list) else items.get("picks",[]):
   yield {"target_draw":str(p.get("target_draw") or ""),"target_date":p.get("target_date"),"model":p.get("model"),"line":int(p.get("line_number",1)),"numbers":sorted(p.get("numbers",[])),"powerball":p.get("powerball"),"published_at":p.get("created_at"),"draw_at":p.get("draw_at")}
def valid(nums,game,ticket=False):
 maximum=80 if game=="keno" else 40
 size=(1,10) if game=="keno" and ticket else ((20,20) if game=="keno" else (6,6))
 return isinstance(nums,list) and size[0]<=len(nums)<=size[1] and len(set(nums))==len(nums) and all(type(n)==int and 1<=n<=maximum for n in nums)
def update(game,results,picks,previous=None):
 previous=previous or {}
 history={x["id"]:x for x in previous.get("snapshots",[])}
 conflicts=list(previous.get("conflicts",[])); seen={(x["id"],x.get("new_sha256")) for x in conflicts}
 for p in candidates(game,picks):
  if not valid(p["numbers"],game,True): continue
  if not (p["target_draw"] or p["target_date"]): continue
  identity={k:p[k] for k in ("target_draw","target_date","model","line")}
  key=signature(identity)[:24]; sha=signature(p)
  if key in history:
   if history[key]["sha256"]!=sha and (key,sha) not in seen:
    conflicts.append({"id":key,"new_sha256":sha,"reason":"Source prediction changed after lock; original retained"});seen.add((key,sha))
   continue
  published=iso(p["published_at"])
  deadline=iso(p["draw_at"])
  if deadline is None and game=="lotto" and p["target_date"]:
   try: deadline=datetime.combine(__import__("datetime").date.fromisoformat(p["target_date"]),time(20,20),tzinfo=NZ)
   except ValueError: pass
  eligible=bool(published and deadline and published<deadline)
  history[key]={"id":key,"sha256":sha,"prediction":p,"pre_draw_time_evidenced":eligible,"status":"awaiting_result","matches":None}
 bydraw={str(x.get("draw")):x for x in results if valid(x.get("numbers"),game)}
 bydate={x.get("date"):x for x in results if valid(x.get("numbers"),game)} if game=="lotto" else {}
 rows=[]
 for item in history.values():
  row=dict(item);p=row["prediction"]
  actual=bydraw.get(p["target_draw"]) if p["target_draw"] else bydate.get(p["target_date"])
  if actual and actual.get("date")==p["target_date"]:
   row["matches"]=len(set(p["numbers"])&set(actual["numbers"]))
   row["result_date"]=actual["date"]
   row["status"]="scored" if row["pre_draw_time_evidenced"] else "scored_without_publication_evidence"
  rows.append(row)
 rows.sort(key=lambda x:(str(x["prediction"]["target_date"]),str(x["prediction"]["target_draw"]),x["id"]))
 summary={}
 for item in rows:
  if item["status"]!="scored":continue
  label=item["prediction"].get("model") or "unknown"
  s=summary.setdefault(label,{"verified_scored":0,"total_matches":0,"distribution":{}})
  s["verified_scored"]+=1;s["total_matches"]+=item["matches"];k=str(item["matches"]);s["distribution"][k]=s["distribution"].get(k,0)+1
 for s in summary.values():s["average_matches"]=round(s["total_matches"]/s["verified_scored"],4)
 return {"version":1,"game":game,"snapshots":rows,"summary":summary,"conflicts":conflicts,"counts":{"locked":len(rows),"verified_scored":sum(x["status"]=="scored" for x in rows),"awaiting":sum(x["status"]=="awaiting_result" for x in rows),"without_publication_evidence":sum(x["status"]=="scored_without_publication_evidence" for x in rows)},"note":"Publication times are supplied by prediction records, not independently authenticated. Retroactive editing is detected after the first ledger snapshot; Git history provides stronger audit evidence. No model is proven to beat chance."}
def main():
 a=argparse.ArgumentParser();a.add_argument("--game",choices=["keno","lotto"],required=True);a.add_argument("--results",required=True);a.add_argument("--predictions",required=True);a.add_argument("--ledger",required=True);opts=a.parse_args()
 report=update(opts.game,read(opts.results,[]),read(opts.predictions,[] if opts.game=="lotto" else {}),read(opts.ledger,{}))
 p=Path(opts.ledger);p.parent.mkdir(parents=True,exist_ok=True);txt=json.dumps(report,indent=2,ensure_ascii=False)+"\n"
 if not p.exists() or p.read_text()!=txt:p.write_text(txt)
 print(opts.game,report["counts"])
if __name__=="__main__":main()
