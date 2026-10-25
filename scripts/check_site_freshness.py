"""Operational guard for unattended LottoLab schedules.

Validates only verifiable public results and immutable pre-draw picks.
Never invents results, skips verification, or silently reports stale data as current.
Run: python scripts/check_site_freshness.py [--now 2026-10-25T20:30:00+13:00]
"""
import argparse
import datetime as dt
import json
import sys
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
NZ = ZoneInfo("Pacific/Auckland")
DRAW_TIME = dt.time(20, 20)
RESULT_GRACE = dt.timedelta(hours=18)
MODELS = {"adaptive_frequency_v1", "random_baseline_v1"}


def scheduled_on_or_before(day):
    while day.weekday() not in (2, 5):
        day -= dt.timedelta(days=1)
    return day


def draw_due(now):
    """Most recent Wednesday/Saturday where an 18-hour result grace has expired."""
    current = now.astimezone(NZ)
    day = scheduled_on_or_before(current.date())
    draw_at = dt.datetime.combine(day, DRAW_TIME, NZ)
    if current >= draw_at + RESULT_GRACE:
        return day
    return scheduled_on_or_before(day - dt.timedelta(days=1))


def upcoming(now):
    local = now.astimezone(NZ)
    day = local.date()
    if day.weekday() in (2, 5) and local.time() < DRAW_TIME:
        return day
    day += dt.timedelta(days=1)
    while day.weekday() not in (2, 5):
        day += dt.timedelta(days=1)
    return day


def assess(now, draws, picks, performance):
    local = now.astimezone(NZ)
    problems = []
    warnings = []
    verified = sorted(
        (d for d in draws if d.get("verification") == "two-source"
         and len(set(d.get("sources", []))) >= 2),
        key=lambda row: (row["date"], row["draw"]))
    due = draw_due(now)
    newest = dt.date.fromisoformat(verified[-1]["date"]) if verified else None
    if newest is None or newest < due:
        problems.append(
            f"Verified results stale. Last={newest}, expected at least {due} "
            f"(NZ draw 20:20 + {RESULT_GRACE.total_seconds() / 3600:g}h grace)."
        )
    target = upcoming(now).isoformat()
    group = [p for p in picks if p.get("target_date") == target]
    models = [(p.get("model"), int(p.get("line_number", 1))) for p in group]
    lines = [(tuple(p.get("numbers", [])), p.get("powerball")) for p in group]
    valid_lines = all(
        len(line[0]) == 6 and len(set(line[0])) == 6
        and all(isinstance(n, int) and 1 <= n <= 40 for n in line[0])
        and isinstance(line[1], int) and 1 <= line[1] <= 14
        for line in lines)
    if (len(group) != 20 or len(set(models)) != 20 or len(set(lines)) != 20
        or {m for m, _ in models} != MODELS or not valid_lines):
        problems.append(f"Upcoming research picks incomplete for {target}: "
                        f"{len(group)}/20 valid frozen lines.")
    if performance.get("upcoming_date") != target:
        problems.append(f"Model scorecard targets {performance.get('upcoming_date')}, "
                        f"but next local draw is {target}.")
    try:
        generated = dt.datetime.fromisoformat(performance.get("generated_at", ""))
        if generated.tzinfo is None:
            raise ValueError("timezone missing")
        age = local - generated.astimezone(NZ)
        if age > dt.timedelta(days=4):
            warnings.append(f"Scorecard last generated {age.days} days ago.")
    except (ValueError, TypeError):
        warnings.append("Scorecard generation timestamp invalid.")
    return {
        "checked_at_nz": local.isoformat(),
        "status": "alert" if problems else "ok",
        "latest_verified": newest.isoformat() if newest else None,
        "expected_verified_through": due.isoformat(),
        "upcoming_draw": target,
        "upcoming_lines": len(group),
        "stored_draws": len(draws),
        "two_source_verified": len(verified),
        "problems": problems,
        "warnings": warnings,
    }


def main(argv=None):
    parser = argparse.ArgumentParser()
    parser.add_argument("--now", help="ISO timezone-aware timestamp for deterministic tests")
    parser.add_argument("--report", default=None, help="Optional JSON output path")
    args = parser.parse_args(argv)
    now = dt.datetime.fromisoformat(args.now) if args.now else dt.datetime.now(NZ)
    if now.tzinfo is None:
        parser.error("--now must include a timezone offset")
    draws = json.loads((ROOT / "data/draws.json").read_text())
    picks = json.loads((ROOT / "data/model-picks.json").read_text())
    performance = json.loads((ROOT / "data/model-performance.json").read_text())
    report = assess(now, draws, picks, performance)
    payload = json.dumps(report, indent=2)
    print(payload)
    if args.report:
        Path(args.report).write_text(payload + "\n")
    return 1 if report["status"] == "alert" else 0


if __name__ == "__main__":
    sys.exit(main())
