"""Interpretation policy as versioned, hashable data (never hard-coded logic)."""
from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any

from .canon import sha256
from .snapshot import LEVELS

TIERS = ("I", "II", "III", "IV")

# How multiple evidence items combine into one variant tier. Previously this was
# hard-coded in the engine (`_best`), so changing it changed every decision hash
# and broke attribution. It is now policy data: versioned, hashed, and readable by
# `engine.aggregate`.
AGGREGATIONS = ("best", "best_supported")

# Default is deliberately NOT "best". "best" is the optimistic maximum, which lets
# a single Level A assertion outvote any amount of weaker contradictory support.
# A policy that omits the field gets the safer rule.
DEFAULT_AGGREGATION = "best_supported"


class PolicyError(ValueError):
    pass


@dataclass(frozen=True)
class Policy:
    data: dict[str, Any]
    hash: str

    @property
    def policy_id(self) -> str:
        return self.data["policy_id"]


def build_policy(data: dict[str, Any]) -> Policy:
    for key in ("policy_id", "level_tier", "offlabel_penalty", "resistance_blocks_levels", "recommend_tiers"):
        if key not in data:
            raise PolicyError(f"policy missing required key: {key}")
    lt = data["level_tier"]
    if set(lt) != set(LEVELS):
        raise PolicyError(f"level_tier must map exactly {LEVELS}")
    for lvl, tier in lt.items():
        if tier not in TIERS[:3]:
            raise PolicyError(f"level_tier[{lvl}]={tier!r}; evidence may map to I, II or III only")
    if not isinstance(data["offlabel_penalty"], int) or data["offlabel_penalty"] < 0:
        raise PolicyError("offlabel_penalty must be a non-negative integer")
    for lvl in data["resistance_blocks_levels"]:
        if lvl not in LEVELS:
            raise PolicyError(f"resistance_blocks_levels has bad level {lvl!r}")
    for t in data["recommend_tiers"]:
        if t not in TIERS:
            raise PolicyError(f"recommend_tiers has bad tier {t!r}")
    aggregation = data.get("aggregation", DEFAULT_AGGREGATION)
    if aggregation not in AGGREGATIONS:
        raise PolicyError(
            f"aggregation={aggregation!r}; must be one of {AGGREGATIONS}"
        )
    canonical_data = {
        "policy_id": data["policy_id"],
        "level_tier": dict(lt),
        "offlabel_penalty": data["offlabel_penalty"],
        "resistance_blocks_levels": sorted(data["resistance_blocks_levels"]),
        "recommend_tiers": sorted(data["recommend_tiers"]),
        "aggregation": aggregation,
    }
    return Policy(data=canonical_data, hash=sha256(canonical_data))


def load_policy(path: str) -> Policy:
    with open(path, encoding="utf-8") as fh:
        return build_policy(json.load(fh))
