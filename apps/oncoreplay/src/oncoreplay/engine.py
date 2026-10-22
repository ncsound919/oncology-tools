"""Pure, deterministic evaluator: (case, snapshot, policy) -> decision with full rule trace.

No clocks, no randomness, no network, no model calls. Same inputs always give the same
decision_hash. That property is what makes replay, attribution and verification possible.

Fixed 2026-10-13 (four audited defects, see tests/test_seeded_faults.py):

  F1  Resistant evidence no longer contributes to the actionability tier. It used to be
      appended to `tiers` before the direction check, so a single Level A *resistant*
      assertion produced tier I with no recommendation - the tier asserted actionability
      from evidence that means the opposite.
  F2  A benign declaration that contradicts real evidence now records the contradiction.
      It used to early-return tier IV with a one-line trace, silently flattening an
      unresolved conflict into a decided answer.
  F3  Aggregation is read from the policy, not hard-coded here. `_best` and the tier cap
      were engine constants, so changing how evidence combines changed every decision
      hash and destroyed attribution.
  F4  The policy carries an `aggregation` field, so the rule is versioned and attributable.
"""
from __future__ import annotations

from collections import Counter
from typing import Any

from . import __version__
from .canon import sha256
from .policy import TIERS, Policy
from .snapshot import Snapshot


def _shift(tier: str, penalty: int) -> str:
    """Move a tier toward 'less certain', capped at III. Evidence never implies benign (IV)."""
    return TIERS[min(TIERS.index(tier) + penalty, 2)]


def aggregate(tiers: list[str], rule: str) -> str:
    """Combine per-evidence tiers into the variant's actionability tier.

    Selected by policy, never hard-coded here, so a change to how evidence combines is
    a versioned policy edit with its own hash rather than an engine edit that silently
    changes every decision hash.

    - ``best``: optimistic maximum -- the most actionable tier present. Simple, and the
      behaviour this engine used to hard-code.
    - ``best_supported``: the tier carried by the most evidence items, ties resolving
      toward the more actionable tier. This is the default because ``best`` lets one
      strong assertion outvote any amount of weaker disagreement, which is how a single
      Level A comes to overrule two Level Es.
    """
    if not tiers:
        raise ValueError("aggregate() requires at least one tier")
    if rule == "best":
        return min(tiers, key=TIERS.index)
    if rule == "best_supported":
        counts = Counter(tiers)
        top = max(counts.values())
        return min((t for t, c in counts.items() if c == top), key=TIERS.index)
    raise ValueError(f"unknown aggregation rule: {rule!r}")


def evaluate(case: dict[str, Any], snap: Snapshot, pol: Policy) -> dict[str, Any]:
    for key in ("case_id", "tumor_type", "variants"):
        if key not in case:
            raise ValueError(f"case missing required key: {key}")
    p = pol.data
    rule = p["aggregation"]
    out_variants = []
    for v in sorted(case["variants"], key=lambda x: (x["gene"], x["variant"])):
        key = (v["gene"], v["variant"])
        trace: list[str] = []
        recs: list[dict[str, Any]] = []
        resistance_flags: list[dict[str, Any]] = []
        conflicts: list[dict[str, Any]] = []
        evidence = snap.index.get(key, [])

        if key in snap.benign:
            # F2: a benign declaration is authoritative, but if it contradicts recorded
            # evidence that contradiction is recorded rather than flattened away.
            if evidence:
                ids = sorted(e["id"] for e in evidence)
                conflicts = [
                    {"evidence_id": e["id"], "direction": e["direction"], "level": e["level"],
                     "drug": e["drug"]}
                    for e in evidence
                ]
                trace.append(
                    f"conflict: benign_in_snapshot contradicts {len(evidence)} evidence "
                    f"item(s) [{', '.join(ids)}]; contradiction recorded, not resolved"
                )
                trace.append("benign_in_snapshot -> tier IV")
            else:
                trace.append("benign_in_snapshot -> tier IV")
            out_variants.append(_variant_out(v, "IV", recs, resistance_flags, trace, conflicts))
            continue

        if not evidence:
            trace.append("no_evidence_in_snapshot -> tier III")
            out_variants.append(_variant_out(v, "III", recs, resistance_flags, trace, conflicts))
            continue

        blocked_drugs: set[str] = set()
        actionability_tiers: list[str] = []
        candidates: list[tuple[dict[str, Any], str, bool]] = []
        for e in evidence:
            offlabel = e["tumor_type"] not in (case["tumor_type"], "any")
            base = p["level_tier"][e["level"]]
            tier = _shift(base, p["offlabel_penalty"]) if offlabel else base
            trace.append(
                f"{e['id']}: level {e['level']} -> {base}"
                + (f", off-label shift -> {tier}" if offlabel and tier != base else "")
                + f" ({e['direction']}, {e['drug']})"
            )
            if e["direction"] == "resistant":
                resistance_flags.append({"drug": e["drug"], "evidence_id": e["id"], "level": e["level"]})
                if e["level"] in p["resistance_blocks_levels"]:
                    blocked_drugs.add(e["drug"])
                    trace.append(f"{e['id']}: resistance at level {e['level']} blocks {e['drug']}")
                # F1: resistant evidence never sets the actionability tier.
                trace.append(f"{e['id']}: resistant evidence does not contribute to actionability tier")
            else:
                candidates.append((e, tier, offlabel))
                actionability_tiers.append(tier)

        for e, tier, offlabel in candidates:
            if e["drug"] in blocked_drugs:
                trace.append(f"{e['id']}: recommendation for {e['drug']} suppressed by resistance rule")
                continue
            if tier in p["recommend_tiers"]:
                recs.append(
                    {"drug": e["drug"], "evidence_id": e["id"], "level": e["level"],
                     "tier": tier, "offlabel": offlabel}
                )
            else:
                trace.append(f"{e['id']}: tier {tier} not in recommend_tiers; no recommendation")
        recs.sort(key=lambda r: (r["drug"], r["evidence_id"]))

        if actionability_tiers:
            variant_tier = aggregate(actionability_tiers, rule)
            trace.append(f"aggregation={rule}: {actionability_tiers} -> {variant_tier}")
        else:
            variant_tier = "III"
            trace.append(
                "no_sensitive_evidence: resistance alone never implies actionability -> tier III"
            )

        out_variants.append(_variant_out(v, variant_tier, recs, resistance_flags, trace, conflicts))

    decision: dict[str, Any] = {
        "case_id": case["case_id"],
        "case_hash": sha256(case),
        "snapshot_id": snap.snapshot_id,
        "snapshot_hash": snap.hash,
        "policy_id": pol.policy_id,
        "policy_hash": pol.hash,
        "engine_version": __version__,
        "variants": out_variants,
        "actionable": any(v["recommendations"] for v in out_variants),
    }
    decision["decision_hash"] = sha256(decision)
    return decision


def _variant_out(v, tier, recs, flags, trace, conflicts=None):
    return {
        "gene": v["gene"],
        "variant": v["variant"],
        "tier": tier,
        "recommendations": recs,
        "resistance_flags": flags,
        "conflicts": conflicts or [],
        "trace": trace,
    }
