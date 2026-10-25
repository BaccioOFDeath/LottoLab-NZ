#!/usr/bin/env python3
"""Leakage-free Keno research scorecard: compare pre-draw policies on later draws.

This is an audit of historical selection strategies, NOT proof that any fair game is predictable.
All model predictions use exclusively preceding draw records.
"""
from collections import Counter, defaultdict, deque
from datetime import datetime
from math import sqrt
from pathlib import Path
import json
import random

SOURCE = Path("data/keno-results.json")
OUT = Path("data/keno-model-audit.json")
WARMUP = 200
WINDOW = 80
MODELS = (
    "long_term_hot", "long_term_cold", "recent_hot",
    "recent_cold", "balanced_zones", "blended_hot", "random_control",
)

def top(counter, reverse=False):
    values = list(range(1, 81))
    values.sort(key=lambda n: (counter[n], n) if reverse else (-counter[n], n))
    return tuple(values[:10])

def selections(all_counts, recent_counts, historical_n, window_n, seed):
    blended = {n: .65 * recent_counts[n] / max(1, window_n) +
                  .35 * all_counts[n] / max(1, historical_n) for n in range(1, 81)}
    result = {
        "long_term_hot": top(all_counts),
        "long_term_cold": top(all_counts, reverse=True),
        "recent_hot": top(recent_counts),
        "recent_cold": top(recent_counts, reverse=True),
        "blended_hot": top(blended),
        "balanced_zones": tuple(
            max(range(i, i+8), key=lambda n: (all_counts[n], -n))
            for i in range(1, 81, 8))
    }
    rng = random.Random(seed)
    result["random_control"] = tuple(sorted(rng.sample(range(1, 81), 10)))
    return result

def add_summary(stats, n):
    theoretical_mean = 2.5
    # Exact hypergeometric variance for 10 selected and 20 drawn from 80.
    variance = 10 * .25 * .75 * (80-10) / (80-1)
    se = sqrt(variance / n) if n else 0
    for name, value in stats.items():
        avg = value["total_hits"] / n if n else None
        value["average_hits"] = round(avg, 5) if avg is not None else None
        value["normal_approx_z_vs_random_expectation"] = round(
            (avg-theoretical_mean)/se, 4) if se else None
        value["draws"] = n
    return stats

def run(draws):
    draws = sorted(draws, key=lambda x: int(x["draw"]))
    all_counts = Counter()
    recent_counts = Counter()
    recent_queue = deque()
    totals = {m: {"total_hits": 0, "five_or_more_hits": 0} for m in MODELS}
    years = defaultdict(lambda: {m: {"total_hits": 0, "five_or_more_hits": 0} for m in MODELS})
    year_n = Counter()
    n = 0
    for i, row in enumerate(draws):
        numbers = row["numbers"]
        if len(numbers) != 20 or len(set(numbers)) != 20:
            raise ValueError("Invalid draw at index %s" % i)
        if i >= WARMUP:
            choices = selections(all_counts, recent_counts, i, len(recent_queue), int(row["draw"]))
            winning = set(numbers)
            for name, line in choices.items():
                hits = sum(number in winning for number in line)
                totals[name]["total_hits"] += hits
                years[row["date"][:4]][name]["total_hits"] += hits
                if hits >= 5:
                    totals[name]["five_or_more_hits"] += 1
                    years[row["date"][:4]][name]["five_or_more_hits"] += 1
            n += 1
            year_n[row["date"][:4]] += 1
        all_counts.update(numbers)
        recent_counts.update(numbers)
        recent_queue.append(numbers)
        if len(recent_queue) > WINDOW:
            removed = recent_queue.popleft()
            for value in removed:
                recent_counts[value] -= 1
    year_stats = {
        year: add_summary(values, year_n[year])
        for year, values in sorted(years.items())
    }
    return {
        "generated_utc": datetime.utcnow().isoformat(timespec="seconds") + "Z",
        "draws_in_database": len(draws),
        "warmup_draws": min(WARMUP, len(draws)),
        "walk_forward_evaluated_draws": n,
        "first_date": draws[0]["date"] if draws else None,
        "last_date": draws[-1]["date"] if draws else None,
        "number_picks_per_line": 10,
        "theoretical_expected_hits": 2.5,
        "models": add_summary(totals, n),
        "by_year": year_stats,
        "methods": {
            "long_term_hot": "Most common 10 numbers across all previous draws",
            "long_term_cold": "Least common 10 numbers across all previous draws",
            "recent_hot": "Most common 10 numbers across previous 80 draws",
            "recent_cold": "Least common 10 numbers across previous 80 draws",
            "balanced_zones": "Most common number from each disjoint group of eight",
            "blended_hot": "65% prior 80-draw frequency plus 35% prior lifetime frequency",
            "random_control": "Repeatable random 10-number set seeded from that draw identifier"
        },
        "disclaimer": "No model is proven to improve odds. History before each target draw only; z-scores are descriptive and uncorrected for multiple testing. Repeated tuning on these results overfits. Independent external validation required."
    }

def main():
    try:
        values = json.loads(SOURCE.read_text(encoding="utf-8"))
        if not isinstance(values, list):
            raise ValueError("Expected list of result records")
        result = run(values)
        OUT.parent.mkdir(parents=True, exist_ok=True)
        content = json.dumps(result, indent=2, ensure_ascii=False) + "\n"
        if not OUT.exists() or OUT.read_text(encoding="utf-8") != content:
            OUT.write_text(content, encoding="utf-8")
        print("Keno audit:", result["walk_forward_evaluated_draws"],
              "held-out draws, prior only")
        for name, stats in result["models"].items():
            print(name, stats["average_hits"], "hits per 10 picks")
    except (OSError, ValueError, KeyError, TypeError) as exc:
        raise SystemExit("Keno audit failed: " + str(exc))

if __name__ == "__main__":
    main()
