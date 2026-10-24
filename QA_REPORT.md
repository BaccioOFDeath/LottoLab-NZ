# LottoLab NZ — UI / functionality quality-control report

**Audit date:** 25 October 2026 (NZ time)
**Production:** https://baccioofdeath.github.io/LottoLab-NZ/
**Source:** https://github.com/BaccioOFDeath/LottoLab-NZ/
**Scope:** Single-page website, its in-page destinations, drawing result cards, contextual analysis, interactive Universe, 20 locked selections, model scorecard, archive and mobile navigation. There are no separate app pages to test.

## Fixed during this audit

| Area | Prior issue | Corrective action |
|---|---|---|
| Powerball card | Decorative arrow, no action | Native keyboard/touch-operable disclosure, official game guide and functioning in-page Powerball statistics link. The link opens its collapsed panel before navigating |
| Strike card | Decorative arrow, no action | Real disclosure, verified game explanation and official Lotto NZ instructions. Explicitly does **not** invent ordered Strike results from sorted main balls |
| Main scrolling experience | Repetitive large analytics before flagship feature | Number Universe moved near the top and given priority |
| Game-rule filters | Four selectors dominated the mobile screen, three with no source data | One primary rules selector; unsupported machine, ball-set and operator selectors kept under expandable advanced settings |
| Statistical analysis | Multiple repetitive data-heavy sections | Advanced number pairs, Powerball chart, Evidence Lab detail, model methods and full prediction history use expandable disclosure |
| Prediction display | Twenty almost identical cards consumed excessive mobile scrolling | Four-line preview with accessible Show all 20 / Show fewer lines, preserving 10 research and 10 random-control selections |
| Research copy | Repeated long disclaimers | Shorter section subtitles and clear distinction between playable Powerball and non-playable Bonus research guess |
| Model preview | Gold Bonus missing in model comparison | Added color-coded Bonus and Powerball balls |
| Design | Inconsistent accents and box styling | One colour language: purple Lotto, pink Powerball, amber Bonus, teal Strike, blue insights and teal evidence; consistent cards and focus styling |
| Cross-device caching | Older iPhone/iPad assets possible | Bumped version of every JS/CSS asset in `index.html` |

## Validation

- **GitHub Actions:** 20 Playwright browser integration tests passed on `main` after the compact-layout changes; see [Browser regression suite](https://github.com/BaccioOFDeath/LottoLab-NZ/actions/workflows/e2e.yml).
- **Independent live-browser QC:** verified actual expansion and destinations of Powerball and Strike cards, source-backed Number Universe, optional advanced research controls, 4-to-20 prediction expansion, CSV/export controls, responsive layout and navigation.
- **Static code audit:** 123 unique DOM IDs; no duplicate IDs; all 24 local anchor destinations valid; 7 properly paired `details` / `summary`; six JavaScript files parse without errors; no anchors missing an `href`.
- **Mobile checks:** a 390px mobile viewport without horizontal overflow, touch and keyboard interaction checks, reduced-motion support and native disclosure controls.
- **Integrity:** the underlying twenty published Lotto lines and their timestamps were **not** changed. Display filters and visual touches do not generate new predictions.

### Behavioural QA checklist

1. On mobile, open Powerball (pink) and follow **Explore Powerball data** — advanced chart opens, with data.
2. Open Strike (teal) — the description and official how-to-play link work, without pretending sorted main numbers are Strike order.
3. Use the Universe and select a number; compare counts before and after selecting the Powerball 1–14 rules period.
4. Inspect advanced draw conditions; machine, ball set and operator remain disabled unless reliable records exist.
5. Expand and close Evidence Lab's detailed statistical results.
6. Open the 20-line prediction section; default is a compact four-line preview. Tap **Show all 20 lines** to access all original, immutable lines.
7. Use the model method and prediction history disclosures, verify both open and contain results.
8. Filter archived draws, switch sort order, load more, download CSV and use search.
9. Navigate via header, mobile menu and keyboard search. Confirm no horizontal clipping on a 390px phone.

## Open limitations (not falsely marked complete)

- **1987–present archive:** the full historical data remains incomplete; older pre-Powerball years need correctly modelled rule eras and source permissions.
- **Actual future draw scoring:** must be observed after a scheduled future draw, including provider updates and output publishing.
- **Real hardware:** browser emulation and a live cloud browser are not substitutes for a full real-device iOS Safari/iPadOS/Android battery and network test.
- **Source coverage:** external providers and official Lotto NZ URLs may change. Cross-checked public sources are not an official results audit.

Historical frequencies and visualization do not reliably predict future independent draws. LottoLab NZ is independent and unaffiliated with Lotto NZ.
