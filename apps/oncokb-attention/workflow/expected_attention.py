"""Cross-fitted expected attention from non-literature gene features.
Residual (observed - expected) = surplus attention, used as the predictor of interest.

Source: Downloads/expected_attention.py. Hardened on integration (2026-10-10),
re-reviewed in audit 2026-10-10:
  1. Primary measure is config-driven (config["primary_measure"]) instead of
     hardcoded "pubtator_gene". Other measures go through the spec curve.
  2. Biology is restricted to gene-level rows (oncotree_code null) before the
     join. The source used drop_duplicates("gene_id"), which silently kept an
     arbitrary oncotree-specific row when per-cancer rows existed.
  3. FORBIDDEN now also covers sensitive_features from config (default:
     pharos_tdl — Tclin implies an approved drug exists, i.e. it is
     knowledge-adjacent). Default drop_sensitive_features=false preserves
     source behaviour; set true for the no-TDL spec-curve variant.
  4. Output keeps the observed log-count alongside the expectation so the
     residual is auditable (source dropped it).
  5. SHAP summary is attempted when shap is installed, skipped otherwise;
     figures land in <data>/figures/ (pathlib, created if missing).
  6. Logic lives in run() so tests can execute it without Snakemake.

Snakemake rule (see ../Snakefile, rule expected_attention):
  input:  attention={data_dir}/interim/attention.parquet,
          biology={data_dir}/interim/biology.parquet
  output: {data_dir}/interim/expected_attention.parquet
Standalone:
  python expected_attention.py --attention A --biology B --out O --cv-folds 5 --seed 1
"""
import argparse
from pathlib import Path

import numpy as np
import pandas as pd
import lightgbm as lgb
from sklearn.model_selection import KFold

DEFAULT_MODEL_KWARGS = dict(n_estimators=400, learning_rate=0.03, num_leaves=31,
                            subsample=0.8, subsample_freq=1, colsample_bytree=0.8)


