#!/usr/bin/env python3
"""Emit kiosk PULSE data shards from the live ledger.

The In-Space Power Notice Kiosk (kiosk.inspacepower.com) reads ./data/
read-only per that project's data/CONTRACT.md. This script maps the
simulation ledger (ledger/ledger.json, ledger/events.json, personas/*.yaml)
onto the contract's files:

  heartbeat.json   newest events, capped, lightweight
  chains.json      chain index
  chains/<id>.json chain detail with events_detail + depth
  personas.json    roster (staff / community)
  personas/<id>.json  per-persona inbox/outbox/threads/chains
  channels.json    channel catalog

Mapping decisions (ledger -> contract):
  ts        "2999-09-06T12:00:00Z" -> "2999.09.06 12:00" (lexicographic sort)
  channel   (role, kind) -> public-notices | customer-desk | community-board
            | record-office (see CHANNEL_FOR below)
  move      roots: statement/comment OPEN, complaint PROPOSE
            replies: acknowledgment COUNTER, footnote ESCALATE, comment COUNTER
  visibility  all events are public (the sim has no internal channels yet)
  participants  sender, plus the trigger event's sender for replies
  positions     empty (the ledger carries no per-persona positions yet)

Usage:
  sim/emit_kiosk.py [--out DIR]

Default --out is the kiosk prototype's data/ directory; existing chains/
and personas/ shards there are cleared first (CONTRACT.md is preserved).
"""

import argparse
import json
import re
import shutil
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
LEDGER_FILE = ROOT / "ledger" / "ledger.json"
EVENTS_FILE = ROOT / "ledger" / "events.json"
PERSONAS_DIR = ROOT / "personas"
DEFAULT_OUT = Path(
    "/mnt/c/Users/mag/Dropbox/BWG/christian/projects/inspacepower-kiosk/data")

HEARTBEAT_CAP = 12

CHANNELS = {
    "public-notices": {"label": "Public Notices", "kind": "public"},
    "customer-desk": {"label": "Customer Correspondence", "kind": "public"},
    "community-board": {"label": "Community Board", "kind": "public"},
    "record-office": {"label": "Corrections to Record", "kind": "public"},
}

CHANNEL_FOR = {
    ("staff", "statement"): "public-notices",
    ("staff", "acknowledgment"): "customer-desk",
    ("community", "complaint"): "customer-desk",
    ("community", "comment"): "community-board",
    ("canon", "footnote"): "record-office",
}


def to_ts(iso: str) -> str:
    m = re.match(r"(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})", iso)
    if not m:
        raise ValueError(f"unparseable timestamp {iso!r}")
    y, mo, d, hh, mm = m.groups()
    return f"{y}.{mo}.{d} {hh}:{mm}"


def line_for(title: str, limit: int = 120) -> str:
    if len(title) <= limit:
        return title
    cut = title[:limit].rsplit(" ", 1)[0]
    return cut + "…"


def kiosk_event(ev: dict, trigger: dict | None) -> dict:
    channel = CHANNEL_FOR.get((ev["role"], ev["kind"]), "community-board")
    if ev["caused_by"] is None:
        move = "PROPOSE" if ev["kind"] == "complaint" else "OPEN"
    else:
        move = {"acknowledgment": "COUNTER", "footnote": "ESCALATE"}.get(
            ev["kind"], "COUNTER")
    participants = [ev["persona_id"]]
    if trigger is not None and trigger["persona_id"] != ev["persona_id"]:
        participants.append(trigger["persona_id"])
    return {
        "id": ev["id"],
        "cycle": ev["cycle"],
        "ts": to_ts(ev["timestamp"]),
        "chain_id": ev["chain_id"],
        "caused_by": ev["caused_by"],
        "spawned": ev["spawned"],
        "channel": channel,
        "visibility": "public",
        "move": move,
        "from": ev["persona_id"],
        "participants": participants,
        "line": line_for(ev["title"]),
        "body": ev["body"],
        "positions": {},
    }


