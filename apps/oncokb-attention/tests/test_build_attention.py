"""Offline tests for build_attention pure logic + adapters. No network.

Run with: python -m unittest discover -s tests -v
"""
import sys
import unittest
from pathlib import Path
from unittest import mock

import pandas as pd

WORKFLOW = Path(__file__).resolve().parent.parent / "workflow"
sys.path.insert(0, str(WORKFLOW))

import build_attention as ba


class FrameTests(unittest.TestCase):
    def test_long_form_two_measures_per_gene(self):
        genes = {"HGNC:1": "BRAF", "HGNC:2": "TP53"}
        frame = ba.build_attention_frame(genes, {"BRAF": 10.0, "TP53": 20.0},
                                         {"BRAF": 3.0, "TP53": 4.0}, "2020-01-01")
        self.assertEqual(len(frame), 4)
        self.assertEqual(set(frame["measure"]), {"openalex_concept", "pubtator_gene"})
        self.assertTrue((frame["oncotree_code"].isna()).all())
        self.assertTrue((frame["asof_date"] == pd.Timestamp("2020-01-01")).all())
        self.assertEqual(set(frame["gene_id"]), {"HGNC:1", "HGNC:2"})

    def test_missing_measure_omitted(self):
        frame = ba.build_attention_frame({"HGNC:1": "BRAF"}, {"BRAF": 1.0}, {}, "2020-01-01")
        self.assertEqual(frame["measure"].tolist(), ["openalex_concept"])


class AdapterTests(unittest.TestCase):
    def test_openalex_count(self):
        cache = mock.MagicMock()
        with mock.patch.object(ba, "fetch_json", return_value={"meta": {"count": 42}}):
            self.assertEqual(ba.openalex_symbol_count(cache, "BRAF", "2020-01-01",
                                                      "https://api.openalex.org"), 42.0)

    def test_openalex_missing_count_raises(self):
        cache = mock.MagicMock()
        with mock.patch.object(ba, "fetch_json", return_value={"meta": {}}):
            with self.assertRaises(ba.FetchError):
                ba.openalex_symbol_count(cache, "BRAF", "2020-01-01", "x")

    def test_pubmed_count(self):
        cache = mock.MagicMock()
        with mock.patch.object(ba, "fetch_json",
                               return_value={"esearchresult": {"count": "7"}}):
            with mock.patch.object(ba.time, "sleep"):
                self.assertEqual(ba.pubmed_symbol_count(cache, "BRAF", "2020-01-01",
                                                        "x", "e@x.org"), 7.0)

    def test_measure_partition(self):
        self.assertTrue(ba.GENE_LEVEL_MEASURES.isdisjoint(ba.PAIR_LEVEL_MEASURES))
        self.assertIn("cooc_ratio", ba.PAIR_LEVEL_MEASURES)


if __name__ == "__main__":
    unittest.main()
