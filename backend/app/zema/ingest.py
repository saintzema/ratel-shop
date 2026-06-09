"""
ZEMA 360 multimodal ingest — Qwen-VL (qwen-vl-max) pipeline.

Seller WhatsApps product photos + KYC docs → structured listing + KYC
verification, all artifacts persisted to Alibaba Cloud OSS bucket
``fairprice-zema``.

Flow
----
1. For each image_url: call qwen-vl-max with a strict JSON schema prompt
   → extract title, category, price_ngn, condition, quantity, description
2. For each kyc_url: call qwen-vl-max with a KYC extraction prompt
   → extract doc_type, name, id_number, expiry, matches_seller flag
3. Merge image results → canonical listing dict
4. Upload every source image + kyc doc to OSS under
   ``ingest/<seller_id>/<run_id>/``
5. Return IngestResult with listing + kyc_verified flag + oss_paths

The caller (orchestrator.ingest) receives IngestResult and may proceed
directly to Phase.ASSESS.
"""
from __future__ import annotations

import asyncio
import json
import logging
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Optional

import httpx

from app.zema import qwen_client

log = logging.getLogger(__name__)

# ─── Result types ─────────────────────────────────────────────────────────────

@dataclass
class KycVerification:
    doc_type: str = ""           # "NIN" | "BVN" | "Passport" | "Driver's Licence" | "unknown"
    name: str = ""
    id_number: str = ""
    expiry: str = ""             # ISO date or empty
    matches_seller: bool = False
    confidence: float = 0.0      # 0–1 as returned by VL
    raw: dict[str, Any] = field(default_factory=dict)


@dataclass
class IngestResult:
    run_id: str = field(default_factory=lambda: uuid.uuid4().hex[:12])
    seller_id: str = ""
    title: str = ""
    category: str = ""
    price_ngn: Optional[float] = None
    condition: str = ""          # "new" | "fairly_used" | "used"
    quantity: int = 1
    description: str = ""
    tags: list[str] = field(default_factory=list)
    image_oss_paths: list[str] = field(default_factory=list)
    kyc_oss_paths: list[str] = field(default_factory=list)
    kyc_verification: Optional[KycVerification] = None
    kyc_verified: bool = False
    confidence: float = 0.0      # average across images
    source_image_urls: list[str] = field(default_factory=list)
    source_kyc_urls: list[str] = field(default_factory=list)
    error: Optional[str] = None
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


# ─── Prompts ──────────────────────────────────────────────────────────────────

_LISTING_SYSTEM = """\
You are a meticulous product catalogue analyst for FairPrice.ng, Nigeria's
leading escrow marketplace. Your job: extract structured product information
from seller photos and return ONLY valid JSON — no markdown, no prose.

Respond with exactly this JSON schema (all fields required):
{
  "title": "<concise product title, max 80 chars>",
  "category": "<one of: Electronics, Fashion, Food, Furniture, Vehicle Parts, Beauty, Books, Sports, Home & Garden, Other>",
  "price_ngn": <number or null>,
  "condition": "<one of: new, fairly_used, used>",
  "quantity": <integer, default 1>,
  "description": "<2-3 sentence product description>",
  "tags": ["<tag1>", "<tag2>"],
  "confidence": <float 0.0–1.0 representing your extraction confidence>
}
"""

_LISTING_USER = "Analyse this product image and extract the catalogue fields:"

_KYC_SYSTEM = """\
You are an identity-document analyst. Extract information from Nigerian
government-issued ID documents and return ONLY valid JSON.

Respond with exactly this JSON schema:
{
  "doc_type": "<one of: NIN, BVN, Passport, Driver's Licence, Voter Card, unknown>",
  "name": "<full name on the document>",
  "id_number": "<document number/ID string>",
  "expiry": "<ISO date YYYY-MM-DD or empty string if none/not visible>",
  "matches_seller": <true if the document appears legitimate and un-tampered>,
  "confidence": <float 0.0–1.0>
}
"""

_KYC_USER = "Extract identity document information from this image:"


# ─── Qwen-VL caller ───────────────────────────────────────────────────────────

