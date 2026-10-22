"""Validate the three interim tables and enforce the leakage guard.

Snakemake rule (see ../Snakefile, rule validate): runs as a `script:` with the
`snakemake` object injected (input.pairs/attention/biology, output[0] guard
file, params.lag/t0/snapshot/hurdle_prefix/require_hurdle, config).

Standalone (audit 2026-10-10: the first version lived as an inline `run:` block
that was cwd-fragile and untestable — this module is importable and CLI-runnable):
    python validate.py --pairs P --attention A --biology B --guard G --lag 12 \\
        --t0 2020-01-01 --snapshot 2026-10-09 --measures pubtator_gene,cooc_ratio
"""
import argparse

import pandas as pd

from checks import assert_no_leakage, level_model_eligible
from schemas import (
    attention as attention_schema,
    biology as biology_schema,
    pairs as pairs_schema,
    set_measure_allowlist,
    validate_pairs_consistency,
)


def main(pairs_path, attention_path, biology_path, guard_path, *, lag_months,
         t0, snapshot_date, measures, hurdle_prefix="t0_", require_hurdle=False):
    """Run schema + consistency + leakage checks; write the guard file. Returns summary."""
    att_schema = set_measure_allowlist(measures, hurdle_prefix)
    p = pairs_schema.validate(pd.read_parquet(pairs_path))
    a = att_schema.validate(pd.read_parquet(attention_path))
    biology_schema.validate(pd.read_parquet(biology_path))
    validate_pairs_consistency(p)
    summary = assert_no_leakage(p, a, lag_months, t0,
                                snapshot_date=snapshot_date,
                                hurdle_prefix=hurdle_prefix,
                                require_hurdle=require_hurdle)
    elig = level_model_eligible(p, t0, lag_months)
    summary["n_level_eligible_pairs"] = len(elig)
    summary["n_level_ineligible_pairs"] = int(p["annotated"].sum()) - len(elig)
    from io_util import ensure_parent
    ensure_parent(guard_path)
    with open(guard_path, "w", encoding="utf-8") as fh:
        fh.write(f"leakage_ok {summary}\n")
    return summary


try:
    snakemake  # noqa: F821 — injected by Snakemake when run as a script:
except NameError:
    def _cli():
        ap = argparse.ArgumentParser(description="validate interim tables + leakage guard")
        ap.add_argument("--pairs", required=True)
        ap.add_argument("--attention", required=True)
        ap.add_argument("--biology", required=True)
        ap.add_argument("--guard", required=True)
        ap.add_argument("--lag", type=int, required=True)
        ap.add_argument("--t0", required=True)
        ap.add_argument("--snapshot", required=True)
        ap.add_argument("--measures", required=True,
                        help="comma-separated attention measures")
        ap.add_argument("--hurdle-prefix", default="t0_")
        ap.add_argument("--require-hurdle", action="store_true")
        a = ap.parse_args()
        summary = main(a.pairs, a.attention, a.biology, a.guard,
                       lag_months=a.lag, t0=a.t0, snapshot_date=a.snapshot,
                       measures=a.measures.split(","), hurdle_prefix=a.hurdle_prefix,
                       require_hurdle=a.require_hurdle)
        print(f"leakage_ok {summary}")

    if __name__ == "__main__":
        _cli()
else:
    main(snakemake.input.pairs, snakemake.input.attention, snakemake.input.biology,
         snakemake.output[0], lag_months=snakemake.params.lag, t0=snakemake.params.t0,
         snapshot_date=snakemake.params.snapshot,
         measures=list(snakemake.config["attention_measures"]),
         hurdle_prefix=snakemake.params.hurdle_prefix,
         require_hurdle=snakemake.params.require_hurdle)
