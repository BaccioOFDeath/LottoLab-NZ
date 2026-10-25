#!/usr/bin/env python3
"""Backfill and update verified-format NZ Keno draw history without fabricated draws.

Source: https://www.lottodraw.co.nz/keno/archive (independent, unofficial).
Stored data should always be cross-checked with official Lotto NZ results.
"""
import argparse
import calendar
import datetime as dt
import json
import random
import re
import sys
import time
from collections import Counter
from pathlib import Path
from urllib.parse import urljoin
from zoneinfo import ZoneInfo

import requests
from bs4 import BeautifulSoup

BASE = "https://www.lottodraw.co.nz"
DATA = Path("data/keno-results.json")
PICKS = Path("data/keno-daily-picks.json")
PICKS_HISTORY = Path("data/keno-picks-history.json")
HEALTH = Path("data/keno-data-health.json")
NZ = ZoneInfo("Pacific/Auckland")
DATE_URL = re.compile(r"/keno/results-([a-z]+)-(\d{1,2})-(20\d{2})", re.I)
TIMES = {"10:00 am": 10, "1:00 pm": 13, "3:00 pm": 15, "6:00 pm": 18}
MONTHS = {calendar.month_name[i].lower(): i for i in range(1, 13)}
S = requests.Session()
S.headers.update({"User-Agent": "LottoLabNZ/1.0 (public statistical research; respectful crawl)", "Accept": "text/html,application/xhtml+xml"})

def read_json(path, default):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return default

def write_json(path, data, pretty=False):
    path.parent.mkdir(parents=True, exist_ok=True)
    output = (json.dumps(data, indent=2 if pretty else None, separators=None if pretty else (",", ":"), ensure_ascii=False) + "\n")
    if path.exists() and path.read_text(encoding="utf-8") == output:
        return False
    path.write_text(output, encoding="utf-8")
    return True

def fetch(url):
    for attempt in range(3):
        try:
            response = S.get(url, timeout=20)
            if response.status_code == 404:
                return None
            if response.status_code in (429, 403):
                raise RuntimeError("Source rate-limited or disallowed requests (HTTP %d): %s" % (response.status_code, url))
            response.raise_for_status()
            time.sleep(0.22)
            return response.text
        except requests.RequestException as exc:
            if attempt == 2:
                print("WARNING fetch failed", url, exc, file=sys.stderr)
                return None
            time.sleep(2 ** attempt)
    return None

def source_date(url):
    match = DATE_URL.search(url)
    if not match or match.group(1).lower() not in MONTHS:
        return None
    try:
        return dt.date(int(match.group(3)), MONTHS[match.group(1).lower()], int(match.group(2)))
    except ValueError:
        return None

def normalize(record):
    if not isinstance(record, dict):
        return None
    try:
        d = dt.date.fromisoformat(record["date"])
        draw = int(record["draw"])
        numbers = sorted(int(v) for v in record["numbers"])
        if draw <= 0 or len(numbers) != 20 or len(set(numbers)) != 20 or numbers[0] < 1 or numbers[-1] > 80:
            return None
        result = {"date": d.isoformat(), "draw": str(draw), "time": str(record.get("time", "")),
                  "numbers": numbers, "multiplier": record.get("multiplier"),
                  "source": str(record.get("source", ""))}
        return result
    except (TypeError, ValueError, KeyError):
        return None

def parse_day(html, url):
    day = source_date(url)
    if day is None or not html:
        return []
    soup = BeautifulSoup(html, "html.parser")
    draws = []
    for article in soup.find_all("article"):
        heading = article.find("h2")
        title = heading.get_text(" ", strip=True).lower() if heading else ""
        clock = re.search(r"(10:00\s*am|1:00\s*pm|3:00\s*pm|6:00\s*pm)", title)
        draw_match = re.search(r"\bDraw\s+(\d{3,7})\b", article.get_text(" ", strip=True), re.I)
        ordered = article.find("ol")
        if not clock or not draw_match or ordered is None:
            continue
        labels = [li.get_text(" ", strip=True) for li in ordered.find_all("li", recursive=False)]
        if not all(re.fullmatch(r"\d{1,2}", x) for x in labels):
            continue
        txt = article.get_text(" ", strip=True)
        mult = re.search(r"[×x]\s*(1\.5|2|3|5|10)(?=\D|$)", txt)
        r = normalize({"date": day.isoformat(), "draw": draw_match.group(1),
                       "time": clock.group(1), "numbers": labels,
                       "multiplier": float(mult.group(1)) if mult else None, "source": url})
        if r:
            draws.append(r)
    # Refuse to publish duplicate draw identifiers or conflicting draw contents.
    if len(set(r["draw"] for r in draws)) != len(draws):
        return []
    return draws

