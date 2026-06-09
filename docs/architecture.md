# ZEMA 360 — System Architecture

> Qwen-powered autonomous commerce OS for FairPrice.ng  
> Hackathon: Global AI Hackathon with Qwen Cloud | Track 4: Autopilot Agent

## High-level Architecture

```mermaid
graph TB
    subgraph "Seller / Buyer"
        WA[WhatsApp]
        Web[FairPrice.ng Web App]
    end

    subgraph "Vercel — Next.js 15 App Router"
        direction TB
        FE[Frontend UI<br/>fairprice.ng/zema360]
        API_PO[POST /api/zema360/process-order]
        API_ING[POST /api/zema360/ingest]
        API_WH[POST /api/whatsapp/webhook]
        API_ESC[POST /api/escrow/release]
        API_PAY[POST /api/payouts/transfer]
        API_WS[POST /api/whatsapp/send]
        API_AS[GET /api/zema360/approval-status]
        DB[(Neon PostgreSQL<br/>Prisma ORM)]
    end

    subgraph "Alibaba Cloud Function Compute"
        direction TB
        FC_ORCH[Orchestrator<br/>orchestrator.py]
        FC_ING[Ingest Pipeline<br/>ingest.py]
        FC_MEM[OSS Memory<br/>memory.py]

        subgraph "Multi-Agent Panel"
            AG_S[Sales Agent<br/>qwen-plus]
            AG_I[Inventory Agent<br/>qwen-plus]
            AG_F[Finance Agent<br/>qwen-plus]
        end

        subgraph "MCP Server"
            MCP[mcp_server.py<br/>8 FairPrice tools]
        end
    end

    subgraph "Alibaba Cloud Model Studio"
        QM[qwen-max<br/>Reasoning / Negotiate]
        QP[qwen-plus<br/>Fast classify]
        QVL[qwen-vl-max<br/>Photos + KYC]
    end

    subgraph "Alibaba Cloud OSS"
        OSS_IMG[ingest/<br/>photos + KYC docs]
        OSS_MEM[memory/<br/>per-seller/buyer JSON]
        OSS_RCP[receipts/<br/>PDF artifacts]
    end

    subgraph "External Services"
        PST[Paystack API<br/>Escrow + Payouts]
        META[Meta WhatsApp<br/>Cloud API]
    end

    %% User flows
    Web -->|browse / buy| API_PO
    WA  -->|approve / reject| API_WH

    %% Enterprise API
    API_PO -->|runs pipeline| FC_ORCH
    API_ING -->|delegates| FC_ING

    %% FC internal
    FC_ORCH --> AG_S & AG_I & AG_F
    FC_ORCH --> FC_MEM
    FC_ING  --> QVL
    AG_S & AG_I & AG_F --> QP
    FC_ORCH --> QM

    %% MCP tools
    FC_ORCH --> MCP
    MCP -->|get_order / release_escrow| API_ESC
    MCP -->|paystack_payout| API_PAY
    MCP -->|send_whatsapp| API_WS
    MCP -->|create_negotiation| DB

    %% HITL loop
    API_WS --> META --> WA
    WA --> API_WH
    API_WH -->|approve/reject| DB
    API_WH -->|on approve| API_ESC

    %% Storage
    FC_ING  --> OSS_IMG
    FC_MEM  --> OSS_MEM
    FC_ORCH --> OSS_RCP

    %% Payments
    API_ESC --> PST
    API_PAY --> PST

    %% DB reads
    API_PO & API_ING & API_WH & API_AS --> DB
```

## Component Descriptions

### Vercel Layer (Next.js 15)

| Route | Purpose |
|---|---|
| `POST /api/zema360/process-order` | Enterprise entry point — triggers the full multi-agent pipeline for a given order/deal. Bearer ApiKey auth (Scale tier). |
| `POST /api/zema360/ingest` | Delegating router for multimodal ingest — forwards to FC backend. |
| `GET /api/zema360/approval-status` | Polling endpoint — Python orchestrator polls until HITL status resolves. |
| `POST /api/whatsapp/webhook` | Inbound WhatsApp handler — parses `approve <id>` / `reject <id>` from approver number. |
| `POST /api/escrow/release` | Service-token-guarded escrow release via Paystack. |
| `POST /api/payouts/transfer` | Initiates seller payout via Paystack Transfer API. |
| `POST /api/whatsapp/send` | Outbound WhatsApp — sends interactive approval prompts. |

