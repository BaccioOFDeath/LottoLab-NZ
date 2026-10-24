"""Cross-check public Lotto results pages before publishing. Python 3.12."""
import json,re,datetime as dt,sys
from pathlib import Path
from urllib.request import Request,urlopen
from bs4 import BeautifulSoup
DATA=Path('data/draws.json')
A='https://www.lottodraw.co.nz/lotto/results'
B='https://dashtickets.nz/lotto-results/'
months={m.lower():i for i,m in enumerate('January February March April May June July August September October November December'.split(),1)}
def fetch(url):
    with urlopen(Request(url,headers={'User-Agent':'LottoLabNZ-Research/1.0','Accept':'text/html'}),timeout=25) as r:return BeautifulSoup(r.read(2000000),'html.parser')
def date(s):
    m=re.search(r'(\d{1,2})\s+('+ '|'.join(months)+r')\s+(20\d\d)',s,re.I)
    if not m:raise ValueError('Date not found')
    return dt.date(int(m[3]),months[m[2].lower()],int(m[1])).isoformat()
def parse_a(soup):
    for a in soup.select('article'):
        t=a.get_text(' ',strip=True);m=re.search(r'\bDraw\s+(\d{3,5})\b',t,re.I)
        ol=a.find('ol')
        if not (m and ol):continue
        ns=[int(x.get_text(strip=True)) for x in ol.find_all('li',recursive=False)]
        if len(ns)!=6:continue
        def dd(label):
            for el in a.find_all(['strong','dt']):
                if el.get_text(' ',strip=True).lower()==label:
                    x=el.find_next('dd')
                    if x:return int(re.search(r'\d+',x.get_text(' ',strip=True)).group())
            raise ValueError('Missing '+label)
        return dict(draw=int(m[1]),date=date(t),numbers=sorted(ns),bonus=dd('bonus ball'),powerball=dd('powerball'))
    raise ValueError('Source A structure changed')
def parse_b(soup):
    for a in soup.select('section'):
        t=a.get_text(' ',strip=True)
        m=re.search(r'\bDraw\s+(\d{3,5})\s*[·-]\s*(\d{1,2}\s+\w+\s+20\d\d)',t,re.I)
        if not m:continue
        ol=a.find('ol')
        if not ol:continue
        ns=[int(x.get_text(strip=True)) for x in ol.find_all('li',recursive=False)]
        bb=re.search(r'Bonus\s*Ball\s*0?(\d{1,2})\b',t,re.I)
        pb=re.search(r'Powerball\s*0?(\d{1,2})\b',t,re.I)
        if len(ns)==6 and bb and pb:return dict(draw=int(m[1]),date=date(m[2]),numbers=sorted(ns),bonus=int(bb[1]),powerball=int(pb[1]))
    raise ValueError('Source B structure changed')
def verify(x):
    day=dt.date.fromisoformat(x['date'])
    if day.weekday() not in (2,5) or day>dt.datetime.now(dt.timezone(dt.timedelta(hours=13))).date():raise ValueError('Invalid draw date')
    ns=x['numbers']
    if len(ns)!=6 or ns!=sorted(set(ns)) or not all(1<=n<=40 for n in ns):raise ValueError('Invalid Lotto balls')
    if x['bonus'] in ns or not 1<=x['bonus']<=40:raise ValueError('Invalid bonus')
    cap=14 if day>=dt.date(2026,9,13) else 10
    if not 1<=x['powerball']<=cap:raise ValueError('Invalid Powerball')
    if x['draw']<1:raise ValueError('Invalid draw number')
def main():
    a,b=parse_a(fetch(A)),parse_b(fetch(B));verify(a);verify(b)
    if a!=b:raise ValueError('Sources disagree: '+repr((a,b)))
    old=json.loads(DATA.read_text())
    matches=[d for d in old if d['draw']==a['draw']]
    if matches:
        if any(d[k]!=a[k] for d in matches for k in ('date','numbers','bonus','powerball')):raise ValueError('Existing draw conflict')
        print('Result already stored');return
    if old and a['draw']<max(d['draw'] for d in old):raise ValueError('Refusing unexpected historic insert')
    old.insert(0,{**a,'verification':'two-source','sources':[A,B]})
    DATA.write_text(json.dumps(old,indent=2)+'\n')
    print('Published cross-checked draw',a['draw'])
if __name__=='__main__':
    try:main()
    except Exception as e:print('BLOCKED: '+str(e),file=sys.stderr);sys.exit(1)
