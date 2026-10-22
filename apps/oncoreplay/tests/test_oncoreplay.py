import json
import os

import pytest

from oncoreplay import __version__
from oncoreplay.canon import sha256
from oncoreplay.drift import cohort_drift
from oncoreplay.engine import evaluate
from oncoreplay.policy import PolicyError, build_policy, load_policy
from oncoreplay.records import RecordStore
from oncoreplay.replay import attribute, classify
from oncoreplay.snapshot import SnapshotError, build_snapshot, load_snapshot
from oncoreplay.verify import check_claims

EX = os.path.join(os.path.dirname(__file__), "..", "examples")


def ex(name):
    return os.path.join(EX, name)


@pytest.fixture
def world():
    cases = json.load(open(ex("cases.json")))
    return {
        "cases": {c["case_id"]: c for c in cases},
        "s24": load_snapshot(ex("snapshot_2024.json")),
        "s26": load_snapshot(ex("snapshot_2026.json")),
        "p1": load_policy(ex("policy_v1.json")),
        "p2": load_policy(ex("policy_v2.json")),
    }


def tier_of(dec, gene):
    return next(v["tier"] for v in dec["variants"] if v["gene"] == gene)


def test_determinism_same_inputs_same_hash(world):
    a = evaluate(world["cases"]["case-001"], world["s24"], world["p1"])
    b = evaluate(world["cases"]["case-001"], world["s24"], world["p1"])
    assert a["decision_hash"] == b["decision_hash"]
    assert a == b


def test_variant_order_does_not_change_hash(world):
    c = world["cases"]["case-001"]
    rev = dict(c, variants=list(reversed(c["variants"])))
    # case_hash differs (input differs) but per-variant output is order-independent
    a = evaluate(c, world["s24"], world["p1"])["variants"]
    b = evaluate(rev, world["s24"], world["p1"])["variants"]
    assert a == b


def test_basic_tiers_and_benign(world):
    d = evaluate(world["cases"]["case-001"], world["s24"], world["p1"])
    assert tier_of(d, "ONC1") == "II"
    assert tier_of(d, "ONC4") == "IV"
    assert d["actionable"] is True


def test_offlabel_shift(world):
    d = evaluate(world["cases"]["case-002"], world["s26"], world["p1"])
    onc5 = next(v for v in d["variants"] if v["gene"] == "ONC5")
    assert onc5["tier"] == "II"  # level A -> I, off-label shifted one tier
    assert onc5["recommendations"][0]["offlabel"] is True


def test_resistance_blocks_recommendation():
    snap = build_snapshot({
        "snapshot_id": "t", "source": "t", "as_of": "2026-01-01", "benign": [],
        "evidence": [
            {"id": "S", "gene": "G", "variant": "v", "tumor_type": "T", "drug": "d", "direction": "sensitive", "level": "A"},
            {"id": "R", "gene": "G", "variant": "v", "tumor_type": "T", "drug": "d", "direction": "resistant", "level": "B"},
        ]})
    pol = build_policy({"policy_id": "p", "level_tier": {"A": "I", "B": "I", "C": "II", "D": "II", "E": "III"},
                        "offlabel_penalty": 1, "resistance_blocks_levels": ["B"], "recommend_tiers": ["I", "II"]})
    d = evaluate({"case_id": "c", "tumor_type": "T", "variants": [{"gene": "G", "variant": "v"}]}, snap, pol)
    assert d["variants"][0]["recommendations"] == []
    assert d["variants"][0]["resistance_flags"][0]["drug"] == "d"


def test_snapshot_hash_is_order_independent_and_content_sensitive(world):
    raw = json.load(open(ex("snapshot_2024.json")))
    shuffled = dict(raw, evidence=list(reversed(raw["evidence"])))
    assert build_snapshot(raw).hash == build_snapshot(shuffled).hash
    raw["evidence"][0]["level"] = "B"
    assert build_snapshot(raw).hash != world["s24"].hash


def test_validation_rejects_bad_input():
    with pytest.raises(SnapshotError):
        build_snapshot({"snapshot_id": "x"})
    with pytest.raises(PolicyError):
        build_policy({"policy_id": "x", "level_tier": {"A": "IV", "B": "I", "C": "I", "D": "I", "E": "I"},
                      "offlabel_penalty": 1, "resistance_blocks_levels": [], "recommend_tiers": []})


