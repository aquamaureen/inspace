# In-Space Power — living-company simulation architecture

Project: `inspacepower.com` (the 2999 statement-fiction utility company site).
This is distinct from `poweringspace.com`, the daily science publisher.

## Goal
Make In-Space Power feel like a very old, very large, slightly deadpan utility that
issues statements, answers community noise, and quietly corrects its own canon.
Everything is static-first: the site fetches JSON shards at runtime and renders them
client-side. No API server in v0/v1.

## Repository layout

```
projects/inspacepower/
  ARCHITECTURE.md          this file
  personas/                canonical voice sheets (one per persona)
  ledger/                  consistency ledger + event log
  sim/                     generator scripts and spawn rules
  output/                  compiled site assets (HTML/CSS/JS)
  data/                    JSON shards consumed by the client-side site
```

## Voice model

Three generator roles:

1. **Staff Writer** — official In-Space Power statements, tariff updates,
   generation-mix reports, regulatory filings, outage notices.
2. **Community Writer** — voices from customers, employees, settlers, tugs,
   town councils, regulators, competitors, historians, conspiracy theorists.
3. **Canon Editor** — reviews contradictions against the ledger and emits
   corrections, clarifications, retcons, and footnotes.

Each persona has a canonical sheet in `personas/<slug>.yaml`:

```yaml
id: meter-112
name: Meter 112
type: customer  # staff | community | canon
role: oldest active account, Earth Reserve Ohio
voice: terse, patient, records every read since 2091
traits:
  - never uses contractions
  - refers to itself as "this meter"
  - questions only the sum, never the rate
stance: loyal but exact
first_seen: 2999.08.01
```

## Ledger

`ledger/ledger.json` is the single source of canon truth. Every generated event is
checked against it before publish. Fields:

- `facts` — immutable canon claims (e.g. "founded 2041", "214,116,882 meters")
- `rates` — current tariff table
- `mix` — current generation mix
- `accounts` — notable accounts and their status
- `routes` — tow routes and interchanges
- `timelines` — major historical events
- `bans` — things no persona may claim

## Events and causal chains

Each event in `ledger/events.json`:

```json
{
  "id": "ev-2999-08-001",
  "cycle": "2999.08",
  "timestamp": "2999-08-05T09:00:00Z",
  "role": "staff",
  "persona_id": "ops-central",
  "kind": "statement",
  "title": "Generation mix update",
  "body": "...",
  "tags": ["mix", "beam"],
  "caused_by": null,
  "spawned": ["ev-2999-08-002"],
  "chain_id": "chain-001",
  "verified": true
}
```

Community events can spawn internal events via `sim/spawn-rules.yaml`:

```yaml
- if: tag contains 'outage' and sentiment < -0.4
  then: staff writer emits 'outage-ack' within 1 cycle hour
- if: tag contains 'rate-dispute' and mentions 'Europa'
  then: canon editor emits 'footnote' correcting tariff history
```

## Build pipeline (v0 static)

1. `sim/build.py` reads personas + ledger.
2. Generates `data/personas.json`, `data/events.json`, `data/chains.json`.
3. Copies static site files from `output/`.
4. Result is deployed to `/var/www/inspacepower.com/html/`.

## Version control

GitHub is the system of record. Every successful cycle run commits and pushes
persona sheets, ledger, emitted JSON shards, prompts, config, and site output
with message `cycle <id>: <sim summary>`.

## Staged rollout

- **v0** (done): seeded static history, hand-written personas and events,
  client-side rendering of notice stream.
- **v1** (done): scheduled agentic runs that append new events, validate them
  against the ledger bans, rebuild, auto-deploy, and commit+push.
- **v1.1** (done): `kiosk.inspacepower.com` notice board fed by the live
  ledger (`sim/emit_kiosk.py` emits the kiosk `data/` contract shards;
  synced after every deployed pass).
- **v2**: optional visitor inquiry form with static queue.

## Operations (v1)

`sim/cycle.py` drives the loop via headless `opencode run` (Zen,
`opencode/qwen3.6-plus`):

- `sim/cycle.py turn` — opens the next statement cycle: ops-central opening
  statement, community noise, statement ripple, spawn-rule responses.
  Timestamps follow the fictional calendar (cycle NN = month NN).
- `sim/cycle.py service` — customer-service pass within the current cycle:
  new complaints/comments plus the responses they trigger via
  `sim/spawn-rules.yaml`. Timestamps track the real clock within the
  cycle's fictional month.
- Both support `--dry-run`, `--no-deploy`, `--no-push`, `--noise N`,
  `--seed N`.

Every generated text passes ledger-ban validation (prompt constraints plus
deterministic checks in `check_bans`); failures retry once, then drop —
canon violations never publish.

After each deployed pass, `cycle.py` also syncs the Notice Kiosk:
`sim/emit_kiosk.py` maps the ledger onto the kiosk's `data/CONTRACT.md`
shards (heartbeat, chains, personas, channels) inside the kiosk source
tree, and `~/bin/deploy-kiosk.sh` rsyncs chrome + shards to
`kiosk.inspacepower.com`. Kiosk sync is best-effort: its failure logs
`KIOSK SYNC FAILED` but never fails the cycle.

Intended crontab (user `mag`):

```
7 5 1 * *    sim/cycle.py turn      # one statement cycle per month
23 7,19 * * *  sim/cycle.py service # complaints + service responses 2x daily
```

Log: `~/inspacepower-cycle.log`. Commit messages: `cycle <id>: <summary>`
and `<cycle> service: <summary>`.

## Deployment

Target: `deploy@157.245.118.128:/var/www/inspacepower.com/html/`
Use the team deploy key at `~/.ssh/id_ed25519`.
