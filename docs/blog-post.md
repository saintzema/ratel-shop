# How We Built ZEMA 360: An Autonomous Commerce OS on Qwen + Alibaba Cloud in Two Weeks

*Build-journey post for the Global AI Hackathon with Qwen Cloud · Track 4: Autopilot Agent*

---

## The Problem We Couldn't Ignore

FairPrice.ng has been live for over a year as Nigeria's first trust-first escrow marketplace. Buyers pay in, sellers ship, funds release on delivery confirmation. It works — but every order still needs a human to review risk, decide on payouts, chase tracking numbers, and handle disputes. At 200+ orders a month, that's a full-time job that doesn't scale.

When the Global AI Hackathon with Qwen Cloud opened Track 4 ("Autopilot Agent"), we saw an opportunity to actually fix this — not with a demo, but with real agents running on a real production system.

---

## Week One: Laying the Foundation

### Choosing the Right Qwen Endpoint

The first decision was which Qwen endpoint to use. Alibaba Cloud Model Studio (DashScope) offers an OpenAI-compatible endpoint, which meant we could mirror the same API contract across our TypeScript frontend (`lib/qwen.ts`) and our Python backend (`app/zema/qwen_client.py`). Both use `Authorization: Bearer` + the same chat/completions format.

We provisioned the Singapore (ap-southeast-1) MaaS workspace endpoint for the lowest latency to our West African users. We kept three models:

- `qwen-max` for anything requiring real reasoning — risk scoring, deal orchestration, complex instructions
- `qwen-plus` for fast, cheap per-agent classification (three agents firing in parallel on every order)
- `qwen-vl-max` for multimodal — seller photos and KYC documents

**Lesson learned**: use `json_mode: true` (response_format: json_object) when you need structured output from agents. It's rock-solid on Qwen. Without it, the models sometimes wrap their JSON in markdown code fences — our `extract_json()` helper in qwen_client handles both cases.

### Building the OSS Bucket Architecture

Every generated artifact — product photos, KYC documents, receipt PDFs, agent memory — goes to a private Alibaba Cloud OSS bucket (`fairprice-zema`, Singapore). We organise by type:

```
ingest/<seller_id>/<run_id>/
  photo_00.jpg    ← original upload
  kyc_00.jpg      ← KYC doc
  manifest.json   ← structured extraction result

memory/seller/<id>.json
memory/buyer/<id>.json

receipts/<order_id>/receipt.pdf
```

The key insight: Function Compute instances are stateless. By writing memory to OSS at the end of every run, the next invocation (possibly a completely different cold-start instance) gets the full deal history of a seller without any sticky sessions or external caches.

---

## The MCP Server: Turning Real Store Ops Into Agent Tools

The hackathon rubric explicitly called out MCP integration. Rather than simulate tools, we wired our MCP server (`backend/app/zema/mcp_server.py`) directly to FairPrice's live Next.js API routes:

```python
@server.tool()
async def release_escrow(order_id: str, released_by: str) -> list[TextContent]:
    res = await _call_api("POST", "/api/escrow/release", 
                          {"orderId": order_id, "releasedBy": released_by})
    return [TextContent(type="text", text=json.dumps(res))]
```

Eight tools: `get_order`, `get_inventory`, `set_tracking`, `release_escrow`, `paystack_payout`, `process_refund`, `send_whatsapp`, `create_negotiation`. Each calls the real endpoint with `ZEMA_SERVICE_TOKEN` bearer auth, 3-retry exponential backoff, and structured JSON logging on every call.

The beautifully orthogonal thing about MCP: the agents don't need to know HTTP. They call `release_escrow(order_id="ord_123", released_by="zema-finance")` and the MCP layer handles the rest. We can swap out the underlying API without touching agent code.

---

## Week Two: The Multi-Agent Panel + HITL

### Three Agents, One Decision

The core of ZEMA 360 is the parallel evaluation panel. When a new order arrives at `POST /api/zema360/process-order`:

1. **Sales Agent** (`qwen-plus`) gets the deal context + its role system prompt → returns stance (approve/negotiate/reject) + a price proposal
2. **Inventory Agent** (`qwen-plus`) checks stock, flagging if quantity is dangerously low → returns fulfillment feasibility
3. **Finance Agent** (`qwen-plus`) calculates risk score (0–100) + escrow recommendation

All three fire **in parallel** (Promise.all on the TypeScript side, asyncio.gather on the Python side). Total latency for the three-way evaluation: under 2 seconds in p95.

The Finance agent's risk score is the gating signal: ≥ 60, or any single `reject` vote, triggers human escalation. Below 60 with unanimous approval → auto-execute.

### Human-in-the-Loop: WhatsApp as the Approval Interface

We almost built a web UI for HITL approvals. Then we remembered: our team approves vendor applications on WhatsApp anyway. So we wired the approval loop directly to our existing WhatsApp inbound webhook.

The full loop:

```
High-risk order detected
  → ZemaApprovalRequest persisted to Neon Postgres
  → WhatsApp sent to +2348162816305:
    "🔎 Order ord_abc123 flagged (risk 72/100)
     Approve: approve ord_abc123
     Reject:  reject ord_abc123"
  
Approver replies "approve ord_abc123"
  → Webhook parses, matches ZemaApprovalRequest by runId fragment
  → DB status updated to "approved"
  → Escrow release triggered automatically
  → Confirmation WhatsApp sent to buyer + seller
```

