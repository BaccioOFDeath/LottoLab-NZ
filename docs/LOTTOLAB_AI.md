# LottoLab AI research assistant

**Live UI:** Both `index.html` (Lotto) and `keno.html` (Keno) load `lottolab-agent.css`, `lottolab-research-engine.js`, and `lottolab-agent.js`.

## Working public feature, without any accounts or paid API

The floating **Ask LottoLab AI** button opens a chat drawer on phones and desktop. These questions are supported by deterministic, traceable calculations from the public GitHub Pages data files:

- Latest published results
- Most and least frequent numbers, with draw count and optional sample windows
- Frequency and co-occurrence of a named number, most common number pairs
- Keno 10am/1pm/3pm/6pm research windows and comparisons
- Consecutive-draw overlap, historical model audits and future/archived research tickets
- Exact all-match probability for a pick count, and history of saved Keno tickets on the visitor's browser
- Starter prompts, follow-up prompts and contextual **Ask AI** actions on the page

The answer card shows calculated metrics, an optional small chart and source links. It never needs an API key to calculate these facts. Charts are based on data loaded from `data/draws.json` (and `data/legacy-draws.json`) or `data/keno-results.json`; model answers use the published audit and pick records.

**Important distinction:** By itself, this is a rule-based, data-grounded *research assistant*, not a generative language model. It can interpret common natural-language questions, but it does not have open-ended AI reasoning in this mode. The website's status label reads **Verified research calculations**.

## Optional generative explanations with an LLM

A real model-backed explanation service is included in `workers/lottolab-ai/src/worker.js`. It is not deployed until a Cloudflare account and API key are configured. The model receives the user's question and the already-calculated evidence, and is told not to invent results.

### Setup

1. Create or sign in to a Cloudflare account with Workers enabled.
2. In Cloudflare, create a KV namespace, e.g. `LOTTOLAB_CHAT_LIMITS`.
3. Install Wrangler locally (e.g. `npm install -g wrangler`), then sign in using `wrangler login`.
4. In `workers/lottolab-ai/wrangler.toml`, add the KV namespace binding:

   ```toml
   [[kv_namespaces]]
   binding = "RATE_LIMIT_KV"
   id = "THE_ID_FROM_CLOUDFLARE"
   ```

5. Add the OpenAI API key as a **Cloudflare Worker Secret**, not a repository file:
   ```bash
   cd workers/lottolab-ai
   wrangler secret put OPENAI_API_KEY
   wrangler secret put RATE_SALT
   wrangler deploy
   ```
6. Add the deployed Worker HTTPS URL as `endpoint` in the public `lottolab-ai-config.json`. The public file must contain only the service URL, **never** the API key.
7. If you eventually move the website from GitHub Pages to a custom domain, update the Worker's `ALLOWED_ORIGIN` setting to match your site's actual origin and redeploy.

The Worker only accepts the configured origin, enforces request-size limits, uses IP-hashed per-hour KV quotas and a timeout, and calls OpenAI's Responses API with `store:false`. Configure billing limits in your AI provider account and consider additional abuse protection for an open public website. KV quotas are approximate under concurrent requests, not strict atomic enforcement.

Without a configured endpoint, the website intentionally stays in free local research mode. If the Worker is unavailable or rate limited, the deterministic evidence still appears.

## Privacy and data interpretation

- The page does not upload the entire 11,000+ draw database to the model. It sends a small bounded evidence summary after performing its own calculations.
- Saved Keno tickets remain in the visitor's device-local browser storage; their numbers are included in evidence only if the visitor explicitly asks about them.
- Results and historic backtests are not guarantees of subsequent draws. The point of the assistant is to show what the data actually contains, not invent an advantage.
- Never place API keys into GitHub Pages HTML, JavaScript, browser localStorage or `lottolab-ai-config.json`.
- There is no login, central user conversation database, payments or account system in this first release.

## Testing

`node --test tests/test_lottolab_ai.cjs` runs deterministic research checks and a JSDOM interaction test. GitHub Actions: `.github/workflows/lottolab-ai-tests.yml`. The existing site's browser regression suite should continue to run as well.
