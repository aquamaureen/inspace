#!/usr/bin/env python3
"""Cron wrapper for cycle.py: run a scheduled pass and catch up missed ones.

The simulation host is a WSL laptop that sleeps; cron does not fire while
the machine is asleep, so scheduled passes are silently dropped and the
kiosk goes quiet. This wrapper records the last successful run of each
pass and, on every invocation (including @reboot), runs one extra pass
per missed slot, up to --cap, before the scheduled pass itself. A flock
serializes passes so a wrapper run never races another cycle.

Usage:
  catchup.py turn [--interval 720] [--cap 0]
  catchup.py service [--interval 12] [--cap 4]
  catchup.py internal [--interval 24] [--cap 2]
  catchup.py <cmd> --extra N   # force N catch-up passes (manual backfill)
"""

import argparse
import fcntl
import json
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
STATE = ROOT / "sim" / ".catchup-state.json"
LOCK = ROOT / "sim" / ".cycle.lock"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("command", choices=["turn", "service", "internal"])
    parser.add_argument("--interval", type=float, required=True,
                        help="expected hours between scheduled runs")
    parser.add_argument("--cap", type=int, default=4,
                        help="max catch-up passes per invocation")
    parser.add_argument("--extra", type=int,
                        help="force this many catch-up passes (backfill)")
    args = parser.parse_args()

    lock_f = open(LOCK, "w")
    try:
        fcntl.flock(lock_f, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        print(f"[catchup] {args.command}: lock held by another pass, "
              f"skipping", flush=True)
        return 0

    state = json.loads(STATE.read_text()) if STATE.exists() else {}
    now = time.time()
    if args.extra is not None:
        missed = args.extra
    else:
        last = state.get(args.command)
        missed = (0 if last is None
                  else max(0, int((now - last) // (args.interval * 3600))))
        missed = min(missed, args.cap)
    total = 1 + missed
    print(f"[catchup] {args.command}: {missed} catch-up pass(es), "
          f"{total} total", flush=True)

    for i in range(total):
        stamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        print(f"[catchup] pass {i + 1}/{total} at {stamp}", flush=True)
        rc = subprocess.run(
            [sys.executable, str(ROOT / "sim" / "cycle.py"), args.command]
        ).returncode
        if rc != 0:
            print(f"[catchup] pass failed (exit {rc}); stopping. Remaining "
                  f"passes retry on the next scheduled run.", flush=True)
            return rc
        state[args.command] = time.time()
        STATE.write_text(json.dumps(state, indent=2) + "\n")
        if i + 1 < total:
            time.sleep(5)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