async def _vl_json(image_url: str, system: str, user_text: str) -> dict[str, Any]:
    """
    Call qwen-vl-max with a single image and return the parsed JSON payload.
    Delegates to qwen_client.vision_json which handles retries + JSON extraction.
    The system prompt is prepended to the user text since vision_json uses a
    single prompt string.
    """
    prompt = f"{system}\n\n{user_text}"
    result = await qwen_client.vision_json(
        prompt,
        image_urls=[image_url],
        temperature=0.1,
    )
    if not isinstance(result, dict):
        raise ValueError(f"Expected JSON object from Qwen-VL, got: {type(result)}")
    return result


# ─── OSS upload helper ────────────────────────────────────────────────────────

def _oss_path(seller_id: str, run_id: str, kind: str, idx: int, ext: str = "jpg") -> str:
    return f"ingest/{seller_id}/{run_id}/{kind}_{idx:02d}.{ext}"


async def _upload_from_url(url: str, oss_key: str) -> bool:
    """Download bytes from url and upload to OSS. Returns True on success."""
    try:
        from app.zema.oss_client import put_bytes
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.get(url, follow_redirects=True)
            r.raise_for_status()
            put_bytes(oss_key, r.content)
            return True
    except Exception as exc:
        log.warning("OSS upload failed (%s): %s", oss_key, exc)
        return False


# ─── Main entry point ─────────────────────────────────────────────────────────

async def run_ingest(
    seller_id: str,
    image_urls: list[str],
    kyc_urls: list[str],
    seller_name: str = "",
) -> IngestResult:
    """
    Multimodal ingest: photos + KYC → structured listing + OSS artifacts.

    Parameters
    ----------
    seller_id   : FairPrice DB seller id (used as OSS key namespace)
    image_urls  : presigned/public URLs of product photos (≤10)
    kyc_urls    : presigned/public URLs of KYC documents (≤3)
    seller_name : seller's registered name for KYC name-match check (optional)

    Returns
    -------
    IngestResult with listing fields populated and oss_paths pointing to
    uploaded artifacts in the fairprice-zema bucket.
    """
    result = IngestResult(seller_id=seller_id)
    result.source_image_urls = image_urls[:10]
    result.source_kyc_urls = kyc_urls[:3]

    # ── 1. Process product images in parallel ──────────────────────────────────
    listing_tasks = [
        _vl_json(url, _LISTING_SYSTEM, _LISTING_USER)
        for url in image_urls[:10]
    ]
    oss_upload_tasks = [
        _upload_from_url(url, _oss_path(seller_id, result.run_id, "photo", i))
        for i, url in enumerate(image_urls[:10])
    ]

    listing_raw: list[dict[str, Any]] = []
    oss_results: list[bool] = []

    listing_raw_or_err, oss_results = await asyncio.gather(
        asyncio.gather(*listing_tasks, return_exceptions=True),
        asyncio.gather(*oss_upload_tasks, return_exceptions=True),
    )

    for i, raw in enumerate(listing_raw_or_err):
        if isinstance(raw, Exception):
            log.error("VL listing extraction %d failed: %s", i, raw)
        else:
            listing_raw.append(raw)
        oss_key = _oss_path(seller_id, result.run_id, "photo", i)
        if oss_results[i] is True:
            result.image_oss_paths.append(oss_key)

    # ── 2. Merge image extractions → canonical listing ─────────────────────────
    if listing_raw:
        result = _merge_listing_results(result, listing_raw)
    else:
        result.error = "No product images could be analysed by Qwen-VL"
        return result

    # ── 3. Process KYC documents in parallel ──────────────────────────────────
    if kyc_urls:
        kyc_tasks = [
            _vl_json(url, _KYC_SYSTEM, _KYC_USER)
            for url in kyc_urls[:3]
        ]
        kyc_oss_tasks = [
            _upload_from_url(url, _oss_path(seller_id, result.run_id, "kyc", i, "jpg"))
            for i, url in enumerate(kyc_urls[:3])
        ]

        kyc_raw_or_err, kyc_oss_results = await asyncio.gather(
            asyncio.gather(*kyc_tasks, return_exceptions=True),
            asyncio.gather(*kyc_oss_tasks, return_exceptions=True),
        )

        kyc_docs: list[dict[str, Any]] = []
        for i, raw in enumerate(kyc_raw_or_err):
            if isinstance(raw, Exception):
                log.error("VL kyc extraction %d failed: %s", i, raw)
            else:
                kyc_docs.append(raw)
            oss_key = _oss_path(seller_id, result.run_id, "kyc", i, "jpg")
            if kyc_oss_results[i] is True:
                result.kyc_oss_paths.append(oss_key)

        if kyc_docs:
            # Use the highest-confidence doc
            best_kyc = max(kyc_docs, key=lambda d: d.get("confidence", 0))
            kyc = KycVerification(
                doc_type=best_kyc.get("doc_type", "unknown"),
                name=best_kyc.get("name", ""),
                id_number=best_kyc.get("id_number", ""),
                expiry=best_kyc.get("expiry", ""),
                matches_seller=best_kyc.get("matches_seller", False),
                confidence=float(best_kyc.get("confidence", 0)),
                raw=best_kyc,
            )
            # Optionally cross-check name if seller_name provided
            if seller_name and kyc.name:
                name_match = _fuzzy_name_match(kyc.name, seller_name)
                kyc.matches_seller = kyc.matches_seller and name_match

            result.kyc_verification = kyc
            result.kyc_verified = kyc.matches_seller and kyc.confidence >= 0.70

    # ── 4. Save ingest manifest to OSS ────────────────────────────────────────
    _save_manifest(result)

    log.info(
        "ingest complete: run=%s seller=%s title=%r kyc_verified=%s "
        "photos=%d kyc_docs=%d",
        result.run_id, seller_id, result.title, result.kyc_verified,
        len(result.image_oss_paths), len(result.kyc_oss_paths),
    )
    return result


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _merge_listing_results(result: IngestResult, raws: list[dict[str, Any]]) -> IngestResult:
    """
    Merge multiple per-image VL outputs into one canonical listing.
    Strategy: take the highest-confidence image for title/category/price;
    concatenate tags and pick the most common condition.
    """
    best = max(raws, key=lambda d: d.get("confidence", 0))
    result.title = best.get("title", "")
    result.category = best.get("category", "Other")
    result.price_ngn = best.get("price_ngn") or None
    result.condition = best.get("condition", "used")
    result.quantity = int(best.get("quantity") or 1)
    result.description = best.get("description", "")

    # Deduplicated tag union
    tags: set[str] = set()
    for r in raws:
        tags.update(r.get("tags") or [])
    result.tags = sorted(tags)[:10]

    # Average confidence
    confidences = [r.get("confidence", 0) for r in raws]
    result.confidence = round(sum(confidences) / len(confidences), 3)

    return result


