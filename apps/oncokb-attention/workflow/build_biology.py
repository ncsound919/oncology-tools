"""Build the biology interim table (non-literature gene features), gene-level.

Contract: workflow/schemas.py `biology` (gene_id = HGNC, oncotree_code = null).

Source registry (probed 2026-10-10):
  VERIFIED LIVE (populate now):
    gene_length   Ensembl REST /lookup/symbol/homo_sapiens/{symbol} (GRCh38)
    expr_breadth  GTEx v10 gene median TPM (fraction of tissues with TPM >= 1)
  BLOCKED / GATED (explicit null + loud report; never scraped, never guessed):
    dnds_selection   Martincorena 2017 supplement CDN -> HTTP 403
    intogen_driver   intogen.org downloads/API -> 404 / handshake timeout
    genie_recurrence AACR GENIE -> Synapse auth required (controlled access)
    depmap_dependency DepMap Public -> needs a vetted release DOI (figshare search 400)
    pharos_tdl       Pharos api/v1/targets -> HTTP 403

A blocked column is written as null (schema permits) and named in a WARNING.
`--require` promotes a column to fatal-if-null (gene_length is always required).
No literature-derived features: FORBIDDEN guard mirrors expected_attention.py.

Snakemake: rule build_biology (input universe, output biology).
Standalone: python build_biology.py --raw-dir R --universe U --out O --config C
"""
import argparse
import gzip
import io
import os
import sys

import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from oncokb_client import Cache, FetchError, fetch_json, fetch_bytes, utcnow
from io_util import write_parquet_with_attrs

FORBIDDEN = {"pubs", "n_pubs", "cooc_ratio"}  # non-literature features only

BLOCKED = {
    "dnds_selection": "Martincorena 2017 supplement CDN -> HTTP 403 (probe 2026-10-10)",
    "intogen_driver": "intogen.org downloads/API -> 404 / TLS timeout (probe 2026-10-10)",
    "genie_recurrence": "AACR GENIE -> Synapse authentication (controlled access)",
    "depmap_dependency": "DepMap Public -> needs vetted release DOI (figshare probe 400)",
    "pharos_tdl": "Pharos api/v1/targets -> HTTP 403 (probe 2026-10-10)",
}
AVAILABLE = {"gene_length", "expr_breadth"}
ALL_COLUMNS = ["dnds_selection", "intogen_driver", "genie_recurrence",
               "depmap_dependency", "gene_length", "expr_breadth", "pharos_tdl"]


def length_from_ensembl_payload(payload):
    """Pure: Ensembl lookup/symbol payload -> gene length in bp (GRCh38), or None."""
    if not isinstance(payload, dict) or "start" not in payload or "end" not in payload:
        return None
    if payload.get("biotype") == "protein_coding" or payload.get("id"):
        return int(payload["end"]) - int(payload["start"]) + 1
    return None


def fetch_gene_length(cache, symbols, ensembl_base, refresh=False):
    """Per-symbol Ensembl lookup (cached). Returns {symbol: length_bp|None}.

    A symbol Ensembl does not know (400/404) maps to None rather than aborting;
    if more than half fail, the source is treated as broken and raised.
    """
    out, failed = {}, 0
    base = ensembl_base.rstrip("/")
    for sym in symbols:
        try:
            payload = fetch_json(cache, f"ensembl_gene_{sym}", "GET",
                                 f"{base}/lookup/symbol/homo_sapiens/{sym}",
                                 refresh=refresh)
            out[sym] = length_from_ensembl_payload(payload)
        except FetchError:
            out[sym] = None
            failed += 1
    if symbols and failed > len(symbols) / 2:
        raise FetchError(f"Ensembl lookups failed for {failed}/{len(symbols)} symbols")
    if failed:
        print(f"NOTE: Ensembl had no record for {failed}/{len(symbols)} symbols (-> null)")
    return out


def parse_gtex_breadth(raw_gz, symbols, threshold=1.0):
    """Pure: GTEx gene-median-TPM .gct.gz bytes -> {symbol: tissue breadth fraction}.

    Breadth = fraction of tissue columns with median TPM >= threshold.
    GTEx .gct: line1 '#1.2', line2 'rows cols cols+2', line3 header, rows.
    Name=ENSG id, Description=symbol; match on Description symbol.
    """
    wanted = set(symbols)
    text = gzip.decompress(raw_gz).decode("utf-8", "replace")
    lines = text.splitlines()
    if len(lines) < 4:
        raise FetchError("GTEx .gct.gz shorter than 4 lines")
    n_cols = int(lines[1].split()[1])
    header = lines[2].split("\t")
    if len(header) != n_cols + 2:
        raise FetchError(f"GTEx header {len(header)} != {n_cols + 2}")
    n_tissues = n_cols
    out = {}
    for line in lines[3:]:
        parts = line.split("\t")
        if len(parts) != n_cols + 2:
            continue
        sym = parts[1]
        if sym not in wanted:
            continue
        vals = [float(v) for v in parts[2:]]
        out[sym] = sum(1 for v in vals if v >= threshold) / n_tissues
    return out


