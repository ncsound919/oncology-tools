"""Canonical serialization + hashing. Every artifact identity in oncoreplay is a content hash."""
from __future__ import annotations

import hashlib
import json
from typing import Any


def canonical(obj: Any) -> str:
    """Deterministic JSON: sorted keys, no whitespace, ASCII only. Floats are rejected
    because their text form is a portability hazard for hashing."""
    _reject_floats(obj)
    return json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=True)


def sha256(obj: Any) -> str:
    return hashlib.sha256(canonical(obj).encode("ascii")).hexdigest()


def _reject_floats(obj: Any) -> None:
    if isinstance(obj, float):
        raise ValueError("floats are not allowed in hashed artifacts; use strings or ints")
    if isinstance(obj, dict):
        for v in obj.values():
            _reject_floats(v)
    elif isinstance(obj, (list, tuple)):
        for v in obj:
            _reject_floats(v)
