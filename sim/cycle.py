#!/usr/bin/env python3
"""In-Space Power v1 agentic loop — cycle turns and service passes.

Subcommands:
  turn     Open the next statement cycle: ops-central opening statement,
           community noise, statement ripple, and spawn-rule responses.
  service  Ongoing customer service within the CURRENT cycle: community
           complaints/comments plus the spawn-rule responses they trigger.
           No new cycle is opened and no statement is issued.

Both passes evaluate sim/spawn-rules.yaml against every new event; the first
matching rule per event spawns a response (customer service, canon
correction). Every generated text is validated against the ledger bans —
failures are retried once, then the event is dropped (canon violations never
publish).

After generation: append to ledger/events.json, rebuild the site
(sim/build.py), rsync to the web droplet, verify, and commit + push.

Usage:
  sim/cycle.py turn [--cycle 2999.10] [--noise 3] [--seed 7] [--dry-run]
                    [--no-deploy] [--no-push]
  sim/cycle.py service [--noise 2] [--seed 7] [--dry-run] [--no-deploy]
                       [--no-push]
"""

import argparse
import json
import random
import re
import shutil
import subprocess
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
PERSONAS_DIR = ROOT / "personas"
LEDGER_FILE = ROOT / "ledger" / "ledger.json"
EVENTS_FILE = ROOT / "ledger" / "events.json"
RULES_FILE = ROOT / "sim" / "spawn-rules.yaml"
OUTPUT_DIR = ROOT / "output"

MODEL = "opencode/qwen3.6-plus"
# cron runs with a minimal PATH; resolve the opencode binary up front.
OPENCODE_BIN = shutil.which("opencode") or str(Path.home() / ".npm-global" / "bin" / "opencode")
DEPLOY_HOST = "deploy@157.245.118.128"
DEPLOY_DST = "/var/www/inspacepower.com/html/"
DEPLOY_KEY = str(Path.home() / ".ssh" / "id_ed25519")
VERIFY_URL = "https://inspacepower.com/data/site.json"
KIOSK_DEPLOY = str(Path.home() / "bin" / "deploy-kiosk.sh")

KINDS = {"statement", "comment", "complaint", "acknowledgment", "footnote"}
ANSI_RE = re.compile(r"\x1b\[[0-9;]*[A-Za-z]")

# Topic seeds for community noise. Service tags (outage, rate-dispute,
# billing) are what spawn-rules.yaml keys on, so every cycle forces at least
# one complaint carrying a service tag.
TOPICS = [
    {"seed": "a four-second read gap on the yard glass, blamed on a synchronization pulse",
     "kind": "complaint", "tags": ["outage", "tow-route-4"]},
    {"seed": "shade pricing while a town sits in the shadow of another town",
     "kind": "complaint", "tags": ["rate-dispute", "shade", "tow-route-4"]},
    {"seed": "The Beam cutting out during relay geometry while the meter keeps reading",
     "kind": "complaint", "tags": ["outage", "beam"]},
    {"seed": "whether a town's water tower is billed as a structure",
     "kind": "complaint", "tags": ["billing", "tow-route-4"]},
    {"seed": "haulage on Underway rate while docked in someone else's shadow",
     "kind": "complaint", "tags": ["rate-dispute", "tug", "underway"]},
    {"seed": "Europa's share of the generation mix and who carried it",
     "kind": "comment", "tags": ["rates", "europa", "mix"]},
    {"seed": "the Belt households' balance, unpaid since 2087",
     "kind": "comment", "tags": ["billing", "belt"]},
    {"seed": "a new settlement asking what First Light actually covers",
     "kind": "comment", "tags": ["first-light", "rates"]},
    {"seed": "the Joint Settlement Authority Ceres filing for cycle review",
     "kind": "comment", "tags": ["regulator", "statement"]},
    {"seed": "the count of active meters and whether it ever goes down",
     "kind": "comment", "tags": ["meters", "comment"]},
    {"seed": "a porch light left burning through a synchronization pulse",
     "kind": "complaint", "tags": ["billing", "sync"]},
    {"seed": "a First Light settlement approaching its third and final free cycle",
     "kind": "comment", "tags": ["first-light", "rates"]},
    {"seed": "a missed tow-route interchange and who pays for the dark stretch",
     "kind": "complaint", "tags": ["outage", "tow-route-4", "underway"]},
    {"seed": "the regulator auditing the mass-battery flywheel depots",
     "kind": "comment", "tags": ["regulator", "stored-light"]},
    {"seed": "a historian asking for read records from before the cornfields",
     "kind": "comment", "tags": ["history", "meters"]},
    {"seed": "whether stored light counts as sunlight for a sunward rate",
     "kind": "complaint", "tags": ["rate-dispute", "stored-light"]},
]

