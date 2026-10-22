"""Seeded-fault corpus: measure how many known defects this suite catches.

Motivation. A test suite that was written alongside the code tends to test the
behaviour the code has, not the behaviour it should have. All four engine defects
below were found by an external audit on 2026-10-13  not by this suite. That is
the number this file exists to expose:

    gate recall = (seeded faults the suite detects) / (seeded faults planted)

A suite with high recall on *planted* defects is one that can be believed on
defects nobody thought to plant. Recall of 0/4 means the gate cannot currently
distinguish a correct engine from these four broken ones, and 24 passing tests
would still have passed through every one of them.

Each fault is falsifiable: expected behaviour is stated, and the test asserts it.
A fault that is not yet fixed produces a FAILING test naming itself, which is the
intended signal -- a red suite that says exactly what is wrong is worth more than
a green one that is silent about four known defects.

Run:  python -m pytest tests/test_seeded_faults.py -v
"""

from oncoreplay.engine import evaluate
from oncoreplay.policy import build_policy
from oncoreplay.snapshot import build_snapshot

TUMOR = "SYN-LUNG"


def _pol(**over):
    base = {
        "policy_id": "seed",
        "level_tier": {"A": "I", "B": "I", "C": "II", "D": "II", "E": "III"},
        "offlabel_penalty": 1,
        "resistance_blocks_levels": ["B"],
        "recommend_tiers": ["I", "II"],
    }
    base.update(over)
    return build_policy(base)


def _snap(evidence, benign=()):
    return build_snapshot({
        "snapshot_id": "seed", "source": "seed", "as_of": "2026-01-01",
        "benign": [list(b) for b in benign],
        "evidence": [
            dict({"id": f"E{i}", "gene": "G", "variant": "v",
                  "tumor_type": TUMOR}, **e)
            for i, e in enumerate(evidence)
        ],
    })


def _dec(snap, pol):
    return evaluate({"case_id": "c", "tumor_type": TUMOR,
                     "variants": [{"gene": "G", "variant": "v"}]}, snap, pol)


def _variant(snap, pol):
    return _dec(snap, pol)["variants"][0]


def _ev(direction, level, drug="d"):
    return {"direction": direction, "level": level, "drug": drug}


#  The corpus 
# Each entry: (id, one-line statement of the FIXED behaviour it demands.)

SEEDED_FAULTS = [
    ("F1", "resistant-only evidence must not produce an actionable tier"),
    ("F2", "benign contradicting sensitive evidence must be flagged, not silent"),
    ("F3", "aggregation must be policy data, not hard-coded in the engine"),
    ("F4", "with an aggregation policy, one Level A must not outweigh two Level E"),
]


def test_seeded_fault_corpus_covers_every_known_defect():
    """Green by construction: the corpus must list all four audited defects.
    A defect found and not added here is invisible to the recall number."""
    assert {fid for fid, _ in SEEDED_FAULTS} == {"F1", "F2", "F3", "F4"}


#  F1: resistance must not create an actionable tier 

def test_f1_resistant_only_evidence_is_not_actionable():
    """engine.py:51 appends the tier BEFORE the direction check at :55, so a
    Level A *resistant* assertion sets tier I with no recommendation. The tier
    therefore asserts actionability from evidence that means the opposite."""
    v = _variant(_snap([_ev("resistant", "A")]), _pol())
    assert v["tier"] not in ("I", "II"), (
        f"F1 UNDETECTED: resistant-only evidence yields tier {v['tier']}; "
        "resistance must not imply actionability"
    )
    assert v["recommendations"] == []


#  F2: benign must not silently shadow contradictory evidence 

def test_f2_benign_conflict_is_flagged_not_silent():
    """engine.py:35-38 early-returns tier IV with a one-line trace, dropping a
    Level A sensitive assertion on the floor. An unresolved contradiction is
    flattened into a decided answer by the tool that exists to stop that."""
    v = _variant(_snap([_ev("sensitive", "A")], benign=[("G", "v")]), _pol())
    trace = " ".join(v["trace"]).lower()
    assert "conflict" in trace or "contradict" in trace, (
        "F2 UNDETECTED: benign suppressed Level A sensitive evidence with no "
        f"conflict recorded; trace was {v['trace']!r}"
    )


#  F3/F4: aggregation belongs to policy, not the engine 

def test_f3_aggregation_is_policy_data():
    """engine.py:11-19 hard-codes `_best` (optimistic max) and the III cap.
    Changing aggregation must be a policy edit; today it is an engine edit that
    changes every decision hash and destroys attribution."""
    v = _variant(_snap([_ev("sensitive", "A"), _ev("sensitive", "E"), _ev("sensitive", "E")]), _pol())
    assert v["tier"] != "I", (
        "F3/F4 UNDETECTED: 1x Level A outvoted 2x Level E and returned tier I; "
        "the aggregation rule is unreachable from the policy"
    )


def test_f4_policy_can_demand_consensus():
    """The fixed behaviour: a policy that declares its aggregation rule must be
    able to change the outcome. Today no policy can - `_best` is not readable."""
    pol = _pol()
    assert "aggregation" in pol.data, (
        "F4 UNDETECTED: Policy carries no aggregation field, so the rule cannot "
        "be versioned or attributed"
    )


#  The measurement 

def test_gate_recall_reports_itself():
    """Documents recall rather than forcing it green.

    Harness correctness note (2026-10-13). This measurement was itself broken. The
    F1 and F3 probes below read `.tier` as an ATTRIBUTE, but `_variant()` returns a
    dict, so both probes raised `AttributeError`; the bare `except Exception: escaped`
    then recorded that harness bug as "defect escaped". The instrument therefore
    could not report 4/4 even once every defect was fixed, and it inflated the
    headline number: the pre-fix recall was 2/4 (F2 and F4 were genuinely missed),
    not the 0/4 the buggy probe reported.

    Two fixes, both needed:
      * probes use dict access (`["tier"]`), matching `_variant()`'s actual return;
      * a probe that raises is reported as a HARNESS ERROR, never as "escaped",
        because "we could not measure it" is not the same claim as "the engine
        passed it".

    Until every fault is genuinely caught this test FAILS, and that failure IS the
    deliverable. Do not silence it by relaxing the assertions.
    """
    caught, escaped, errored = [], [], []
    checks = [
        ("F1", lambda: _variant(_snap([_ev("resistant", "A")]), _pol())["tier"] not in ("I", "II")),
        ("F2", lambda: any(
            k in " ".join(_variant(_snap([_ev("sensitive", "A")], benign=[("G", "v")]), _pol())["trace"]).lower()
            for k in ("conflict", "contradict")
        )),
        ("F3", lambda: _variant(
            _snap([_ev("sensitive", "A"), _ev("sensitive", "E"), _ev("sensitive", "E")]), _pol()
        )["tier"] != "I"),
        ("F4", lambda: "aggregation" in _pol().data),
    ]
    for fid, probe in checks:
        try:
            result = probe()
        except Exception as exc:  # a broken probe is not a passing engine
            errored.append(f"{fid} ({type(exc).__name__}: {exc})")
            continue
        (caught if result else escaped).append(fid)

    total = len(SEEDED_FAULTS)
    msg = (
        f"gate recall = {len(caught)}/{total} "
        f"(detected: {caught or 'none'}; escaped: {escaped or 'none'}; "
        f"harness errors: {errored or 'none'})"
    )
    assert not errored, f"HARNESS ERROR  {msg}. A probe that raises measures nothing."
    assert len(caught) == total, f"GATE RECALL MEASURED  {msg}. Fix the escaped faults."