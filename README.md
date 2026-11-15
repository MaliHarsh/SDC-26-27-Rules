# PODIUM CY2027 rules guide

GitHub Pages serves `index.html`. The chatbot uses the committed official PDF, not the team notes or website summaries. `assets/rules.json` contains source passages with actual PDF page numbers (the PDF's table of contents has offset page labels). Inline footnotes open the relevant PDF page; expandable references show the extracted passage.

## Activate the AI backend

The existing `sdc-rules-bot.harshvmali26.workers.dev` endpoint was returning HTTP 502 with `{"error":"ai"}`. Its previous source was not in this repository. The replacement in `worker/index.js` uses a Workers AI binding named `AI`; no API key belongs in the browser or repository.

### Option A: Cloudflare dashboard (no local setup)

1. Open Cloudflare → Workers & Pages → `sdc-rules-bot` → Edit code.
2. Replace the editor contents with `worker/dashboard-worker.js` from this package and deploy.
3. In the Worker's Bindings, add a **Workers AI** binding named exactly **AI**, if it is missing, and deploy the binding change.
4. Verify that Workers AI is enabled and quota is available, then test the chatbot. The default allowed website is already configured.

### Option B: command line

1. Install Node.js, then run `npm install` in this repository.
2. Run `npx wrangler login` and sign into the Cloudflare account that owns `sdc-rules-bot.harshvmali26.workers.dev`.
3. Run `npm run deploy:worker`. `wrangler.jsonc` creates the `AI` binding. Workers AI must be enabled with available quota in that account.
4. Ask “Can I pre-load a spring launcher for Marksman?” on the website. A working AI response explains the discipline-specific exception and includes numbered references. If you see “AI is temporarily unavailable,” inspect the Worker logs (`npx wrangler tail`) and the account's Workers AI quota/billing.

Deployment replaces the named Worker's existing implementation. If deploying under a different account/name, update `WORKER_URL` in `assets/chat.js`. GitHub Pages deployment alone does **not** deploy Cloudflare Workers.

The public AI endpoint restricts browser origins but that is not authentication. Monitor Workers AI usage; configure Cloudflare rate limiting or Turnstile if public traffic becomes significant.

## Behavior and limits

- Full extracted rulebook is supplied to the model, preserving cross-section exceptions. Client-supplied source text is ignored.
- Every AI answer must contain valid source IDs. The browser requires the matching source version and builds links from its own index; arbitrary model URLs/HTML are not rendered.
- Citation validation proves the referenced passage exists, not that the AI interpreted it correctly. Officials and published ASME Q&A remain authoritative; later Q&A is not included in this PDF.
- Backend errors, timeouts and malformed answers produce explicitly labeled, locally ranked rulebook excerpts rather than a fabricated answer. This fallback is search, not AI interpretation.
- PDF diagrams are available through page links but the text-only model does not inspect diagram pixels.

## Development

Run `npm test`. Serve the directory with `python3 -m http.server 8000` for browser testing (ES modules require HTTP). Regenerate the source index after replacing the PDF with `python3 scripts/extract_rules.py` (requires Poppler `pdftotext`), then deploy both website and Worker together. Preserve and verify page references against the PDF.

## Apply the website files

Upload this package’s contents into the root of `MaliHarsh/SDC-26-27-Rules`, keeping the `assets`, `worker`, `scripts`, and `tests` directories intact, and replace `index.html`. Commit to the branch used by GitHub Pages (currently `main`). Do not upload only the ZIP itself. Wait for Pages to publish, then refresh the site.

After regenerating `assets/rules.json`, run `python3 scripts/build_dashboard_worker.py` to refresh the dashboard copy too.