PERSONA_WEIGHTS = {
    "meter-112": 2,
    "new-sheboygan-clerk": 2,
    "halverson-green": 1,
    "europa-grid": 1,
    "tug-captain-mako": 2,
}


def load_personas() -> dict[str, dict]:
    personas = {}
    for path in sorted(PERSONAS_DIR.glob("*.yaml")):
        data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
        if data.get("id"):
            personas[data["id"]] = data
    return personas


def persona_sheet(persona: dict) -> str:
    return yaml.safe_dump(persona, sort_keys=False).strip()


def canon_block(ledger: dict, cycle: str) -> str:
    facts = ledger["facts"]
    rates = ledger["rates"]
    mix = ", ".join(f"{m['label']} {m['value']}%" for m in ledger["mix"].values())
    lines = [
        f"- Founded {facts['founded']}. Present year {facts['present_year']}; statement cycle {cycle}.",
        f"- Active meters: {facts['active_meters']:,}. Reads every {facts['read_interval_seconds']} seconds.",
        f"- Estimated reads issued since founding: {facts['estimated_reads_since_founding']}.",
        f"- Consumption: {facts['energy_consumption']['yottajoules_per_41_days']} yottajoule per 41 days.",
        f"- Regulator: {facts['regulator']}. Payment route {facts['payment_route']}.",
        f"- Billing principle: \"{facts['billing_principle']}\".",
        f"- Generation mix this cycle: {mix}.",
        f"- Tariffs: Porchlight {rates['porchlight']['sunward']}/{rates['porchlight']['shade']} "
        f"(sunward/shade), Corner Main {rates['corner_main']['sunward']}/{rates['corner_main']['shade']}, "
        f"Underway flat {rates['underway']['flat']}, all credits/MJ. "
        f"First Light: {rates['first_light']['note']}.",
        "BANS — never violate, in any wording:",
    ]
    lines += [f"  - {b}" for b in ledger["bans"]]
    return "\n".join(lines)


def llm(prompt: str, timeout: int = 300) -> str:
    proc = subprocess.run(
        [OPENCODE_BIN, "run", "-m", MODEL, prompt],
        capture_output=True, text=True, timeout=timeout, cwd="/tmp",
    )
    if proc.returncode != 0:
        raise RuntimeError(f"opencode exited {proc.returncode}: {proc.stderr[-400:]}")
    text = ANSI_RE.sub("", proc.stdout)
    lines = [l for l in text.splitlines() if not l.lstrip().startswith(">")]
    return "\n".join(lines).strip()


def extract_json(text: str) -> dict:
    """Parse the last balanced JSON object in the model output."""
    spans, stack = [], []
    for i, ch in enumerate(text):
        if ch == "{":
            stack.append(i)
        elif ch == "}" and stack:
            start = stack.pop()
            if not stack:
                spans.append((start, i + 1))
    for start, end in reversed(spans):
        try:
            obj = json.loads(text[start:end])
        except json.JSONDecodeError:
            continue
        if isinstance(obj, dict):
            return obj
    raise ValueError(f"no JSON object in model output: {text[:200]!r}")


def generate(prompt: str, attempts: int = 2) -> dict | None:
    """LLM call with retry; returns the parsed JSON draft or None."""
    last_err = None
    for _ in range(attempts):
        try:
            return extract_json(llm(prompt))
        except (RuntimeError, ValueError, subprocess.TimeoutExpired) as err:
            last_err = err
    print(f"  [!] generation failed: {last_err}", file=sys.stderr)
    return None