def run(config, attention_path, biology_path, out_path, figures_dir=None,
        model_kwargs=None):
    """Train cross-fitted E[log1p(pubs) | biology]; write gene-level expectations.

    Returns the output DataFrame (gene_id, observed_log_pubs,
    expected_log_pubs, surplus_attention).
    """
    att = pd.read_parquet(attention_path)
    bio = pd.read_parquet(biology_path)

    primary = config.get("primary_measure", "pubtator_gene")
    sensitive = set(config.get("sensitive_features", ["pharos_tdl"]))
    drop_sensitive = bool(config.get("drop_sensitive_features", False))
    forbidden = {"pubs", "n_pubs", "cooc_ratio"} | (sensitive if drop_sensitive else set())
    if sensitive & set(bio.columns) and not drop_sensitive:
        print(f"NOTE: knowledge-adjacent features retained: {sorted(sensitive & set(bio.columns))} "
              f"(run drop_sensitive_features=true as a spec-curve variant)")

    # Gene-level pre-period count for the primary measure; other measures go through spec_curve.
    # Vintage cap (audit 2026-10-10): the "pre-period" in the design is t0. Without
    # the cap, gene-level rows written at post-annotation vintages would leak into
    # the predictor. Fail loudly when nothing survives the cap.
    cap = config.get("attention_vintage_cap", config.get("t0"))
    g = att[(att.oncotree_code.isna()) & (att.measure == primary)]
    if g.empty:
        raise ValueError(f"no gene-level rows for primary measure {primary!r}")
    if cap is not None:
        g = g[pd.to_datetime(g["asof_date"]) <= pd.Timestamp(cap)]
        if g.empty:
            raise ValueError(
                f"no gene-level rows for {primary!r} at vintage <= {cap} (leakage cap)")
    g = g[["gene_id", "value"]]
    gene_bio = bio[bio.oncotree_code.isna()].drop_duplicates("gene_id")
    df = g.merge(gene_bio, on="gene_id", how="inner")
    if df.empty:
        raise ValueError("attention/biology gene-level join is empty")
    BOOKKEEPING = {"gene_id", "value", "oncotree_code", "hugo_symbol"}
    feat = [c for c in df.columns
            if c not in BOOKKEEPING and c not in forbidden]
    # Drop all-null feature columns (blocked biology sources) and coerce to numeric;
    # keep a real categorical (pharos_tdl) only when it has values.
    dropped_allnull = [c for c in feat if df[c].isna().all()]
    feat = [c for c in feat if c not in dropped_allnull]
    if dropped_allnull:
        print(f"NOTE: dropping all-null biology features: {dropped_allnull}")
    if not feat:
        raise ValueError("no features left after FORBIDDEN + all-null exclusion")
    X = pd.DataFrame({c: pd.to_numeric(df[c], errors="coerce")
                      if df[c].dtype.kind in "ifb" or str(df[c].dtype).startswith(("Int", "Float", "boolean"))
                      else df[c] for c in feat})
    for cat_col in ("pharos_tdl",):
        if cat_col in X.columns and X[cat_col].notna().any():
            X[cat_col] = X[cat_col].astype("category")
        elif cat_col in X.columns:
            X = X.drop(columns=[cat_col])
    y = np.log1p(df["value"].to_numpy())

    mk = dict(DEFAULT_MODEL_KWARGS)
    mk.update(model_kwargs or {})
    mk.setdefault("random_state", config.get("seed", 1))
    mk.setdefault("verbose", -1)
    oof = np.zeros(len(df))
    for tr, te in KFold(config.get("cv_folds", 5), shuffle=True,
                        random_state=config.get("seed", 1)).split(X):
        m = lgb.LGBMRegressor(**mk)
        m.fit(X.iloc[tr], y[tr])
        oof[te] = m.predict(X.iloc[te])

    out = df[["gene_id"]].assign(observed_log_pubs=y,
                                 expected_log_pubs=oof,
                                 surplus_attention=y - oof)
    out.to_parquet(out_path, index=False)

    try:
        import shap  # optional; skipped when not installed
        explainer = shap.TreeExplainer(m)  # final fold's model: approximate importance only
        sv = explainer.shap_values(X)
        imp = (pd.Series(np.abs(sv).mean(axis=0), index=X.columns)
                 .sort_values(ascending=False))
        figs = Path(figures_dir) if figures_dir else Path(out_path).parent.parent / "figures"
        figs.mkdir(parents=True, exist_ok=True)
        fig_path = figs / "shap_expected_attention.csv"
        imp.to_csv(fig_path, header=["mean_abs_shap"])
        print(f"wrote SHAP summary to {fig_path}")
    except ImportError:
        print("shap not installed; skipping SHAP summary (results/figures/)")
    return out


try:
    snakemake  # noqa: F821 — injected by Snakemake when run as a script
except NameError:
    def _cli():
        ap = argparse.ArgumentParser(description="cross-fitted expected attention")
        ap.add_argument("--attention", required=True)
        ap.add_argument("--biology", required=True)
        ap.add_argument("--out", required=True)
        ap.add_argument("--primary-measure", default="pubtator_gene")
        ap.add_argument("--vintage-cap", default="2020-01-01")
        ap.add_argument("--cv-folds", type=int, default=5)
        ap.add_argument("--seed", type=int, default=1)
        ap.add_argument("--drop-sensitive", action="store_true")
        a = ap.parse_args()
        run({"primary_measure": a.primary_measure, "cv_folds": a.cv_folds,
             "seed": a.seed, "drop_sensitive_features": a.drop_sensitive,
             "attention_vintage_cap": a.vintage_cap},
            a.attention, a.biology, a.out)
        print(f"wrote {a.out}")

    if __name__ == "__main__":
        _cli()
else:
    run(dict(snakemake.config), snakemake.input.attention, snakemake.input.biology,
        snakemake.output[0])
