"""
Qwen client for the ZEMA backend (Alibaba Cloud Model Studio / DashScope).

Uses the OpenAI-compatible endpoint over httpx (already a project dependency)
so we avoid pulling in a heavier SDK. Mirrors the frontend lib/qwen.ts contract
so both halves of the system speak Qwen the same way.
"""
from __future__ import annotations

import json
import asyncio
import random
from typing import Any, Optional

import httpx

from app.core.config import settings


class QwenError(RuntimeError):
    pass


def is_configured() -> bool:
    return bool(settings.DASHSCOPE_API_KEY)


def _chat_url() -> str:
    return settings.QWEN_BASE_URL.rstrip("/") + "/chat/completions"


async def chat(
    messages: list[dict[str, Any]],
    *,
    model: Optional[str] = None,
    tools: Optional[list[dict[str, Any]]] = None,
    tool_choice: Optional[str] = None,
    temperature: float = 0.7,
    json_mode: bool = False,
    enable_search: bool = False,
    timeout: float = 45.0,
    max_retries: int = 4,
) -> dict[str, Any]:
    """One round trip to Qwen. Returns {content, tool_calls, raw}."""
    if not is_configured():
        raise QwenError("DASHSCOPE_API_KEY (Qwen) is not configured")

    body: dict[str, Any] = {
        "model": model or settings.QWEN_MODEL_REASON,
        "messages": messages,
        "temperature": temperature,
    }
    if tools:
        body["tools"] = tools
        if tool_choice:
            body["tool_choice"] = tool_choice
    if json_mode:
        body["response_format"] = {"type": "json_object"}
    if enable_search:
        body["enable_search"] = True

    headers = {
        "Authorization": f"Bearer {settings.DASHSCOPE_API_KEY}",
        "Content-Type": "application/json",
    }

    last_err: Optional[Exception] = None
    async with httpx.AsyncClient(timeout=timeout) as client:
        for attempt in range(max_retries + 1):
            try:
                res = await client.post(_chat_url(), headers=headers, json=body)
                if (res.status_code == 429 or res.status_code >= 500) and attempt < max_retries:
                    await asyncio.sleep((2 ** attempt) * 0.8 + random.random() * 0.6)
                    continue
                if res.status_code >= 400:
                    raise QwenError(f"Qwen API {res.status_code}: {res.text[:500]}")
                data = res.json()
                msg = (data.get("choices") or [{}])[0].get("message", {}) or {}
                return {
                    "content": msg.get("content"),
                    "tool_calls": msg.get("tool_calls") or [],
                    "raw": data,
                }
            except (httpx.HTTPError, QwenError) as err:
                last_err = err
                if attempt < max_retries:
                    await asyncio.sleep((2 ** attempt) * 0.8 + random.random() * 0.6)
                    continue
    raise QwenError(str(last_err) if last_err else "Qwen request failed after retries")


async def chat_json(
    prompt: str,
    *,
    system: Optional[str] = None,
    model: Optional[str] = None,
    enable_search: bool = False,
    temperature: float = 0.4,
) -> Any:
    """Single JSON object back from a text prompt (best-effort extraction)."""
    messages: list[dict[str, Any]] = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})
    out = await chat(
        messages,
        model=model or settings.QWEN_MODEL_REASON,
        json_mode=True,
        enable_search=enable_search,
        temperature=temperature,
    )
    return extract_json(out.get("content") or "")


async def vision_json(
    prompt: str,
    image_urls: list[str],
    *,
    model: Optional[str] = None,
    temperature: float = 0.3,
) -> Any:
    """Multimodal call (qwen-vl-max): reason over one or more images -> JSON."""
    content: list[dict[str, Any]] = [{"type": "text", "text": prompt}]
    for url in image_urls:
        content.append({"type": "image_url", "image_url": {"url": url}})
    out = await chat(
        [{"role": "user", "content": content}],
        model=model or settings.QWEN_MODEL_VISION,
        json_mode=True,
        temperature=temperature,
    )
    return extract_json(out.get("content") or "")


def extract_json(text: str) -> Any:
    """Tolerant JSON extractor — strips ```json fences and stray prose."""
    s = (text or "").replace("```json", "").replace("```", "").strip()
    start = min((i for i in (s.find("{"), s.find("[")) if i != -1), default=-1)
    if start != -1:
        # find matching last brace/bracket of the same kind
        end = max(s.rfind("}"), s.rfind("]"))
        if end > start:
            s = s[start:end + 1]
    return json.loads(s)