def check_bans(body: str) -> list[str]:
    """Deterministic net over the ledger bans. The prompt is the first wall;
    this is the second. Anything that slips both is dropped, never published."""
    problems = []
    low = body.lower()
    m = re.search(r"founded\s*(?:in\s*)?(\d{4})", low)
    if m and int(m.group(1)) != 2041:
        problems.append("claims a founding year other than 2041")
    if re.search(r"europa[^.]{0,100}(behind|delinquent|unpaid|owes|debt|arrears)", low):
        problems.append("claims Europa is behind on payments")
    m = re.search(r"beam[^.]{0,80}?(\d{1,2})\s*%", low)
    if m and int(m.group(1)) < 40:
        problems.append("claims The Beam below 40% of the mix this cycle")
    m = re.search(r"(\d[\d,]*)\s+reads[^.]{0,60}issued", low)
    if m and int(m.group(1).replace(",", "")) != 0:
        problems.append("claims estimated reads have been issued")
    return problems


TAG_RE = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")


def validate_draft(draft: dict) -> list[str]:
    problems = []
    if not isinstance(draft.get("title"), str) or not draft["title"].strip():
        problems.append("missing title")
    if not isinstance(draft.get("body"), str) or not draft["body"].strip():
        problems.append("missing body")
    tags = draft.get("tags")
    if not isinstance(tags, list) or not tags or not all(
        isinstance(t, str) and TAG_RE.match(t) for t in tags
    ):
        problems.append("tags must be a non-empty list of lowercase-hyphenated slugs")
    if isinstance(draft.get("title"), str) and len(draft["title"]) > 90:
        problems.append("title too long (max 90 chars)")
    if isinstance(draft.get("body"), str) and len(draft["body"]) > 800:
        problems.append("body too long (max 800 chars)")
    if isinstance(draft.get("body"), str):
        problems.extend(check_bans(draft["body"]))
    return problems


def make_prompt(kind: str, persona: dict, ledger: dict, cycle: str, task: str,
                rules: str) -> str:
    return f"""You are a fiction writer for inspacepower.com, the website of In-Space Power, utility of record for the Sol system in the year 2999. You write entries for the site's public notice stream.

VOICE (write strictly in this persona's voice):
{persona_sheet(persona)}

CANON (cite accurately, never contradict):
{canon_block(ledger, cycle)}

TASK: Write one "{kind}" notice by this persona.
{task}

Style rules:
- 2 to 5 sentences. Plain, dry, slightly deadpan utility-fiction tone.
- Stay in character. Never mention fiction, simulations, or AI.
{rules}

Reply with ONLY a JSON object, no markdown fences:
{{"title": "<short notice title>", "body": "<the notice text>", "tags": ["<lowercase-hyphenated>", "..."]}}"""


def gen_event(kind: str, persona_id: str, personas: dict, ledger: dict,
              cycle: str, task: str, require_tags: list[str]) -> dict | None:
    persona = personas[persona_id]
    tag_rule = f"- Tags: choose 2-4 tags and include: {', '.join(require_tags)}."
    prompt = make_prompt(kind, persona, ledger, cycle, task, tag_rule)
    draft = generate(prompt)
    if draft is None:
        return None
    problems = validate_draft(draft)
    if problems:
        print(f"  [!] draft rejected ({'; '.join(problems)}), retrying once", file=sys.stderr)
        prompt += "\n\nYour previous draft was rejected because: " + "; ".join(problems) + ". Try again."
        draft = generate(prompt)
        if draft is None:
            return None
        problems = validate_draft(draft)
        if problems:
            print(f"  [!] draft rejected again ({'; '.join(problems)}), dropping event", file=sys.stderr)
            return None
    for t in require_tags:
        if t not in draft["tags"]:
            draft["tags"].append(t)
    return {
        "title": draft["title"].strip(),
        "body": draft["body"].strip(),
        "tags": draft["tags"][:5],
        "kind": kind,
        "role": persona["type"],
        "persona_id": persona_id,
    }


def rule_matches(rule: dict, event: dict) -> bool:
    when = rule["when"]
    if when.get("role") and event["role"] != when["role"]:
        return False
    if when.get("kind") and event["kind"] != when["kind"]:
        return False
    if when.get("any_tag") and not set(when["any_tag"]) & set(event["tags"]):
        return False
    if when.get("body_mentions") and not any(
        m.lower() in event["body"].lower() for m in when["body_mentions"]
    ):
        return False
    return True