### Alibaba Cloud Function Compute Layer

| Module | Purpose |
|---|---|
| `orchestrator.py` | Stateless pipeline driver: INGEST → ASSESS → NEGOTIATE → AWAITING_APPROVAL → EXECUTE → DONE |
| `ingest.py` | Qwen-VL multimodal pipeline: photos + KYC → structured listing JSON + OSS artifacts |
| `agents.py` | Sales / Inventory / Finance agent classes. Each evaluates a deal and returns a `Position`. |
| `mcp_server.py` | MCP server exposing 8 FairPrice store tools over stdio — callable by any MCP client. |
| `memory.py` | OSS-backed per-entity memory (seller/buyer deal history, risk aggregates, bounded to last 50 events). |
| `qwen_client.py` | Async Qwen HTTP client with exponential backoff (4 retries), JSON extraction, vision_json. |
| `oss_client.py` | Alibaba OSS wrapper: `put_bytes`, `get_bytes`, `signed_url`. |

### Alibaba Cloud Model Usage

| Model | Used for |
|---|---|
| `qwen-vl-max` | Photo → structured listing extraction; KYC document parsing + name-match verification |
| `qwen-max` | Complex reasoning: deal risk scoring, price intelligence, negotiation orchestration |
| `qwen-plus` | Per-agent evaluation (Sales / Inventory / Finance) — fast, cost-efficient classification |

### Human-in-the-Loop (HITL) Flow

```
New Order
   │
   ▼
process-order → 3-agent panel (qwen-plus each)
   │
   ├─ Finance risk ≥ 60 OR any veto?
   │        │ YES
   │        ▼
   │   ZemaApprovalRequest persisted to DB
   │        │
   │        ▼
   │   WhatsApp sent to +2348162816305
   │        "approve <id>"  /  "reject <id>"
   │        │
   │        ▼
   │   Approver replies → webhook handler
   │        │ approve        │ reject
   │        ▼                ▼
   │   escrow release    notification
   │   Paystack payout   to seller
   │
   └─ Auto-approve (low risk)
           │
           ▼
      escrow release + payout (no human needed)
```

### Data Flow: Multimodal Ingest

```
Seller sends photos (WhatsApp/upload)
          │
          ▼
    image_urls + kyc_urls
          │
          ▼
  ingest.run_ingest()
  ┌──────────────────────────────────────┐
  │  qwen-vl-max (per image, parallel)   │
  │  → title, category, price_ngn,       │
  │    condition, quantity, description  │
  │    tags, confidence                  │
  ├──────────────────────────────────────┤
  │  qwen-vl-max (per KYC doc, parallel) │
  │  → doc_type, name, id_number,        │
  │    expiry, matches_seller,           │
  │    confidence                        │
  └──────────────────────────────────────┘
          │
          ▼
  Upload artifacts → OSS bucket fairprice-zema
  ingest/<seller_id>/<run_id>/photo_00.jpg
  ingest/<seller_id>/<run_id>/kyc_00.jpg
  ingest/<seller_id>/<run_id>/manifest.json
          │
          ▼
  IngestResult → orchestrator.state.listing
```

## Security Model

- **ZEMA_SERVICE_TOKEN**: Bearer auth for all inter-service calls (FC → Next.js API routes). Never exposed client-side.
- **ApiKey model**: Scale-tier sellers get an API key (Prisma `ApiKey`) for enterprise access to `process-order` and `ingest` endpoints. Rate-limited, expiry-aware.
- **OSS bucket `fairprice-zema`**: private, no public access. Files served only via `oss_client.signed_url()` (pre-signed, TTL 1 hour).
- **WhatsApp HITL**: inbound approval restricted to `ZEMA_APPROVER_WHATSAPP` number; all other senders are ignored.
- **Secrets**: never committed to git. Managed via Vercel environment variables (frontend) and Serverless Devs `s.yaml` env references (backend).
