# LottoLab Geo — winner locations, not location prediction

**Live section:** https://baccioofdeath.github.io/LottoLab-NZ/#geo

## Implemented

- Local, source-attributed New Zealand outline (small Natural Earth-derived GeoJSON) with no paid map or third-party tracking SDK.
- Weather-style winning ticket **density heatmap**, exact-source-marker mode, and region grouping mode.
- Source-linked cards with approximate location precision, date, game, prize tier, outlet or MyLotto channel and number of publicly reported winning tickets.
- Filters for Lotto/Powerball/Strike, First/Second/Strike Four/Powerball roll-down, retailer versus online winner area, and NZ region.
- Interactive zoom and timeline playback of the **dates represented in this sampled dataset**. Non-contiguous dates are not interpolated into fake historical records.
- An accessible ranked list providing keyboard/touch selection even when the map is unavailable. Full mobile responsive layout.
- Clear summary metrics that count `tickets` rather than database rows; MyLotto rows may be grouped by public release.
- Sales-adjusted rates intentionally unavailable because a matching ticket-sales denominator is not publicly available at the required place/time granularity. No 'lucky town' or next-location probabilities are invented.

## Dataset

- `data/geo-winners.json`: curated, **partial** seed of publicly reported winners from selected Lotto NZ releases (2024, 2025, 2026). The initial seed contained 48 separately identified source rows representing **51 tickets**, across **29 cities/areas, 11 regions and 10 draw dates**.
- `data/nz-outline.geojson`: simplified NZ coastline; original geometry from [glynnbird/countriesgeojson, NZ](https://github.com/glynnbird/countriesgeojson/blob/master/new%20zealand.geojson), derived from public Natural Earth country data. Cartographic reference only.
- `data/geo-places.json`: approved approximate town/region centroids, **never precise outlet coordinates**; no automatic geocoding of unknown places.

Each record includes id, date, optional draw ID, game, division/prize tier, sales channel, ticket count, named outlet or MyLotto, locality, larger region, approximate centroid, geo precision, a declared `location_role`, prize amount if explicitly stated, source URL and publisher.

**Retail:** a pin shows the approximate town/city for a published winning outlet, **not its physical address**.

**MyLotto:** the reported locality is a *winner-reported location*, not the ticket purchase location; it must not be treated as an outlet or mapped to a precise address. Visitors can exclude online records (the default filter is physical retailers only).

**Division overlap:** Powerball First winners also match Lotto First; we represent a combined First-Division jackpot as a single Powerball record to avoid double-counting a ticket. The 8 June 2024 jackpot was a Powerball **roll-down**, not an ordinary Powerball First Division win, and is classified separately.

**Sample bias:** the seed intentionally includes only events that could be grounded to a published store/city/region. News releases disproportionately cover high-prize winners and recent years. This map must never be read as a complete census or a source of location-adjusted odds.

## Automated updates

- `scripts/geo_ingest.py` searches for public Lotto NZ result articles following recent Wednesday and Saturday draws. It **only accepts clearly headed Lotto First Division tables**, exact date/draw statements, approved location centroids and official Lotto NZ article URLs.
- `.github/workflows/geo-ingest.yml` checks daily and commits only genuinely new records, running data tests both before and after. A source format change or inaccessible article causes a safe skip, **not a guessed report**.
- Source extraction for Powerball, Strike and all historical winners remains **curated** pending verifiable source structure. Fully automatic import of all Lotto NZ winners and pre-1987 years is not claimed.

## Operation & audit

- `geo-lab.js` validates schema, HTTPS source allowlist, latitude/longitude bounds, game, tier and counted tickets; invalid rows cannot become map pins.
- `tests/test_geo_data.py` checks provenance, map outline, offline parser fixtures, correct online/outlet identity, and 2024 roll-down integrity.
- `tests-e2e/site.spec.js` checks the Geo UI filters, map and marker render, source links, timeline, zoom, region heatmap, iPhone-width UI, error recovery and unavailability of false normalised rankings.
- Both source code and data are openly inspectable in the [GitHub repository](https://github.com/BaccioOFDeath/LottoLab-NZ).

**Research interpretation:** A shop's historical win count is strongly confounded by tickets sold, opening hours, promotion, online purchases and publicity. Even perfectly normalised past rates would not establish future prediction power in a fair independent draw. LottoLab Geo is a location intelligence visualisation, **not** a location betting recommendation.


## Pinch-to-zoom and map navigation (iPhone Safari + other browsers)

- **Two fingers:** pinch in/out to zoom from **1.0× to 4.0×**. Zoom remains under the midpoint of the fingers (not the map centre).
- **Two-finger drag:** move the zoomed map without jumping; map bounds keep New Zealand in the viewport.
- **One finger by default:** scroll the website normally, even when the finger passes over the map. This is intentional; Geo Lab must not trap users on a tall mobile page.
- **Move button:** opt in to one-finger map dragging; if the map is still at 1×, Geo Lab zooms slightly so the drag is useful. Tap Move again to return to ordinary page scrolling.
- **Plus / minus:** zoom around the centre of the map by 0.5×; the level display updates. **Reset** restores the whole NZ view and disables Move mode.
- **Desktop:** drag with the mouse after zooming, and pinch on supported trackpads (Ctrl/Meta+wheel). Ordinary wheel scrolling still scrolls the page.
- **Double tap:** on the map background, zoom towards the tap point (or return to full view when already highly zoomed). Named location pins still open their source-linked inspector.
- **Safari safety:** only the map intercepts two-finger custom gestures; the rest of the page stays browser-zoomable. Never use `user-scalable=no`, never disable touch or pinch globally.
- **Tests:** `tests-e2e/geo-gestures.spec.js` covers two simultaneous fingers, panning, zoom limits, one-finger scroll behaviour, Move mode and source-record integrity in **Chromium and WebKit Mobile Safari emulation**. Live testing on a physical iPhone is still a separate desirable final check.

Browser touch-gesture standards: [MDN touch-action](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/touch-action), [Apple Safari handling events](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/HandlingEvents/HandlingEvents.html).

## 25 October 2026 — Deeper archival research and readable zoom

The initial 48-row seed was expanded to **121 source-linked report entries covering 143 reported tickets, 55 unique places and 25 selected draw dates**. New source-backed rows include the official [3 October 2026 Powerball winner recap](https://mylotto.co.nz/news-and-press-releases/lotto-draw-results-031026) and [19 September](https://mylotto.co.nz/news-and-press-releases/lotto-draw-results-190926), [23 September](https://mylotto.co.nz/news-and-press-releases/lotto-draw-results-230926), [7 October](https://mylotto.co.nz/news-and-press-releases/lotto-draw-results-071026) and [10 October](https://mylotto.co.nz/news-and-press-releases/lotto-draw-results-101026) Lotto NZ releases.

- The 2026 Powerball First Division recap identifies **18 jackpot-winning tickets through 3 October 2026**, counted once even where those same tickets qualified for Lotto First Division.
- The 10 October Lotto NZ release identifies **26 Second Division tickets** (including a group of 13 MyLotto winners in Wellington); 21 October has **7 Lotto Second Division tickets**. These aggregated counts are stored as ticket weights, not 13 duplicate rows.
- New map references are approved city/region centroids, supported by [New Zealand city coordinates](https://geodatakit.com/datasets/new-zealand-cities), [GeoNames](https://www.geonames.org/advanced-search.html?country=NZ) and [Manawatū-Whanganui region centre](https://archivescentral.org.nz/place/manawatu-whanganui-region). They are not precise retailer addresses.
- At zoom level 4×, each visible marker's full circle diameter is about **66% of its normal apparent size** rather than 400%. The child marker compensates for scene zoom by `zoom^-1.30`; label type is additionally adjusted by `zoom^0.19`, and heatmap radii are redrawn with `zoom^-0.72` compensation.
- The optional source-quality panel breaks down source articles, location precision, retail/online mix and monthly record counts, all recomputed from selected publicly reported records. Empty months mean **no reported observation in the stored sample**, not no winner.

**Never infer more from the dataset than it supports:** 143 reported tickets is a selective press-release sample, **not** the number of all NZ winning tickets in this period. There is no ticket-sales denominator. A popular outlet may appear frequently simply because it sells more tickets.