def heartbeat_view(kev: dict) -> dict:
    return {k: kev[k] for k in (
        "id", "ts", "channel", "visibility", "move", "from", "participants",
        "line", "chain_id", "caused_by", "spawned")}


def chain_status(last_ts: str, current_cycle: str) -> str:
    return "live" if last_ts.startswith(current_cycle) else "dormant"


def build_chains(events: list[dict], kiosk_events: dict[str, dict],
                 current_cycle: str) -> list[dict]:
    by_chain: dict[str, list[dict]] = {}
    for ev in events:
        by_chain.setdefault(ev["chain_id"], []).append(ev)

    chains = []
    for chain_id, members in by_chain.items():
        members.sort(key=lambda e: e["timestamp"])
        root = members[0]
        depth = {root["id"]: 0}
        for ev in members[1:]:
            depth[ev["id"]] = depth.get(ev["caused_by"], 0) + 1
        k_members = [kiosk_events[ev["id"]] for ev in members]
        last_ts = k_members[-1]["ts"]
        channels = []
        for k in k_members:
            if k["channel"] not in channels:
                channels.append(k["channel"])
        chains.append({
            "id": chain_id,
            "title": root["title"],
            "status": chain_status(last_ts, current_cycle),
            "cycle": root["cycle"],
            "started": k_members[0]["ts"],
            "last": last_ts,
            "events": len(members),
            "public_events": len(members),
            "max_depth": max(depth.values()),
            "channels": channels,
            "root_line": k_members[0]["line"],
            "summary": root["body"][:220],
            "_members": members,
            "_k_members": k_members,
            "_depth": depth,
        })
    chains.sort(key=lambda c: c["started"])
    return chains


def short_name(name: str) -> str:
    parts = name.split()
    if len(parts) > 1 and len(parts[-1]) > 2:
        return parts[-1]
    return name


