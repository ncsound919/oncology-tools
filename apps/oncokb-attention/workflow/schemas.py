"""pandera schemas for the three interim tables.

Source: Downloads/schemas.py, hardened on integration (2026-10-10):
  1. attention.measure is now allowlisted against config attention_measures
     (+ hurdle_prefix variants). The source left it unconstrained.
  2. validate_pairs_consistency() enforces: annotated rows carry an
     annotation_date; unannotated rows carry no oncogenicity/level labels.
     The source schema could not express this cross-column rule.
  3. ONCOGENICITY list is UNVERIFIED against current OncoKB terms
     (source comment carried over). Do not treat as canonical.

Ecosystem rule: sens_level (sensitivity axis) and res_level (resistance axis)
are never pooled. Any model pooling them fails review regardless of fit.
"""
import pandas as pd
import pandera as pa
from pandera import Column, Check

SENS = ["1", "2", "3A", "3B", "4"]
RES = ["R1", "R2"]
# PROVISIONAL — verify against the frozen OncoKB download before any
# annotated-model run (audit 2026-10-10, spot-check of live oncokb.org pages):
#   confirmed live: "Oncogenic", "Likely Oncogenic", "Likely Neutral", "Inconclusive"
#     (seen on SF3B1 / POLE / IDH2 / BCL2 gene pages).
#   NOT observed in spot check: "Predicted Oncogenic" (may be legacy) — confirm or drop.
#   possibly missing: "Resistance" (seen as an OncoKB oncogenicity value in a
#     PDMDB OncoKB dump row) and "Unknown" — check the frozen download for both.
# Builders must call assert_no_novel_oncogenicity() so a new term fails loudly
# instead of being silently dropped by the isin check.
ONCOGENICITY = ["Oncogenic", "Likely Oncogenic", "Predicted Oncogenic",
                "Likely Neutral", "Inconclusive"]

# Populated from config.yaml attention_measures (+ hurdle_prefix variants)
# by set_measure_allowlist(). Falls back to the config-file values below
# so the schema is usable without a config round-trip.
MEASURES = ["pubtator_gene_cancer", "pubtator_gene", "openalex_concept", "cooc_ratio"]
HURDLE_PREFIX = "t0_"


def set_measure_allowlist(measures, hurdle_prefix=HURDLE_PREFIX):
    """Bind the attention.measure allowlist to the study config.

    Rebuilds AND replaces the module-global `attention` schema (audit 2026-10-10:
    the first version rebuilt it into a local that callers discarded, so
    validation silently kept the defaults). Returns the new schema.
    """
    global MEASURES, HURDLE_PREFIX, attention
    MEASURES = list(measures)
    HURDLE_PREFIX = hurdle_prefix
    attention = pa.DataFrameSchema({
        "gene_id": Column(str),
        "oncotree_code": Column(str, nullable=True),     # null = gene-level count
        "asof_date": Column("datetime64[ns]"),
        "measure": Column(str, Check.isin(MEASURES + [f"{hurdle_prefix}{m}" for m in MEASURES])),
        "value": Column(float, Check.ge(0)),
    }, strict=True)
    return attention


pairs = pa.DataFrameSchema({
    "gene_id": Column(str, Check.str_matches(r"^HGNC:\d+$")),
    "oncotree_code": Column(str),
    "annotated": Column(bool),
    "annotation_date": Column("datetime64[ns]", nullable=True),
    "annotation_date_source": Column(str, nullable=True),  # provenance per row, e.g.
    # "first-appearance:v7.7". NULL means unprovenanced — never silently imputed
    # (build_pairs refuses to write dateless annotated pairs; see its docstring).
    "oncogenicity": Column(str, Check.isin(ONCOGENICITY), nullable=True),
    "sens_level": Column(str, Check.isin(SENS), nullable=True),   # sensitivity axis only
    "res_level": Column(str, Check.isin(RES), nullable=True),     # separate axis, never pooled
}, unique=["gene_id", "oncotree_code"], strict=True)

attention = pa.DataFrameSchema({
    "gene_id": Column(str),
    "oncotree_code": Column(str, nullable=True),     # null = gene-level count
    "asof_date": Column("datetime64[ns]"),
    "measure": Column(str, Check.isin(
        MEASURES + [f"{HURDLE_PREFIX}{m}" for m in MEASURES])),
    "value": Column(float, Check.ge(0)),
}, strict=True)

biology = pa.DataFrameSchema({
    "gene_id": Column(str),
    "oncotree_code": Column(str, nullable=True),
    "dnds_selection": Column(float, nullable=True),
    "intogen_driver": Column("boolean", nullable=True),  # nullable boolean dtype: an
    # all-null column is impossible with numpy bool (post-integration fix 2026-10-10)
    "genie_recurrence": Column(float, nullable=True),
    "depmap_dependency": Column(float, nullable=True),  # also the negative-control outcome
    "gene_length": Column(float, Check.gt(0)),
    "expr_breadth": Column(float, nullable=True),
    "pharos_tdl": Column(str, Check.isin(["Tdark", "Tbio", "Tchem", "Tclin"]), nullable=True),
}, strict=False)


def assert_no_novel_oncogenicity(df):
    """Builder guard: fail loudly on terms outside ONCOGENICITY.

    The pandera isin check would reject them too, but with a generic
    SchemaError. This names the offending values so the builder knows to
    check them against the frozen OncoKB download (see ONCOGENICITY note).
    """
    novel = sorted(set(df["oncogenicity"].dropna().unique()) - set(ONCOGENICITY))
    if novel:
        raise ValueError(
            f"novel oncogenicity terms {novel}: verify against the frozen OncoKB "
            f"download and extend ONCOGENICITY deliberately, never silently"
        )
    return True


def validate_pairs_consistency(df):
    """Cross-column rule pandera cannot express: annotated <=> dated + labelled."""
    errors = []
    ann = df[df["annotated"]]
    unann = df[~df["annotated"]]
    if ann["annotation_date"].isna().any():
        errors.append(f"{int(ann['annotation_date'].isna().sum())} annotated rows lack annotation_date")
    if "annotation_date_source" in df.columns:
        missing_src = ann[ann["annotation_date"].notna() & ann["annotation_date_source"].isna()]
        if len(missing_src):
            errors.append(f"{len(missing_src)} dated annotated rows lack annotation_date_source")
    for col in ("oncogenicity", "sens_level", "res_level"):
        if col in unann.columns and unann[col].notna().any():
            errors.append(f"{int(unann[col].notna().sum())} unannotated rows carry {col}")
    if errors:
        raise ValueError("pairs consistency: " + "; ".join(errors))
    return True
