"""Strict historical NZ Lotto backfill from publicly accessible archive pages.

Historical first pass covers Dec 2018-Oct 2025. The archive explicitly does
not contain pre-Dec-2018 results. Both third-party providers must agree exactly;
a disagreement is skipped, never overwritten. No fake Powerball for pre-2001.

Usage: python scripts/backfill_history.py --limit 45
       python scripts/backfill_history.py --limit 100 --start 2018-12
"""
import argparse,calendar,datetime as dt,json,re,time
from pathlib import Path
from urllib.request import Request,urlopen
from urllib.error import HTTPError,URLError
from bs4 import BeautifulSoup

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/'data/draws.json'
MAIN='https://www.lottodraw.co.nz/lotto'
SECOND='https://app.nz-lotto.com/loto-statistics/results/mylotto-'
MONTHS=list(calendar.month_name)
MONTH_ID={n.lower():i for i,n in enumerate(MONTHS) if n}
DATE=re.compile(r'(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})\s*[·\-\s]+\s*Draw\s*(\d+)',re.I)
DATE2=re.compile(r'Draw:\s*(\d+)\s*,?\s*Date:\s*(\d{4}-\d{2}-\d{2})',re.I)
FIRST=re.compile(r'Lotto results\s+(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})\s+(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s*[·\-\s]+\s*Draw\s*(\d+)',re.I)
def fetch(url):
 req=Request(url,headers={'User-Agent':'LottoLab-NZ research archive validator (https://github.com/BaccioOFDeath/LottoLab-NZ)','Accept':'text/html'})
 try:
  with urlopen(req,timeout=17) as response:
   html=response.read(2_500_000).decode('utf-8','replace')
   return BeautifulSoup(html,'html.parser')
 except (HTTPError,URLError,TimeoutError,OSError):
  return None
def read_first(soup):
 if not soup:return None
 article=soup.select_one('article')
 if not article:return None
 plain=article.get_text(' ',strip=True)
 m=DATE.search(plain)
 if not m:return None
 try:date=dt.date(int(m[3]),MONTH_ID[m[2].lower()],int(m[1])).isoformat()
 except (ValueError,KeyError):return None
 six=article.select_one('ol')
 if six is None:return None
 try:nums=sorted(int(t.get_text(strip=True)) for t in six.select('li'))
 except ValueError:return None
 dd=article.select('dd')
 if len(dd)<2:return None
 bonus=re.search(r'\d+',dd[0].get_text(' ',strip=True))
 power=re.search(r'\d+',dd[1].get_text(' ',strip=True))
 if not bonus or not power:return None
 return dict(draw=int(m[4]),date=date,numbers=nums,bonus=int(bonus[0]),powerball=int(power[0]))
def read_second(soup):
 if not soup:return None
 main=soup.select_one('main')
 if not main:return None
 text=main.get_text('\n',strip=True)
 m=DATE2.search(text)
 if not m:return None
 # Result numbers are located between first two horizontal rules and the next.
 html=str(main)
 first=html.find('<hr')
 if first<0:return None
 prior=BeautifulSoup(html[:first],'html.parser').get_text('\n',strip=True)
 after=html[first:]
 second=after.find('<hr',3)
 bonusblock=BeautifulSoup(after[:second] if second>=0 else after,'html.parser').get_text('\n',strip=True)
 lines=[z.strip() for z in prior.splitlines() if re.fullmatch(r'\d{1,2}',z.strip())]
 if len(lines)<7:return None
 nums=sorted(int(v) for v in lines[-7:-1])
 bonus=int(lines[-1])
 pvals=[z.strip() for z in bonusblock.splitlines() if re.fullmatch(r'\d{1,2}',z.strip())]
 if len(pvals)<1:return None
 return dict(draw=int(m[1]),date=m[2],numbers=nums,bonus=bonus,powerball=int(pvals[0]))
def valid(r):
 if not r or len(r['numbers'])!=6 or len(set(r['numbers']))!=6:return False
 if not all(1<=n<=40 for n in r['numbers']):return False
 if not 1<=r['bonus']<=40 or r['bonus'] in r['numbers']:return False
 if not 1<=r['powerball']<=14:return False
 try:d=dt.date.fromisoformat(r['date'])
 except ValueError:return False
 return dt.date(2018,12,1)<=d<=dt.date.today() and r['draw']>0
def month_pages(start):
 now=dt.date.today()
 ym=now.year*12+now.month-1
 stop_year,stop_month=map(int,start.split('-'))
 minimum=stop_year*12+stop_month-1
 for idx in range(min(ym,2025*12+10-1),minimum-1,-1):
  year,mm=divmod(idx,12);mm+=1
  url=f'{MAIN}/archive/{MONTHS[mm].lower()}-{year}'
  yield url
def archive_links(soup):
 links=[]
 if not soup:return links
 for a in soup.select('a[href]'):
  url=a.get('href','')
  if not re.search(r'/lotto/results-[a-z]+-\d{1,2}-\d{4}',url):continue
  if url.startswith('/'):url='https://www.lottodraw.co.nz'+url
  if url.startswith(MAIN+'/results-') and url not in links:links.append(url)
 return links
def process(limit,start):
 current=json.loads(DATA.read_text())
 existing={row['draw']:row for row in current}
 inserted=[];checked=0;skipped=0
 for month in month_pages(start):
  page=fetch(month)
  if not page:continue
  for url in archive_links(page):
   if checked>=limit:break
   checked+=1
   a=read_first(fetch(url))
   if not valid(a):skipped+=1;continue
   if a['draw'] in existing:continue
   secondary_url=SECOND+str(a['draw'])
   b=read_second(fetch(secondary_url))
   if not valid(b) or (a['draw'],a['date'],a['numbers'],a['bonus'],a['powerball'])!=(b['draw'],b['date'],b['numbers'],b['bonus'],b['powerball']):
    print('Unconfirmed draw',a['draw'],'- skipping');skipped+=1;continue
   record={**a,'verification':'two-source','sources':[url,secondary_url]}
   inserted.append(record);existing[a['draw']]=record
   print('Verified',a['draw'],a['date'])
   time.sleep(.2)
  if checked>=limit:break
 if inserted:
  current.extend(inserted);current.sort(key=lambda r:r['draw'],reverse=True)
  DATA.write_text(json.dumps(current,indent=2,ensure_ascii=False)+'\n')
 print('Backfill inspected',checked,'pages, imported',len(inserted),'verified draws; skipped',skipped,'unconfirmed. Database total:',len(current))
if __name__=='__main__':
 parser=argparse.ArgumentParser()
 parser.add_argument('--limit',type=int,default=50)
 parser.add_argument('--start',default='2018-12')
 args=parser.parse_args()
 process(min(250,max(1,args.limit)),args.start)
