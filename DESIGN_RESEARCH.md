# LottoLab NZ | 10 contemporary design benchmarks

Curated examples, not an objective global ranking. We borrowed general UX principles, not branding, code, imagery or protected visual assets.

1. Stripe — confident editorial hero and restrained gradient: layered LottoLab hero.
2. Linear — keyboard-first polish: Cmd/Ctrl+K quick navigation and clear focus states.
3. Apple — strong product-first hierarchy: clear winning-number balls, spacious type.
4. Airbnb — simple task-oriented navigation: latest results, archive, picker, analysis.
5. Notion — friendly explanations for complex information: readable Evidence Lab.
6. Figma — visual playfulness: purple main, gold Bonus, pink Powerball ball system.
7. Duolingo — recognisable warm design without compulsive streaks, false urgency or deceptive winning claims.
8. Vercel — performance and clarity: lightweight static CSS and deferred vanilla JS.
9. GitHub — traceability: immutable pre-draw picks, provenance, dated commit history.
10. Framer Awards winners — purposeful micro-interactions: subtle float and hover with reduced-motion support.

Research references: https://www.framer.com/awards/ ; https://uitop.design/blog/best-website-design-examples/ ; https://www.thecssagency.com/blog/saas-website-design-examples ; https://awwwards.withseismic.com/

## Product integrity
- Exactly twenty fixed, signed-off research lines per draw, no unlimited rerolls.
- Gold Bonus is the seventh drawn ball, not something a player can select. Bonus forecasts are research-only, with their own real publication timestamps.
- Pink Powerball and six purple main balls are the ticket inputs; copying only includes those.
- Responsive mobile design, skip link, keyboard search, scroll progress, live copy feedback, accessible motion controls.
- Transparency about the incomplete 1987+ archive, model limitations, verified sources and every miss as well as hit.
- Measure mobile overflow, new-draw scoring and performance after changes.


## October 2026 — Touch-first immersive interaction research

The goal is not to copy the visual identity of award-winning sites or introduce misleading game mechanics; it is to give people a memorable, explanatory and accessible way to explore data.

2026 primary reference points reviewed:
- [Webby Awards 2026, Best User Experience](https://winners.webbyawards.com/winners/websites-and-mobile-sites/features-design/best-user-experience): Pentagram Archive, The Wildlife Society, Google Gemini Marketing Site and other nominees show an emphasis on meaningful, intuitive storytelling.
- [Webby Awards 2026, Best User Interface](https://winners.webbyawards.com/winners/websites-and-mobile-sites/features-design/best-user-interface): DICH Fashion and Google Store winners; evidence that useful, approachable product surfaces matter as much as advanced interaction.
- [Awwwards and FWA Site of the Year teardowns](https://rickcreates.com/year): interactive exploration as the experience itself (including Bruno Simon's explorable portfolio); LottoLab adapts the exploration principle to a data-driven universe, not a copied 3D game.
- [Awwwards/FWA award-site teardowns](https://rickcreates.com/): experiments in cursor-led visuals and interaction feedback.
- [web.dev accessible motion](https://web.dev/learn/design/accessibility): use `prefers-reduced-motion`, protect legibility and avoid intense or dizzying movement.

Implemented decisions:
1. **Finger-responsive feedback site-wide:** each touch displays one short luminous ripple with a few fading micro-particles. Nothing blocks native scrolling or intercepts buttons.
2. **Number Universe:** one performant 2D Canvas containing 40 real Lotto numbers. A touch stirs nearby balls; a tap opens actual historical frequency and co-occurrence statistics. A verified analysis filter drives every count.
3. **Data-backed connections:** optional pair lines correspond to co-occurrences in the archived sample, never invented drawing-machine connections or odds of winning.
4. **Meaningful touch targets:** the latest actual winning balls are buttons that open the Number Universe inspector for that number.
5. **Accessibility and performance:** an ordinary 1–40 selector provides full keyboard access; animation is capped at ~30fps, pauses when offscreen, uses a capped device pixel ratio, and defaults off for reduced-motion or data-saver preferences. Touch gestures never call `preventDefault()`.
6. **Explicit motion control:** visitors can disable animation, with the numbers and counts still accessible and accurate.
7. **Truth in research:** the 20 pre-draw research lines remain immutable, untouched by Universe interactions, and past frequencies have no known predictive advantage.

This is an interpretation of interaction principles from contemporary projects and awards; it is not a claim that LottoLab is already on a global award ranking.
