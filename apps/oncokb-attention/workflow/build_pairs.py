"""Build the pairs interim table (one row per gene x oncotree_code).

Input: data/interim/gene_universe.parquet (rule build_gene_universe, public).
Gated phase needs ONCOKB_TOKEN (free self-registration at
https://www.oncokb.org/account). Without it the rule fails LOUDLY after
reading the universe — never silently, never partial.

annotation_date provenance (the hardest field):
  OncoKB publishes no per-pair curation timestamps. Dating is first-appearance
  across version-stamped raw caches (data/raw/oncokb/versions.jsonl). The
  inaugural pull archives release N; pairs get dates only once a LATER release
  still contains them (source "first-appearance:{version}"). Until then the
  builder REFUSES to write pairs.parquet: imputing the data-version date would
  be ANTI-conservative (latest possible annotation = weakest leakage guard) and
  silently corrupt the guard. Refusal is the research-integrity behavior; the
  message names exactly what is missing.

Snakemake: rule build_pairs (input universe, output pairs).
Standalone: python build_pairs.py --raw-dir R --universe U --out O --config C [--refresh]
"""
import argparse
import json
import os
import sys

import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from oncokb_client import Cache, FetchError, fetch_json, oncokb_token, utcnow

# --- documented aggregation rules (frozen with the study) --------------------
# Sensitivity hierarchy 1 > 2 > 3A > 3B > 4; resistance R1 > R2 (OncoKB levels).
SENS_ORDER = {"1": 0, "2": 1, "3A": 2, "3B": 3, "4": 4}
RES_ORDER = {"R1": 0, "R2": 1}
# Oncogenicity severity for tie-breaks (pair takes the alteration behind the
# top sensitivity level; ties broken by this order).
ONCO_SEVERITY = ["Oncogenic", "Likely Oncogenic", "Predicted Oncogenic",
                 "Resistance", "Likely Neutral", "Inconclusive", "Unknown"]
# Levels as returned by /api/v1/levels: LEVEL_1, LEVEL_2, LEVEL_3A, LEVEL_3B,
# LEVEL_4, LEVEL_R1, LEVEL_R2 (+ Dx/Px/FDA variants, out of scope: therapeutic only).
LEVEL_MAP = {"LEVEL_1": ("sens", "1"), "LEVEL_2": ("sens", "2"),
             "LEVEL_3A": ("sens", "3A"), "LEVEL_3B": ("sens", "3B"),
             "LEVEL_4": ("sens", "4"), "LEVEL_R1": ("res", "R1"),
             "LEVEL_R2": ("res", "R2")}


class UnprovenancedDates(Exception):
    """Raised when annotated pairs lack provenanced annotation_dates."""


# --- gated fetch (UNVERIFIED: token endpoints return 401 here, so none of this
# has executed against the live API; shapes are asserted strictly) -------------

def fetch_gated_raw(cache, cfg, hugo_symbols, token, refresh=False):
    """Fetch + cache per-gene gated payloads. Returns {symbol: raw payload}."""
    base = cfg["oncokb_api_base"].rstrip("/")
    out = {}
    for sym in hugo_symbols:
        out[sym] = fetch_json(cache, f"gated_gene_{sym}", "GET",
                              base + "/genes/" + sym,
                              token=token, refresh=refresh)
    return out


def log_payload_inventory(payloads, path):
    """Write the key inventory of one sample payload for future date-field work."""
    from oncokb_client import utcnow
    sample = next(iter(payloads.values()), None)
    inv = {"sample_keys": sorted(sample.keys()) if isinstance(sample, dict) else type(sample).__name__,
           "n_genes": len(payloads), "logged_utc": utcnow()}
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(inv, fh, indent=2, sort_keys=True)
    return inv


