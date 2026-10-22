"""Offline tests for oncokb_client + build_pairs pure logic. No network.

HTTP is monkeypatched; fixtures are hand-shaped (assumed gated shapes are
labelled as such — see build_pairs.normalize_implications).

Run with: python -m unittest discover -s tests -v
"""
import io
import json
import os
import sys
import unittest
from pathlib import Path
from unittest import mock

import pandas as pd

WORKFLOW = Path(__file__).resolve().parent.parent / "workflow"
sys.path.insert(0, str(WORKFLOW))

from oncokb_client import Cache, FetchError, fetch_json
from build_gene_universe import aggregate_gene_universe
from build_pairs import (
    aggregate_pairs,
    date_pairs_first_appearance,
    normalize_implications,
)


def fake_response(payload):
    raw = json.dumps(payload).encode("utf-8")
    resp = mock.MagicMock()
    resp.status = 200
    resp.read.return_value = raw
    resp.__enter__.return_value = resp
    resp.__exit__.return_value = False
    return resp


class ClientTests(unittest.TestCase):
    def test_cache_roundtrip(self):
        import tempfile
        with tempfile.TemporaryDirectory() as d:
            c = Cache(d)
            self.assertIsNone(c.read("k"))
            c.write("k", b'{"a":1}', {"url": "u"})
            self.assertEqual(c.read("k"), b'{"a":1}')

    def test_fetch_uses_cache_without_network(self):
        import tempfile
        with tempfile.TemporaryDirectory() as d:
            c = Cache(d)
            c.write("k", b'{"cached":true}', {"url": "u"})
            with mock.patch("urllib.request.urlopen",
                            side_effect=AssertionError("network touched")):
                self.assertEqual(fetch_json(c, "k", "GET", "http://x"), {"cached": True})

    def test_401_names_token_self_service(self):
        import tempfile
        import urllib.error
        with tempfile.TemporaryDirectory() as d:
            c = Cache(d)
            err = urllib.error.HTTPError("http://x", 401, "Unauthorized", {}, None)
            with mock.patch("urllib.request.urlopen", side_effect=err):
                with self.assertRaises(FetchError) as ctx:
                    fetch_json(c, "k", "GET", "http://x", refresh=True)
            self.assertIn("ONCOKB_TOKEN", str(ctx.exception))


class UniverseTests(unittest.TestCase):
    def test_aggregate_gene_universe(self):
        genes = [
            {"hugoSymbol": "BRAF", "entrezGeneId": 673, "oncokbAnnotated": True,
             "geneType": "ONCOGENE"},
            {"hugoSymbol": "TTN", "entrezGeneId": 7273, "oncokbAnnotated": False,
             "geneType": None},
        ]
        df = aggregate_gene_universe(genes, {673: "HGNC:1097"})
        self.assertEqual(len(df), 2)
        self.assertEqual(df.loc[0, "hgnc_id"], "HGNC:1097")
        self.assertIsNone(df.loc[1, "hgnc_id"])
        self.assertEqual(list(df.columns),
                         ["hugo_symbol", "entrez_id", "hgnc_id",
                          "oncokb_annotated", "gene_type"])

    def test_missing_symbol_rejected(self):
        with self.assertRaises(ValueError):
            aggregate_gene_universe([{"entrezGeneId": 1}], {})

    def test_live_fixture_slice(self):
        """Recorded-live response slices flow through aggregation unchanged."""
        fix = Path(__file__).resolve().parent / "fixtures"
        genes = json.load(open(fix / "oncokb_cancerGeneList_slice.json"))
        mygene = json.load(open(fix / "mygene_slice.json"))
        hgnc = {}
        for rec in mygene:
            hgnc[int(rec["entrezgene"])] = f"HGNC:{rec['HGNC']}"
        df = aggregate_gene_universe(genes, hgnc)
        self.assertEqual(len(df), 3)
        self.assertTrue(df["hgnc_id"].notna().all())
        self.assertEqual(df.set_index("hugo_symbol").loc["ABL1", "hgnc_id"], "HGNC:76")
        self.assertTrue(df.set_index("hugo_symbol").loc["TP53", "oncokb_annotated"])
        tumors = json.load(open(fix / "oncotree_slice.json"))
        self.assertEqual({t["code"] for t in tumors}, {"LUAD", "MEL"})


