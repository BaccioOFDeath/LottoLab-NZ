"""Conservative public Lotto NZ first-division winner-location importer.

This importer does NOT guess unknown towns, exact store coordinates, online sale
locations, or jackpot outcomes. It only ingests a report when its official URL,
draw/date statement, a Lotto First Division store/location table, and approved
coordinates can all be independently parsed. Other prize tiers are curated
from published releases and are not guessed by this script.
"""
import argparse
import datetime as dt
import json
import re
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import Request, urlopen
from bs4 import BeautifulSoup
from zoneinfo import ZoneInfo

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/'data/geo-winners.json'
PLACES=ROOT/'data/geo-places.json'
OFFICIAL='https://mylotto.co.nz/news-and-press-releases/'
DATE_RE=re.compile(r'For draw\s+(\d{3,5})\s+on\s+(Wednesday|Saturday)\s+(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})\.',re.I)
MONTHS={m.lower():i for i,m in enumerate(['January','February','March','April','May','June','July','August','September','October','November','December'],1)}
FIRST_DIV=re.compile(r'Lotto\s+First\s+Division',re.I)
NUMBER=re.compile(r'(\d+)',re.I)
ALIASES={'Pāpāmoa':'Papamoa','Papamoa':'Papamoa','Tāmaki Makaurau':'Auckland','Christchurch City':'Christchurch',
          'Waikato':'Hamilton','Te Rapa':'Hamilton','Mt Maunganui':'Mount Maunganui','Otātara':'Invercargill'}
MAX_URLS=28

def parse_header(text):
    m=DATE_RE.search(text)
    if not m:return None
    day=dt.date(int(m[5]),MONTHS[m[4].lower()],int(m[3]))
    if day.strftime('%A').lower()!=m[2].lower():return None
    return int(m[1]),day.isoformat()

def clean(s):
    return re.sub(r'\s+',' ',s).strip(' :\u00a0\t\n')

def first_division_rows(doc,source_url,places):
    if not source_url.startswith(OFFICIAL):return []
    soup=BeautifulSoup(doc,'html.parser')
    text=clean(soup.get_text(' ',strip=True))
    header=parse_header(text)
    if not header:return []
    draw,date=header
    # Only discover explicitly classified Lotto First Division store tables.
    # Never treat Powerball or Strike tables as Lotto winners.
    tables=soup.find_all('table')
    winners=[]
    for table in tables:
        prev=table.find_previous(['h1','h2','h3','h4','h5','strong','p'])
        header_text=clean(prev.get_text(' ',strip=True)) if prev else ''
        if not FIRST_DIV.search(header_text):continue
        cells=[[clean(c.get_text(' ',strip=True)) for c in row.find_all(['td','th'])] for row in table.find_all('tr')]
        for row in cells:
            if len(row)<2 or row[0].lower()=='store' or row[1].lower()=='location':continue
            outlet=clean(row[0]);loc=clean(row[1])
            if not outlet or not loc:continue
            channel='online' if outlet.lower().startswith('mylotto') else 'retail'
            times=re.search(r'\(x\s*(\d+)\)',outlet,re.I)
            count=int(times[1]) if times else 1
            if count>100:continue
            outlet=re.sub(r'\(x\s*\d+\)','',outlet,flags=re.I).strip()
            loc=ALIASES.get(loc,loc)
            where=places.get(loc)
            if not where:continue # unknown coordinate: never guess
            winners.append(make_record(draw,date,outlet,loc,where,count,channel,source_url))
    # Safest optional single-winner construction when explicitly one Lotto first winner
    # and a human-readable "sold at STORE in CITY" declaration is present.
    if not winners:
        pattern=(r'One player won Lotto First Division.{0,240}?'
                 r'winning ticket was sold at\s+(.{3,110}?)\s+in\s+([A-Za-zāēīōūĀĒĪŌŪ][\w\sāēīōūĀĒĪŌŪ-]{2,40})(?:\.|\s{2,})')
        match=re.search(pattern,text,re.I)
        if match:
            outlet=clean(match[1]);loc=ALIASES.get(clean(match[2]),clean(match[2]))
            if loc in places and not outlet.lower().startswith('mylotto'):
                winners.append(make_record(draw,date,outlet,loc,places[loc],1,'retail',source_url))
    return winners

def make_record(draw,date,outlet,place,geo,tickets,channel,url):
    ident=re.sub(r'[^a-z0-9]+','-',f'{date}-{draw}-{outlet}-{place}'.lower()).strip('-')
    return {
      'id':'auto-'+ident[:100], 'draw_date':date,'draw_id':draw,'game':'Lotto','tier':'first',
      'channel':channel,'tickets':tickets,'outlet':outlet,'place':place,'region':geo['region'],
      'lat':geo['lat'],'lon':geo['lon'],'precision':'region' if geo.get('precision')=='region' else 'city',
      'location_role':'retailer_town_not_exact_shop' if channel=='retail' else 'online_winner_reported_area_not_sale_point',
      'prize_each_nzd':None,'source_url':url,'source_publisher':'Lotto NZ official result release'
    }

def unique_key(row):
    return (row['draw_date'],row['game'],row['tier'],row['channel'],
            re.sub(r'\W+','',row['outlet'].lower()),re.sub(r'\W+','',row['place'].lower()))

def fetch(url):
    if not url.startswith(OFFICIAL):return ''
    request=Request(url,headers={'User-Agent':'LottoLabNZ/1.0 (+https://github.com/BaccioOFDeath/LottoLab-NZ)',
                                  'Accept':'text/html'})
    try:
        with urlopen(request,timeout=11) as res:
            content=res.read(1_500_000).decode('utf-8','replace')
            return content if '<html' in content.lower() else ''
    except Exception as e:
        print('Source inaccessible, skipped:',url,type(e).__name__)
        return ''

def candidate_urls(today,days):
    for offset in range(days):
        d=today-dt.timedelta(days=offset)
        if d.weekday() not in (2,5):continue
        slug=d.strftime('%d%m%y')
        yield OFFICIAL+'lotto-draw-results-'+slug
        yield OFFICIAL+'lotto_draw_results_'+slug

def run(today=None,days=10):
    if not 1<=days<=30:raise ValueError('days must be 1..30')
    now=today or dt.datetime.now(ZoneInfo('Pacific/Auckland')).date()
    data=json.loads(DATA.read_text())
    places=json.loads(PLACES.read_text())['places']
    seen={unique_key(x) for x in data['records']}
    additions=[]
    for url in list(candidate_urls(now,days))[:MAX_URLS]:
        raw=fetch(url)
        if not raw or len(raw)<200:continue
        for row in first_division_rows(raw,url,places):
            key=unique_key(row)
            if key in seen:continue
            seen.add(key);additions.append(row)
    if additions:
        data['records'].extend(additions)
        data['records'].sort(key=lambda r:(r['draw_date'],r['id']),reverse=True)
        DATA.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
    print('Official Lotto NZ location import: '+str(len(additions))+' new vetted public store/town records, source links stored; no unverified coordinates accepted.')

if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--days',type=int,default=10)
    args=parser.parse_args()
    run(days=args.days)
