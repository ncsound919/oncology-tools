from __future__ import annotations

import argparse
import json
import sys

from .drift import cohort_drift
from .engine import evaluate
from .policy import load_policy
from .records import RecordStore
from .replay import attribute
from .snapshot import load_snapshot
from .verify import check_claims


def _load(path):
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def _out(obj) -> None:
    print(json.dumps(obj, indent=2, sort_keys=True))


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="oncoreplay", description="Research use only.")
    sub = ap.add_subparsers(dest="cmd", required=True)

    d = sub.add_parser("decide", help="evaluate a case and record it")
    d.add_argument("--case", required=True); d.add_argument("--snapshot", required=True)
    d.add_argument("--policy", required=True); d.add_argument("--records", required=True)

    a = sub.add_parser("attribute", help="attribute changes to knowledge vs policy (2x2 replay)")
    a.add_argument("--case", required=True)
    a.add_argument("--snapshot-old", required=True); a.add_argument("--snapshot-new", required=True)
    a.add_argument("--policy-old", required=True); a.add_argument("--policy-new", required=True)

    f = sub.add_parser("drift", help="cohort drift between two snapshots under one policy")
    f.add_argument("--cases", required=True)
    f.add_argument("--snapshot-old", required=True); f.add_argument("--snapshot-new", required=True)
    f.add_argument("--policy", required=True)

    v = sub.add_parser("verify-records", help="re-hash every record (content tampering only)")
    v.add_argument("--records", required=True)

    c = sub.add_parser("check-claims", help="fail-closed check of claims against recorded decisions")
    c.add_argument("--claims", required=True); c.add_argument("--records", required=True)

    args = ap.parse_args(argv)
    if args.cmd == "decide":
        dec = evaluate(_load(args.case), load_snapshot(args.snapshot), load_policy(args.policy))
        RecordStore(args.records).append("decision", dec)
        _out(dec)
    elif args.cmd == "attribute":
        _out(attribute(_load(args.case), load_snapshot(args.snapshot_old), load_snapshot(args.snapshot_new),
                       load_policy(args.policy_old), load_policy(args.policy_new)))
    elif args.cmd == "drift":
        _out(cohort_drift(_load(args.cases), load_snapshot(args.snapshot_old),
                          load_snapshot(args.snapshot_new), load_policy(args.policy)))
    elif args.cmd == "verify-records":
        ok, msg = RecordStore(args.records).verify_records()
        _out({"ok": ok, "message": msg,
              "note": "content integrity only; ordering integrity requires the ecosystem chain "
                      "(evidence/evidence_gate.py) and an externally published hash"})
        return 0 if ok else 2
    elif args.cmd == "check-claims":
        res = check_claims(_load(args.claims), RecordStore(args.records))
        _out(res)
        return 0 if all(r["status"] == "supported" for r in res) else 1
    return 0


if __name__ == "__main__":
    sys.exit(main())