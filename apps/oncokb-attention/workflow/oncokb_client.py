"""Thin HTTP + frozen-cache layer for the build_pairs data sources. Stdlib only.

Design (audit 2026-10-10):
  - Every response is cached as raw bytes under data/raw/oncokb/ with a .meta.json
    sidecar (url, fetched_utc, bytes). Re-runs read the cache: the download
    freeze (config snapshot_date) is enforced by construction, not by memory.
  - Public endpoints (OncoKB /info, /levels, /utils/cancerGeneList; OncoTree;
    MyGene) need no token. Token-gated OncoKB endpoints read the token from the
    env var named by config (default ONCOKB_TOKEN) — never from code, never
    logged. 401 fails fast with self-service instructions; 5xx retries 3x.
  - No HTML scraping, no portal-proxy use: only documented API endpoints.
"""
import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone

RETRYABLE = (500, 502, 503, 504)


class FetchError(Exception):
    """Raised for any non-recoverable fetch failure, with the URL and status."""


def utcnow():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


class Cache:
    def __init__(self, raw_dir):
        self.raw_dir = raw_dir
        os.makedirs(raw_dir, exist_ok=True)

    def _paths(self, key):
        safe = "".join(c if c.isalnum() or c in "-_." else "_" for c in key)
        return (os.path.join(self.raw_dir, safe + ".json"),
                os.path.join(self.raw_dir, safe + ".meta.json"))

    def read(self, key):
        body_path, _ = self._paths(key)
        if not os.path.exists(body_path):
            return None
        with open(body_path, "rb") as fh:
            return fh.read()

    def write(self, key, body, meta):
        body_path, meta_path = self._paths(key)
        with open(body_path, "wb") as fh:
            fh.write(body)
        with open(meta_path, "w", encoding="utf-8") as fh:
            json.dump(meta, fh, indent=2, sort_keys=True)


def _http_json(method, url, body=None, headers=None, token=None, retries=3):
    """Single HTTP round-trip returning (status, raw_bytes). No caching."""
    hdrs = dict(headers or {})
    hdrs.setdefault("Accept", "application/json")
    if token:
        hdrs["Authorization"] = "Bearer " + token
    data = None
    if body is not None:
        data = urllib.parse.urlencode(body).encode("utf-8") if isinstance(body, dict) else body
    last_status = None
    for attempt in range(retries + 1):
        req = urllib.request.Request(url, data=data, headers=hdrs, method=method)
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return r.status, r.read()
        except urllib.error.HTTPError as e:
            last_status = e.code
            if e.code == 401:
                raise FetchError(
                    f"401 Unauthorized for {url}: this endpoint needs an OncoKB token. "
                    f"Register free at https://www.oncokb.org/account, set "
                    f"ONCOKB_TOKEN, and re-run with --refresh.")
            if e.code in RETRYABLE and attempt < retries:
                time.sleep(2 ** attempt)
                continue
            raise FetchError(f"HTTP {e.code} for {url}: {e.reason}")
        except (urllib.error.URLError, TimeoutError) as e:
            if attempt < retries:
                time.sleep(2 ** attempt)
                continue
            raise FetchError(f"network failure for {url} after {retries + 1} tries: {e}")
    raise FetchError(f"gave up on {url} (last status {last_status})")


def fetch_json(cache, key, method, url, body=None, headers=None, token=None,
               refresh=False):
    """Cache-first JSON fetch. Returns parsed JSON. Records provenance in .meta.json."""
    if not refresh:
        cached = cache.read(key)
        if cached is not None:
            return json.loads(cached.decode("utf-8"))
    status, raw = _http_json(method, url, body=body, headers=headers, token=token)
    cache.write(key, raw, {"url": url, "status": status,
                           "fetched_utc": utcnow(), "bytes": len(raw)})
    return json.loads(raw.decode("utf-8"))


def fetch_bytes(cache, key, method, url, body=None, headers=None, token=None,
                refresh=False):
    """Cache-first raw-bytes fetch (for non-JSON payloads, e.g. GTEx .gct.gz)."""
    if not refresh:
        cached = cache.read(key)
        if cached is not None:
            return cached
    status, raw = _http_json(method, url, body=body, headers=headers, token=token)
    cache.write(key, raw, {"url": url, "status": status,
                           "fetched_utc": utcnow(), "bytes": len(raw)})
    return raw


def oncokb_token(env_name="ONCOKB_TOKEN"):
    """Read the OncoKB token from the environment. Returns None when unset."""
    return os.environ.get(env_name) or None
