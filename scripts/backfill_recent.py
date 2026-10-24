"""Incremental, deliberately rate-limited historic NZ Lotto backfill (2018+).

Uses two independent public archives. Adds only draws for which date, draw ID,
six main balls, bonus and Powerball match *exactly*. Nothing is guessed.
Run once with: python scripts/backfill_recent.py --limit 8
"""
import argparse
import datetime as dt
import json
import re
import time
import urllib.request
from pathlib import Path
from bs4 import BeautifulSoup

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/'data/draws.json'
A='https://www.lottodraw.co.nz/lotto/results-'
B='https://app.nz-lotto.com/loto-statistics/results/mylotto-'
MONTHS='january february march april may june july august september october november december'.split()
FIRST_A_DRAW=1814
PAUSE_SECONDS=1.3

def html(url):
    req=urllib.request.Request(url,headers={'User-Agent':'LottoLabNZ-IndependentResearch/1.0','Accept':'text/html'})
    with urllib.request.urlopen(req,timeout=20) as r:
        if r.status!=200:raise ValueError('HTTP '+str(r.status))
        return BeautifulSoup(r.read(2_000_000),'html.parser')

def parse_b(doc):
    txt=doc.get_text(' ',strip=True)
    pat=r'Draw:\s*(\d+),\s*Date:\s*(\d{4}-\d\d-\d\d)\s+((?:\d{1,2}\s+){6})\+\s*(\d{1,2})\s+(\d{1,2})'
    m=re.search(pat,txt)
    if not m:raise ValueError('Source B markup changed')
    return {'draw':int(m[1]),'date':m[2],
        'numbers':sorted(int(v) for v in m[3].split()),
        'bonus':int(m[4]),'powerball':int(m[5])}

def parse_a(doc):
    for article in doc.select('article'):
        t=article.get_text(' ',strip=True)
        m=re.search(r'\bDraw\s+(\d{3,5})\b',t)
        ol=article.find('ol')
        if not (m and ol):continue
        nums=[int(i.get_text(strip=True)) for i in ol.find_all('li',recursive=False)]
        if len(nums)!=6:continue
        def lookup(label):
            for strong in article.select('strong'):
                if strong.get_text(' ',strip=True).lower()==label:
                    dd=strong.find_next('dd')
                    if dd:return int(re.search(r'\d+',dd.get_text(' ',strip=True))[0])
            raise ValueError('Missing '+label)
        return {'draw':int(m[1]),'numbers':sorted(nums),
            'bonus':lookup('bonus ball'),'powerball':lookup('powerball')}
    raise ValueError('Source A markup changed')

def validate(row):
    day=dt.date.fromisoformat(row['date'])
    if day.weekday() not in (2,5):raise ValueError('Unexpected weekday')
    if len(row['numbers'])!=6 or len(set(row['numbers']))!=6 or not all(1<=n<=40 for n in row['numbers']):raise ValueError('Invalid main balls')
    if row['bonus'] in row['numbers'] or not 1<=row['bonus']<=40:raise ValueError('Invalid bonus')
    cap=14 if day>=dt.date(2026,9,16) else 10
    if not 1<=row['powerball']<=cap:raise ValueError('Invalid Powerball')

def source_a_url(date):
    y,m,d=(int(s) for s in date.split('-'))
    return f'{A}{MONTHS[m-1]}-{d}-{y}'

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--limit',type=int,default=8)
    opts=ap.parse_args()
    if not 1<=opts.limit<=20:raise ValueError('limit must be between 1 and 20')
    existing=json.loads(DATA.read_text())
    seen={d['draw'] for d in existing}
    maxid=max(seen)
    missing=[n for n in range(maxid-1,FIRST_A_DRAW-1,-1) if n not in seen]
    inserted=[]
    failures=[]
    for id in missing[:opts.limit]:
        try:
            b=parse_b(html(B+str(id)))
            time.sleep(PAUSE_SECONDS)
            if b['draw']!=id:raise ValueError('Incorrect remote draw ID')
            a=parse_a(html(source_a_url(b['date'])))
            if any(a[k]!=b[k] for k in ('draw','numbers','bonus','powerball')):
                raise ValueError('Two sources disagree')
            validate(b)
            b['verification']='two-source'
            b['sources']=[B+str(id),source_a_url(b['date'])]
            existing.append(b)
            inserted.append(id)
        except Exception as e:
            failures.append(f'{id}: {type(e).__name__}: {e}')
            if len(failures)>=3:break
        time.sleep(PAUSE_SECONDS)
    if inserted:
        existing.sort(key=lambda d:d['draw'],reverse=True)
        DATA.write_text(json.dumps(existing,indent=2)+'\n')
    print(f'New verified draws: {len(inserted)} ({inserted})')
    for e in failures:print('Skipped (not published):',e)
    if failures and not inserted:
        raise RuntimeError('No verified progress; source review required')

if __name__=='__main__':
    main()