def build_personas(personas: dict, events: list[dict],
                   kiosk_events: dict[str, dict], chains: list[dict],
                   current_cycle: str) -> tuple[dict, dict]:
    chain_by_id = {c["id"]: c for c in chains}
    channels_used: dict[str, list[str]] = {}
    for ev in events:
        k = kiosk_events[ev["id"]]
        channels_used.setdefault(ev["persona_id"], [])
        if k["channel"] not in channels_used[ev["persona_id"]]:
            channels_used[ev["persona_id"]].append(k["channel"])

    roster = []
    for pid, p in personas.items():
        cast = "community" if p["type"] == "community" else "staff"
        roster.append({
            "id": pid,
            "name": p["name"],
            "short": short_name(p["name"]),
            "cast": cast,
            "role": p["role"],
            "culture": p.get("culture", p["role"]),
            "voice": p["voice"],
            "channels": channels_used.get(pid, []),
        })
    staff = [p for p in roster if p["cast"] == "staff"]
    community = [p for p in roster if p["cast"] == "community"]

    details: dict[str, dict] = {}
    for entry in roster:
        pid = entry["id"]
        outbox = [kiosk_events[e["id"]] for e in events
                  if e["persona_id"] == pid]
        inbox = [kiosk_events[e["id"]] for e in events
                 if pid in kiosk_events[e["id"]]["participants"]
                 and kiosk_events[e["id"]]["from"] != pid]
        outbox.sort(key=lambda k: k["ts"], reverse=True)
        inbox.sort(key=lambda k: k["ts"], reverse=True)

        threads_map: dict[str, dict] = {}
        for k in sorted(outbox + inbox, key=lambda k: k["ts"]):
            tid = f"{k['chain_id']}::{k['channel']}"
            t = threads_map.setdefault(tid, {
                "thread_id": tid,
                "chain_id": k["chain_id"],
                "chain_title": chain_by_id[k["chain_id"]]["title"],
                "channel": k["channel"],
                "status": chain_by_id[k["chain_id"]]["status"],
                "events": 0,
                "last": k["ts"],
                "participants": [],
            })
            t["events"] += 1
            t["last"] = max(t["last"], k["ts"])
            for part in k["participants"]:
                if part not in t["participants"]:
                    t["participants"].append(part)

        my_chains = []
        for cid in {k["chain_id"] for k in outbox + inbox}:
            c = chain_by_id[cid]
            root_sender = next(
                e["persona_id"] for e in c["_members"] if e["caused_by"] is None)
            my_chains.append({
                "chain_id": cid,
                "title": c["title"],
                "status": c["status"],
                "last": c["last"],
                "visible_events": c["events"],
                "hidden_events": 0,
                "opened_by_me": root_sender == pid,
                "note": None,
            })

        details[pid] = {
            "persona": entry,
            "cycle": current_cycle,
            "counts": {
                "inbox": len(inbox),
                "outbox": len(outbox),
                "threads": len(threads_map),
                "chains": len(my_chains),
            },
            "inbox": inbox,
            "outbox": outbox,
            "threads": sorted(threads_map.values(),
                              key=lambda t: t["last"], reverse=True),
            "chains": sorted(my_chains, key=lambda c: c["last"], reverse=True),
        }
    return {"staff": staff, "community": community}, details


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT,
                        help="kiosk data/ directory to write")
    args = parser.parse_args()

    ledger = json.loads(LEDGER_FILE.read_text(encoding="utf-8"))
    events = json.loads(EVENTS_FILE.read_text(encoding="utf-8"))["events"]
    cycle = ledger["meta"]["cycle"]

    personas = {}
    for path in sorted(PERSONAS_DIR.glob("*.yaml")):
        data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
        if data.get("id"):
            personas[data["id"]] = data

    by_id = {e["id"]: e for e in events}
    kiosk_events = {
        e["id"]: kiosk_event(e, by_id.get(e["caused_by"])) for e in events}

    out = args.out
    if not out.is_dir():
        print(f"FATAL: {out} is not a directory", file=sys.stderr)
        return 1
    for sub in ("chains", "personas"):
        target = out / sub
        if target.is_dir():
            shutil.rmtree(target)
        target.mkdir()

    chains = build_chains(events, kiosk_events, cycle)
    latest = max(k["ts"] for k in kiosk_events.values())

    newest = sorted(kiosk_events.values(), key=lambda k: k["ts"], reverse=True)
    heartbeat = {
        "generated_at": latest,
        "cycle": cycle,
        "cap": HEARTBEAT_CAP,
        "events": [heartbeat_view(k) for k in newest[:HEARTBEAT_CAP]],
    }
    (out / "heartbeat.json").write_text(
        json.dumps(heartbeat, indent=1, ensure_ascii=False), encoding="utf-8")

    (out / "chains.json").write_text(
        json.dumps({"cycle": cycle,
                    "chains": [{k: v for k, v in c.items()
                                if not k.startswith("_")} for c in chains]},
                   indent=1, ensure_ascii=False), encoding="utf-8")
    for c in chains:
        detail = {kk: c[kk] for kk in c if not kk.startswith("_")}
        detail["events_detail"] = [
            {**kiosk_events[ev["id"]], "depth": c["_depth"][ev["id"]]}
            for ev in sorted(c["_members"], key=lambda e: e["timestamp"])]
        (out / "chains" / f"{c['id']}.json").write_text(
            json.dumps(detail, indent=1, ensure_ascii=False), encoding="utf-8")

    roster, details = build_personas(personas, events, kiosk_events, chains, cycle)
    (out / "personas.json").write_text(
        json.dumps({"cycle": cycle, **roster}, indent=1, ensure_ascii=False),
        encoding="utf-8")
    for pid, detail in details.items():
        (out / "personas" / f"{pid}.json").write_text(
            json.dumps(detail, indent=1, ensure_ascii=False), encoding="utf-8")

    (out / "channels.json").write_text(
        json.dumps(CHANNELS, indent=1, ensure_ascii=False), encoding="utf-8")

    print(f"Emitted kiosk shards to {out}: cycle {cycle}, "
          f"{len(events)} events, {len(chains)} chains, "
          f"{len(details)} personas.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
