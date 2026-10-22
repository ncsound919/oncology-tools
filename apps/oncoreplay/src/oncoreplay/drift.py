"""Cohort-level knowledge drift: re-run a fixed cohort under two snapshots, same policy."""
from __future__ import annotations

from collections import Counter
from typing import Any

from .engine import evaluate
from .policy import Policy
from .snapshot import Snapshot


def cohort_drift(cases: list[dict[str, Any]], s0: Snapshot, s1: Snapshot, pol: Policy) -> dict[str, Any]:
    transitions: Counter[str] = Counter()
    changed, act0, act1 = [], 0, 0
    for case in sorted(cases, key=lambda c: c["case_id"]):
        d0, d1 = evaluate(case, s0, pol), evaluate(case, s1, pol)
        act0 += d0["actionable"]
        act1 += d1["actionable"]
        v0 = {(v["gene"], v["variant"]): v for v in d0["variants"]}
        v1 = {(v["gene"], v["variant"]): v for v in d1["variants"]}
        case_changed = False
        for k in sorted(v0):
            a, b = v0[k], v1[k]
            drugs_a = sorted({r["drug"] for r in a["recommendations"]})
            drugs_b = sorted({r["drug"] for r in b["recommendations"]})
            if a["tier"] != b["tier"]:
                transitions[f"{a['tier']}->{b['tier']}"] += 1
            if a["tier"] != b["tier"] or drugs_a != drugs_b:
                case_changed = True
        if case_changed:
            changed.append(case["case_id"])
    n = len(cases)
    return {
        "snapshot_from": s0.snapshot_id, "snapshot_to": s1.snapshot_id,
        "policy_id": pol.policy_id, "cases": n,
        "changed_cases": changed, "n_changed": len(changed),
        "actionable_from": act0, "actionable_to": act1,
        "tier_transitions": dict(sorted(transitions.items())),
    }
