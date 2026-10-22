"""Leakage guards for the annotation-attention study.

Source: Downloads/checks.py. Hardened on integration (2026-10-10):
  1. assert_no_leakage() now also enforces asof_date <= snapshot_date.
     The source never checked the download freeze.
  2. The hurdle-part check was a vacuous pass when no t0_-prefixed measure
     existed (empty selection, .all() on empty == True). It now takes
     require_hurdle: when True, zero hurdle rows raise instead of passing.
  3. Gene-level attention rows (oncotree_code null) cannot join to pair
     annotation dates, so they are exempt from the lag check by construction.
     That exemption is now explicit (and logged as a count) rather than an
     accident of merge-NaN + dropna. Gene-level rows still obey the t0 and
     snapshot-date cutoffs.

Call sites: Snakefile validate rule; tests/test_checks.py.
"""
import pandas as pd


def assert_no_leakage(pairs, attention, lag_months, t0,
                      snapshot_date=None, hurdle_prefix="t0_", require_hurdle=False):
    """Attention must predate annotation by lag_months (annotated pairs),
    must not postdate t0 (the hurdle-part cutoff), and must not postdate
    snapshot_date (the download freeze). Returns a summary dict."""
    attention = attention.copy()
    attention["asof_date"] = pd.to_datetime(attention["asof_date"])

    if snapshot_date is not None:
        snap = pd.Timestamp(snapshot_date)
        bad_snap = attention[attention["asof_date"] > snap]
        assert bad_snap.empty, (
            f"{len(bad_snap)} attention rows postdate snapshot_date {snap.date()}"
        )

    a = attention.merge(pairs[["gene_id", "oncotree_code", "annotation_date"]],
                        on=["gene_id", "oncotree_code"], how="left")
    ann = a.dropna(subset=["annotation_date"]).copy()
    ann["annotation_date"] = pd.to_datetime(ann["annotation_date"])
    limit = ann["annotation_date"] - pd.DateOffset(months=lag_months)
    bad = ann[ann["asof_date"] > limit]
    assert bad.empty, f"{len(bad)} attention rows postdate annotation minus lag"

    hurdle = a[a["measure"].astype(str).str.startswith(hurdle_prefix)]
    if hurdle.empty and require_hurdle:
        raise AssertionError(
            f"require_hurdle=True but no measure starts with {hurdle_prefix!r}"
        )
    if not hurdle.empty:
        assert (hurdle["asof_date"] <= pd.Timestamp(t0)).all(), "hurdle attention after t0"

    return {
        "n_attention": len(attention),
        "n_pair_level_checked": len(ann),
        "n_gene_level_exempt": int(attention["oncotree_code"].isna().sum()),
        "n_hurdle_checked": len(hurdle),
    }


def level_model_eligible(pairs, t0, lag_months):
    """Pairs whose annotation is late enough that pre-t0 surplus is pre-annotation.

    The surplus-attention predictor is gene-level at vintage <= t0, so for pairs
    annotated before t0 + lag it would postdate annotation-minus-lag. Level
    models (sens/res) must subset to these eligible pairs; the hurdle model
    ("annotated at all") is unaffected. Returns the eligible slice.
    """
    cutoff = pd.Timestamp(t0) + pd.DateOffset(months=lag_months)
    elig = pairs[pairs["annotated"]
                 & (pd.to_datetime(pairs["annotation_date"]) >= cutoff)]
    return elig