def normalize_implications(gene_payloads):
    """Pure (assumed shape — VERIFY on first token run): raw gene payloads ->
    implication records {gene, alteration, cancer_type, level, oncogenicity}.

    Assumed model (OncoKB documented curation model: alterations carry
    oncogenicity; therapeutic implications carry level + cancer type + drug):
    payload = {"hugoSymbol": str, "alterations": [{"alteration": str,
      "oncogenicity": str, "therapeuticImplications": [{"cancerType": str,
      "levelOfEvidence": "LEVEL_1"|...}]}]}.
    Anything else raises FetchError naming the mismatch.
    """
    impls = []
    for sym, payload in gene_payloads.items():
        if not isinstance(payload, dict) or "alterations" not in payload:
            raise FetchError(
                f"gated payload shape mismatch for {sym}: expected dict with "
                f"'alterations', got {type(payload)} keys="
                f"{sorted(payload.keys()) if isinstance(payload, dict) else '?'} "
                f"(assumed shape unverified — see normalize_implications docstring)")
        for alt in payload["alterations"]:
            onc = alt.get("oncogenicity")
            for ti in alt.get("therapeuticImplications", []):
                impls.append({"gene": sym,
                              "alteration": alt.get("alteration"),
                              "cancer_type": ti.get("cancerType"),
                              "level": ti.get("levelOfEvidence"),
                              "oncogenicity": onc})
    return impls


def aggregate_pairs(implications, hgnc_by_hugo, valid_cancer_codes):
    """Pure: implication records -> pair frame WITHOUT dates (dating is separate).

    Rules: therapeutic levels only (LEVEL_MAP); per (gene, cancer) sens = best
    SENS_ORDER, res = best RES_ORDER; oncogenicity = the alteration behind the
    top sens level (ONCO_SEVERITY tie-break), else behind top res. Unknown
    levels/cancers are COUNTED and reported, never silently dropped (returned
    as `skipped`); pairs without HGNC ids are dropped with a count.
    """
    from collections import defaultdict
    grouped = defaultdict(list)
    skipped = defaultdict(int)
    for im in implications:
        mapped = LEVEL_MAP.get(im["level"])
        if mapped is None:
            skipped[f"level:{im['level']}"] += 1
            continue
        if im["cancer_type"] not in valid_cancer_codes:
            skipped[f"cancer:{im['cancer_type']}"] += 1
            continue
        grouped[(im["gene"], im["cancer_type"])].append((mapped, im))

    rows = []
    for (gene, cancer), items in grouped.items():
        sens = [(lvl, im) for (axis, lvl), im in items if axis == "sens"]
        res = [(lvl, im) for (axis, lvl), im in items if axis == "res"]
        if sens:
            sens_sorted = sorted(sens, key=lambda t: (
                SENS_ORDER[t[0]], ONCO_SEVERITY.index(t[1]["oncogenicity"])
                if t[1]["oncogenicity"] in ONCO_SEVERITY else len(ONCO_SEVERITY)))
            sens_level = sens_sorted[0][0]
            top_onc = sens_sorted[0][1]["oncogenicity"]
        else:
            sens_level, top_onc = None, None
        if res:
            res_sorted = sorted(res, key=lambda t: RES_ORDER[t[0]])
            res_level = res_sorted[0][0]
            if top_onc is None:
                top_onc = res_sorted[0][1]["oncogenicity"]
        else:
            res_level = None
        rows.append({"gene_id": hgnc_by_hugo.get(gene), "hugo_symbol": gene,
                     "oncotree_code": cancer, "annotated": True,
                     "oncogenicity": top_onc, "sens_level": sens_level,
                     "res_level": res_level})
    pairs = pd.DataFrame(rows, columns=["gene_id", "hugo_symbol", "oncotree_code",
                                        "annotated", "oncogenicity", "sens_level",
                                        "res_level"])
    n_no_hgnc = int(pairs["gene_id"].isna().sum()) if len(pairs) else 0
    pairs = pairs.dropna(subset=["gene_id"]).reset_index(drop=True)
    return pairs, dict(skipped), n_no_hgnc