def test_floats_rejected_in_hashed_data():
    # 1.5 is a deliberate bad-value probe, not an unsourced constant. The
    # evidence-gate HARDCODED_VALUE warning this line produces is expected: a
    # static scanner cannot tell a probe from a constant. Do not "fix" it by
    # substituting a record ID -- the point of the test is the bare literal.
    with pytest.raises(ValueError):
        sha256({"x": 1.5})


def test_classify_matrix():
    assert classify(1, 1, 1, 1) is None
    assert classify(1, 2, 1, 2) == "knowledge"
    assert classify(1, 1, 2, 2) == "policy"
    assert classify(1, 2, 2, 2) == "overdetermined"
    assert classify(1, 2, 3, 1) == "offsetting"
    assert classify(1, 2, 3, 4) == "interaction"


def test_attribution_knowledge_only(world):
    r = attribute(world["cases"]["case-002"], world["s24"], world["s26"], world["p1"], world["p1"])
    causes = {(c["gene"], c["facet"]): c["cause"] for c in r["changes"]}
    assert causes[("ONC5", "tier")] == "knowledge"
    assert causes[("ONC5", "recommended_drugs")] == "knowledge"


def test_attribution_policy_only(world):
    r = attribute(world["cases"]["case-001"], world["s24"], world["s24"], world["p1"], world["p2"])
    causes = {(c["gene"], c["facet"]): c["cause"] for c in r["changes"]}
    assert causes[("ONC1", "tier")] == "policy"


def test_attribution_interaction(world):
    r = attribute(world["cases"]["case-001"], world["s24"], world["s26"], world["p1"], world["p2"])
    causes = {(c["gene"], c["facet"]): c["cause"] for c in r["changes"]}
    assert causes[("ONC1", "tier")] == "interaction"
    assert causes[("ONC1", "recommended_drugs")] in ("offsetting", "interaction", "overdetermined")


def test_cohort_drift(world):
    r = cohort_drift(list(world["cases"].values()), world["s24"], world["s26"], world["p1"])
    assert r["n_changed"] == 3
    assert (r["actionable_from"], r["actionable_to"]) == (2, 3)
    assert r["tier_transitions"]["III->I"] == 1  # case-003 ONC5, on-label


# ---------------------------------------------------------------- engine record

def test_decision_records_engine_version(world):
    """Without engine_version in the record, two builds producing different
    answers are indistinguishable in the store."""
    d = evaluate(world["cases"]["case-001"], world["s24"], world["p1"])
    assert d["engine_version"] == __version__


def test_engine_version_changes_decision_hash(world):
    """engine_version is inside the hashed payload, so it is load-bearing."""
    d = evaluate(world["cases"]["case-001"], world["s24"], world["p1"])
    forged = dict(d, engine_version="9.9.9")
    assert sha256({k: forged[k] for k in d if k != "decision_hash"}) != d["decision_hash"]


# ---------------------------------------------------------------- record store

def test_record_store_detects_content_tampering(world, tmp_path):
    st = RecordStore(str(tmp_path / "r.jsonl"))
    st.append("decision", evaluate(world["cases"]["case-001"], world["s24"], world["p1"]))
    assert st.verify_records() == (True, "ok")
    text = open(st.path).read()
    assert "drugA" in text  # guard: the tamper below must actually change something
    open(st.path, "w").write(text.replace("drugA", "drugQ"))
    ok, msg = st.verify_records()
    assert not ok and "tampered" in msg


def test_record_store_is_reproducible(world, tmp_path):
    def build(p):
        st = RecordStore(str(p))
        st.append("decision", evaluate(world["cases"]["case-001"], world["s24"], world["p1"]))
        return open(p).read()
    assert build(tmp_path / "a.jsonl") == build(tmp_path / "b.jsonl")


def test_record_store_does_not_detect_reordering(world, tmp_path):
    """Pins the honest limit: there is no prev-link, so order is not integrity
    checked. That is the ecosystem chain's job (evidence/evidence_gate.py).

    If this test ever starts failing because a chain was added here, the fix is
    to delete the chain from this file, not to weaken the assertion -- a second
    hash chain in the repo is the bug.
    """
    st = RecordStore(str(tmp_path / "r.jsonl"))
    st.append("decision", evaluate(world["cases"]["case-001"], world["s24"], world["p1"]))
    st.append("decision", evaluate(world["cases"]["case-002"], world["s24"], world["p1"]))
    entries = st.entries()
    assert len(entries) == 2
    with open(st.path, "w") as fh:
        for e in reversed(entries):
            fh.write(json.dumps(e, sort_keys=True, separators=(",", ":")) + "\n")
    ok, msg = st.verify_records()
    assert ok and msg == "ok"  # reordering is NOT detected, by design


