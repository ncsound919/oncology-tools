"""Schema-contract tests. Skip gracefully when pandera is not installed.

Run with: python -m unittest discover -s tests -v
"""
import sys
import unittest
from pathlib import Path

try:
    import pandas as pd
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "workflow"))
    import schemas
    HAS_DEPS = True
except ImportError:
    HAS_DEPS = False


@unittest.skipUnless(HAS_DEPS, "pandera/pandas not installed")
class SchemaContractTests(unittest.TestCase):
    def test_measure_allowlist_rejects_unknown(self):
        import pandera.errors
        bad = pd.DataFrame([{
            "gene_id": "HGNC:1", "oncotree_code": "LUAD",
            "asof_date": pd.Timestamp("2019-01-01"),
            "measure": "google_scholar_vibes", "value": 1.0}])
        with self.assertRaises(pandera.errors.SchemaError):
            schemas.attention.validate(bad)

    def test_measure_allowlist_accepts_config_measures(self):
        ok = pd.DataFrame([{
            "gene_id": "HGNC:1", "oncotree_code": None,
            "asof_date": pd.Timestamp("2019-01-01"),
            "measure": "pubtator_gene", "value": 1.0}])
        schemas.attention.validate(ok)

    def test_pairs_consistency_blocks_undated_annotated(self):
        df = pd.DataFrame([{
            "gene_id": "HGNC:1", "oncotree_code": "LUAD", "annotated": True,
            "annotation_date": pd.NaT, "oncogenicity": "Oncogenic",
            "sens_level": "1", "res_level": None}])
        with self.assertRaises(ValueError):
            schemas.validate_pairs_consistency(df)

    def test_pairs_consistency_blocks_labelled_unannotated(self):
        df = pd.DataFrame([{
            "gene_id": "HGNC:1", "oncotree_code": "LUAD", "annotated": False,
            "annotation_date": pd.NaT, "oncogenicity": "Oncogenic",
            "sens_level": None, "res_level": None}])
        with self.assertRaises(ValueError):
            schemas.validate_pairs_consistency(df)

    def test_pairs_consistency_passes_clean(self):
        df = pd.DataFrame([
            {"gene_id": "HGNC:1", "oncotree_code": "LUAD", "annotated": True,
             "annotation_date": pd.Timestamp("2021-06-01"),
             "annotation_date_source": "first-appearance:v7.6",
             "oncogenicity": "Oncogenic", "sens_level": "1", "res_level": None},
            {"gene_id": "HGNC:2", "oncotree_code": "BRCA", "annotated": False,
             "annotation_date": pd.NaT, "annotation_date_source": None,
             "oncogenicity": None,
             "sens_level": None, "res_level": None},
        ])
        self.assertTrue(schemas.validate_pairs_consistency(df))

    def test_pairs_consistency_blocks_dated_without_source(self):
        df = pd.DataFrame([{
            "gene_id": "HGNC:1", "oncotree_code": "LUAD", "annotated": True,
            "annotation_date": pd.Timestamp("2021-06-01"),
            "annotation_date_source": None, "oncogenicity": "Oncogenic",
            "sens_level": "1", "res_level": None}])
        with self.assertRaises(ValueError):
            schemas.validate_pairs_consistency(df)


if __name__ == "__main__":
    unittest.main()