def build_frame(universe, lengths, breadth):
    """Pure: universe (gene-level) + feature dicts -> biology DataFrame.

    gene_length is non-nullable in the frozen schema (schemas.py), so genes
    without an Ensembl length are DROPPED here (reported by the caller) rather
    than written as null — the contract is enforced, not relaxed. Those genes
    are also excluded from the expectation model by the inner join.
    """
    df = pd.DataFrame({
        "gene_id": universe["hgnc_id"],
        "oncotree_code": None,
        "hugo_symbol": universe["hugo_symbol"],
        "dnds_selection": pd.Series([float("nan")] * len(universe), dtype="float64"),
        "intogen_driver": pd.array([pd.NA] * len(universe), dtype="boolean"),
        "genie_recurrence": pd.Series([float("nan")] * len(universe), dtype="float64"),
        "depmap_dependency": pd.Series([float("nan")] * len(universe), dtype="float64"),
        "gene_length": universe["hugo_symbol"].map(lengths),
        "expr_breadth": universe["hugo_symbol"].map(breadth),
        "pharos_tdl": pd.Series([None] * len(universe), dtype=object),
    })
    df["gene_length"] = pd.to_numeric(df["gene_length"], errors="coerce")
    df["expr_breadth"] = pd.to_numeric(df["expr_breadth"], errors="coerce")
    df = df.dropna(subset=["gene_id"])
    no_len = df["gene_length"].isna()
    if no_len.any():
        print(f"NOTE: dropping {int(no_len.sum())} genes with no Ensembl length "
              f"(gene_length is required by the schema): "
              f"{sorted(df.loc[no_len, 'hugo_symbol'])[:20]}")
    df = df[~no_len].reset_index(drop=True)
    return df


def main(raw_dir, universe_path, out_path, cfg, refresh=False, require=None):
    require = set(require or []) | {"gene_length"}
    os.makedirs(raw_dir, exist_ok=True)
    cache = Cache(raw_dir)
    universe = pd.read_parquet(universe_path)
    symbols = universe["hugo_symbol"].dropna().tolist()

    lengths = fetch_gene_length(cache, symbols, cfg["ensembl_api_base"], refresh=refresh)
    gtex_gz = fetch_bytes(cache, "gtex_median_tpm_v10", "GET", cfg["gtex_median_tpm_url"],
                          refresh=refresh)
    breadth = parse_gtex_breadth(gtex_gz, set(symbols))
    frame = build_frame(universe, lengths, breadth)

    null_cols = [c for c in ALL_COLUMNS if c not in ("gene_length", "expr_breadth")
                 and frame[c].isna().all()]
    if null_cols:
        print("WARNING: biology columns written null (blocked/gated sources):")
        for c in null_cols:
            print(f"  {c}: {BLOCKED[c]}")
    for c in require:
        if c in frame and frame[c].isna().all():
            raise FetchError(f"required biology column {c!r} is all-null "
                             f"({BLOCKED.get(c, 'no data')})")
    write_parquet_with_attrs(frame, out_path, {
        "built_utc": utcnow(), "builder": "build_biology.py",
        "sources_live": "gene_length=ensembl;expr_breadth=gtex_v10",
        "sources_blocked": ";".join(f"{c}={BLOCKED[c]}" for c in null_cols),
    })
    print(f"wrote {out_path}: {len(frame)} rows; gene_length "
          f"{int(frame['gene_length'].notna().sum())} non-null; expr_breadth "
          f"{int(frame['expr_breadth'].notna().sum())} non-null")
    return frame


try:
    snakemake  # noqa: F821 — injected by Snakemake when run as a script
except NameError:
    def _cli():
        import yaml
        ap = argparse.ArgumentParser(description="build biology interim table")
        ap.add_argument("--raw-dir", required=True)
        ap.add_argument("--universe", required=True)
        ap.add_argument("--out", required=True)
        ap.add_argument("--config", required=True)
        ap.add_argument("--refresh", action="store_true")
        ap.add_argument("--require", nargs="*", default=[])
        a = ap.parse_args()
        cfg = yaml.safe_load(open(a.config, encoding="utf-8"))
        main(a.raw_dir, a.universe, a.out, cfg, refresh=a.refresh, require=a.require)

    if __name__ == "__main__":
        _cli()
else:
    _cfg = dict(snakemake.config)
    main(os.path.join(_cfg["data_dir"], "raw", "biology"),
         snakemake.input.universe, snakemake.output[0], _cfg)
