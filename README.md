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
