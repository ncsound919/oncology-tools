"""Counterfactual replay and causal attribution of changed answers.

Core idea: when an interpretation changes, was it *knowledge* (new evidence snapshot),
*policy* (new rules), or both? We answer by evaluating the 2x2 grid
(old/new snapshot) x (old/new policy) and classifying each variant's outcome.
"""
from __future__ import annotations

from typing import Any

from .engine import evaluate
from .policy import Policy
from .snapshot import Snapshot


def classify(a00: Any, a10: Any, a01: Any, a11: Any) -> str | None:
    """a<snapshot><policy>: a00=old/old, a10=new snapshot/old policy, a01=old snapshot/new policy,
    a11=new/new. Returns the cause of the change from a00 to a11, or None if nothing changed."""
    if a00 == a10 == a01 == a11:
        return None
    if a00 == a11:
        return "offsetting"      # intermediate cells differ but net answer is unchanged
    if a10 == a01 == a11:
        return "overdetermined"  # either change alone is sufficient
    if a10 == a11 and a01 == a00:
        return "knowledge"
    if a01 == a11 and a10 == a00:
        return "policy"
    return "interaction"         # the effect depends on the combination


def _vmap(decision: dict[str, Any]) -> dict[tuple[str, str], dict[str, Any]]:
    return {(v["gene"], v["variant"]): v for v in decision["variants"]}


def attribute(case: dict[str, Any], s0: Snapshot, s1: Snapshot, p0: Policy, p1: Policy) -> dict[str, Any]:
    d00, d10 = evaluate(case, s0, p0), evaluate(case, s1, p0)
    d01, d11 = evaluate(case, s0, p1), evaluate(case, s1, p1)
    maps = [_vmap(d) for d in (d00, d10, d01, d11)]
    changes = []
    for key in sorted(maps[0]):
        cells = [m[key] for m in maps]
        for facet, fn in (
            ("tier", lambda v: v["tier"]),
            ("recommended_drugs", lambda v: sorted({r["drug"] for r in v["recommendations"]})),
        ):
            vals = [fn(c) for c in cells]
            cause = classify(*vals)
            if cause:
                changes.append({
                    "gene": key[0], "variant": key[1], "facet": facet,
                    "from": vals[0], "to": vals[3], "cause": cause,
                })
    return {
        "case_id": case["case_id"],
        "grid": {"old_old": d00["decision_hash"], "new_snapshot": d10["decision_hash"],
                 "new_policy": d01["decision_hash"], "new_new": d11["decision_hash"]},
        "changes": changes,
    }
