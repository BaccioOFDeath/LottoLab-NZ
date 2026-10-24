# LottoLab NZ

**Live website:** https://baccioofdeath.github.io/LottoLab-NZ/

Independent New Zealand Lotto historical results, number selection experiments and a public, pre-draw prediction audit ledger. **Not affiliated with Lotto NZ. Not a ticket checker or ticket seller.**

## What is working

- Mobile-friendly Lotto-style latest results, archive search, day/period filters, 40-ball heat map, number pairs and CSV export
- Exactly 20 locked pre-draw Lotto selections per draw (10 experimental + 10 random control); no unlimited client-side number generation
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


## Exactly 20 pre-draw suggestions (October 2026)

LottoLab now publishes **exactly 20 research lines per future Wednesday/Saturday draw**, fixed and identical for every visitor. The previous unlimited Quick Pick UI is retired; there is **no in-browser generation or unlimited reroll**.

- 10 lines from the experimental recency/frequency-weighted approach and 10 lines from a deterministic random control, all uniquely recorded with six main numbers and one Powerball.
- `scripts/model_engine.py` is the **only** publisher. It checks for duplicate combinations, duplicate model slots, invalid numbers and any attempt to publish over 20 lines. Repeated runs cannot change a previously recorded selection.
- The first adaptive and random lines originally committed for **28 October 2026** have their original timestamps and values intact; the remaining 18 were subsequently timestamped and appended.
- The website displays all 20, with filters to view 10 per method, individual Copy buttons, and Copy All 20.
- Draw-condition analysis filters affect statistics but **never change these locked selections**.
- Every line is scored after a two-source-confirmed result. Scored and unsuccessful lines remain in `data/model-picks.json` and in the public prediction ledger.
- Historical walk-forward model comparisons remain separate from genuine, timestamped prospective selections. Ten guesses from one model do **not** establish an improved chance over random selection.

New constraints have Python unit tests for exactly 20, 10/10 split, uniqueness, preservation and repeat-run idempotence, plus browser regression tests for no generation button and stable reload.


## October 2026 — visual experience and research-only Bonus forecasts

The website now presents purple **six main numbers**, a **gold Bonus ball** and a **pink Powerball** on every fixed research line, latest result and scorecard. The gold Bonus is **not playable** on a Lotto ticket. Lotto NZ's Rules 2025 define it as the seventh ball randomly drawn (https://www.legislation.govt.nz/regulation/public/2025/0174/latest/whole.html).

- The original 20 six-plus-Powerball selections and their timestamps remain unchanged.
- Research-only `bonus_prediction` is separately recorded in each entry, with `bonus_prediction_created_at`, `bonus_prediction_method`, and `bonus_is_ticket_selection=false`.
- Bonus forecast numbers are selected from outside that individual line's six-number set; they are *not* a seventh ticket selection.
- Copy and Share ticket lines include **only the playable six main numbers plus Powerball**, never Bonus.
- After a confirmed draw, separately published Bonus forecasts are scored and logged using `bonus_prediction_match`. They have no proven predictive edge.
- Contemporary UI patterns implemented: on-screen Ctrl/Cmd+K search, keyboard shortcuts, accessible focus rings, skip link, toast feedback, scroll progress, back-to-top, subtle hero animation with reduced-motion override, improved mobile spacing and three color-coded ball styles.
- See `DESIGN_RESEARCH.md` for a curated ten-site UX benchmark and decisions. These are not claims about an objective top-ten ranking.
- Nine or more browser integration tests (depending on revision) validate line integrity and mobile layout. Use GitHub Actions logs for actual deployment results, not configuration alone.


## Number Universe: touch-responsive interactive research experience

