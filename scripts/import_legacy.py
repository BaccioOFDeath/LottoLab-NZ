"""Cautious legacy NZ Lotto public-draw importer (1987–late 2018).

Pages are public unauthed draw-specific documents from a third-party archive.
Source data is tagged 'one-source' and NEVER represented as independently verified.
The Powerball field is null before its February 2001 introduction.
Run: python scripts/import_legacy.py --start 1 --end 1800 --workers 3
"""
import argparse,concurrent.futures,datetime as dt,json,re,time
from pathlib import Path
from urllib.request import Request,urlopen
from urllib.error import HTTPError,URLError
from bs4 import BeautifulSoup
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'data/legacy-draws.json'
BASE='https://app.nz-lotto.com/loto-statistics/results/mylotto-'
HEADER=re.compile(r'Draw:\s*(\d+)\s*,\s*Date:\s*(\d{4}-\d{2}-\d{2})',re.I)
_NUM=re.compile(r'^\d{1,2}$')
FIRST_POWER=dt.date(2001,2,1)
def parse(html,n,source):
 soup=BeautifulSoup(html,'html.parser')
 main=soup.select_one('main') or soup.body or soup
 text=main.get_text('\n',strip=True)
 match=HEADER.search(text)
 if not match or int(match[1])!=n:return None
 try:date=dt.date.fromisoformat(match[2])
 except ValueError:return None
 if not dt.date(1987,8,1)<=date<dt.date(2018,12,1):return None
 if date.weekday() not in (2,5):return None
 # The results are the first six numeric paragraph values after the draw
 # header, followed by '+' then a bonus then optional Powerball.
 tail=text[match.end():]
 tail=tail.split('Next Draw',1)[0]
 lines=[v.strip() for v in tail.splitlines() if v.strip()]
 nums=[]
 plus_idx=-1
 for i,line in enumerate(lines):
  if line=='+':
   plus_idx=i;break
  if _NUM.fullmatch(line):nums.append(int(line))
 if plus_idx<0 or len(nums)!=6:return None
 following=[int(v) for v in lines[plus_idx+1:] if _NUM.fullmatch(v)]
 if len(following)<2:return None
 bonus,power=following[:2]
 if len(set(nums))!=6 or any(not 1<=v<=40 for v in nums):return None
 if not 1<=bonus<=40 or bonus in nums:return None
 if date<FIRST_POWER:
  if power!=0:return None
  pb=None
 else:
  if not 1<=power<=10:return None
  pb=power
 return dict(draw=n,date=date.isoformat(),numbers=sorted(nums),bonus=bonus,powerball=pb,
             verification='one-source',sources=[source],source_note='Third-party historical result page, not independently confirmed; pre-2001 Powerball did not exist')
def fetch(n):
 url=BASE+str(n)
 req=Request(url,headers={'User-Agent':'LottoLabNZ-history-audit/1.0 (+https://github.com/BaccioOFDeath/LottoLab-NZ)','Accept':'text/html'})
 try:
  with urlopen(req,timeout=18) as response:page=response.read(180_000).decode('utf8','replace')
  return parse(page,n,url)
 except (HTTPError,URLError,TimeoutError,OSError,ValueError):return None
 finally:
  # Keep concurrent load modest rather than crawling a third-party archive fast.
  time.sleep(.75)
def main(start,end,workers):
 if start<1 or end>1800 or start>end:raise ValueError('Legacy import supports draw numbers 1..1800 only')
 existing=json.loads(OUT.read_text()) if OUT.exists() else []
 byid={r['draw']:r for r in existing}
 missing=[n for n in range(start,end+1) if n not in byid]
 print('Legacy import: existing',len(byid),'requested',len(missing),'from',start,'to',end,flush=True)
 with concurrent.futures.ThreadPoolExecutor(max_workers=min(4,max(1,workers))) as pool:
  for index,row in enumerate(pool.map(fetch,missing),1):
   if row:byid[row['draw']]=row
   if index%50==0:print('Read',index,'pages,',len(byid),'valid historical records',flush=True)
 rows=sorted(byid.values(),key=lambda r:r['draw'],reverse=True)
 # Check key continuity dates for single-source imports; report gaps, never fill.
 gaps=sorted(set(range(start,end+1))-set(byid))
 OUT.write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
 print('Legacy records stored',len(rows),'missing in requested range',len(gaps),'first missing',gaps[:25],flush=True)
if __name__=='__main__':
 ap=argparse.ArgumentParser();ap.add_argument('--start',type=int,default=1);ap.add_argument('--end',type=int,default=1800);ap.add_argument('--workers',type=int,default=3)
 a=ap.parse_args();main(a.start,a.end,a.workers)
