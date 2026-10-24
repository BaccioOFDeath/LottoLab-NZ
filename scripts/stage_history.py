"""Stage historic results from a licensed CSV without silently publishing unknown data.

Expected CSV: draw,date,n1,n2,n3,n4,n5,n6,bonus,powerball,source_url
Older (pre-2001) records may omit powerball. Outputs staging only, never live data.
"""
import argparse,csv,json,datetime as dt
from pathlib import Path
def parse(row):
    nums=sorted(int(row['n'+str(i)]) for i in range(1,7))
    power=int(row['powerball']) if row.get('powerball','').strip() else None
    entry={'draw':int(row['draw']),'date':dt.date.fromisoformat(row['date']).isoformat(),
           'numbers':nums,'bonus':int(row['bonus']),'powerball':power,
           'verification':'unverified','sources':[row['source_url']]}
    day=dt.date.fromisoformat(entry['date'])
    assert len(set(nums))==6 and all(1<=n<=40 for n in nums)
    assert 1<=entry['bonus']<=40 and entry['bonus'] not in nums
    assert power is None or 1<=power<=(14 if day>=dt.date(2026,9,16) else 10)
    assert day.weekday() in (2,5) or day<dt.date(2000,1,1) # Historical timetable must be checked separately
    assert entry['sources'][0].startswith('https://')
    return entry
def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('csv_file',help='CSV you have the right to reuse')
    ap.add_argument('--out',default='data/staged-import.json')
    a=ap.parse_args()
    with open(a.csv_file,newline='',encoding='utf-8-sig') as f:
        rows=[parse(r) for r in csv.DictReader(f)]
    ids=[r['draw'] for r in rows]
    if len(set(ids))!=len(ids):raise ValueError('duplicate draw IDs')
    Path(a.out).parent.mkdir(parents=True,exist_ok=True)
    Path(a.out).write_text(json.dumps(sorted(rows,key=lambda d:d['draw'],reverse=True),indent=2)+'\n')
    print('Staged',len(rows),'records. NOT published. Review rights, source and game rules before promotion.')
if __name__=='__main__':main()
