#!/usr/bin/env python3
"""Score the frozen CIViC cohort with oncoreplay's deterministic engine.

    python scripts/score-civic-cohort.py

Reads platform/data/civic-tier-cohort.json (frozen by the TS emitter, which owns
the CIViC schema) and writes platform/data/civic-tier-readings.json: one row per
AMP-tiered CIViC assertion, carrying CIViC's curated tier and the tier our own
unvalidated policy derives from the same evidence.

What this measures, stated plainly: whether a MECHANICAL level->tier policy plus
the engine's aggregation reproduces how CIViC's CURATORS tiered the same variant.
It is cross-source/policy agreement. It is NOT clinical accuracy, and neither side
is a gold standard - one side is an unvalidated synthetic policy, the other is
community curated.

Every drop is counted, so the scored n can never be read as a silent loss:
  - non-sensitive/non-resistant CIViC directions ("Does Not Support ...") are
    dropped: oncoreplay's vocabulary is {sensitive, resistant}, and quietly
    folding a negative assertion into "sensitive" would be a fabrication;
  - evidence items whose molecular profile is not the case's exact gene+variant
    are dropped (CIViC explicitly allows an assertion to lean on a more general
    MP such as "EGFR Mutation"), counted as `evidence_other_mp`;
  - levels outside A-E are counted and skipped.
"""
from __future__ import annotations

import json
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from oncoreplay.engine import evaluate  # noqa: E402
from oncoreplay.policy import Policy, load_policy  # noqa: E402
from oncoreplay.snapshot import Snapshot, build_snapshot  # noqa: E402

REPO = Path(__file__).resolve().parents[3]
COHORT = REPO / "platform" / "data" / "civic-tier-cohort.json"
OUT = REPO / "platform" / "data" / "civic-tier-readings.json"
POLICIES = {
    "policy-v1": ROOT / "examples" / "policy_v1.json",
    "policy-v2": ROOT / "examples" / "policy_v2.json",
}

# oncoreplay's vocabulary is two-way (sensitive | resistant). CIViC records the
# direction coarsely as SUPPORTS / DOES_NOT_SUPPORT and carries the actual clinical
# meaning in `significance`. So the mapping needs BOTH fields - reading only
# `evidenceDirection`, as this script first did, drops 808 of 808 items and scores
# an empty snapshot, which produces a number while measuring nothing.
#
# Only unambiguous sensitivity/resistance assertions map. A stated non-support
# ("DOES_NOT_SUPPORT") is neither, and oncogenicity / predisposition / prognostic /
# adverse-response evidence says nothing about drug sensitivity, so all of it is
# dropped and counted rather than folded into "sensitive".
_SENSITIVITY = {"SENSITIVITYRESPONSE", "POSITIVE"}
_RESISTANCE = {"RESISTANCE", "REDUCEDSENSITIVITY", "REDUCED_SENSITIVITY"}


def map_direction(direction: str, significance: str) -> str | None:
    """CIViC (evidenceDirection, significance) -> oncoreplay direction, or None."""
    if str(direction).upper().strip() != "SUPPORTS":
        return None  # a stated non-support is neither a supporting nor a resisting claim
    sig = str(significance).upper().replace("_", "").replace(" ", "")
    if sig in {s.replace("_", "").replace(" ", "") for s in _RESISTANCE}:
        return "resistant"
    if sig in {s.replace("_", "").replace(" ", "") for s in _SENSITIVITY}:
        return "sensitive"
    return None