class NormalizeTests(unittest.TestCase):
    def test_normalize_assumed_shape(self):
        payloads = {"BRAF": {"hugoSymbol": "BRAF", "alterations": [
            {"alteration": "V600E", "oncogenicity": "Oncogenic",
             "therapeuticImplications": [
                 {"cancerType": "MEL", "levelOfEvidence": "LEVEL_1"},
                 {"cancerType": "CRC", "levelOfEvidence": "LEVEL_4"}]},
            {"alteration": "G469A", "oncogenicity": "Likely Oncogenic",
             "therapeuticImplications": []}]}}
        impls = normalize_implications(payloads)
        self.assertEqual(len(impls), 2)
        self.assertEqual(impls[0]["level"], "LEVEL_1")

    def test_shape_mismatch_raises(self):
        with self.assertRaises(FetchError):
            normalize_implications({"BRAF": {"unexpected": []}})


class AggregatePairsTests(unittest.TestCase):
    def test_best_levels_and_tiebreak(self):
        impls = [
            {"gene": "BRAF", "alteration": "V600E", "cancer_type": "MEL",
             "level": "LEVEL_2", "oncogenicity": "Likely Oncogenic"},
            {"gene": "BRAF", "alteration": "V600K", "cancer_type": "MEL",
             "level": "LEVEL_1", "oncogenicity": "Oncogenic"},
            {"gene": "BRAF", "alteration": "V600E", "cancer_type": "MEL",
             "level": "LEVEL_R2", "oncogenicity": "Resistance"},
            {"gene": "EGFR", "alteration": "T790M", "cancer_type": "LUAD",
             "level": "LEVEL_R1", "oncogenicity": "Resistance"},
            {"gene": "X", "alteration": "?", "cancer_type": "MEL",
             "level": "LEVEL_Dx1", "oncogenicity": "Oncogenic"},
            {"gene": "X", "alteration": "?", "cancer_type": "MADEUP",
             "level": "LEVEL_1", "oncogenicity": "Oncogenic"},
        ]
        pairs, skipped, n_no_hgnc = aggregate_pairs(
            impls, {"BRAF": "HGNC:1097", "EGFR": "HGNC:3236"},
            {"MEL", "LUAD"})
        mel = pairs[(pairs["gene_id"] == "HGNC:1097")].iloc[0]
        self.assertEqual(mel["sens_level"], "1")          # best of 1,2
        self.assertEqual(mel["oncogenicity"], "Oncogenic")  # behind top level
        self.assertEqual(mel["res_level"], "R2")
        luad = pairs[pairs["gene_id"] == "HGNC:3236"].iloc[0]
        self.assertIsNone(luad["sens_level"])
        self.assertEqual(luad["res_level"], "R1")
        self.assertEqual(luad["oncogenicity"], "Resistance")
        self.assertEqual(skipped, {"level:LEVEL_Dx1": 1, "cancer:MADEUP": 1})
        self.assertEqual(n_no_hgnc, 0)
        self.assertEqual(set(pairs["hugo_symbol"]), {"BRAF", "EGFR"})


class DatingTests(unittest.TestCase):
    def _pairs(self):
        return pd.DataFrame([
            {"hugo_symbol": "A", "oncotree_code": "LUAD"},
            {"hugo_symbol": "A", "oncotree_code": "BRCA"},
        ])

    def test_first_seen_current_is_censored(self):
        log = [{"version": "v1", "date": "2025-01-01", "genes": {"A": ["LUAD"]}},
               {"version": "v2", "date": "2026-09-30", "genes": {"A": ["LUAD", "BRCA"]}}]
        dated, censored = date_pairs_first_appearance(self._pairs(), log)
        self.assertEqual(dated[("A", "LUAD")], ("2025-01-01", "first-appearance:v1"))
        self.assertIn(("A", "BRCA"), censored)

    def test_inaugural_pull_censors_everything(self):
        log = [{"version": "v1", "date": "2026-09-30", "genes": {"A": ["LUAD", "BRCA"]}}]
        dated, censored = date_pairs_first_appearance(self._pairs(), log)
        self.assertEqual(dated, {})
        self.assertEqual(len(censored), 2)

    def test_empty_log_censors_everything(self):
        dated, censored = date_pairs_first_appearance(self._pairs(), [])
        self.assertEqual(dated, {})
        self.assertEqual(len(censored), 2)


if __name__ == "__main__":
    unittest.main()