def next_cycle(current: str) -> str:
    year, cyc = current.split(".")
    year, cyc = int(year), int(cyc)
    cyc += 1
    if cyc > 12:
        year, cyc = year + 1, 1
    return f"{year}.{cyc:02d}"


class CycleRun:
    """ID/chain counters and event accumulator for one pass."""

    def __init__(self, cycle: str, existing: list[dict]):
        self.cycle = cycle
        self.year, self.cyc = cycle.split(".")
        self.events: list[dict] = []
        self.ev_num = sum(1 for e in existing if e["cycle"] == cycle)
        self.chain_num = max(
            (int(m.group(1)) for e in existing
             if (m := re.match(r"chain-(\d+)$", e["chain_id"]))),
            default=0,
        )

    def new_id(self) -> str:
        self.ev_num += 1
        return f"ev-{self.year}-{self.cyc}-{self.ev_num:03d}"

    def new_chain(self) -> str:
        self.chain_num += 1
        return f"chain-{self.chain_num:03d}"

    def publish(self, ev: dict, chain_id: str, caused_by: str | None,
                dt: datetime) -> dict:
        ev.update({
            "id": self.new_id(), "cycle": self.cycle,
            "timestamp": dt.strftime("%Y-%m-%dT%H:%M:00Z"),
            "caused_by": caused_by, "spawned": [], "chain_id": chain_id,
            "verified": True,
        })
        ordered = {k: ev[k] for k in (
            "id", "cycle", "timestamp", "role", "persona_id", "kind",
            "title", "body", "tags", "caused_by", "spawned", "chain_id",
            "verified")}
        self.events.append(ordered)
        print(f"  + {ordered['id']} [{ordered['kind']}] "
              f"{ordered['persona_id']}: {ordered['title']}")
        return ordered


def pick_persona(rng: random.Random) -> str:
    return rng.choices(list(PERSONA_WEIGHTS),
                       weights=list(PERSONA_WEIGHTS.values()))[0]


def load_state() -> tuple[dict, list[dict], list[dict], dict]:
    ledger = json.loads(LEDGER_FILE.read_text(encoding="utf-8"))
    events_doc = json.loads(EVENTS_FILE.read_text(encoding="utf-8"))
    rules = yaml.safe_load(RULES_FILE.read_text(encoding="utf-8"))["rules"]
    return ledger, events_doc["events"], rules, load_personas()


def community_noise(run: CycleRun, personas: dict, ledger: dict,
                    rng: random.Random, count: int, clock) -> list[tuple[dict, datetime]]:
    """Standalone community complaints/comments (each a new chain).
    clock() yields the fictional datetime of the next notice."""
    topics = rng.sample(TOPICS, k=min(count, len(TOPICS)))
    if count > 0 and not any(t["kind"] == "complaint" for t in topics):
        topics[0] = rng.choice([t for t in TOPICS if t["kind"] == "complaint"])
    results = []
    for topic in topics:
        pid = pick_persona(rng)
        print(f" community noise ({pid}, {topic['kind']})...")
        ev = gen_event(
            topic["kind"], pid, personas, ledger, run.cycle,
            task=f"The persona raises: {topic['seed']}.",
            require_tags=topic["tags"],
        )
        if ev is not None:
            dt = clock()
            results.append((run.publish(ev, run.new_chain(), None, dt), dt))
    return results


def spawn_responses(run: CycleRun, personas: dict, ledger: dict,
                    rules: list[dict], rng: random.Random,
                    triggers: list[tuple[dict, datetime]]) -> None:
    """Customer-service pass: first matching rule per trigger spawns a reply."""
    for trigger, trigger_dt in triggers:
        rule = next((r for r in rules if r["id"] != "statement-ripple"
                     and rule_matches(r, trigger)), None)
        if rule is None:
            continue
        action = rule["then"]
        pid = action["persona"]
        if pid == "any-community":
            pid = pick_persona(rng)
        print(f" spawn rule {rule['id']} -> {pid} {action['kind']}...")
        resp = gen_event(
            action["kind"], pid, personas, ledger, run.cycle,
            task=f"A community notice arrived and triggered rule \"{rule['id']}\".\n"
                 f"  kind: {trigger['kind']}, tags: {', '.join(trigger['tags'])}\n"
                 f"  title: {trigger['title']}\n  body: {trigger['body']}\n"
                 f"YOUR DUTY: {action['duty'].strip()}",
            require_tags=[trigger["tags"][0]],
        )
        if resp is not None:
            dt = trigger_dt + timedelta(hours=rng.randint(1, 6))
            resp = run.publish(resp, trigger["chain_id"], trigger["id"], dt)
            trigger["spawned"].append(resp["id"])


