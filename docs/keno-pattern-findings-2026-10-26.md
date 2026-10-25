# Keno pattern discovery — full historical audit (26 October 2026)

**Dataset inspected:** 11,403 independently sourced NZ Keno draws, draw IDs 16508–27911, dates 5 January 2019–25 October 2026. The scraper's source is [lottodraw.co.nz](https://www.lottodraw.co.nz/keno/archive). Results are third-party historical records, not a guarantee of official verification.

## Data findings

| Measurement | Observed |
|---|---:|
| No. 4 appearances | 2,951 |
| No. 53 appearances | 2,949 |
| No. 57 appearances | 2,948 |
| No. 69 appearances | 2,733 |
| No. 53 + 57 co-occurrences | 787 |
| Mean overlap between consecutively numbered draws (11,401 pairs) | 4.9993 |
| Mean overlap for draws 4 numbers apart (11,395 pairs) | 5.0223 |
| One complete 10-number selection's neutral expected hit count | 2.5 |

Raw pair frequency must be adjusted for how often each individual number appears, and for the fact that Keno draws are sampled without replacement. High co-occurrence by itself is not evidence of a stable future pairing.

The interval between draw IDs **18284 and 18286** reveals that **18285** is absent. The [24 March 2020 source page](https://www.lottodraw.co.nz/keno/results-march-24-2020) itself lists only three draws (10am, 3pm, 6pm), with no 1pm result; this cannot simply be filled with simulated numbers.

## Chronological models explored (ten-number picks)

Models are evaluated against historical draws using *only preceding results*, so no future outcomes are fed into a selection:

- Lifetime hot / cold: frequency over all preceding draws
- Recent hot / cold: previous 40, 80, 200 or 500 draws
- Time-of-day hot: number frequency in previous draws at the matching 10am / 1pm / 3pm / 6pm slot
- Same-time repeat: take 10 of the 20 numbers from the previous draw at that clock time, ranked by frequency in the prior 80 draws
- Recent + time-of-day blended frequency
- Previous-draw repeat and other experimental controls
- Fixed/seeded random controls, with no retrospective optimisation

The **same-time repeat** strategy is the candidate worth following in future precommitted draws:

| Test period | Evaluated draws | Same-time repeat average matches | Neutral theoretical average |
|---|---:|---:|---:|
| Calendar 2025 | 1,460 | 2.5781 | 2.500 |
| 2026 through 25 October | 1,192 | 2.5529 | 2.500 |

However, the 2026 model breakdown is uneven:

| 2026 clock slot | Draws | Average matched |
|---|---:|---:|
| 10am | 298 | 2.5604 |
| 1pm | 298 | 2.5604 |
| 3pm | 298 | 2.6611 |
| 6pm | 298 | 2.4295 |

These are exploratory historical comparisons. The same-time method was noticed after searching several alternatives; the 2026 difference from 2.5 is not decisive on its own. For a credible claim of improved forecasting, freeze the method before future draws, log every selection and use later outcomes as the test period.

## Targeted next experiments

1. Lock in the same-time repeat model as an **experimental** line before the next eligible draw. Keep the existing dated selections immutable.
2. Compare results by clock time, including whether 3pm's historical performance repeats and whether 6pm's negative results continue.
3. Analyse conditional number-pair lift, correcting for each number's marginal frequency and for multiple comparisons; validate associations on later dates.
4. Expand to next-draw transition features, rolling windows and candidate model ensembles, but never optimise hyperparameters using the final evaluation period.
5. Use outcome-level match counts, frequency of prize tiers, confidence intervals, and model-minus-random paired comparisons, not simply the model's apparent historical win rate.

## Software changes

- `scripts/keno_model_audit.py` now includes same-time repeat, time-of-day frequency and recent 200-draw models, with annual scorecards.
- `keno.js` adds these model names to the advanced audit display.
- This research is separate from the already timestamped daily tickets; none were rewritten.

The goal is to **test for exploitable structure experimentally**, treating every apparent advantage as a hypothesis to verify on unseen draws. There is no need to assume a result in advance.
