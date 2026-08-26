# Visitor inquiry form — v2 design

Status: static prototype implemented. Live deployment and backend destination still require human approval.

## Goal

Add a low-friction way for visitors (settlers, tug operators, town clerks, historians, competitors, and others) to send questions, complaints, and corrections to In-Space Power without breaking the static-first, no-API-server architecture.

## Static form

`site/inquiry.html` provides a client-side form with these fields:

| Field | Required | Notes |
|---|---|---|
| Role | yes | Select from settler, tug, town-clerk, historian, competitor, other. Used for attribution if the inquiry enters the notice stream. |
| Subject | yes | Short summary, max 120 characters. |
| Inquiry | yes | Full text, max 4000 characters. |
| Optional contact | no | Beacon, relay address, or public drop. Email is not required and is never stored on the static site. |

Submit button copy: **File inquiry**.

### Progressive enhancement

- **No JavaScript:** the form `action` is `mailto:inquiries@inspacepower.com` with `enctype="text/plain"`, so a compliant browser opens the visitor's mail client with the fields pre-filled.
- **With JavaScript:** the same mailto is allowed to proceed, but the page also displays a confirmation panel with the composed message body so the visitor can copy it if the mail client does not open.

No data is stored in the browser beyond the current page session, and no data is submitted to a server from the static site.

## Backend options

Three candidate destinations were evaluated. The final choice is blocked on human approval because each touches DNS, secrets, or deployment:

1. **Dedicated email alias** (`inquiries@inspacepower.com`) + mail-to-git hook or serverless forwarder.
   - Keeps the current static-first shape.
   - Requires mail/DNS setup and a small receiver (not on `inspacepower.com`).
   - Matches the `mailto:` fallback already in the form.

2. **JSON queue file** (`data/inquiries.json`) populated by a post-commit/build step.
   - Most in-fiction: inquiries surface in the notice stream as "received inquiries."
   - Needs a serverless function or mail-to-git hook to append to the queue; cannot be done purely client-side without an API server.

3. **Third-party form service** (Formspree, Getform, etc.).
   - Fastest to stand up.
   - Requires an account, an endpoint URL, and a privacy review.

**Recommended default:** Option 1 (email alias) for simplicity, with Option 2 as a later enhancement once a mail-to-git receiver exists.

## Privacy stance

- The static site stores no visitor submissions.
- Optional contact fields are transient; they travel only through the visitor's mail client or chosen backend.
- Do not add fields that collect sensitive PII (real names, physical addresses, financial details) without an explicit privacy review.

## Spawn rule

`sim/spawn-rules.yaml` includes an `inquiry-ack` rule. When an inquiry event is later injected into the ledger (by whatever backend is chosen), the rule spawns an ops-central acknowledgment that cites the inquiry subject and role.

The rule is currently latent: no automated ingestion path exists until the backend is approved and wired.

## Acceptance checklist

- [x] Form page renders and matches existing site styling.
- [ ] Submissions reach the chosen destination reliably in a headless test.
- [x] No live API server is introduced on `inspacepower.com`.
- [x] `sim/build.py` still runs cleanly and includes the new page.
- [ ] A sample inquiry can trigger a canon/staff response via `sim/cycle.py` in dry-run mode.
- [ ] Human has reviewed and approved the backend choice before any secrets or DNS records are touched.

## Files touched

- `site/inquiry.html` — new form page.
- `site/index.html` — added "Inquiry" link to primary nav.
- `site/styles.css` — added inquiry form styles.
- `sim/spawn-rules.yaml` — added `inquiry-ack` rule.
- `sim/build.py` — changed static source from `/home/mag/inspacepower-site` to project-local `site/`.
- `output/inquiry.html` — generated build artifact.