def date_pairs_first_appearance(pairs, versions_log):
    """Date pairs by first appearance across versioned raw caches.

    versions_log: oldest-first list of {"version", "date", "genes": {symbol: [cancers]}}.
    Entries without a "genes" inventory (universe-only pulls) are skipped.
    A pair is datable ONLY if its earliest containing entry is strictly older
    than the final (current) entry: first-seen-in-current-pull means the date
    is right-censored, and dating it to the current release would be the
    anti-conservative imputation this builder refuses. Returns (dated, censored).
    """
    dated, censored = {}, []
    inv_log = [v for v in versions_log if "genes" in v]
    for _, r in pairs.iterrows():
        key = (r["hugo_symbol"], r["oncotree_code"])
        hits = [i for i, v in enumerate(inv_log)
                if key[0] in v["genes"] and key[1] in v["genes"][key[0]]]
        if not hits or min(hits) == len(inv_log) - 1:
            censored.append(key)
        else:
            first = inv_log[min(hits)]
            dated[key] = (first["date"], f"first-appearance:{first['version']}")
    return dated, censored


# --- orchestration --------------------------------------------------------------

def main(raw_dir, universe_path, pairs_path, cfg, refresh=False,
         token_env="ONCOKB_TOKEN"):
    os.makedirs(raw_dir, exist_ok=True)
    cache = Cache(raw_dir)
    universe = pd.read_parquet(universe_path)

    token = oncokb_token(token_env)
    if token is None:
        raise FetchError(
            f"gene universe has {len(universe)} genes, but per-cancer levels need "
            f"an OncoKB token: register free at https://www.oncokb.org/account, "
            f"set {token_env}, re-run. Refusing to write {pairs_path} rather than "
            f"emit dateless/level-less pairs.")
    annotated_genes = universe.loc[universe["oncokb_annotated"], "hugo_symbol"].tolist()
    raw = fetch_gated_raw(cache, cfg, annotated_genes, token, refresh=refresh)
    inv = log_payload_inventory(raw, os.path.join(raw_dir, "gated_key_inventory.json"))
    print(f"gated payloads: {len(raw)} genes; sample keys: {inv['sample_keys']}")
    impls = normalize_implications(raw)
    tumors = cache.read("oncotree_tumorTypes.json")
    import json as _json
    valid_cancers = {t.get("code") for t in _json.loads(tumors.decode("utf-8"))}
    hgnc_by_hugo = dict(zip(universe["hugo_symbol"], universe["hgnc_id"]))
    pairs_nodates, skipped, n_no_hgnc = aggregate_pairs(impls, hgnc_by_hugo, valid_cancers)
    print(f"aggregated {len(pairs_nodates)} pairs; skipped={skipped}; no-HGNC dropped={n_no_hgnc}")

    versions_path = os.path.join(raw_dir, "versions.jsonl")
    dv = _data_version(cache)
    inventory = {}
    for _, r in pairs_nodates.iterrows():
        inventory.setdefault(r["hugo_symbol"], [])
        if r["oncotree_code"] not in inventory[r["hugo_symbol"]]:
            inventory[r["hugo_symbol"]].append(r["oncotree_code"])
    with open(versions_path, "a", encoding="utf-8") as fh:
        fh.write(json.dumps({"version": dv.get("version"), "date": dv.get("date"),
                             "fetched_utc": utcnow(),
                             "genes": inventory}) + "\n")
    versions_log = []
    if os.path.exists(versions_path):
        with open(versions_path, encoding="utf-8") as fh:
            versions_log = [json.loads(line) for line in fh if line.strip()]
    dated, censored = date_pairs_first_appearance(pairs_nodates, versions_log)
    if censored:
        raise UnprovenancedDates(
            f"{len(censored)} annotated pairs lack provenanced annotation_dates "
            f"(no earlier versioned pull to date first appearance against). Raw "
            f"evidence is archived under {raw_dir}; re-run after a later OncoKB "
            f"release to date them. Refusing to write {pairs_path}: a "
            f"data-version-date imputation would be anti-conservative and silently "
            f"weaken the leakage guard.")

    ann = pairs_nodates.copy()
    ann["annotation_date"] = [pd.Timestamp(dated[(g, c)][0])
                              for g, c in zip(ann["hugo_symbol"], ann["oncotree_code"])]
    ann["annotation_date_source"] = [dated[(g, c)][1]
                                     for g, c in zip(ann["hugo_symbol"], ann["oncotree_code"])]

    # Controls (pre-data rule, flagged for prereg amendment: prereg pins the unit
    # of analysis but not the negative set). control_cancers="annotated_cancers":
    # unannotated pairs = HGNC-mapped universe genes x cancers carrying any
    # annotated pair, minus annotated pairs. Rationale: bounds the space to
    # cancers OncoKB actually curates instead of all 897 OncoTree codes.
    from schemas import pairs as pairs_schema, validate_pairs_consistency, \
        assert_no_novel_oncogenicity
    from io_util import write_parquet_with_attrs
    control_mode = cfg.get("control_cancers", "annotated_cancers")
    if control_mode != "annotated_cancers":
        raise ValueError(f"unknown control_cancers mode {control_mode!r}")
    control_cancers = sorted(ann["oncotree_code"].unique())
    have = set(zip(ann["gene_id"], ann["oncotree_code"]))
    genes = universe.loc[universe["hgnc_id"].notna(), ["hgnc_id"]].drop_duplicates()
    control_rows = [{"gene_id": gid, "oncotree_code": c, "annotated": False,
                     "annotation_date": pd.NaT, "annotation_date_source": None,
                     "oncogenicity": None, "sens_level": None, "res_level": None}
                    for gid in genes["hgnc_id"] for c in control_cancers
                    if (gid, c) not in have]
    full = pd.concat([ann.drop(columns=["hugo_symbol"]), pd.DataFrame(control_rows)],
                     ignore_index=True)
    assert_no_novel_oncogenicity(full)
    pairs_schema.validate(full)
    validate_pairs_consistency(full)
    write_parquet_with_attrs(full, pairs_path, {
        "oncokb_data_version": _data_version(cache).get("version", "unknown"),
        "fetched_utc": utcnow(),
        "builder": "build_pairs.py",
        "control_cancers": control_mode,
        "annotation_date_provenance": "first-appearance across versioned pulls; "
                                      "see data/raw/oncokb/versions.jsonl",
    })
    print(f"wrote {pairs_path}: {len(full)} pairs ({len(ann)} annotated, "
          f"{len(full) - len(ann)} controls)")
    return full


def _data_version(cache):
    raw = cache.read("info.json")
    if raw is None:
        return {}
    import json as _json
    return _json.loads(raw.decode("utf-8")).get("dataVersion", {})


try:
    snakemake  # noqa: F821 — injected by Snakemake when run as a script
except NameError:
    def _cli():
        import yaml
        ap = argparse.ArgumentParser(description="build pairs interim table")
        ap.add_argument("--raw-dir", required=True)
        ap.add_argument("--universe", required=True)
        ap.add_argument("--out", required=True)
        ap.add_argument("--config", required=True)
        ap.add_argument("--refresh", action="store_true")
        a = ap.parse_args()
        cfg = yaml.safe_load(open(a.config, encoding="utf-8"))
        main(a.raw_dir, a.universe, a.out, cfg, refresh=a.refresh)

    if __name__ == "__main__":
        _cli()
else:
    import yaml
    _cfg = dict(snakemake.config)
    main(os.path.join(_cfg["data_dir"], "raw", "oncokb"),
         snakemake.input.universe, snakemake.output[0], _cfg)
