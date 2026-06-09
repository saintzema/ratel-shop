# ZEMA 360 × FairPrice.ng

> **[Global AI Hackathon with Qwen Cloud](https://hackathon.qwen.cloud) — Track 4: Autopilot Agent**  
> Deadline: July 9, 2026 · Prize: $7,000 + $3,000 Alibaba Cloud credits  
> 🏗 **[Architecture](docs/architecture.md)** · 📖 **[Build Journey](docs/blog-post.md)** · 🌐 **[Live Demo](https://fairprice.ng/zema360)**

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Track 4: Autopilot Agent](https://img.shields.io/badge/Hackathon-Track%204%20Autopilot-orange)](https://hackathon.qwen.cloud)
[![Qwen](https://img.shields.io/badge/AI-Qwen%20%28DashScope%29-blue)](https://dashscope.aliyuncs.com)
[![Alibaba Cloud](https://img.shields.io/badge/Deploy-Alibaba%20FC-FF6A00)](https://www.alibabacloud.com/product/function-compute)

**ZEMA 360** is a Qwen-powered autonomous commerce OS built on FairPrice.ng — a live Nigerian escrow marketplace. Three specialised AI agents (Sales · Inventory · Finance) autonomously handle every order, negotiation, and payout end-to-end. Human-in-the-loop approval runs over WhatsApp. Sellers onboard via multimodal Qwen-VL photo + KYC. Everything runs on Alibaba Cloud: Function Compute + OSS + Model Studio.

**Quick links:** [Qwen-VL ingest](backend/app/zema/ingest.py) · [MCP server](backend/app/zema/mcp_server.py) · [Orchestrator](backend/app/zema/orchestrator.py) · [Enterprise API](frontend/src/app/api/zema360/process-order/route.ts) · [Landing page](frontend/src/app/zema360/page.tsx) · [Deploy script](backend/deploy-fc.sh)

---

# FairPrice.ng - The Transactional OS for Africa's Informal Economy

[![Platform](https://img.shields.io/badge/Platform-Next.js%2015-black)](https://fairprice.ng)
[![Database](https://img.shields.io/badge/Database-PostgreSQL%20%7C%20Prisma-blue)](https://prisma.io)
[![WhatsApp](https://img.shields.io/badge/WhatsApp-Cloud%20API-25D366)](https://developers.facebook.com/docs/whatsapp/cloud-api)
[![AI](https://img.shields.io/badge/AI-Ziva%20Bot-emerald)](https://zemaai.com)

FairPrice.ng is an AI-powered, escrow-based marketplace designed to solve trust and pricing issues in Nigeria's informal economy. It connects buyers with verified sellers through a secure conversational commerce layer, enabling price negotiations and "headless" ordering directly via WhatsApp.

---

## 🚀 Key Features

### 🛍️ 1. Trusted Marketplace
- **Escrow System:** Funds are held securely and only released to sellers upon buyer confirmation.
- **Price Intelligence:** AI engine analyzes local and global market data to flag overpriced items and guarantee fairness.
- **Dynamic Negotiations:** Real-time price haggling between buyers and sellers with seamless WhatsApp synchronization.

### 💬 2. WhatsApp "Headless" Ordering
- **Conversational Commerce:** Full ordering flow integrated into WhatsApp. Customers can browse, search for products, and place orders without leaving the app.
- **Intelligent Bot:** Automated product search and PDP card delivery via the Meta Cloud API.
- **Bulk Marketing:** Admin-led broadcasts for "Happy New Month" greetings and product promos to targeted WhatsApp audiences.

### 🏪 3. Seller Empowerment
- **Verified Status:** KYC-backed seller profiles (NIN, License, Passport) to build buyer trust.
- **Negotiation Dashboard:** Specialized UI for sellers to manage hundreds of active price offers simultaneously.
- **Payout Management:** Automated settlement system for secure fund disbursement.

---

## 🛠️ Technical Stack

- **Frontend:** Next.js 15 (App Router), Tailwind CSS, Framer Motion, Lucide Icons.
- **Backend/API:** Next.js Serverless Functions, Node.js.
- **Database:** PostgreSQL with Prisma ORM.
- **Authentication:** NextAuth.js.
- **Communications:**
    - **WhatsApp:** Meta Cloud API (v25.0).
    - **Email:** Resend (Transactional & Marketing).
- **Deployment:** Vercel (Frontend), Supabase (Database).

---

## 📂 Project Structure

```text
├── frontend/          # Next.js web application & API routes
├── backend/           # Core business logic & standalone services
├── mobile/            # Capacitor-based mobile app (iOS/Android)
└── prisma/            # Database schema & migrations
```

---

## ⚙️ Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Meta Developer Account (for WhatsApp API)

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/saintzema/ratel-shop.git
   ```
2. Install dependencies:
   ```bash
   cd frontend && npm install
   ```
3. Set up environment variables:
   Copy `.env.example` to `.env.local` and fill in your credentials.
4. Run the development server:
   ```bash
   npm run dev
   ```

---

## 📜 Documentation
For a comprehensive guide on all platform features, visit our [Features Page](https://fairprice.ng/features) or view the [internal documentation](frontend/src/app/features/page.tsx).

---

## 🛡️ Security & Compliance
- **PCI DSS Compliant** via Paystack integration.
- **Data Privacy:** Full compliance with NDPR (Nigeria Data Protection Regulation).

---

Developed by **[Zema Technologies Group](https://zemaai.com)**.
*CEO: Emmanuel Ezeji*
