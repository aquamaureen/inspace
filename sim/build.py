#!/usr/bin/env python3
"""Build In-Space Power static site + JSON shards."""
import json
import shutil
import subprocess
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
PERSONAS_DIR = ROOT / "personas"
LEDGER_FILE = ROOT / "ledger" / "ledger.json"
EVENTS_FILE = ROOT / "ledger" / "events.json"
OUTPUT_DIR = ROOT / "output"
DATA_DIR = OUTPUT_DIR / "data"


def load_yaml(path: Path) -> dict:
    return yaml.safe_load(path.read_text(encoding="utf-8")) or {}


def build_personas() -> list[dict]:
    personas = []
    for path in sorted(PERSONAS_DIR.glob("*.yaml")):
        personas.append(load_yaml(path))
    return personas


def build_data() -> dict:
    personas = build_personas()
    ledger = json.loads(LEDGER_FILE.read_text(encoding="utf-8"))
    events = json.loads(EVENTS_FILE.read_text(encoding="utf-8"))

    # Build causal chains
    chains: dict[str, list[dict]] = {}
    for ev in events["events"]:
        chains.setdefault(ev["chain_id"], []).append(ev)
    for chain_id, items in chains.items():
        chains[chain_id] = sorted(items, key=lambda e: e["timestamp"])

    return {
        "meta": ledger.get("meta", {}),
        "personas": personas,
        "facts": ledger.get("facts", {}),
        "rates": ledger.get("rates", {}),
        "mix": ledger.get("mix", {}),
        "accounts": ledger.get("accounts", []),
        "routes": ledger.get("routes", []),
        "timelines": ledger.get("timelines", []),
        "events": events["events"],
        "chains": chains,
    }


def main() -> int:
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    data = build_data()
    (DATA_DIR / "site.json").write_text(
        json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8"
    )

    # Copy static site files from the project-local source tree.
    src = ROOT / "site"
    for item in src.iterdir():
        if item.is_file():
            shutil.copy2(item, OUTPUT_DIR / item.name)
        elif item.is_dir():
            shutil.copytree(item, OUTPUT_DIR / item.name, dirs_exist_ok=True)

    print(f"Built {OUTPUT_DIR} with {len(data['events'])} events, {len(data['personas'])} personas.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
