# LottoLab NZ — independent NZ Lotto research

Site: https://baccioofdeath.github.io/LottoLab-NZ/

## Current status (24 October 2026)
- Public interactive research dashboard: **deployed via GitHub Pages**
- Data: **16 rows** from 2 September to 24 October 2026. Draw 2632 (24 October 2026) was cross-checked against two independently hosted public result pages. **The older seed records have not all been independently reverified.**
- Scheduled updater: **configured**, runs Wednesday and Saturday after NZ evening draw; **not yet confirmed in a real scheduled run.**
- Full Lotto history since 1987: **not yet imported**.
- Full Lotto-style UI redesign: deferred until historical ingestion and updater are validated.

## Website features
Main-ball heatmap, frequency charts, leading numbers, last-seen gaps, common number pairs, basic composition, Powerball distribution (up to 14 with rules changed from 10 in September 2026), weekday/sample filters, search, CSV export.

## Automated refresh
Workflow: `.github/workflows/update-results.yml`
Source comparison script: `scripts/update_results.py`

The script requests two separate public result pages:
- https://www.lottodraw.co.nz/lotto/results
- https://dashtickets.nz/lotto-results/

It parses both, validates game/date rules, requires an exact match (draw number, date, six balls, bonus ball, Powerball), prevents conflicts, and adds a new draw only if both sources agree. It fails without updating if a source is unavailable, the layout changes, or the numbers differ. It makes no calls to private MyLotto endpoints.

**Caution:** Both secondary pages might ultimately use the same underlying official feed; they are independently hosted, not independent official authorities. Further work should address licensing, provenance and official confirmation. GitHub Actions scheduler may run late or occasionally be skipped, and the real production run has not been proven yet. The workflow may require enabling Actions and the repository's workflow token to have write permissions.

To test: GitHub → Actions → Verify Lotto results → Run workflow, inspect the logs. If a run fails, do not disable validation to force a result.

## Next steps
1. Confirm legitimate data reuse rights and authoritative historical dataset.
2. Audit and correct all seed entries.
3. Import historical results back to 1987 where reliable records are available, storing source/provenance and game-rule periods.
4. Add data completeness checks and failure notifications.
5. Observe successful automatic updates across multiple real draws.
6. Redesign full UI with a friendly Lotto-results presentation while retaining an advanced analytics view.

## Disclaimer
This website is independent of Lotto NZ and not a ticket checker or gambling service. Check winning numbers and claims directly with Lotto NZ. Historical results do not change independent future-draw probabilities.


## Lotto-style UI redesign (October 2026)
Redesigned the responsive public homepage using `index.html`, `styles.css`, `app.js` and `favicon.svg`. It now separates a familiar Lotto-style latest-results experience from the optional number-analysis and historical archive sections. The UI explicitly shows that data coverage is partial and distinguishes two-source cross-checked records from older seed entries. The redesign is committed, but the separate CSS/JS files need successful GitHub Pages deployment and browser verification before this release is considered fully operational.

## Research findings and limitations
- Lotto first drew on 1 August 1987; the independently cited first draw is 4, 8, 16, 29, 32, 40 (bonus 30). **Historical first-draw record not added to the analysis archive**, because mixed-era data would require rules-aware filters and verified contiguous coverage.
- Strike launched in 1993, Powerball in 2001. Powerball expanded from 10 to 14 numbers for the 16 September 2026 draw; analyses must partition rules eras.
- lottodraw.co.nz archive explicitly begins in December 2018, not in 1987.
- An independently operated archive lists years dating to 1987, but completeness, rights and accuracy are not yet established.
- A public GitHub project `ricmagno/Lotto_NZ` documents an Excel-based past results import script; it is research material, **not** confirmed complete or legally reusable historical data.
- We must not infer missing draw results, invent records, or describe this sample as a complete 1987–present dataset.

## Data intake milestone
Obtain permission for reliable historical results, audit all current seed data, import back history with provenance, compare against multiple independently published sources, then add versioned game rules, completeness checks and regression tests. Only after this milestone should the redesign be called production-ready.


## 25 October 2026 — data quality / model milestone
- Added `scripts/stage_history.py` to validate and **stage**, not publish, properly sourced licensed CSV history.
- Added `scripts/evaluate.py`: rolling, chronological out-of-sample comparisons to a random baseline, with a minimum 30 previously two-source-verified training draws; no look-ahead.
- Added `.github/workflows/evaluate.yml` to run validation + evaluation on relevant pushes. Scheduled and write workflow success still needs checking in GitHub Actions.
- Existing public archive: **24 stored rows** (1 two-source cross-checked, 8 single-source, 15 unverified). Some records are discontinuous, spanning 2025 and 2026. No claim of complete archival coverage.
- Current method isn't a reliable predictor of future random winning numbers. Historical inference can be researched with prospective, precommitted picks, but random-draw outcomes cannot be reliably forecast.
- Next major external dependency: identify a complete historical dataset with permission for reuse (or obtain it directly from Lotto NZ) and perform independent audits, including rule-era treatment for historic Powerball/Strike.

### Running the audit locally
```sh
python -m unittest discover -s tests -v
python scripts/evaluate.py
python scripts/stage_history.py path/to/licensed-draws.csv --out data/staged-import.json
```
