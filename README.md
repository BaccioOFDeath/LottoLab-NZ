# LottoLab NZ — Research Terminal

Public site: https://baccioofdeath.github.io/LottoLab-NZ/

Independent New Zealand Lotto statistics dashboard. **Not affiliated with Lotto NZ.** No ticket sales or validation.

## Dashboard features
- Responsive results overview
- Main-ball frequency heat map and bar chart
- Frequency leaders and last-seen gaps
- Common pairs, draw composition and Powerball distribution
- Latest 5/10/20/50/100 stored-draw filter
- Wednesday/Saturday filter
- Draw history search and CSV export

## Current data limitations (important)
The archive currently contains **15 preliminary, independently unverified seed records** covering 2 September to 21 October 2026. The history is incomplete and it does **not** update automatically. Its displayed statistics are only about the stored sample, and should not be relied on as accurate Lotto NZ draw history until verified against authoritative sources.

**Do not use the site as a ticket checker.** Use https://mylotto.co.nz for official results.

## Upcoming engineering stages
1. Identify an authorised, reliable results source; document licensing and attribution.
2. Verify existing seed draw records, remove any unverified records, backfill historical draws with provenance.
3. Add a scheduled importer that stages newly fetched results pending source verification.
4. Add checks for exact draw identifiers, dates, main numbers, bonus and Powerball, with alerts and zero publishing on validation failure.
5. Publish confirmed results using an auditable process, test through multiple real draws.

No scheduled data collection is yet configured. Do not describe this preview as an automated or official live result service.

## Deployment
GitHub Pages: Settings → Pages → Deploy from branch `main`, folder `/ (root)`.

## Probability note
Lotto draws are independent. Historical gaps, combinations and frequency do not confer prediction power.
