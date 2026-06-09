"""
ZEMA 360 — Alibaba Cloud Function Compute handler
Python 3.10 managed runtime, HTTP trigger

Endpoints:
  GET  /                       → redirect to /api/v1/zema/health
  GET  /api/v1/zema/health     → liveness + Qwen/OSS config check
  POST /api/v1/zema/negotiate  → multi-agent Qwen panel (Sales/Inventory/Finance)
  POST /api/v1/zema/ingest     → Qwen-VL photo+KYC → structured listing
"""
import json
import os
import urllib.request
import urllib.error

# ─── config ──────────────────────────────────────────────────────────────────
DASHSCOPE_KEY = os.environ.get("DASHSCOPE_API_KEY", "")
QWEN_BASE_URL = os.environ.get(
    "QWEN_BASE_URL",
    "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
)
OSS_BUCKET    = os.environ.get("OSS_BUCKET", "")
OSS_ENDPOINT  = os.environ.get("OSS_ENDPOINT", "")
MODEL_FAST    = os.environ.get("QWEN_MODEL_FAST", "qwen-plus")
MODEL_VISION  = os.environ.get("QWEN_MODEL_VISION", "qwen-vl-max")


def _json_response(body: dict, status: int = 200) -> dict:
    return {
        "statusCode": status,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
        },
        "body": json.dumps(body, ensure_ascii=False),
    }


