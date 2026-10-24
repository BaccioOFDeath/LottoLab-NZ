# LottoLab NZ

**Live website:** https://baccioofdeath.github.io/LottoLab-NZ/

Independent New Zealand Lotto historical results, number selection experiments and a public, pre-draw prediction audit ledger. **Not affiliated with Lotto NZ. Not a ticket checker or ticket seller.**

## What is working

- Mobile-friendly Lotto-style latest results, archive search, day/period filters, 40-ball heat map, number pairs and CSV export
- Random number picker, balanced selection and experimental frequency-weighted picker
- Separate Powerball rule eras (10-number pool before September 2026, 14-number pool beginning 16 September 2026)
- A public **Prediction & Performance** centre with adaptive-frequency and random-baseline models
- Prospective six-number + Powerball selections written and timestamped **before** a future draw, followed by scoring against verified results
- Every hit and miss retained in the public prediction ledger; original GitHub commits expose previous snapshots
- Chronological backtesting with no information from the target draw in training
- GitHub Actions archive validation, desktop/mobile browser tests and evaluation workflow
- Two-source validation for imported recent records; source URLs stored with each result

## Current data quality / historic coverage

See `data/draws.json` for the current number of records and `data/model-performance.json` for the latest evaluation snapshot. The backfill is **not complete**. The verified recent records span parts of 2025–2026, with a contiguous January–October 2026 block, but many older years remain absent.

The first two August 1987 results have been separately checked and are kept in `data/pre-powerball-staging.json`, **not** mixed into the current public dataset, because Powerball and Strike did not exist in 1987. Old-source placeholders of `00` must never be mistaken for drawn Powerball numbers.

### Incremental 2018+ importer

`scripts/backfill_recent.py` checks a small number of missing draws in reverse chronological order using two independent public result archives:
- https://app.nz-lotto.com/
- https://www.lottodraw.co.nz/

It accepts a draw only when identifier, date, six unique main numbers, bonus ball and Powerball agree. It stops on repeated source errors, does not guess missing results and spaces out requests. `.github/workflows/backfill.yml` is configured for a small daily run; **successful automated operation should be judged from actual GitHub Actions results, not from configuration alone**.

For historical draws before December 2018, further source verification and rights assessment is necessary. More comprehensive historical reuse may require an authorised dataset from Lotto NZ or explicit permission from the provider.

### Draw result updates

`scripts/update_results.py` compares two independent public pages after the Wednesday and Saturday draws. `.github/workflows/update-results.yml` is configured to check for newly confirmed results and, when accepted, score the stored pre-draw model predictions. A scheduled production run following a future draw must still be observed and verified.

## Auditable model experiment

`scripts/model_engine.py` uses at least 30 **earlier**, two-source-verified results to evaluate `adaptive_frequency_v1` against `random_baseline_v1`. It writes:

- `data/model-picks.json` — future selections, models, target dates, original creation timestamp and training sample size; previous selections are never regenerated
- `data/model-performance.json` — held-out backtests and actual prospective results scored after a verified draw

The initial published selections for 28 October 2026 used **53 verified historical draws**. Later backfills **must not** retroactively change those original selections.

**No evidence of a dependable winning-number prediction advantage has been established.** For a fair independent draw of six from 40, any fixed six-number line has the same probability of matching the jackpot numbers. Expected average main-number matches per draw: 0.9. A small historical comparison favouring one model over another does not validate a predictive edge.

## Run development tests

```bash
python -m unittest discover -s tests -v
python scripts/evaluate.py
python scripts/model_engine.py
npm install
npx playwright install chromium
npm run test:e2e
```

Playwright tests include a 390-pixel mobile viewport, navigation, number picker, results, model scorecard and archive search.

## Responsible use

Results and model selections are for historical research and entertainment. Verify claims with the official Lotto NZ service: https://mylotto.co.nz/. Playing more tickets or following historical patterns does not create a prediction advantage. Play within your means.


## Comparable draw conditions / rule-era analysis

The Number Lab has a **Draw conditions & rule changes** section with a rule-era filter for:
- All known Lotto six-from-forty draws (main-ball probabilities remain comparable).
- Powerball 1–10 draws before the September 2026 matrix change.
- Powerball 1–14 draws beginning 16 September 2026.

The frequency-weighted **user number picker** now uses the same selected, like-for-like analysis sample; its Powerball output always uses the currently applicable 1–14 range. Historical frequencies have **no established predictive value**.

`data/draw-context.json` records documented, sourced operational events and optional per-draw machine, ball-set and operator IDs. It **does not** contain guesses: the equipment/operator filters remain disabled until actual assignments with source URLs are supplied. Lotto NZ rotates equipment by documented procedures, so attributing an entire era to one machine would be an error. Avoid personal speculation about draw staff.

Relevant sources:
- https://nzhistory.govt.nz/lotto-goes-on-sale-for-the-first-time
- https://www.legislation.govt.nz/regulation/public/2015/0204/latest/whole.html
- https://www.legislation.govt.nz/secondary-legislation/pco-drafted/2026/51/en/latest/
- https://www.procurement.govt.nz/about-us/news/procuring-lucky-numbers-and-the-machine-that-runs-them/

To add validated mechanical metadata later, add an object in `by_draw` keyed by draw number with fields such as `machine_id`, `ball_set_id`, `operator_id`, and a public supporting `source` URL. `tests/test_draw_context.py` checks for missing provenance. These fields should support retrospective testing only; actual equipment assignments cannot be forecast before the independent draw.