# ---------------------------------------------------------------- claims

def test_claims_fail_closed_and_snapshot_pinning(world, tmp_path):
    st = RecordStore(str(tmp_path / "r.jsonl"))
    st.append("decision", evaluate(world["cases"]["case-001"], world["s24"], world["p1"]))
    base = {"case_id": "case-001", "gene": "ONC1", "variant": "p.X1Y"}
    res = check_claims([
        dict(base, claim="tier", value="II"),
        dict(base, claim="tier", value="I"),
        dict(base, claim="recommends", drug="drugZ"),
        dict(base, claim="tier", value="II", snapshot_id="SYNTHETIC-KB-2026"),
        {"case_id": "nope", "gene": "G", "variant": "v", "claim": "tier", "value": "I"},
        dict(base, claim="mystery"),
    ], st)
    assert [r["status"] for r in res] == ["supported", "contradicted", "contradicted",
                                          "unverifiable", "unverifiable", "unverifiable"]


def test_claim_pinned_to_snapshot_and_policy(world, tmp_path):
    """Regression. A claim could only pin snapshot_id, so pinning selected the
    LAST decision under that snapshot -- a claim true under policy v1 came back
    `contradicted` because policy v2 was recorded after it under the same
    knowledge. That makes the knowledge-vs-policy question unanswerable in claim
    space, which is the one question oncoreplay exists to answer.
    """
    st = RecordStore(str(tmp_path / "r.jsonl"))
    st.append("decision", evaluate(world["cases"]["case-001"], world["s24"], world["p1"]))
    st.append("decision", evaluate(world["cases"]["case-001"], world["s24"], world["p2"]))
    assert tier_of(evaluate(world["cases"]["case-001"], world["s24"], world["p1"]), "ONC1") == "II"
    assert tier_of(evaluate(world["cases"]["case-001"], world["s24"], world["p2"]), "ONC1") == "III"
    base = {"case_id": "case-001", "gene": "ONC1", "variant": "p.X1Y", "claim": "tier"}
    res = check_claims([
        dict(base, value="II", snapshot_id="SYNTHETIC-KB-2024", policy_id="synthetic-policy-v1"),
        dict(base, value="III", snapshot_id="SYNTHETIC-KB-2024", policy_id="synthetic-policy-v2-strict"),
        dict(base, value="II"),   # unpinned: judged against the latest decision
    ], st)
    # The claim true under (2024, v1) resolves to its own pinned decision and is
    # `stale` (a newer decision exists) -- it must NOT be `contradicted`, which
    # is what pinning-by-snapshot-only produced.
    assert [r["status"] for r in res] == ["stale", "supported", "contradicted"]
    assert res[0]["status"] != "contradicted"


def test_claim_stale_names_the_policy_axis(world, tmp_path):
    st = RecordStore(str(tmp_path / "r.jsonl"))
    st.append("decision", evaluate(world["cases"]["case-001"], world["s24"], world["p1"]))
    st.append("decision", evaluate(world["cases"]["case-001"], world["s24"], world["p2"]))
    r = check_claims([{
        "case_id": "case-001", "gene": "ONC1", "variant": "p.X1Y", "claim": "tier", "value": "II",
        "snapshot_id": "SYNTHETIC-KB-2024", "policy_id": "synthetic-policy-v1",
    }], st)[0]
    assert r["status"] == "stale"
    assert "policy_id" in r["reason"]


def test_superseded_claims_are_stale_not_supported(world, tmp_path):
    st = RecordStore(str(tmp_path / "r.jsonl"))
    st.append("decision", evaluate(world["cases"]["case-001"], world["s24"], world["p1"]))
    st.append("decision", evaluate(world["cases"]["case-001"], world["s26"], world["p1"]))
    base = {"case_id": "case-001", "gene": "ONC1", "variant": "p.X1Y", "claim": "tier"}
    res = check_claims([
        dict(base, value="II", snapshot_id="SYNTHETIC-KB-2024"),  # true then, superseded now
        dict(base, value="I", snapshot_id="SYNTHETIC-KB-2026"),   # true and current
        dict(base, value="II"),                                   # unpinned: judged against latest
        dict(base, value="I", snapshot_id="SYNTHETIC-KB-2024"),   # false even then
    ], st)
    assert [r["status"] for r in res] == ["stale", "supported", "contradicted", "contradicted"]