The **Number Universe** is a source-backed, touch-responsive 40-ball Canvas 2D visualisation at [`#universe`](https://baccioofdeath.github.io/LottoLab-NZ/#universe). Users can touch or click a number to inspect real appearance counts, the observed rate, difference from the six-in-forty expected frequency, and its most common co-appearance with another number.

- **Finger feedback across the site:** one short lavender/pink/gold ripple and three fading motes per touch. Native scrolling is never prevented; overlays have `pointer-events: none`.
- **Lightweight number motion:** the visible 40-ball field responds to nearby finger movement and settles back to its positions. Drawing runs at approximately 30fps only while the section is visible, with device pixel ratio capped at 2. No WebGL, autoplay media or heavy animation dependencies.
- **Historical connection view:** optionally display only actual co-occurrence links calculated from the currently filtered archive. This is *not* a prediction or draw-machine network.
- **Deep links from results:** tapping a latest-result main Lotto ball opens its corresponding history in the Number Universe.
- **Accessible fallback:** an ordinary number selector (1–40), labeled inspector and keyboard navigation work without touch or animation.
- **Motion toggle:** visitors can disable motion. Reduced-motion and data-saving preferences automatically default to still visuals.
- **Independent data:** uses the same shared `window.lottoLabAnalysisDraws` as the verified Number Lab; analysis filters recompute all 40 counts without changing locked predictions.
- **Responsive:** supports an iPhone-width 390px viewport without horizontal overflow. Tested in GitHub Actions using a touch-enabled mobile Chromium context and normal desktop tests. Tests cover history counts, touch reactions, original locked lines, scroll safety, motion-off and accessibility.

Research benchmark: [2026 Webby Best UX winners](https://winners.webbyawards.com/winners/websites-and-mobile-sites/features-design/best-user-experience), [2026 Webby Best UI winners](https://winners.webbyawards.com/winners/websites-and-mobile-sites/features-design/best-user-interface), [Awwwards/FWA interaction teardowns](https://rickcreates.com/), and [web.dev accessible motion](https://web.dev/learn/design/accessibility). The design applies general interaction principles and does not copy third-party identities.

**Important:** Historical results and ball-pair frequencies cannot reliably predict a fair draw. LottoLab still lacks a complete 1987–present archive, and pre-draw scoring must be observed through a real future draw.


## Geo Lab — New Zealand winner locations & heatmaps

[Open the live Geo Lab](https://baccioofdeath.github.io/LottoLab-NZ/#geo) · [Detailed data and implementation notes](GEO_LAB.md)

**Features:** source-backed New Zealand outline; animated-weather-style winner-density view; accessible town-level map markers and region clustering; filters by Lotto/Powerball/Strike, prize division, retail versus MyLotto reported area, and region; zoom; sample-date replay timeline; source-linked location inspector and top reported towns.

The expanded archive now contains **121 source-linked report entries representing 143 winning tickets**, spread across 55 reported towns/areas and 25 selected draw dates in 2024–2026 (researched 25 October 2026). The newly added data includes the official 2026 Powerball jackpot-location recap and more Lotto NZ First/Second Division records. It is *not* a complete census of all winners.

**Accuracy:** A physical retailer pin is only positioned at an approximate **town centre**, never a claimed store door. A MyLotto pin represents a *reported winner area*, **not** a physical ticket-sale location. MyLotto records can be hidden (the default is retailer-only). Every row contains an official or Lotto NZ press-release source URL and a `location_role`.

**Odds:** A high raw win count does not mean a town is luckier, because ticket sales volume and retailer activity are unknown. Sales-normalised comparisons and prediction rankings remain disabled until an independently verified denominator is available. The map makes no claim to predict future winning locations.

**Updating:** `.github/workflows/geo-ingest.yml` runs daily and attempts strict first-division table parsing of public Lotto NZ releases. `scripts/geo_ingest.py` refuses unknown coordinates, ambiguous draw identification and unsupported game types. A successful workflow with zero new records means no new records were accepted — **not** that all future releases are fully ingested. Wider coverage, including accurate future Powerball/Strike retailer locations and pre-2024 archives, requires additional source support and validation.

**Tests:** `tests/test_geo_data.py` checks public source provenance, point validity, online-versus-retail distinction and historic roll-down classification; Playwright covers weather map, Geo filters, marker details, regional grouping, timeline, 390px mobile layout and source-outage fallback. See [GitHub Actions](https://github.com/BaccioOFDeath/LottoLab-NZ/actions).

This is a geographic visualization of reported winners. Past outcomes do not change the odds of a fair independent draw.


### Geo Lab — mobile navigation

The map supports **two-finger pinch-to-zoom (1–4×)** centered on your fingers, plus two-finger dragging. **One finger still scrolls the webpage** by default. Use the **✋ Move** toggle for one-finger map dragging, then tap it again to resume natural scrolling. The **+ / −** buttons and **↺ Reset** provide a precise fallback, and a zoom indicator shows the current level.

The mobile gesture handlers are scoped to the map; they do not globally disable Safari browser pinch/page zoom. New map-gesture regression tests use WebKit Mobile Safari emulation as well as Chromium. Physical iPhone/iPad testing remains a final hardware check.

See [Geo Lab gesture documentation](GEO_LAB.md#pinch-to-zoom-and-map-navigation-iphone-safari--other-browsers) and [browser test runs](https://github.com/BaccioOFDeath/LottoLab-NZ/actions/workflows/e2e.yml).

### October 2026 Geo research upgrade
- At zoom levels 1–4×, visible hotspot badges and labels now **shrink** as magnification increases; heatmap halos no longer balloon. Town marker locations and click targets remain tied to the map.
- Expand **Location research & source quality** for distinct press sources, city-versus-region precision, channel share and an explicitly **incomplete** 12-month report timeline. Every number obeys Geo game/division/channel/region/time filters.
- Added 2026 Powerball jackpot-winning areas from the official October jackpot summary plus source-checked September/October store and online winner-area reports. The importer is conservative and does not manufacture missing locations.
- This is *not* 143 tickets from all Lotto NZ wins or a representative sample, and the map's concentration cannot reliably predict future locations without ticket-sales denominators.
