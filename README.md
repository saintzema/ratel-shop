# FairPrice.ng — The Transactional OS for Africa's Informal Economy

[![Platform](https://img.shields.io/badge/Platform-Next.js%2015-black)](https://fairprice.ng)
[![Database](https://img.shields.io/badge/Database-Neon%20PostgreSQL%20%7C%20Prisma-blue)](https://prisma.io)
[![WhatsApp](https://img.shields.io/badge/WhatsApp-Cloud%20API-25D366)](https://developers.facebook.com/docs/whatsapp/cloud-api)
[![AI](https://img.shields.io/badge/AI-Qwen%20%7C%20ZEMA%20360-emerald)](https://fairprice.ng)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

FairPrice.ng is an AI-powered, escrow-based marketplace designed to solve trust and pricing issues in Nigeria's informal economy. It connects buyers with verified sellers through a secure conversational commerce layer, enabling price negotiations and "headless" ordering directly via WhatsApp — with an autonomous multi-agent commerce OS (ZEMA 360) powered by Alibaba Qwen running behind the scenes.

---

## Key Features

### 1. Trusted Marketplace
- **Escrow System:** Funds are held securely and only released to sellers upon buyer confirmation.
- **Price Intelligence:** AI engine analyzes local and global market data to flag overpriced items and guarantee fairness.
- **Dynamic Negotiations:** Real-time price haggling between buyers and sellers with WhatsApp synchronization.

### 2. WhatsApp "Headless" Ordering
- **Conversational Commerce:** Full ordering flow inside WhatsApp. Customers browse, search, negotiate, and checkout without leaving the app.
- **Intelligent Bot:** Automated product search and rich product cards delivered via Meta Cloud API CTA buttons (opens in-app, not external browser).
- **Bulk Marketing:** Admin-led broadcasts and product promos to targeted WhatsApp audiences.
- **WhatsApp Listing:** Sellers can create product listings end-to-end via WhatsApp chat.

### 3. ZEMA 360 — Autonomous Commerce OS (Qwen-Powered)
- **Multi-Agent Ops Squad:** Sales, Inventory, and Finance agents collaborate to process orders end-to-end.
- **Human-in-the-Loop:** Every critical financial action (escrow release, Paystack payout) requires WhatsApp approval from the designated approver.
- **MCP Tool Integration:** Agents call real FairPrice operations (orders, escrow, payouts, WhatsApp notifications) via a Model Context Protocol server.
- **Multimodal Ingestion:** Qwen-VL processes seller-uploaded photos and KYC documents into structured listings.
- **Alibaba Cloud Deployment:** Agent orchestrator runs on Alibaba Function Compute with OSS for document storage.

### 4. Seller Empowerment
- **Verified Status:** KYC-backed seller profiles (CAC certificate, Government ID) to build buyer trust.
- **Negotiation Dashboard:** Specialized UI for sellers to manage active price offers simultaneously.
- **Payout Management:** Automated settlement via Paystack Transfers with escrow protection.
- **Subscription Tiers:** Starter, Growth, and Scale plans with Paystack subscription integration.

### 5. Admin Command Center
- **360° User Management:** View sellers and buyers, approve KYC, manage subscriptions, resolve disputes.
- **AI Provider Toggle:** Switch Ziva's brain between Qwen (qwen-max) and Gemini (gemini-2.5-flash) at runtime — no redeploy needed.
- **Real-Time Sync:** Live order, negotiation, and dispute feeds across the admin dashboard.
- **WhatsApp Bulk Import:** Upload unstructured data to bulk-import WhatsApp contacts to the user database.

---

## Technical Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router), Tailwind CSS, Framer Motion, shadcn/ui |
| API | Next.js Serverless Functions on Vercel |
| Database | Neon PostgreSQL + Prisma ORM |
| Auth | NextAuth.js (email/password + role-based access) |
| AI — Ziva assistant | Qwen qwen-max via Alibaba DashScope (Gemini fallback) |
| AI — ZEMA 360 agents | Qwen qwen-max + qwen-vl-max via Alibaba MaaS |
| Agent runtime | FastAPI on Alibaba Function Compute |
| Agent storage | Alibaba OSS (`fairprice-zema` bucket) |
| WhatsApp | Meta Cloud API v25.0 |
| Email | Resend |
| Payments | Paystack (checkout + payouts + subscriptions) |
| Escrow | Custom EscrowService with automatic release cron |

---

## Project Structure

```
├── frontend/          # Next.js web app, API routes, Prisma schema
│   ├── src/app/       # App Router pages and API handlers
│   ├── src/lib/       # WhatsApp, Escrow, Payout, Qwen services
│   └── prisma/        # Database schema
├── backend/           # FastAPI ZEMA 360 agent orchestrator
│   └── app/zema/      # Qwen agents, MCP server, OSS client
└── mobile/            # Capacitor mobile app (iOS/Android)
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- Neon PostgreSQL database (or any Postgres)
- Meta Developer Account (WhatsApp Cloud API)
- Alibaba Cloud account (DashScope API key for Qwen)
- Paystack account

### Installation

```bash
# Clone
git clone https://github.com/saintzema/ratel-shop.git
cd ratel-shop

# Frontend
cd frontend
npm install
cp .env.example .env.local   # fill in your credentials
npx prisma db push           # sync schema to your DB
npm run dev
```

```bash
# Backend (ZEMA 360 agents)
cd backend
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

### Key Environment Variables

See [`frontend/.env.example`](frontend/.env.example) and [`backend/.env.example`](backend/.env.example) for the full list. Critical ones:

- `DATABASE_URL` — Neon PostgreSQL connection string
- `DASHSCOPE_API_KEY` — Alibaba DashScope key for Qwen
- `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` — Meta Cloud API
- `PAYSTACK_SECRET_KEY` — Paystack payments
- `NEXTAUTH_SECRET` — NextAuth session signing

---

## License

[MIT](LICENSE) © 2026 Emmanuel Ezeji / ZEMA Technologies

---

Developed by **[Zema Technologies Group](https://zemaai.com)** — making commerce work for everyone.
