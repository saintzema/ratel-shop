"""
Alibaba Cloud Object Storage (OSS) client.

Stores ingested seller product photos, KYC documents, and ZEMA-generated
receipt/contract PDFs. All config comes from env (see core/config.py). The
client is import-safe even when OSS isn't configured yet — callers should
check `is_configured()` first.
"""
from __future__ import annotations

from typing import Optional

from app.core.config import settings

try:  # oss2 is optional at import time so the app boots without credentials
    import oss2  # type: ignore
except Exception:  # pragma: no cover - oss2 not installed in some envs
    oss2 = None  # type: ignore


def is_configured() -> bool:
    return bool(
        oss2
        and settings.ALIBABA_CLOUD_ACCESS_KEY_ID
        and settings.ALIBABA_CLOUD_ACCESS_KEY_SECRET
        and settings.OSS_BUCKET
        and settings.OSS_ENDPOINT
    )


def _bucket():
    if not is_configured():
        raise RuntimeError("OSS is not configured (set ALIBABA_CLOUD_* and OSS_* env vars)")
    auth = oss2.Auth(  # type: ignore[union-attr]
        settings.ALIBABA_CLOUD_ACCESS_KEY_ID,
        settings.ALIBABA_CLOUD_ACCESS_KEY_SECRET,
    )
    return oss2.Bucket(auth, settings.OSS_ENDPOINT, settings.OSS_BUCKET)  # type: ignore[union-attr]


def put_bytes(key: str, data: bytes, content_type: Optional[str] = None) -> str:
    """Upload raw bytes and return the object's public URL."""
    bucket = _bucket()
    headers = {"Content-Type": content_type} if content_type else None
    bucket.put_object(key, data, headers=headers)
    host = settings.OSS_ENDPOINT.replace("https://", "").replace("http://", "")
    return f"https://{settings.OSS_BUCKET}.{host}/{key}"


def get_bytes(key: str) -> bytes:
    return _bucket().get_object(key).read()


def signed_url(key: str, expires_seconds: int = 3600) -> str:
    """Time-limited URL for private objects (e.g. KYC docs)."""
    return _bucket().sign_url("GET", key, expires_seconds)
