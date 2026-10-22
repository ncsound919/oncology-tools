"""Offline tests for build_biology pure functions. No network.

Run with: python -m unittest discover -s tests -v
"""
import gzip
import sys
import unittest
from pathlib import Path

import pandas as pd

WORKFLOW = Path(__file__).resolve().parent.parent / "workflow"
sys.path.insert(0, str(WORKFLOW))

from build_biology import (
    length_from_ensembl_payload,
    parse_gtex_breadth,
    build_frame,
)


def gct_bytes(rows):
    """rows: list of (ensg, symbol, [tpm,...]) -> GTEx-style .gct.gz bytes."""
    header = ["Name", "Description", "T1", "T2", "T3"]
    lines = ["#1.2", f"{len(rows)}\t3\t5", "\t".join(header)]
    for ensg, sym, vals in rows:
        lines.append("\t".join([ensg, sym] + [str(v) for v in vals]))
    return gzip.compress(("\n".join(lines) + "\n").encode("utf-8"))


class EnsemblTests(unittest.TestCase):
    def test_length(self):
        self.assertEqual(
            length_from_ensembl_payload(
                {"id": "ENSG00000157764", "start": 140719327, "end": 140925199,
                 "biotype": "protein_coding"}),
            205873)

    def test_missing_keys_none(self):
        self.assertIsNone(length_from_ensembl_payload({"id": "x"}))
        self.assertIsNone(length_from_ensembl_payload("not a dict"))


class GtexTests(unittest.TestCase):
    def test_breadth_fraction(self):
        raw = gct_bytes([
            ("ENSG1", "G1", [2.0, 2.0, 0.5]),   # 2/3 tissues >= 1
            ("ENSG2", "G2", [0.0, 0.0, 0.0]),   # 0/3
        ])
        b = parse_gtex_breadth(raw, {"G1", "G2"}, threshold=1.0)
        self.assertAlmostEqual(b["G1"], 2 / 3)
        self.assertEqual(b["G2"], 0.0)

    def test_unknown_symbol_absent(self):
        raw = gct_bytes([("ENSG1", "G1", [2.0, 2.0, 2.0])])
        b = parse_gtex_breadth(raw, {"G1", "NOPE"})
        self.assertIn("G1", b)
        self.assertNotIn("NOPE", b)


class FrameTests(unittest.TestCase):
    def test_drops_genes_without_length_and_reports(self):
        universe = pd.DataFrame({
            "hgnc_id": ["HGNC:1", "HGNC:2"],
            "hugo_symbol": ["G1", "G2"],
        })
        df = build_frame(universe, {"G1": 1000, "G2": None}, {"G1": 0.5, "G2": 0.9})
        self.assertEqual(df["gene_id"].tolist(), ["HGNC:1"])
        self.assertIn("intogen_driver", df.columns)
        self.assertEqual(str(df["intogen_driver"].dtype), "boolean")
        self.assertTrue(df["intogen_driver"].isna().all())

    def test_blocked_columns_null_dtypes(self):
        universe = pd.DataFrame({"hgnc_id": ["HGNC:1"], "hugo_symbol": ["G1"]})
        df = build_frame(universe, {"G1": 1000}, {"G1": 0.5})
        self.assertEqual(str(df["dnds_selection"].dtype), "float64")
        self.assertIsNone(df["pharos_tdl"].iloc[0])


if __name__ == "__main__":
    unittest.main()