def _fuzzy_name_match(a: str, b: str) -> bool:
    """Very lightweight name-match: checks if all tokens in the shorter name
    appear somewhere in the longer name (case-insensitive)."""
    a_tokens = set(a.lower().split())
    b_tokens = set(b.lower().split())
    shorter = a_tokens if len(a_tokens) <= len(b_tokens) else b_tokens
    longer  = b_tokens if len(a_tokens) <= len(b_tokens) else a_tokens
    return all(tok in longer for tok in shorter)


def _save_manifest(result: IngestResult) -> None:
    """Persist a JSON manifest of this ingest run to OSS for auditability."""
    try:
        from app.zema.oss_client import put_bytes
        manifest = {
            "run_id": result.run_id,
            "seller_id": result.seller_id,
            "listing": {
                "title": result.title,
                "category": result.category,
                "price_ngn": result.price_ngn,
                "condition": result.condition,
                "quantity": result.quantity,
                "description": result.description,
                "tags": result.tags,
                "confidence": result.confidence,
            },
            "kyc_verified": result.kyc_verified,
            "image_oss_paths": result.image_oss_paths,
            "kyc_oss_paths": result.kyc_oss_paths,
            "created_at": result.created_at,
        }
        key = f"ingest/{result.seller_id}/{result.run_id}/manifest.json"
        put_bytes(key, json.dumps(manifest, ensure_ascii=False).encode())
    except Exception as exc:
        log.warning("manifest save failed: %s", exc)