def month_urls(year, month):
    url = BASE + "/keno/archive/" + calendar.month_name[month].lower() + "-" + str(year)
    page = fetch(url)
    if not page:
        return []
    soup = BeautifulSoup(page, "html.parser")
    urls = set()
    for link in soup.find_all("a", href=True):
        link_url = urljoin(BASE, link["href"].split("#", 1)[0])
        d = source_date(link_url)
        if d and d.year == year and d.month == month:
            urls.add(link_url)
    return sorted(urls, key=lambda u: source_date(u), reverse=True)

def date_url(day):
    return BASE + "/keno/results-" + calendar.month_name[day.month].lower() + "-" + str(day.day) + "-" + str(day.year)

def upsert(current, new):
    m = {str(r["draw"]): r for r in current if normalize(r)}
    added = 0
    conflicts = 0
    for r in new:
        norm = normalize(r)
        if not norm:
            continue
        existing = m.get(norm["draw"])
        if existing and existing["numbers"] != norm["numbers"]:
            conflicts += 1
            print("CONFLICT draw", norm["draw"], "retaining existing record", file=sys.stderr)
        elif not existing:
            m[norm["draw"]] = norm
            added += 1
    return sorted(m.values(), key=lambda r: int(r["draw"])), added, conflicts

def load_draws():
    result = []
    for value in read_json(DATA, []):
        n = normalize(value)
        if n:
            result.append(n)
    return result

def collect(draws, recent_days, backfill_days):
    seen = {r["date"] for r in draws if sum(x["date"] == r["date"] for x in draws[-40:]) == 4}
    # Fetch recent days even if four are already present; new draws can appear throughout the day.
    now = dt.datetime.now(NZ).date()
    fresh = []
    for i in range(recent_days):
        day = now - dt.timedelta(days=i)
        fresh.extend(parse_day(fetch(date_url(day)), date_url(day)))
    updated, added, conflicts = upsert(draws, fresh)
    if backfill_days > 0:
        existing = Counter(r["date"] for r in updated)
        remaining = backfill_days
        year, month = now.year, now.month
        while (year, month) >= (2019, 1) and remaining > 0:
            first_day = 5 if year == 2019 and month == 1 else 1
            valid_days = [dt.date(year, month, d) for d in range(first_day, calendar.monthrange(year, month)[1] + 1) if dt.date(year,month,d) <= now]
            if all(existing[d.isoformat()] >= 4 for d in valid_days):
                month -= 1
                if month == 0:
                    month, year = 12, year - 1
                continue
            for url in month_urls(year, month):
                day = source_date(url)
                if not day or existing[day.isoformat()] >= 4:
                    continue
                fresh = parse_day(fetch(url), url)
                if not fresh:
                    continue
                updated, plus, c = upsert(updated, fresh)
                if plus:
                    added += plus
                    existing[day.isoformat()] += plus
                    remaining -= 1
                conflicts += c
                if remaining <= 0:
                    break
            month -= 1
            if month == 0:
                month, year = 12, year - 1
    print("Records:", len(updated), "added:", added, "conflicts:", conflicts)
    return updated, conflicts

