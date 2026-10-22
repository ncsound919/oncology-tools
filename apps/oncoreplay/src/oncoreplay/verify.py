"""Fail-closed claim verification: check any agent's (or human's) statements
against recorded decisions.

A claim with no matching recorded decision is `unverifiable`, never `supported`.

A claim may pin `snapshot_id`, `policy_id`, or both. Pinning both is the only way
to assert "this was true under this knowledge AND these rules". Pinning the
snapshot alone cannot separate a knowledge change from a policy change, which is
the question oncoreplay exists to answer.
"""
from __future__ import annotations

from typing import Any

from .records import RecordStore


def check_claims(claims: list[dict[str, Any]], store: RecordStore) -> list[dict[str, Any]]:
    ok, msg = store.verify_records()
    if not ok:
        return [{"claim": c, "status": "unverifiable",
                 "reason": f"record store failed verification: {msg}"} for c in claims]
    history: dict[str, list[dict[str, Any]]] = {}
    for d in store.decisions():
        history.setdefault(d["case_id"], []).append(d)
    return [{"claim": c, **_check(c, history)} for c in claims]


def _select(decisions: list[dict[str, Any]], c: dict[str, Any]):
    """Return (chosen, None) or (None, reason). Latest wins within a match."""
    snap, pol = c.get("snapshot_id"), c.get("policy_id")
    if snap is None and pol is None:
        return decisions[-1], None
    matched = [
        d for d in decisions
        if (snap is None or d.get("snapshot_id") == snap)
        and (pol is None or d.get("policy_id") == pol)
    ]
    if not matched:
        return None, f"no decision recorded under snapshot={snap} policy={pol}"
    return matched[-1], None


def _check(c: dict[str, Any], history: dict[str, list[dict[str, Any]]]) -> dict[str, str]:
    decisions = history.get(c.get("case_id", ""))
    if not decisions:
        return {"status": "unverifiable", "reason": "no recorded decision for case"}
    latest = decisions[-1]
    d, err = _select(decisions, c)
    if d is None:
        return {"status": "unverifiable", "reason": err}

    v = next((x for x in d["variants"]
              if (x["gene"], x["variant"]) == (c.get("gene"), c.get("variant"))), None)
    if v is None:
        return {"status": "unverifiable", "reason": "variant not present in recorded decision"}

    kind = c.get("claim")
    if kind == "tier":
        holds = v["tier"] == c.get("value")
        detail = f"recorded tier is {v['tier']}"
    elif kind == "recommends":
        drugs = sorted({r["drug"] for r in v["recommendations"]})
        holds = c.get("drug") in drugs
        detail = f"recorded recommendations: {drugs}"
    else:
        return {"status": "unverifiable", "reason": f"unknown claim type {kind!r}"}

    if not holds:
        return {"status": "contradicted", "reason": detail}

    if d is not latest:
        axis = " and ".join(
            f"{k} ({d.get(k)} -> {latest.get(k)})"
            for k in ("snapshot_id", "policy_id") if d.get(k) != latest.get(k)
        ) or "recording order"
        return {"status": "stale",
                "reason": (f"holds under {d['snapshot_id']}/{d['policy_id']} but was "
                           f"superseded on {axis}")}

    return {"status": "supported",
            "reason": f"decision {d['decision_hash'][:12]} ({d['snapshot_id']}/{d['policy_id']}): {detail}"}