"""
ZEMA 360 persistent agent memory — per-seller and per-buyer context.

Backed by Alibaba Cloud OSS so every agent run on Function Compute can read
prior deal history and risk signals, regardless of instance warm/cold state.

Layout in bucket fairprice-zema:
    memory/seller/<seller_id>.json   — seller deal history, trust profile
    memory/buyer/<buyer_id>.json     — buyer purchase history, credit signal

Each file is a JSON object with a bounded `history` list (last 50 events) and
an `aggregate` object of summary stats (deal_count, avg_risk, last_seen).

Fallback: if OSS is not configured, memory falls back to an in-process dict
(per-process, not shared) so dev runs still work.
"""
from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any, Optional

log = logging.getLogger(__name__)

_IN_PROCESS: dict[str, dict[str, Any]] = {}   # fallback when OSS is absent
_MAX_HISTORY = 50


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ─── OSS helpers ─────────────────────────────────────────────────────────────

def _oss_key(entity_type: str, entity_id: str) -> str:
    return f"memory/{entity_type}/{entity_id}.json"


def _load_from_oss(key: str) -> dict[str, Any] | None:
    try:
        from app.zema.oss_client import get_bytes
        data = get_bytes(key)
        if data:
            return json.loads(data)
    except Exception as exc:
        log.debug("OSS memory read miss (%s): %s", key, exc)
    return None


def _save_to_oss(key: str, payload: dict[str, Any]) -> None:
    try:
        from app.zema.oss_client import put_bytes
        put_bytes(key, json.dumps(payload, ensure_ascii=False).encode())
    except Exception as exc:
        log.warning("OSS memory write failed (%s): %s", key, exc)


# ─── Public API ───────────────────────────────────────────────────────────────

def load(entity_type: str, entity_id: str) -> dict[str, Any]:
    """
    Load memory for a seller or buyer.  Returns an empty baseline if not found.

    entity_type: "seller" | "buyer"
    entity_id:   DB id of the entity
    """
    key = _oss_key(entity_type, entity_id)

    # Try OSS first
    data = _load_from_oss(key)
    if data is not None:
        return data

    # Fallback: in-process dict
    process_key = f"{entity_type}:{entity_id}"
    if process_key in _IN_PROCESS:
        return _IN_PROCESS[process_key]

    return _baseline(entity_type, entity_id)


def save(entity_type: str, entity_id: str, memory: dict[str, Any]) -> None:
    """Persist updated memory back to OSS (and in-process fallback)."""
    key = _oss_key(entity_type, entity_id)
    memory["updated_at"] = _now_iso()
    _save_to_oss(key, memory)
    _IN_PROCESS[f"{entity_type}:{entity_id}"] = memory


def record_event(
    entity_type: str,
    entity_id: str,
    event: dict[str, Any],
) -> dict[str, Any]:
    """
    Append a new event to the entity's history and refresh aggregate stats.
    Returns the updated memory dict.

    event should include at minimum: { type, run_id, risk_score, decision, ts? }
    """
    memory = load(entity_type, entity_id)
    event.setdefault("ts", _now_iso())

    history: list[dict[str, Any]] = memory.get("history", [])
    history.append(event)
    if len(history) > _MAX_HISTORY:
        history = history[-_MAX_HISTORY:]
    memory["history"] = history

    # Refresh aggregates
    memory["aggregate"] = _aggregate(history)
    save(entity_type, entity_id, memory)
    return memory


def get_context(entity_type: str, entity_id: str) -> dict[str, Any]:
    """
    Return a compact context dict suitable for including in an agent prompt.
    Omits raw history to keep token count low.
    """
    memory = load(entity_type, entity_id)
    agg = memory.get("aggregate", {})
    recent = memory.get("history", [])[-5:]   # last 5 events
    return {
        "entity_type": entity_type,
        "entity_id": entity_id,
        "deal_count": agg.get("deal_count", 0),
        "avg_risk_score": agg.get("avg_risk_score", 50),
        "approved_count": agg.get("approved_count", 0),
        "rejected_count": agg.get("rejected_count", 0),
        "last_seen": agg.get("last_seen"),
        "recent_events": recent,
    }


# ─── Internal helpers ─────────────────────────────────────────────────────────

def _baseline(entity_type: str, entity_id: str) -> dict[str, Any]:
    return {
        "entity_type": entity_type,
        "entity_id": entity_id,
        "created_at": _now_iso(),
        "updated_at": _now_iso(),
        "history": [],
        "aggregate": {
            "deal_count": 0,
            "avg_risk_score": 50,
            "approved_count": 0,
            "rejected_count": 0,
            "last_seen": None,
        },
    }


def _aggregate(history: list[dict[str, Any]]) -> dict[str, Any]:
    if not history:
        return {
            "deal_count": 0,
            "avg_risk_score": 50,
            "approved_count": 0,
            "rejected_count": 0,
            "last_seen": None,
        }
    risk_scores = [h.get("risk_score", 50) for h in history if "risk_score" in h]
    return {
        "deal_count": len(history),
        "avg_risk_score": round(sum(risk_scores) / len(risk_scores), 1) if risk_scores else 50,
        "approved_count": sum(1 for h in history if h.get("decision") == "approved"),
        "rejected_count": sum(1 for h in history if h.get("decision") in ("rejected", "reject")),
        "last_seen": history[-1].get("ts"),
    }