def test_claims_unverifiable_when_record_tampered(world, tmp_path):
    st = RecordStore(str(tmp_path / "r.jsonl"))
    st.append("decision", evaluate(world["cases"]["case-001"], world["s24"], world["p1"]))
    text = open(st.path).read()
    assert "drugA" in text  # guard: the tamper below must actually change something
    open(st.path, "w").write(text.replace("drugA", "drugQ"))
    assert st.verify_records()[0] is False
    res = check_claims([{"case_id": "case-001", "gene": "ONC1", "variant": "p.X1Y",
                         "claim": "tier", "value": "II"}], st)
    assert res[0]["status"] == "unverifiable"
    assert "failed verification" in res[0]["reason"]


# ---------------------------------------------------------------- aggregation

def test_best_tier_across_multiple_evidence_items():
    snap = build_snapshot({
        "snapshot_id": "t", "source": "t", "as_of": "2026-01-01", "benign": [],
        "evidence": [
            {"id": "X1", "gene": "G", "variant": "v", "tumor_type": "T", "drug": "d1", "direction": "sensitive", "level": "D"},
            {"id": "X2", "gene": "G", "variant": "v", "tumor_type": "T", "drug": "d2", "direction": "sensitive", "level": "A"},
        ]})
    pol = build_policy({"policy_id": "p", "level_tier": {"A": "I", "B": "I", "C": "II", "D": "II", "E": "III"},
                        "offlabel_penalty": 1, "resistance_blocks_levels": [], "recommend_tiers": ["I", "II"]})
    d = evaluate({"case_id": "c", "tumor_type": "T", "variants": [{"gene": "G", "variant": "v"}]}, snap, pol)
    v = d["variants"][0]
    assert v["tier"] == "I"
    assert [r["drug"] for r in v["recommendations"]] == ["d1", "d2"]  # both kept, sorted by drug


# ------------------------------------------------- aggregation is policy data

def _agg_snap():
    return build_snapshot({
        "snapshot_id": "t", "source": "t", "as_of": "2026-01-01", "benign": [],
        "evidence": [
            {"id": "S1", "gene": "G", "variant": "v", "tumor_type": "T", "drug": "d1", "direction": "sensitive", "level": "A"},
            {"id": "S2", "gene": "G", "variant": "v", "tumor_type": "T", "drug": "d2", "direction": "sensitive", "level": "E"},
            {"id": "S3", "gene": "G", "variant": "v", "tumor_type": "T", "drug": "d3", "direction": "sensitive", "level": "E"},
        ]})


_AGG_BASE = {"policy_id": "p", "level_tier": {"A": "I", "B": "I", "C": "II", "D": "II", "E": "III"},
             "offlabel_penalty": 1, "resistance_blocks_levels": [], "recommend_tiers": ["I", "II"]}


def test_aggregation_rule_is_load_bearing_not_decorative():
    """F3/F4: the policy field must change the OUTCOME, not just exist.

    One Level A against two Level E. Under the old hard-coded optimistic max this
    was tier I; under the default rule it is III. If both policies give the same
    tier, the field is decoration and the defect is not fixed.
    """
    snap = _agg_snap()
    case = {"case_id": "c", "tumor_type": "T", "variants": [{"gene": "G", "variant": "v"}]}
    default_pol = build_policy(dict(_AGG_BASE))
    optimistic_pol = build_policy(dict(_AGG_BASE, aggregation="best"))

    assert default_pol.data["aggregation"] == "best_supported"
    assert evaluate(case, snap, default_pol)["variants"][0]["tier"] == "III"
    assert evaluate(case, snap, optimistic_pol)["variants"][0]["tier"] == "I"
    # The rule is inside the hashed policy, so the two are distinguishable.
    assert default_pol.hash != optimistic_pol.hash


def test_aggregation_default_is_the_documented_one():
    """A policy that omits the field gets the safer rule, and says so in its trace."""
    pol = build_policy(dict(_AGG_BASE))
    d = evaluate({"case_id": "c", "tumor_type": "T", "variants": [{"gene": "G", "variant": "v"}]}, _agg_snap(), pol)
    assert pol.data["aggregation"] == "best_supported"
    assert any("aggregation=best_supported" in line for line in d["variants"][0]["trace"])


def test_unknown_aggregation_is_rejected():
    with pytest.raises(PolicyError):
        build_policy(dict(_AGG_BASE, aggregation="majority_vote"))