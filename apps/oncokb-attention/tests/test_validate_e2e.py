"""Synthetic end-to-end test: schemas -> consistency -> leakage guard -> model.

Builds tiny synthetic interim tables in a tmp dir, runs validate.main() then
expected_attention.run(), and checks the outputs. No Snakemake, no network,
no real data. Requires pandas/pyarrow/pandera/lightgbm (see requirements.txt).

Run with: python -m unittest discover -s tests -v
"""
import sys
import unittest
from pathlib import Path

import numpy as np
import pandas as pd

WORKFLOW = Path(__file__).resolve().parent.parent / "workflow"
sys.path.insert(0, str(WORKFLOW))

import schemas
from schemas import assert_no_novel_oncogenicity, set_measure_allowlist
from validate import main as validate_main
from expected_attention import run as expected_attention_run

MEASURES = ["pubtator_gene_cancer", "pubtator_gene", "openalex_concept", "cooc_ratio"]
N_GENES = 60


def synthetic_tables():
    rng = np.random.default_rng(1)
    genes = [f"HGNC:{1000 + i}" for i in range(N_GENES)]
    cancers = ["LUAD", "BRCA"]

    pair_rows = []
    for i, g in enumerate(genes):
        for c in cancers:
            ann = (i % 3 == 0)
            pair_rows.append({
                "gene_id": g, "oncotree_code": c, "annotated": ann,
                "annotation_date": pd.Timestamp("2021-06-01")
                if ann and c == "LUAD" else (pd.Timestamp("2022-03-01") if ann else pd.NaT),
                "annotation_date_source": "first-appearance:v7.6-synthetic"
                if ann else None,
                "oncogenicity": "Oncogenic" if ann else None,
                "sens_level": "1" if ann else None,
                "res_level": None,
            })
    pairs = pd.DataFrame(pair_rows)

    att_rows = []
    for g in genes:
        att_rows.append({"gene_id": g, "oncotree_code": None,
                         "asof_date": pd.Timestamp("2019-06-01"),
                         "measure": "pubtator_gene", "value": float(rng.integers(5, 5000))})
        att_rows.append({"gene_id": g, "oncotree_code": None,  # post-t0: cap must exclude
                         "asof_date": pd.Timestamp("2021-01-01"),
                         "measure": "pubtator_gene", "value": 99999.0})
        att_rows.append({"gene_id": g, "oncotree_code": None,
                         "asof_date": pd.Timestamp("2019-06-01"),
                         "measure": "t0_pubtator_gene", "value": float(rng.integers(5, 5000))})
    for _, r in pairs.iterrows():
        att_rows.append({"gene_id": r["gene_id"], "oncotree_code": r["oncotree_code"],
                         "asof_date": pd.Timestamp("2019-01-01"),
                         "measure": "pubtator_gene_cancer",
                         "value": float(rng.integers(0, 500))})
    attention = pd.DataFrame(att_rows)

    tdls = ["Tdark", "Tbio", "Tchem", "Tclin", None]
    bio_rows = [{
        "gene_id": g, "oncotree_code": None,
        "dnds_selection": float(rng.normal(0, 1)),
        "intogen_driver": bool(rng.integers(0, 2)),
        "genie_recurrence": float(rng.random()),
        "depmap_dependency": float(rng.normal(-0.5, 0.5)),
        "gene_length": float(rng.integers(1000, 200000)),
        "expr_breadth": float(rng.random()),
        "pharos_tdl": tdls[i % len(tdls)],
    } for i, g in enumerate(genes)]
    bio_rows.append({"gene_id": genes[0], "oncotree_code": "LUAD",  # oncotree row: join must ignore
                     "dnds_selection": 999.0, "intogen_driver": True,
                     "genie_recurrence": 999.0, "depmap_dependency": 999.0,
                     "gene_length": 999.0, "expr_breadth": 999.0, "pharos_tdl": "Tclin"})
    biology = pd.DataFrame(bio_rows)
    biology["intogen_driver"] = biology["intogen_driver"].astype("boolean")
    return pairs, attention, biology


class EndToEndTests(unittest.TestCase):
    def test_validate_then_model(self):
        import tempfile
        with tempfile.TemporaryDirectory() as d:
            d = Path(d)
            pairs, attention, biology = synthetic_tables()
            pairs.to_parquet(d / "pairs.parquet", index=False)
            attention.to_parquet(d / "attention.parquet", index=False)
            biology.to_parquet(d / "biology.parquet", index=False)

            summary = validate_main(
                d / "pairs.parquet", d / "attention.parquet", d / "biology.parquet",
                d / "_leakage_ok.txt", lag_months=12, t0="2020-01-01",
                snapshot_date="2026-10-09", measures=MEASURES,
                hurdle_prefix="t0_", require_hurdle=True)
            self.assertTrue((d / "_leakage_ok.txt").exists())
            self.assertGreater(summary["n_level_eligible_pairs"], 0)
            self.assertEqual(summary["n_level_ineligible_pairs"], 0)

            out = expected_attention_run(
                {"primary_measure": "pubtator_gene", "cv_folds": 5, "seed": 1,
                 "attention_vintage_cap": "2020-01-01"},
                d / "attention.parquet", d / "biology.parquet",
                d / "expected_attention.parquet",
                figures_dir=d / "figures", model_kwargs={"n_estimators": 20})
            self.assertEqual(len(out), N_GENES)
            self.assertEqual(list(out.columns),
                             ["gene_id", "observed_log_pubs", "expected_log_pubs",
                              "surplus_attention"])
            self.assertTrue(np.isfinite(out[["observed_log_pubs", "expected_log_pubs",
                                             "surplus_attention"]].to_numpy()).all())
            np.testing.assert_allclose(
                out["surplus_attention"].to_numpy(),
                (out["observed_log_pubs"] - out["expected_log_pubs"]).to_numpy(),
                rtol=1e-9)
            # vintage cap excluded the 99999.0 post-t0 decoy rows
            self.assertLess(out["observed_log_pubs"].max(), np.log1p(99999.0))
            reread = pd.read_parquet(d / "expected_attention.parquet")
            self.assertEqual(len(reread), N_GENES)

    def test_allowlist_rebuild_replaces_global(self):
        """Regression (audit 2026-10-10): set_measure_allowlist must rebind schemas.attention."""
        old_measures, old_prefix = schemas.MEASURES, schemas.HURDLE_PREFIX
        try:
            set_measure_allowlist(["pubtator_gene"], "t0_")
            bad = pd.DataFrame([{"gene_id": "HGNC:1", "oncotree_code": None,
                                 "asof_date": pd.Timestamp("2019-01-01"),
                                 "measure": "openalex_concept", "value": 1.0}])
            import pandera.errors
            with self.assertRaises(pandera.errors.SchemaError):
                schemas.attention.validate(bad)
        finally:
            set_measure_allowlist(old_measures, old_prefix)

    def test_novel_oncogenicity_guard(self):
        df = pd.DataFrame({"oncogenicity": ["Oncogenic", None]})
        self.assertTrue(assert_no_novel_oncogenicity(df))
        df2 = pd.DataFrame({"oncogenicity": ["Oncogenic", "Resistance"]})
        with self.assertRaises(ValueError):
            assert_no_novel_oncogenicity(df2)


if __name__ == "__main__":
    unittest.main()