The hardest part wasn't the WhatsApp parsing — it was making the ID format short enough to type on a phone but unique enough to avoid collisions. We settled on a 12-char hex `run_id` prefix.

### The Multimodal Ingest Pipeline

Qwen-VL (`qwen-vl-max`) is genuinely impressive on product photos from informal market stalls. We send each image with this prompt:

```
You are a product catalogue analyst for FairPrice.ng, Nigeria's leading 
escrow marketplace. Extract structured product information and return ONLY 
valid JSON:
{
  "title": "...",
  "category": "Electronics | Fashion | Food | ...",
  "price_ngn": <number or null>,
  "condition": "new | fairly_used | used",
  ...
}
```

For a batch of 3–5 product photos, we fire all VL calls in parallel (asyncio.gather). The merge step takes the highest-confidence result for core fields (title, price, category) and unions the tags from all images. Real-world accuracy on Nigerian market photos: solid 80–90% for condition and category, ~60% for price (sellers often don't show price tags, which is expected).

The KYC extraction is the same pattern — VL extracts NIN/BVN/Passport fields, checks `matches_seller` (name plausibility), and returns a `confidence` score. KYC passes at ≥ 70% confidence + `matches_seller: true`.

---

## Deploying to Alibaba Function Compute

The hackathon required proof of Alibaba deployment. We used Function Compute Custom Container Runtime — our existing `backend/Dockerfile` (Python 3.11-slim, FastAPI + Uvicorn) with three additions:

1. **HEALTHCHECK**: `curl -f /api/v1/zema/health` — FC uses this to determine container readiness
2. **`--forwarded-allow-ips='*'`**: FC's load balancer sends X-Forwarded-For; Uvicorn needs this to trust it
3. **`--proxy-headers`**: same reason — uvicorn behind an FC HTTP trigger

Deployment is one command from repo root:

```bash
bash backend/deploy-fc.sh
```

The script configures Serverless Devs credentials, builds the Docker image for `linux/amd64`, pushes to Alibaba Container Registry, then runs `s deploy -y`. It writes the live endpoint URL to `backend/deploy/fc-proof.json` for the submission.

**One gotcha**: `docker build` on an M2 Mac defaults to `arm64`. Add `--platform linux/amd64` or FC will refuse the image with a confusing error.

---

## The Landing Page: Selling the Vision

`fairprice.ng/zema360` is ZEMA 360's public face. We built it with:

- **Framer Motion v12**: the new `Variants` type API (import `{ type Variants }`) + `staggerChildren` for the cascade animations. Gotcha: v12 no longer accepts `ease: number[]` — use the string `"easeOut"` instead.
- **Bento grid layout**: each feature gets its own card at a different grid span, creating visual hierarchy without needing a heavy design tool
- **6-step pipeline visualization**: SVG arrow path connecting Order → Agents → Decision → HITL → Escrow → Payout
- **Live API tab switcher**: shows the actual `POST /api/zema360/process-order` request/response with copy button

The pricing section ties directly to FairPrice's real subscription tiers. "ZEMA 360 Included" badge on the Scale plan is genuine — it's gated on `subscriptionPlan === "Scale"` in the API routes.

---

## What We Learned

**On Qwen**: `qwen-plus` is underrated for structured classification tasks. Three agents in parallel on `qwen-plus` costs less than one `qwen-max` call and produces better-calibrated votes because each agent is scoped to a single domain.

**On MCP**: the real power isn't tool calling — it's the decoupling. Our orchestrator doesn't know or care that "release_escrow" hits a Paystack API that calls a Nigerian payment network. It just calls a tool. When we swap Paystack for another provider, the agent doesn't change.

**On Function Compute**: Custom Container Runtime is the right choice for any non-trivial Python workload. The FC managed Python runtime is fine for simple functions but won't let you install oss2, mcp, or httpx without wrestling with layers. With Docker you just `pip install -r requirements.txt` and it works.

**On HITL**: WhatsApp is the right approval interface for a Nigerian marketplace. Our target approvers (operations team) are already on WhatsApp all day. A web dashboard would get ignored. A WhatsApp message gets a response in minutes. Don't build tools people won't use.

---

## What's Next

ZEMA 360 is production-ready. The plan after the hackathon:

1. **Open the Scale-tier API** to verified FairPrice sellers — the enterprise API is live at `POST /api/zema360/process-order`
2. **Auto-generate listing receipts**: Finance agent → PDF artifact → OSS → attached to WhatsApp confirmation
3. **Benchmark**: A/B test ZEMA 360 auto-decisions vs manual review — measure approval time, dispute rate, and payout accuracy
4. **Extend MCP tools**: add `get_buyer_history`, `flag_seller`, `send_email` to the MCP server
5. **Memory analytics**: surface per-seller risk trends in the seller dashboard

---

## Try It

- 🌐 **Live**: [fairprice.ng/zema360](https://fairprice.ng/zema360)
- 📦 **Code**: [github.com/fairprice/RatelShop](https://github.com) (branch `hackathon-zema`)
- 🏥 **Health**: `GET https://<fc-endpoint>/api/v1/zema/health`

---

*Built by the FairPrice.ng team for the Global AI Hackathon with Qwen Cloud, Track 4: Autopilot Agent. June 2026.*
