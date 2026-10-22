"""Build the gene universe (public phase — no token needed).

Fetches OncoKB cancerGeneList + OncoTree tumor types + MyGene HGNC mapping,
all cached raw under data/raw/oncokb/, and writes data/interim/gene_universe.parquet
with provenance attrs (oncokb_data_version/date, oncotree_version, fetched_utc).
Appends the pull to data/raw/oncokb/versions.jsonl (first-appearance dating ledger).

Snakemake: rule build_gene_universe (output universe).
Standalone: python gene_universe.py --raw-dir R --out U --config C [--refresh]
"""
import argparse
import json
import os
import sys

import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from oncokb_client import Cache, FetchError, fetch_json, utcnow
from io_util import write_parquet_with_attrs


def fetch_public_phase(cache, cfg, refresh=False):
    """Fetch + cache the three public sources. Returns dict of raw payloads."""
    base = cfg["oncokb_api_base"].rstrip("/")
    info = fetch_json(cache, "info", "GET", base + "/info", refresh=refresh)
    genes = fetch_json(cache, "cancerGeneList", "GET",
                       base + "/utils/cancerGeneList", refresh=refresh)
    oncotree_url = (cfg["oncotree_api_base"].rstrip("/") +
                    "/tumorTypes?version=oncotree_latest_stable")
    tumors = fetch_json(cache, "oncotree_tumorTypes", "GET", oncotree_url,
                        refresh=refresh)
    return {"info": info, "cancerGeneList": genes, "oncotree": tumors}


def fetch_hgnc_map(cache, entrez_ids, mygene_base, refresh=False):
    """Batch Entrez -> {entrez: HGNC:id|None} via MyGene.info POST /gene."""
    import urllib.parse
    out = {}
    ids = sorted(set(entrez_ids))
    for i in range(0, len(ids), 1000):
        chunk = ids[i:i + 1000]
        key = f"mygene_batch_{i // 1000}"
        body = urllib.parse.urlencode(
            {"ids": ",".join(map(str, chunk)),
             "fields": "symbol,HGNC,entrezgene"}).encode("utf-8")
        recs = fetch_json(cache, key, "POST", mygene_base.rstrip("/") + "/gene",
                          body=body,
                          headers={"Content-Type": "application/x-www-form-urlencoded"},
                          refresh=refresh)
        if not isinstance(recs, list):
            raise FetchError(
                f"MyGene batch shape changed: expected list, got {type(recs)}")
        for rec in recs:
            if rec.get("notfound"):
                continue
            hgnc = rec.get("HGNC")
            ent = rec.get("entrezgene") or rec.get("_id")
            try:
                ent = int(ent)
            except (TypeError, ValueError):
                continue
            out[ent] = f"HGNC:{hgnc}" if hgnc else None
    return out


def aggregate_gene_universe(cancer_genes, hgnc_by_entrez):
    """Pure: cancerGeneList + HGNC map -> gene universe DataFrame."""
    rows = []
    for g in cancer_genes:
        ent = g.get("entrezGeneId")
        rows.append({
            "hugo_symbol": g.get("hugoSymbol"),
            "entrez_id": ent,
            "hgnc_id": hgnc_by_entrez.get(ent),
            "oncokb_annotated": bool(g.get("oncokbAnnotated")),
            "gene_type": g.get("geneType"),
        })
    df = pd.DataFrame(rows, columns=["hugo_symbol", "entrez_id", "hgnc_id",
                                     "oncokb_annotated", "gene_type"])
    if df["hugo_symbol"].isna().any() or (df["hugo_symbol"] == "").any():
        raise ValueError("cancerGeneList entries without hugoSymbol")
    return df


def main(raw_dir, universe_path, cfg, refresh=False):
    os.makedirs(raw_dir, exist_ok=True)
    cache = Cache(raw_dir)
    pub = fetch_public_phase(cache, cfg, refresh=refresh)
    info = pub["info"]
    data_version = info.get("dataVersion", {})
    entrez_ids = [g.get("entrezGeneId") for g in pub["cancerGeneList"]
                  if g.get("entrezGeneId") is not None]
    hgnc_by_entrez = fetch_hgnc_map(cache, entrez_ids, cfg["mygene_api_base"],
                                    refresh=refresh)
    universe = aggregate_gene_universe(pub["cancerGeneList"], hgnc_by_entrez)
    oncotree_version = info.get("oncoTreeVersion", "unknown")
    write_parquet_with_attrs(universe, universe_path, {
        "oncokb_data_version": data_version.get("version", "unknown"),
        "oncokb_data_date": data_version.get("date", "unknown"),
        "oncotree_version": oncotree_version,
        "fetched_utc": utcnow(),
        "builder": "gene_universe.py",
    })
    print(f"wrote {universe_path}: {len(universe)} genes "
          f"({int(universe['oncokb_annotated'].sum())} OncoKB-annotated), "
          f"OncoKB data {data_version.get('version')} ({data_version.get('date')})")

    versions_path = os.path.join(raw_dir, "versions.jsonl")
    with open(versions_path, "a", encoding="utf-8") as fh:
        fh.write(json.dumps({"version": data_version.get("version"),
                             "date": data_version.get("date"),
                             "fetched_utc": utcnow(),
                             "n_genes": len(universe)}) + "\n")
    return universe


try:
    snakemake  # noqa: F821 — injected by Snakemake when run as a script
except NameError:
    def _cli():
        import yaml
        ap = argparse.ArgumentParser(description="build gene universe (public)")
        ap.add_argument("--raw-dir", required=True)
        ap.add_argument("--out", required=True)
        ap.add_argument("--config", required=True)
        ap.add_argument("--refresh", action="store_true")
        a = ap.parse_args()
        cfg = yaml.safe_load(open(a.config, encoding="utf-8"))
        main(a.raw_dir, a.out, cfg, refresh=a.refresh)

    if __name__ == "__main__":
        _cli()
else:
    import yaml
    _cfg = dict(snakemake.config)
    main(os.path.join(_cfg["data_dir"], "raw", "oncokb"),
         snakemake.output[0], _cfg)
