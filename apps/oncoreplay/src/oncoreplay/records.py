"""Append-only record store for oncoreplay decisions.

This is **not** a provenance chain. Hash chaining is the ecosystem's job:
`evidence/evidence_gate.py` owns pre-registration chaining and is the only
hash-chained implementation in the repo. oncoreplay must not fork it.

What this store guarantees:

- Each record is self-hashing. `verify_records()` re-hashes every payload and
  detects **content** tampering.
- Records are appended verbatim and never rewritten.

What it deliberately does NOT guarantee:

- **Order.** There is no prev-link, so reordering or deleting a record is not
  detected here. That is the chain's job, not this file's.
- **Existence.** An empty or truncated store verifies clean.

Anyone relying on order integrity must chain this store with
`evidence/evidence_gate.py` and publish the chain hash externally.
"""
from __future__ import annotations

import json
import os
from typing import Any

from .canon import sha256


class RecordStore:
    def __init__(self, path: str):
        self.path = path

    def entries(self) -> list[dict[str, Any]]:
        if not os.path.exists(self.path):
            return []
        with open(self.path, encoding="utf-8") as fh:
            return [json.loads(line) for line in fh if line.strip()]

    def append(self, kind: str, payload: dict[str, Any]) -> dict[str, Any]:
        entry = {"kind": kind, "payload": payload}
        entry["record_hash"] = sha256({k: entry[k] for k in ("kind", "payload")})
        with open(self.path, "a", encoding="utf-8") as fh:
            fh.write(json.dumps(entry, sort_keys=True, separators=(",", ":")) + "\n")
        return entry

    def verify_records(self) -> tuple[bool, str]:
        """Re-hash every record. Detects content tampering only."""
        for i, e in enumerate(self.entries()):
            if "record_hash" not in e:
                return False, f"record {i}: missing record_hash"
            expect = sha256({k: e[k] for k in ("kind", "payload")})
            if e["record_hash"] != expect:
                return False, f"record {i}: content hash mismatch (tampered)"
        return True, "ok"

    def decisions(self) -> list[dict[str, Any]]:
        return [e["payload"] for e in self.entries() if e["kind"] == "decision"]