def canon_hash(obj) -> str:
    import hashlib

    return hashlib.sha256(json.dumps(obj, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def main() -> int:
    cohort = json.loads(COHORT.read_text(encoding="utf-8"))
    assertions = cohort["assertions"]

    policies = {name: load_policy(str(path)) for name, path in POLICIES.items()}

    evidence_rows: list[dict] = []
    seen_ids: set[str] = set()
    cases: list[dict] = []
    case_ids: set[str] = set()
    counters: Counter[str] = Counter()

    for a in assertions:
        mp_evidence = 0
        for e in a["evidence"]:
            counters["evidence_items"] += 1
            direction = map_direction(e.get("direction", ""), e.get("significance", "") or "")
            if direction is None:
                # Counted by reason, so the exclusion is visible rather than a
                # silent shrink of n.
                if str(e.get("direction", "")).upper().strip() != "SUPPORTS":
                    counters["dropped_not_supported"] += 1
                else:
                    sig = str(e.get("significance", "")).upper().replace("_", "").replace(" ", "")
                    counters[f"dropped_sig_{sig.lower() or 'null'}"] += 1
                continue
            level = str(e.get("level", "")).upper().strip()
            if level not in ("A", "B", "C", "D", "E"):
                counters["dropped_level"] += 1
                continue
            # Split the EID's own molecular profile: an assertion may lean on a
            # more general MP ("EGFR Mutation"), which must not be scored as if
            # it were the asserted variant. Counted, never folded in.
            name = str(e.get("molecularProfile", "")).strip()
            parts = name.split(None, 1)
            if len(parts) < 2:
                counters["evidence_other_mp"] += 1
                continue
            e_gene, e_alt = parts[0].upper(), parts[1].strip()
            if (e_gene, e_alt) != (a["gene"], a["alteration"]):
                counters["evidence_other_mp"] += 1
                continue
            therapies = e.get("therapies") or []
            if not therapies:
                # No drug means nothing to recommend against; the engine expects
                # one. Counted rather than given a placeholder drug name.
                counters["dropped_no_drug"] += 1
                continue
            for idx, drug in enumerate(therapies):
                eid = f"civic:EID{e['id']}:{idx}"
                if eid in seen_ids:
                    counters["dropped_duplicate_id"] += 1
                    continue
                seen_ids.add(eid)
                evidence_rows.append(
                    {
                        "id": eid,
                        "gene": e_gene,
                        "variant": e_alt,
                        "tumor_type": e.get("disease") or "Unspecified",
                        "drug": drug,
                        "direction": direction,
                        "level": level,
                    }
                )
                mp_evidence += 1

        case_id = f"civic:AID{a['assertionId']}"
        if case_id in case_ids:
            counters["dropped_duplicate_case"] += 1
            continue
        case_ids.add(case_id)
        cases.append(
            {
                "case_id": case_id,
                "tumor_type": a["disease"] or "Unspecified",
                "variants": [{"gene": a["gene"], "variant": a["alteration"]}],
            }
        )
        counters[f"assertion_evidence_rows:{mp_evidence > 0}"] += 1

    snapshot = build_snapshot(
        {
            "snapshot_id": f"civic-{cohort['cohortHash'][:12]}",
            "source": "CIViC (civicdb.org), CC0 1.0 - supporting evidence of AMP-tiered assertions",
            "as_of": cohort["fetchedAt"],
            "evidence": evidence_rows,
            "benign": [],
        }
    )

    readings = []
    for a, case in zip(assertions, cases):
        key = (a["gene"], a["alteration"])
        evidence_rows_for_case = len(snapshot.index.get(key, []))
        row = {
            "caseId": case["case_id"],
            "gene": a["gene"],
            "variant": a["alteration"],
            "disease": a["disease"],
            "civicAmpLevel": a["civicAmpLevel"],
            "civicTierAxis": a["civicTierAxis"],
            # Whether the policy actually decided this case. When no evidence row
            # matches the asserted variant, oncoreplay's engine returns its own
            # default (no_evidence_in_snapshot -> tier III). That default is an
            # engine behaviour, not a policy judgement, so comparing it with
            # CIViC's curated tier would measure the fallback and call it
            # agreement. Such cases are marked unscoreable rather than scored.
            "evidenceRows": evidence_rows_for_case,
            "scoreable": evidence_rows_for_case > 0,
        }
        for name, pol in policies.items():
            decision = evaluate(case, snapshot, pol)
            v = decision["variants"][0]
            row[name] = v["tier"]
            row[f"{name}_recommendations"] = len(v["recommendations"])
        readings.append(row)

    scored = [r for r in readings if r["scoreable"]]
    per_policy: dict[str, dict] = {}
    for name in policies:
        agree_scored = sum(1 for r in scored if r[name] == r["civicTierAxis"])
        agree_all = sum(1 for r in readings if r[name] == r["civicTierAxis"])
        per_policy[name] = {
            "policy_id": policies[name].policy_id,
            "policy_hash": policies[name].hash,
            "agreeOnScored": agree_scored,
            "nScored": len(scored),
            "agreeOnAll": agree_all,
            "nAll": len(readings),
        }

    doc = {
        "cohortId": cohort["cohortId"],
        "cohortHash": cohort["cohortHash"],
        "scoredAt": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(),
        "engine": {
            "module": "apps/oncoreplay/src/oncoreplay/engine.py",
            "snapshot_hash": snapshot.hash,
            "snapshot_evidence": len(evidence_rows),
        },
        # What this is and is not, carried inside the artifact so the label cannot
        # be separated from the number.
        "claim": {
            "measures": "agreement between unvalidated synthetic level->tier policies and CIViC curator-assigned AMP tiers over the same evidence",
            "doesNotMeasure": "clinical correctness; neither arm is a gold standard",
            "scoredDefinition": "scoreable == the asserted variant has >=1 evidence row, so the policy rather than the engine's no_evidence default decided the tier",
        },
        "counts": dict(counters),
        "counts_summary": {
            "assertions_in": len(assertions),
            "assertions_scored": len(readings),
            "assertions_scoreable": len(scored),
            "assertions_defaulted": len(readings) - len(scored),
            "evidence_items_seen": counters["evidence_items"],
            "evidence_rows_used": len(evidence_rows),
        },
        "agreement": per_policy,
        "readings": readings,
    }
    doc["readingsHash"] = canon_hash(readings)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(doc, indent=2) + "\n", encoding="utf-8")

    print(f"[score] cohort            : {cohort['cohortId']}")
    print(f"[score] assertions in     : {len(assertions)}")
    print(f"[score] evidence items    : {counters['evidence_items']}")
    for k in sorted(counters):
        print(f"[score]   {k:<28}: {counters[k]}")
    print(f"[score] snapshot evidence : {len(evidence_rows)} rows, hash {snapshot.hash[:12]}")
    print(f"[score] assertions scored : {len(readings)} (scoreable {len(scored)}, defaulted {len(readings)-len(scored)})")
    for name, d in per_policy.items():
        print(
            f"[score] {name:<14} ({d['policy_id']}): "
            f"scored {d['agreeOnScored']}/{d['nScored']}  all(incl. default) {d['agreeOnAll']}/{d['nAll']}"
        )
    print(f"[score] wrote             : {OUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
