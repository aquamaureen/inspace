# In-Space Power backlog

## 2026-08-25 — v2 visitor inquiry form with static queue

**Priority:** medium  
**Value:** The architecture doc flags v2 as "optional visitor inquiry form with static queue." Adding a low-friction inquiry path lets prospective settlers, tugs, and town clerks ask questions without breaking the static-first, no-API-server design. It also gives the canon editor a new source of community signal to react to.  
**Estimated cost:** low for design + static prototype; medium if a serverless endpoint or email integration is required.  
**Blocked by:** Human approval on form destination (static file, email alias, or third-party form backend) and on any live deployment.

### Context

- Site is static-first: `output/` is built by `sim/build.py` and rsynced to `/var/www/inspacepower.com/html/`.
- Client-side rendering reads JSON shards from `/data/`; no API server exists in v0/v1.
- Existing personas include a town clerk and tug captain, suggesting inquiry voices the form could feed.

### Status

**Static prototype implemented 2026-08-25** by idle-work scout (team-ops):
- Created `site/inquiry.html` with role, subject, body, and optional contact fields; "File inquiry" submit copy; client-side validation; `mailto:` fallback for no-JS; and JS confirmation panel.
- Added form styles to `site/styles.css` and an "Inquiry" link to the primary nav in `site/index.html`.
- Added `inquiry-ack` spawn rule to `sim/spawn-rules.yaml` so future injected inquiry events trigger an ops-central acknowledgment.
- Wrote design doc at `docs/inquiry-form.md` covering backend options, privacy stance, acceptance checklist, and files touched.
- Changed `sim/build.py` to copy static assets from the project-local `site/` directory instead of `/home/mag/inspacepower-site`, making the build self-contained.
- Ran `python3 sim/build.py` successfully; `output/inquiry.html` is generated and styling matches the site.

Backend choice (email alias vs. JSON queue vs. third-party service) remains pending human approval. No live deployment, DNS, or secrets touched.

### First milestone

1. Design a static inquiry form that fits the site voice:
   - Fields: role (settler / tug / town clerk / other), subject, body, optional contact.
   - Submit button with a deadpan utility tone ("File inquiry").
   - Client-side validation; no required email to stay in-fiction.
2. Choose a static-queue backend that preserves the no-API-server constraint:
   - Option A: form posts to a dedicated email alias (e.g., `inquiries@inspacepower.com`) via a small serverless function or mail-to-git hook.
   - Option B: form data is written to a JSON queue file in `data/inquiries.json` by a post-commit/build step and surfaced in the notice stream as "received inquiries".
   - Option C: third-party form service (Formspree, Getform) with a custom success page styled to match the site.
3. Add the form to the generated site:
   - Link from the primary nav and hero.
   - Build step copies or generates the form page.
   - Keep the form functional without JavaScript (progressive enhancement).
4. Add a spawn rule in `sim/spawn-rules.yaml` so high-signal inquiries can trigger a staff or canon response in a future cycle.
5. Document the queue path, privacy stance (no PII stored on the static site), and moderation rule in `docs/inquiry-form.md`.

### Acceptance

- [x] Form page renders and matches existing site styling.
- [ ] Submissions reach the chosen destination reliably in a headless test.
- [x] No live API server is introduced on `inspacepower.com`.
- [x] `sim/build.py` still runs cleanly and deploys the new page.
- [ ] A sample inquiry can trigger a canon/staff response via `sim/cycle.py` in dry-run mode.
- [ ] Human has reviewed and approved the backend choice before any secrets or DNS records are touched.

### Experts

- `code` / `kimicode` for static form, build-step integration, and queue wiring.
- `cheapdraft` for in-fiction form copy and inquiry voice samples.
- `portfolio` or owner for backend choice and moderation policy.

## 2026-08-26 — Add dry-run unit test for inquiry-ack spawn rule

**Priority:** medium  
**Value:** The v2 inquiry form acceptance checklist requires "a sample inquiry can trigger a canon/staff response via `sim/cycle.py` in dry-run mode." A deterministic, LLM-free unit test exercises the exact spawn-rule path so the team can verify the rule logic now without waiting for a backend or paying for model calls.  
**Estimated cost:** near-zero (read-only test of existing code).  
**Blocked by:** None.  
**Status:** Completed 2026-08-26 by idle-work scout (team-ops).

### What was done

- Created `projects/inspacepower/tests/test_spawn_rules.py` with three tests:
  1. `test_inquiry_event_matches_inquiry_ack_rule` — confirms a community `inquiry` event matches the `inquiry-ack` rule in `sim/spawn-rules.yaml`.
  2. `test_non_inquiry_event_does_not_match_inquiry_ack_rule` — confirms a generic outage complaint does not accidentally trigger the rule.
  3. `test_inquiry_ack_spawn_pipeline` — monkey-patches the LLM call in `sim/cycle.py`, injects a synthetic inquiry event into `spawn_responses`, and asserts that an `ops-central` `acknowledgment` event is published on the same chain with the inquiry event as `caused_by`.
- Tests run in `python3 -m unittest discover -s tests -v` and pass in ~0.02 s with no network or model calls.
- `sim/build.py` still runs cleanly after the test files were added.

### Acceptance

- [x] `tests/test_spawn_rules.py` exists and passes deterministically.
- [x] No LLM, secrets, live deployment, or DNS records are touched.
- [x] `sim/build.py` remains clean.
- [ ] Full end-to-end dry-run with a real injected inquiry event still requires the chosen backend and human approval.

### Experts

- Scout / `code` for the test and monkey-patch wiring.
