"""Run with: python -m unittest discover -s tests -v  (from apps/oncokb-attention/)
Standard library + pandas only. Mirrors the style of evidence/test_evidence_gate.py.
"""
import sys
import unittest
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "workflow"))
from checks import assert_no_leakage


def make_pairs():
    return pd.DataFrame({
        "gene_id": ["HGNC:1", "HGNC:2"],
        "oncotree_code": ["LUAD", "BRCA"],
        "annotation_date": [pd.Timestamp("2021-06-01"), pd.NaT],
    })


def att_row(gene, code, asof, measure="pubtator_gene", value=10.0):
    return {"gene_id": gene, "oncotree_code": code,
            "asof_date": pd.Timestamp(asof), "measure": measure, "value": value}


class LeakageTests(unittest.TestCase):
    def test_lag_violation_detected(self):
        pairs = make_pairs()
        att = pd.DataFrame([att_row("HGNC:1", "LUAD", "2021-05-01")])  # 1 month before ann
        with self.assertRaises(AssertionError):
            assert_no_leakage(pairs, att, lag_months=12, t0="2020-01-01")

    def test_lag_respected_passes_with_summary(self):
        pairs = make_pairs()
        att = pd.DataFrame([
            att_row("HGNC:1", "LUAD", "2020-05-01"),   # 13 months before ann
            att_row("HGNC:2", "BRCA", "2023-01-01"),   # unannotated: no lag constraint
            att_row("HGNC:1", None, "2023-01-01"),     # gene-level: exempt from lag
        ])
        summary = assert_no_leakage(pairs, att, lag_months=12, t0="2020-01-01")
        self.assertEqual(summary["n_pair_level_checked"], 1)
        self.assertEqual(summary["n_gene_level_exempt"], 1)

    def test_snapshot_freeze_enforced(self):
        pairs = make_pairs()
        att = pd.DataFrame([att_row("HGNC:2", "BRCA", "2026-10-10")])
        with self.assertRaises(AssertionError):
            assert_no_leakage(pairs, att, lag_months=12, t0="2020-01-01",
                              snapshot_date="2026-10-09")

    def test_hurdle_after_t0_fails(self):
        pairs = make_pairs()
        att = pd.DataFrame([att_row("HGNC:2", "BRCA", "2021-01-01",
                                    measure="t0_pubtator_gene")])
        with self.assertRaises(AssertionError):
            assert_no_leakage(pairs, att, lag_months=12, t0="2020-01-01")

    def test_hurdle_before_t0_passes(self):
        pairs = make_pairs()
        att = pd.DataFrame([att_row("HGNC:2", "BRCA", "2019-06-01",
                                    measure="t0_pubtator_gene")])
        summary = assert_no_leakage(pairs, att, lag_months=12, t0="2020-01-01")
        self.assertEqual(summary["n_hurdle_checked"], 1)

    def test_require_hurdle_guards_vacuous_pass(self):
        pairs = make_pairs()
        att = pd.DataFrame([att_row("HGNC:2", "BRCA", "2019-06-01")])
        with self.assertRaises(AssertionError):
            assert_no_leakage(pairs, att, lag_months=12, t0="2020-01-01",
                              require_hurdle=True)
        # and without the flag the same input passes (no hurdle rows to check)
        assert_no_leakage(pairs, att, lag_months=12, t0="2020-01-01")


if __name__ == "__main__":
    unittest.main()