def build_models(data, target):
    training = [r for r in data if r["date"] < target.isoformat()]
    if len(training) < 30:
        return []
    all_counts = Counter(n for r in training for n in r["numbers"])
    recent = training[-min(80, len(training)):]
    recent_counts = Counter(n for r in recent for n in r["numbers"])
    universe = list(range(1, 81))
    def top(c, rev=False):
        return sorted(sorted(universe, key=lambda n: (c[n], n) if rev else (-c[n], n))[:10])
    hot = top(all_counts)
    momentum = top(recent_counts)
    cold = top(recent_counts, True)
    pair = Counter((min(a, b), max(a, b)) for r in training for i, a in enumerate(r["numbers"]) for b in r["numbers"][i+1:])
    chosen = [hot[0]]
    while len(chosen) < 10:
        def score(n):
            # Excess co-appearance over unconditional independence, not proof of predictability.
            return (sum(pair[(min(n, k), max(n, k))] - all_counts[n] * all_counts[k] / len(training) for k in chosen)
                    + .05 * all_counts[n])
        chosen.append(max((n for n in universe if n not in chosen), key=lambda n: (score(n), -n)))
    network = sorted(chosen)
    balanced = sorted(max(range(i, i+8), key=lambda n: (all_counts[n], -n)) for i in range(1, 81, 8))
    seeded = random.Random(int(target.strftime("%Y%m%d")))
    reference = sorted(seeded.sample(universe, 10))
    return [
        {"id": "historical", "name": "Historical hot", "description": "Most frequently drawn across available verified-format history", "numbers": hot},
        {"id": "recent", "name": "Recent momentum", "description": "Most frequently drawn across the most recent 80 draws", "numbers": momentum},
        {"id": "cold", "name": "Recent cold", "description": "Least frequent in the last 80 draws; not due to appear", "numbers": cold},
        {"id": "network", "name": "Pair network", "description": "Historical co-appearance above independent expectation", "numbers": network},
        {"id": "spread", "name": "Balanced zones", "description": "One high-frequency number from each block of eight", "numbers": balanced},
        {"id": "random", "name": "Random control", "description": "Seeded random reference for an honest baseline", "numbers": reference}
    ]

def publish_picks(draws):
    now = dt.datetime.now(NZ)
    today = now.date()
    old = read_json(PICKS, {})
    if old.get("date") == today.isoformat():
        print("Today's published lines are immutable. No regeneration.")
        return
    if now.hour >= 18:
        print("After last draw. Keeping the last published set until next morning.")
        return
    training = [r for r in draws if r["date"] < today.isoformat()]
    if len(training) < 30:
        print("Insufficient Keno history for daily picks.")
        return
    models = build_models(draws, today)
    last_id = max((int(r["draw"]) for r in training), default=0)
    slots = [(10, 0), (13, 1), (15, 2), (18, 3)]
    next_slot = next(((h, i) for h,i in slots if now.hour < h or (now.hour == h and now.minute == 0 and now.second == 0)), None)
    if next_slot is None:
        return
    hour, offset = next_slot
    first = last_id + 1 + offset
    before = dt.datetime.combine(today, dt.time(hour, 0), tzinfo=NZ)
    record = {
        "date": today.isoformat(), "created_at": now.isoformat(),
        "timezone": "Pacific/Auckland", "eligible_from": before.isoformat(),
        "first_scored_draw": first, "training_draws": len(training),
        "last_training_draw": str(last_id), "models": models,
        "note": "Research only; all valid lines have equal theoretical odds. Draws earlier than publication are excluded."
    }
    hist = read_json(PICKS_HISTORY, [])
    if old and old.get("date") and not any(h.get("date") == old["date"] for h in hist):
        hist.append(old)
        write_json(PICKS_HISTORY, hist[-365:], pretty=True)
    write_json(PICKS, record, pretty=True)
    print("Published locked", today, "Keno lines for", before.isoformat(), "from", len(training), "draws")

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--recent-days", type=int, default=7)
    ap.add_argument("--backfill-days", type=int, default=0)
    a = ap.parse_args()
    draws, conflicts = collect(load_draws(), max(1, a.recent_days), max(0, a.backfill_days))
    write_json(DATA, draws)
    dates = Counter(x["date"] for x in draws)
    missing_days = [d for d, v in dates.items() if v < 4]
    health = {"draw_count": len(draws),
              "first_date": draws[0]["date"] if draws else None,
              "last_date": draws[-1]["date"] if draws else None,
              "latest_draw": draws[-1]["draw"] if draws else None,
              "partial_days": len(missing_days), "conflicts_this_run": conflicts,
              "source": BASE + "/keno/archive",
              "disclaimer": "Independent, unofficial history. Check against Lotto NZ."}
    write_json(HEALTH, health, pretty=True)
    publish_picks(draws)
    if conflicts:
        raise SystemExit("Conflicting results found; review source before trusting new data.")

if __name__ == "__main__":
    main()