def kiosk_sync() -> None:
    """Emit live shards into the kiosk data/ dir and rsync the kiosk.
    Best effort: a kiosk failure must not fail the cycle (already
    committed and deployed by the time this runs)."""
    try:
        subprocess.run([sys.executable, str(ROOT / "sim" / "emit_kiosk.py")],
                       check=True, capture_output=True, text=True)
        proc = subprocess.run(["bash", KIOSK_DEPLOY], capture_output=True,
                              text=True, timeout=600)
        if proc.returncode != 0:
            raise RuntimeError((proc.stdout + proc.stderr)[-400:])
        print(" kiosk synced")
    except Exception as err:
        print(f"KIOSK SYNC FAILED (cycle still committed): {err}",
              file=sys.stderr)


def finalize(run: CycleRun, ledger: dict, existing: list[dict],
             msg_prefix: str, dry_run: bool, do_deploy: bool,
             do_push: bool) -> int:
    """Append events, rebuild, deploy, verify, commit, push."""
    if not run.events:
        print("FATAL: no events generated", file=sys.stderr)
        return 1

    run.events.sort(key=lambda e: e["timestamp"])
    counts: dict[str, int] = {}
    for ev in run.events:
        counts[ev["role"]] = counts.get(ev["role"], 0) + 1
    summary = ", ".join(f"{v} {k}" for k, v in sorted(counts.items()))
    summary += f"; chains {run.events[0]['chain_id']}..{run.events[-1]['chain_id']}"
    print(f" {len(run.events)} events: {summary}")

    if dry_run:
        print(" dry-run: not touching ledger, site, or git.")
        print(json.dumps(run.events, indent=2, ensure_ascii=False))
        return 0

    existing.extend(run.events)
    EVENTS_FILE.write_text(
        json.dumps({"events": existing}, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8")
    ledger["meta"]["cycle"] = run.cycle
    ledger["meta"]["updated"] = run.events[-1]["timestamp"]
    LEDGER_FILE.write_text(
        json.dumps(ledger, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    subprocess.run([sys.executable, str(ROOT / "sim" / "build.py")], check=True)
    print(" site rebuilt")

    if do_deploy:
        subprocess.run([
            "rsync", "-az", "--delete",
            "-e", f"ssh -i {DEPLOY_KEY} -o BatchMode=yes -o ConnectTimeout=10 "
                  "-o StrictHostKeyChecking=accept-new",
            f"{OUTPUT_DIR}/", f"{DEPLOY_HOST}:{DEPLOY_DST}",
        ], check=True)
        probe = subprocess.run(
            ["curl", "-s", "--max-time", "20", VERIFY_URL],
            capture_output=True, text=True, check=True)
        live_cycle = json.loads(probe.stdout).get("meta", {}).get("cycle")
        if live_cycle != run.cycle:
            print(f"FATAL: live site shows cycle {live_cycle}, "
                  f"expected {run.cycle}", file=sys.stderr)
            return 1
        print(f" deployed and verified: {VERIFY_URL} shows cycle {run.cycle}")

    subprocess.run(["git", "-C", str(ROOT), "add", "-A"], check=True)
    subprocess.run(
        ["git", "-C", str(ROOT), "commit", "-m", f"{msg_prefix}: {summary}"],
        check=True)
    if do_push:
        subprocess.run(["git", "-C", str(ROOT), "push"], check=True)
        print(" committed and pushed")
    else:
        print(" committed (push skipped)")

    if do_deploy:
        kiosk_sync()
    return 0


def cmd_turn(args) -> int:
    """Open the next statement cycle: statement, noise, ripple, responses."""
    ledger, existing, rules, personas = load_state()
    cycle = args.cycle or next_cycle(ledger["meta"]["cycle"])
    run = CycleRun(cycle, existing)
    rng = random.Random(args.seed)
    base = datetime(int(run.year), int(run.cyc), 1, 6, 0)
    print(f"== cycle turn {cycle} ==")

    print(" opening statement...")
    stmt = gen_event(
        "statement", "ops-central", personas, ledger, cycle,
        task="This is the opening statement for the new statement cycle. "
             "Confirm the cycle, cite the active meter count and the read "
             "interval, and note one stable fact of record (the mix, a "
             "tariff, or the billing principle).",
        require_tags=["statement", "cycle"],
    )
    if stmt is None:
        print("FATAL: could not generate opening statement", file=sys.stderr)
        return 1
    stmt = run.publish(stmt, run.new_chain(), None, base)

    day = {"d": 1}

    def noise_clock() -> datetime:
        day["d"] += rng.randint(2, 4)
        return base + timedelta(days=day["d"], hours=rng.randint(0, 12))

    triggers = community_noise(run, personas, ledger, rng, args.noise, noise_clock)

    print(" statement ripple...")
    ripple_rule = next(r for r in rules if r["id"] == "statement-ripple")
    ripple = gen_event(
        ripple_rule["then"]["kind"], pick_persona(rng), personas, ledger, cycle,
        task=f"Respond to this official statement.\nStatement: {stmt['body']}\n"
             f"Duty: {ripple_rule['then']['duty'].strip()}",
        require_tags=["cycle"],
    )
    if ripple is not None:
        dt = base + timedelta(hours=rng.randint(4, 8))
        ripple = run.publish(ripple, stmt["chain_id"], stmt["id"], dt)
        stmt["spawned"].append(ripple["id"])

    spawn_responses(run, personas, ledger, rules, rng, triggers)
    return finalize(run, ledger, existing, f"cycle {cycle}",
                    args.dry_run, not args.no_deploy, not args.no_push)


def cmd_service(args) -> int:
    """Ongoing customer service within the current cycle (no new cycle)."""
    ledger, existing, rules, personas = load_state()
    cycle = ledger["meta"]["cycle"]
    run = CycleRun(cycle, existing)
    rng = random.Random(args.seed)
    now = datetime.now(timezone.utc)
    base = datetime(int(run.year), int(run.cyc), 1, 0, 0)
    # Fictional clock tracks real UTC inside the cycle's month, but must
    # never go backwards: floor at the newest event already on record.
    last_ts = max((e["timestamp"] for e in existing if e["cycle"] == cycle),
                  default=None)
    floor = (datetime.fromisoformat(last_ts.replace("Z", "+00:00"))
             .replace(tzinfo=None) if last_ts else None)
    clock = {"t": base + timedelta(days=min(now.day, 28) - 1,
                                   hours=now.hour)}
    if floor is not None and clock["t"] <= floor:
        clock["t"] = floor + timedelta(hours=1)

    def service_clock() -> datetime:
        clock["t"] += timedelta(minutes=rng.randint(5, 50))
        return clock["t"]

    print(f"== service pass {cycle} ==")
    triggers = community_noise(run, personas, ledger, rng, args.noise, service_clock)
    spawn_responses(run, personas, ledger, rules, rng, triggers)
    return finalize(run, ledger, existing, f"{cycle} service",
                    args.dry_run, not args.no_deploy, not args.no_push)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    sub = parser.add_subparsers(dest="command", required=True)

    common = argparse.ArgumentParser(add_help=False)
    common.add_argument("--noise", type=int, help="community noise events")
    common.add_argument("--seed", type=int, help="RNG seed for reproducibility")
    common.add_argument("--dry-run", action="store_true", help="generate and print only")
    common.add_argument("--no-deploy", action="store_true", help="skip rsync to the droplet")
    common.add_argument("--no-push", action="store_true", help="commit but do not push")

    turn = sub.add_parser("turn", parents=[common],
                          help="open the next statement cycle")
    turn.add_argument("--cycle", help="cycle id to open (default: next after ledger meta)")
    turn.set_defaults(func=cmd_turn, noise_default=3)

    service = sub.add_parser("service", parents=[common],
                             help="customer-service pass within the current cycle")
    service.set_defaults(func=cmd_service, noise_default=2)

    args = parser.parse_args()
    if args.noise is None:
        args.noise = args.noise_default
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