def _qwen_chat(messages: list, model: str = MODEL_FAST) -> str:
    """Minimal synchronous Qwen chat call via urllib (no extra deps needed)."""
    if not DASHSCOPE_KEY:
        raise RuntimeError("DASHSCOPE_API_KEY not set")
    payload = json.dumps({
        "model": model,
        "messages": messages,
        "temperature": 0.4,
        "max_tokens": 512,
    }).encode()
    req = urllib.request.Request(
        url=f"{QWEN_BASE_URL.rstrip('/')}/chat/completions",
        data=payload,
        headers={
            "Authorization": f"Bearer {DASHSCOPE_KEY}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as res:
        data = json.loads(res.read())
    return data["choices"][0]["message"]["content"]


# ─── route handlers ───────────────────────────────────────────────────────────

def handle_health() -> dict:
    """Liveness + Alibaba Cloud service config check."""
    qwen_ok = bool(DASHSCOPE_KEY)
    oss_ok  = bool(OSS_BUCKET and OSS_ENDPOINT)

    # Optional: live-test Qwen (only if key is present)
    qwen_live = False
    qwen_note = ""
    if qwen_ok:
        try:
            _qwen_chat([{"role": "user", "content": "Reply with exactly: ok"}])
            qwen_live = True
        except Exception as exc:
            qwen_note = str(exc)[:120]

    return _json_response({
        "status":        "ok",
        "engine":        "ZEMA 360",
        "version":       "1.0.0",
        "runtime":       "Alibaba Cloud Function Compute — Python 3.10",
        "region":        "ap-southeast-1",
        "qwen_configured": qwen_ok,
        "qwen_live":     qwen_live,
        "qwen_model":    MODEL_FAST,
        "qwen_vision":   MODEL_VISION,
        "oss_configured": oss_ok,
        "oss_bucket":    OSS_BUCKET or "(not set)",
        "oss_note":      qwen_note or None,
        "alibaba_services": [
            "Function Compute (FC3) — Python 3.10",
            "Model Studio (DashScope/Qwen)",
            f"Object Storage Service — bucket {OSS_BUCKET or '(pending)'}",
        ],
    })


def handle_negotiate(body: dict) -> dict:
    """3-agent panel: Sales / Inventory / Finance evaluate a deal."""
    deal     = body.get("deal", {})
    seller_id = body.get("seller_id", "unknown")
    if not deal:
        return _json_response({"error": "deal object is required"}, 400)

    deal_str = json.dumps(deal, ensure_ascii=False)
    agents = [
        ("sales",     "You are a Sales Agent. Evaluate this deal and reply JSON: {stance, price_suggestion, reason}"),
        ("inventory", "You are an Inventory Agent. Evaluate this deal and reply JSON: {stance, stock_risk, fulfillment_ok}"),
        ("finance",   "You are a Finance Agent. Evaluate this deal and reply JSON: {stance, risk_score, escrow_ok, veto}"),
    ]
    positions = []
    for name, system_prompt in agents:
        try:
            raw = _qwen_chat([
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": f"Deal: {deal_str}\nSeller: {seller_id}"},
            ])
            # strip json fences
            clean = raw.strip().lstrip("```json").lstrip("```").rstrip("```").strip()
            parsed = json.loads(clean)
        except Exception as exc:
            parsed = {"error": str(exc)[:120], "stance": "unknown"}
        parsed["agent"] = name
        positions.append(parsed)

    finance     = next((p for p in positions if p["agent"] == "finance"), {})
    risk_score  = finance.get("risk_score", 50)
    any_veto    = any(p.get("veto") or p.get("stance") == "reject" for p in positions)
    requires_human = bool(any_veto or (isinstance(risk_score, (int, float)) and risk_score >= 60))

    return _json_response({
        "seller_id":      seller_id,
        "positions":      positions,
        "requires_human": requires_human,
        "risk_score":     risk_score,
        "phase":          "awaiting_approval" if requires_human else "execute",
    })


def handle_ingest(body: dict) -> dict:
    """Qwen-VL: first product image → structured listing JSON."""
    seller_id  = body.get("seller_id", "unknown")
    image_urls = body.get("image_urls", [])
    if not image_urls:
        return _json_response({"error": "image_urls required"}, 400)

    prompt = (
        "You are a product catalogue analyst for FairPrice.ng. "
        "Analyse this product image and return ONLY valid JSON:\n"
        '{"title":"...","category":"...","price_ngn":null,"condition":"new|fairly_used|used",'
        '"quantity":1,"description":"...","tags":[],"confidence":0.0}'
    )
    content = [{"type": "text", "text": prompt}]
    for url in image_urls[:3]:
        content.append({"type": "image_url", "image_url": {"url": url}})

    try:
        raw = _qwen_chat(
            [{"role": "user", "content": content}],
            model=MODEL_VISION,
        )
        clean   = raw.strip().lstrip("```json").lstrip("```").rstrip("```").strip()
        listing = json.loads(clean)
    except Exception as exc:
        return _json_response({"error": str(exc)[:200], "seller_id": seller_id}, 500)

    return _json_response({
        "seller_id": seller_id,
        "listing":   listing,
        "source_images": len(image_urls),
        "model": MODEL_VISION,
    })


# ─── FC3 HTTP trigger handler ─────────────────────────────────────────────────

def handler(event, context):
    """
    Alibaba Cloud Function Compute 3 — HTTP trigger entry point.
    event is an fc3 HTTPEvent object.
    """
    try:
        path    = getattr(event, "path",   "/")
        method  = getattr(event, "method", "GET").upper()
        raw_body = getattr(event, "body", b"") or b""

        # normalise path
        path = path.split("?")[0].rstrip("/") or "/"

        # parse JSON body for POST requests
        body: dict = {}
        if method == "POST" and raw_body:
            try:
                body = json.loads(raw_body)
            except Exception:
                body = {}

        # ── routing ──────────────────────────────────────────────────────────
        if path in ("/", "/api/v1/zema", "/api/v1/zema/health"):
            return handle_health()

        if path == "/api/v1/zema/negotiate" and method == "POST":
            return handle_negotiate(body)

        if path == "/api/v1/zema/ingest" and method == "POST":
            return handle_ingest(body)

        return _json_response({"error": f"Not found: {method} {path}"}, 404)

    except Exception as exc:
        return _json_response({"error": str(exc)[:500]}, 500)
