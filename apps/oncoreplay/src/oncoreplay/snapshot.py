"""Content-addressed evidence snapshots.

A snapshot is a frozen, offline copy of an evidence knowledge base at a point in time.
Its identity is the hash of its canonical content, so "which knowledge produced this
answer" is never ambiguous. Building snapshots from live sources (CIViC, OncoKB, ...)
is an adapter concern and intentionally out of scope for the core.
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any

from .canon import sha256

LEVELS = ("A", "B", "C", "D", "E")
DIRECTIONS = ("sensitive", "resistant")
_EVIDENCE_KEYS = ("id", "gene", "variant", "tumor_type", "drug", "direction", "level")


class SnapshotError(ValueError):
    pass


@dataclass(frozen=True)
class Snapshot:
    data: dict[str, Any]
    hash: str
    index: dict[tuple[str, str], list[dict[str, Any]]] = field(repr=False)
    benign: frozenset[tuple[str, str]] = field(repr=False)

    @property
    def snapshot_id(self) -> str:
        return self.data["snapshot_id"]


def build_snapshot(data: dict[str, Any]) -> Snapshot:
    for key in ("snapshot_id", "source", "as_of", "evidence", "benign"):
        if key not in data:
            raise SnapshotError(f"snapshot missing required key: {key}")
    seen: set[str] = set()
    evidence = []
    for e in data["evidence"]:
        missing = [k for k in _EVIDENCE_KEYS if k not in e]
        if missing:
            raise SnapshotError(f"evidence {e.get('id', '?')} missing keys: {missing}")
        if e["level"] not in LEVELS:
            raise SnapshotError(f"evidence {e['id']}: bad level {e['level']!r}")
        if e["direction"] not in DIRECTIONS:
            raise SnapshotError(f"evidence {e['id']}: bad direction {e['direction']!r}")
        if e["id"] in seen:
            raise SnapshotError(f"duplicate evidence id: {e['id']}")
        seen.add(e["id"])
        evidence.append(dict(e))
    evidence.sort(key=lambda e: e["id"])
    benign = sorted([list(b) for b in data["benign"]])
    canonical_data = {
        "snapshot_id": data["snapshot_id"],
        "source": data["source"],
        "as_of": data["as_of"],
        "evidence": evidence,
        "benign": benign,
    }
    idx: dict[tuple[str, str], list[dict[str, Any]]] = {}
    for e in evidence:
        idx.setdefault((e["gene"], e["variant"]), []).append(e)
    return Snapshot(
        data=canonical_data,
        hash=sha256(canonical_data),
        index=idx,
        benign=frozenset((b[0], b[1]) for b in benign),
    )


def load_snapshot(path: str) -> Snapshot:
    with open(path, encoding="utf-8") as fh:
        return build_snapshot(json.load(fh))
