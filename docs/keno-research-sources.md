# New Zealand Keno historical research and model validation

Research checkpoint: 26 October 2026 (NZT).

## Confirmed game history
- Keno launched in New Zealand in October 1994. See [Te Ara, Gambling](https://teara.govt.nz/en/gambling/page-5).
- The current Keno game design is [Lotto NZ Keno Game Design No. 5, effective 23 October 2025](https://assets.mylotto.co.nz/assets/uploads/5e779b5e-bf65-11f0-a522-3ad4acd14bcf.pdf).
- In each draw 20 unique numbers are drawn from 1 to 80. Players may select 1–10 numbers with stakes from $1 to $100. A Multiplier entry doubles the ticket cost.
- Official standard $1 prize groups are implemented in `keno-math.js`, and probabilities use exact hypergeometric enumeration rather than fitted historical odds.

## Data sources and coverage
1. [lottodraw.co.nz Keno archive](https://www.lottodraw.co.nz/keno/archive) indexes 5 January 2019 onward. As at late October 2026, more than 11,000 four-draw-per-day records are listed. Importer: `scripts/update_keno.py`.
2. [kenoresults.co.nz previous results](https://www.kenoresults.co.nz/previousresults.html) independently lists several 2020 draws. Its 3 February 2020 draw 18087, numbers `7 11 13 17 20 23 25 31 32 35 44 46 48 50 55 60 66 69 74 78`, matches the 2020 archive entry at [lottodraw.co.nz February 2020](https://www.lottodraw.co.nz/keno/archive/february-2020). This validates only the sampled draw, not the whole historical dataset.
3. [businesslist.nz historical results](https://www.businesslist.nz/lottery/results/history) offers recent cross-checks. 25 October 2026 draw numbers 27908–27911 match our imported entries.
4. **Unresolved:** Detailed, independently verified digital New Zealand Keno draws for October 1994 through December 2018 have not been found in the sources investigated. Never substitute a different country's Keno records (including 20-from-70 games), simulations, or guesses. Older draw sets should be imported only with documented provenance and validation.

## Data integrity rules
- Exactly 20 distinct integer numbers between 1 and 80.
- Unique draw identifier and no conflicting numbers for the same draw.
- Preserve the source URL, date, draw time and multiplier when available; `null` is valid for unrecorded multipliers.
- Do not fabricate missing draw IDs or make up daily results.
- Source-checked format is not equivalent to official Lotto NZ verification.
- Export `data/keno-data-health.json` including missing draw IDs, date/time gaps, conflicting records, and count of URL-provenanced records.
- Public records are presented for independent analysis; ticket claims should be verified with Lotto NZ.

## Research-engine rules
- All daily suggested model lines must be published and timestamped before the first eligible target draw. Never rewrite previous picks after observing results.
- Use only draw records **earlier** than the target draw when training or selecting numbers.
- Include an untuned seeded random baseline. Report held-out hits, five-or-more matches, year-by-year outcomes, and limitations from multiple testing.
- Don't describe historical hot/cold/pair frequencies as increased chance of winning: fair draw probabilities are independent of historical results.
- Don't claim a model's forecast is proven better than chance without preregistered, out-of-sample statistical evidence.
- The stake and 1–10 pick count affect payout distribution and prize probability; **stake does not change the probability of matching numbers**.
- Headline statistic for every fair 10-number selection: expected matches = 10 × 20 / 80 = 2.5.

## Operations
- Daily historical ingestion and immutable pre-draw picks: `.github/workflows/update-keno.yml`.
- Independent research audit: `scripts/keno_model_audit.py`, output `data/keno-model-audit.json`.
- Exact theoretical odds and payout calculations: `keno-math.js`.
- Users can export current verified-format data as CSV on the Keno page.
