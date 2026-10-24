"""Coverage and chronological walk-forward evaluation. No future information leakage.
Run: python scripts/evaluate.py. Standard library only.
"""
import collections, datetime as dt, json, random, hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def load():
    rows=json.loads((ROOT/'data/draws.json').read_text())
    rows.sort(key=lambda d:d['draw'])
    return rows
def valid_for_train(d):
    return d.get('verification')=='two-source'
def draw_pick(seed):
    r=random.Random(seed)
    return set(r.sample(range(1,41),6)),r.randint(1,14)
def frequency_pick(history):
    counts=collections.Counter(n for x in history for n in x['numbers'])
    return set(sorted(range(1,41),key=lambda n:(-counts[n],n))[:6])
def evaluate(rows,min_train=30):
    output=[]
    for i in range(len(rows)):
        row=rows[i]
        history=[x for x in rows[:i] if valid_for_train(x)]
        if len(history)<min_train or not valid_for_train(row):
            continue
        actual=set(row['numbers'])
        seed=int.from_bytes(hashlib.sha256(('baseline|'+str(row['draw'])).encode()).digest()[:8],'big')
        random_line,_=draw_pick(seed)
        frequent=frequency_pick(history)
        output.append({'draw':row['draw'],'date':row['date'],
            'random_hits':len(actual&random_line),'frequency_hits':len(actual&frequent),
            'n_training_draws':len(history)})
    return output
def main():
    rows=load()
    verified=[x for x in rows if valid_for_train(x)]
    numbers={x['draw'] for x in rows}
    holes=[i for i in range(min(numbers),max(numbers)+1) if i not in numbers] if numbers else []
    print('Total stored:',len(rows),'Two-source:',len(verified),'Unverified:',len(rows)-len(verified))
    print('Missing draw numbers inside stored range:',len(holes))
    results=evaluate(rows)
    if not results:
        print('NOT READY: requires 30 prior verified records and verified held-out draws. No outperformance claim.')
    else:
        for method in ('random','frequency'):
            hits=[x[method+'_hits'] for x in results]
            print(method, 'draws:',len(hits),'mean main-ball matches:',round(sum(hits)/len(hits),3))
    path=ROOT/'data/evaluation-summary.json'
    path.write_text(json.dumps({'total_stored':len(rows),'two_source_verified':len(verified),
      'missing_draws_within_range':len(holes),'missing_sample_ids':holes[:50],
      'held_out_evaluated':len(results),
      'model_ready':bool(results),
      'disclaimer':'Selection comparison is descriptive. It does not imply predictability.'},indent=2)+'\n')
if __name__=='__main__':main()
