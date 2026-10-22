"""Build gene-level attention (public APIs), vintage = t0 (pre-period).

Produced measures (gene-level; oncotree_code = null; asof_date = t0):

  openalex_concept   OpenAlex works count for the gene symbol, cumulative to t0.
                     IMPLEMENTATION NOTE: OpenAlex retired "concepts" in 2024, so
                     this is a full-text symbol search (filter=fulltext.search),
                     not a concept-scoped count. The published metric name is
                     kept for continuity with config/prereg; the substitution
                     MUST be recorded in a chained prereg amendment before any
                     result is interpreted.

  pubtator_gene      NCBI PubMed (eutils esearch) publication count for the gene
                     symbol, cumulative to t0.
                     IMPLEMENTATION NOTE: this is a PubMed symbol search, NOT a
                     PubTator-normalized gene-entity count. PubTator3's API is
                     rate-limited (<=3 req/s) and has no simple date window; the
                     exact normalization needs its bulk FTP. Flagged for the same
                     amendment. Do not describe results as "PubTator counts".

  pubtator_gene_cancer, cooc_ratio   REQUIRE pair-level inputs (gene x cancer),
                     so they are produced after build_pairs (token-gated). This
                     module does not emit them.

vintage honesty: both counts are cumulative-to-t0 (pre-period), matching the
design's "attention must predate annotation by lag" and the hurdle t0 cutoff.
"""
import argparse
import os
import sys
import time
import urllib.parse

import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from oncokb_client import Cache, FetchError, fetch_json, utcnow
from io_util import write_parquet_with_attrs

GENE_LEVEL_MEASURES = {"openalex_concept", "pubtator_gene"}
PAIR_LEVEL_MEASURES = {"pubtator_gene_cancer", "cooc_ratio"}


def openalex_symbol_count(cache, symbol, until_date, base, refresh=False):
    """OpenAlex works count for `symbol`, published through until_date."""
    key = f"openalex_{symbol}_{until_date}"
    url = (f"{base.rstrip('/')}/works?filter=fulltext.search:{urllib.parse.quote(symbol)},"
           f"to_publication_date:{until_date}&per-page=1")
    payload = fetch_json(cache, key, "GET", url, refresh=refresh)
    meta = payload.get("meta", {})
    if "count" not in meta:
        raise FetchError(f"OpenAlex response missing meta.count for {symbol}")
    return float(meta["count"])


def pubmed_symbol_count(cache, symbol, until_date, eutils_base, email,
                        refresh=False, sleep=0.35):
    """NCBI eutils esearch count for `symbol` through until_date (3 req/s etiquette)."""
    key = f"pubmed_{symbol}_{until_date}"
    term = f"{symbol}[All Fields] AND {until_date}[Date - Publication]"
    url = (f"{eutils_base.rstrip('/')}/esearch.fcgi?db=pubmed&retmode=json&rettype=count"
           f"&term={urllib.parse.quote(term)}&email={urllib.parse.quote(email)}")
    # cache-hit avoids the network; only sleep when refreshing blindly
    payload = fetch_json(cache, key, "GET", url, refresh=refresh)
    res = payload.get("esearchresult", {})
    if "count" not in res:
        raise FetchError(f"eutils response missing esearchresult.count for {symbol}")
    time.sleep(sleep)
    return float(res["count"])


def build_attention_frame(pairs_genes, counts_openalex, counts_pubmed, t0):
    """Pure: {hgnc: symbol} + count dicts -> long-form attention DataFrame."""
    rows = []
    for hgnc, sym in pairs_genes.items():
        if sym in counts_openalex:
            rows.append({"gene_id": hgnc, "oncotree_code": None,
                         "asof_date": pd.Timestamp(t0), "measure": "openalex_concept",
                         "value": counts_openalex[sym]})
        if sym in counts_pubmed:
            rows.append({"gene_id": hgnc, "oncotree_code": None,
                         "asof_date": pd.Timestamp(t0), "measure": "pubtator_gene",
                         "value": counts_pubmed[sym]})
    return pd.DataFrame(rows, columns=["gene_id", "oncotree_code", "asof_date",
                                       "measure", "value"])


def main(raw_dir, universe_path, out_path, cfg, refresh=False, limit=None):
    os.makedirs(raw_dir, exist_ok=True)
    cache = Cache(raw_dir)
    universe = pd.read_parquet(universe_path)
    t0 = cfg["t0"]
    until = pd.Timestamp(t0).strftime("%Y-%m-%d")
    gene_map = dict(zip(universe["hgnc_id"], universe["hugo_symbol"]))
    if limit:
        gene_map = dict(list(gene_map.items())[:limit])

    print("WARNING: measure definitions are PROXIES (see module docstring). "
          "openalex_concept=OpenAlex fulltext search; pubtator_gene=PubMed symbol "
          "search (eutils). Both REQUIRE a chained prereg amendment before use.")
    co, cp = {}, {}
    for hgnc, sym in gene_map.items():
        co[sym] = openalex_symbol_count(cache, sym, until, cfg["openalex_api_base"], refresh)
        cp[sym] = pubmed_symbol_count(cache, sym, until, cfg["eutils_base"],
                                      cfg.get("eutils_email", "research@example.org"), refresh)
    frame = build_attention_frame(gene_map, co, cp, t0)
    write_parquet_with_attrs(frame, out_path, {
        "built_utc": utcnow(), "builder": "build_attention.py",
        "impl_note": "openalex_concept=openalex fulltext; pubtator_gene=pubmed eutils; needs prereg amendment",
        "genes": str(len(gene_map)), "vintage": until,
    })
    print(f"wrote {out_path}: {len(frame)} rows over {len(gene_map)} genes")
    return frame


try:
    snakemake  # noqa: F821 — injected by Snakemake when run as a script
except NameError:
    def _cli():
        import yaml
        ap = argparse.ArgumentParser(description="build gene-level attention")
        ap.add_argument("--raw-dir", required=True)
        ap.add_argument("--universe", required=True)
        ap.add_argument("--out", required=True)
        ap.add_argument("--config", required=True)
        ap.add_argument("--refresh", action="store_true")
        ap.add_argument("--limit", type=int, default=None)
        a = ap.parse_args()
        cfg = yaml.safe_load(open(a.config, encoding="utf-8"))
        main(a.raw_dir, a.universe, a.out, cfg, refresh=a.refresh, limit=a.limit)

    if __name__ == "__main__":
        _cli()
else:
    _cfg = dict(snakemake.config)
    main(os.path.join(_cfg["data_dir"], "raw", "attention"),
         snakemake.input.universe, snakemake.output[0], _cfg)
