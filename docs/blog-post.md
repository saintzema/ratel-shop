# How We Built an Autonomous eCommerce SuperApp OS for Nigeria's Informal Economy Using Qwen

*A build-journey for the Global AI Hackathon with Alibaba Cloud — Track 4: Autopilot Agent*

---

## The Problem Nobody Talks About

Nigeria has a $240 billion informal economy. Millions of transactions happen every day — in markets, over the phone, via WhatsApp voice notes — with zero paper trail, zero escrow, and near-zero trust.

A buyer sees a product on Instagram. They DM the seller. They haggle for forty-five minutes. They send money to a stranger's bank account. Sometimes they get the product. Often they don't. There is no dispute resolution. There is no refund. There is no record it happened.

FairPrice.ng was built to fix this.

We're an AI-powered, escrow-based marketplace for Nigeria's informal economy. Buyers and sellers connect through a secure conversational layer — price negotiations, order management, automatic fund release, KYC-verified seller profiles — all wired into WhatsApp because that's where commerce already happens in West Africa.

We had a working platform. Real sellers. Real orders. Real escrow.

What we didn't have was the time to run it.

---

## The Insight: Commerce Should Run Itself

Every morning I open the admin dashboard and see the same tasks waiting:

- Three new sellers uploaded KYC documents and are waiting for review
- Eight orders moved to "shipped" — needs escrow release confirmation
- Twelve negotiations stalled because nobody sent a counter-offer
- Two disputes filed, both with clear evidence on one side

These aren't judgment calls. They're pattern matching. And pattern matching is exactly what large language models are good at.

When the Qwen Cloud Global AI Hackathon announced Track 4 — *Autopilot Agent* — I knew what we had to build.

**ZEMA 360: the autonomous commerce OS that runs the back-office while we sleep.**

---

## What ZEMA 360 Does

ZEMA 360 is a multi-agent system that orchestrates FairPrice's real business operations using Qwen as its reasoning engine.

When a new order comes in, five things need to happen in sequence:

1. **Inventory** must be decremented
2. **Fulfillment** needs to be tracked (carrier assigned, tracking number updated)
3. **Escrow** holds the funds until delivery is confirmed
4. **Finance** releases funds to the seller via Paystack Transfer after confirmation
5. **Communications** keeps buyer and seller informed throughout, on WhatsApp

In the old world, a human coordinates all of this. In ZEMA 360, three specialized agents — **Inventory**, **Fulfillment/Comms**, and **Finance** — hand off to each other, call real FairPrice APIs through an MCP server, and only pause when they genuinely need a human: before moving money.

That pause is the heart of the system.

---

## The Human-in-the-Loop Decision

I almost skipped the human-in-the-loop (HITL) approval step. It felt like admitting the AI couldn't be trusted.

Then I thought about what "trusted" means in the Nigerian financial context. Paystack transfers are irreversible. Escrow releases are final. A false positive from the agent — releasing funds to the wrong seller, or before delivery is confirmed — costs real money and destroys real trust.

So ZEMA 360 never moves money without approval. When the Finance agent is ready to release escrow or initiate a Paystack payout, it sends a WhatsApp message to the designated approver (me, for now — but configurable per seller for enterprise clients):

```
🔔 ZEMA 360: Approval Required

Order: ORD-2891
Buyer: Chukwuemeka Okafor
Product: Industrial Gas Mask × 2
Amount: ₦47,000

Escrow release + Paystack payout to Adunola Stores
Bank: Zenith | Acct: ****3847

Reply: approve 2891 or reject 2891
```

Reply `approve 2891` and the escrow releases, the Paystack transfer fires, and the buyer gets a WhatsApp receipt. Reply `reject 2891` and the funds stay held, the seller is notified, and the run is cancelled cleanly.

This is not a limitation of the AI. It's the feature. A Qwen-powered agent that knows what it doesn't own is more valuable than one that acts on everything.

---

## The Technical Architecture

### The Brain: Qwen via Alibaba DashScope

We run `qwen-max` for all reasoning, negotiation, and decision-making tasks. Qwen's tool-calling capability is what makes the multi-agent architecture clean — each agent declares its available tools, Qwen decides which to call, and the orchestrator routes the result to the next agent in the pipeline.

For multimodal tasks — a seller uploads a photo of a product via WhatsApp, we need a structured listing — we use `qwen-vl-max`. It sees the image, extracts product name, category, condition, estimated price, and generates a draft listing. The seller confirms via WhatsApp reply. No form-filling required.

We use Alibaba's dedicated Singapore MaaS endpoint, which gave us consistent low latency throughout development.

### The Nervous System: MCP Tools

Every agent action goes through an MCP server (`backend/app/zema/mcp_server.py`) that wraps FairPrice's real Next.js API routes. Tools include:

- `get_order` / `get_inventory` — read order state and stock levels
- `set_tracking` — update fulfillment carrier and tracking ID
- `release_escrow` — mark escrow as releaseable (triggers HITL)
- `paystack_payout` — initiate Paystack Transfer to seller bank account
- `process_refund` — reverse escrow and notify buyer
- `send_whatsapp` — send messages, CTA buttons, and media via Meta Cloud API
- `create_negotiation` — open a negotiation request between buyer and seller

The MCP server is authenticated with a service token. The agents never touch the database directly — they call the same APIs a human would, which means every agent action appears in the admin dashboard like any other operation.

### The Memory: Per-Seller Context

Each seller has a persistent memory file in Alibaba OSS. The orchestrator reads it before each run and writes to it after:

```json
{
  "seller_id": "sel_adunola_stores",
  "avg_fulfillment_days": 2.3,
  "dispute_rate": 0.02,
  "preferred_carrier": "DHL",
  "negotiation_floor": 0.88,
  "last_payout_date": "2026-06-10",
  "customer_notes": {
    "cus_emeka_okafor": "repeat buyer, always pays on time"
  }
}
```

This context shapes agent decisions. A seller with a high dispute rate gets more conservative negotiation floors. A seller with fast fulfillment history gets their escrow released sooner. The memory compounds over time.

### The Runtime: Alibaba Function Compute

The agent orchestrator runs on Alibaba Function Compute, separate from the Next.js frontend on Vercel. This isolation is intentional — if the agent system goes down, the marketplace keeps working. If Vercel redeploys the frontend, the agents aren't interrupted mid-run.

OSS stores three types of artifacts:
- **Seller memory files** — per-seller context JSON
- **Product photos** — ingested via WhatsApp, staged before DB write
- **KYC documents** — CAC certificates and government IDs, private with signed URLs

---

## The Ziva Upgrade

Before ZEMA 360, FairPrice had Ziva — our AI shopping assistant floating in the corner of every page. Ziva helped buyers search the catalog, compare products, and start negotiations.

Ziva ran on Gemini. As part of this project, we ported her brain to Qwen `qwen-max` with full tool-calling: catalog search, product comparison, price intelligence, and negotiation kickoff all run through Qwen's function-calling API now.

We kept the Gemini path alive behind an environment variable (`AI_PROVIDER`), switchable at runtime via the admin settings dashboard without a redeploy. If DashScope is unreachable during a regional outage, Ziva falls back to Gemini in under 60 seconds.

The switch is a two-button toggle in the admin panel. No engineer needed.

---

## WhatsApp as the Universal Interface

The most important architectural decision we made early: **WhatsApp is a first-class interface, not a notification channel.**

Nigerian buyers don't want to install another app. They don't want to create an account. They want to message a seller on WhatsApp and get a product delivered. Everything else is friction.

So ZEMA 360's HITL approval flow is WhatsApp-native. The agent status updates are WhatsApp messages. When a seller creates a product listing by sending a photo, that's WhatsApp. When a buyer starts a negotiation by texting `/negotiate gas mask`, that's WhatsApp.

The technical implementation uses Meta's Cloud API with `cta_url` interactive messages — CTA buttons that open links inside WhatsApp's built-in browser instead of launching an external app. Users never leave the conversation.

For the ZEMA 360 enterprise API, each inbound webhook that processes a negotiation or order update carries the sender's WhatsApp profile name from `value.contacts[0].profile.name`. We save it immediately and update any previously-imported contacts who still had the generic "WhatsApp User" name. The database gradually gets cleaner over time as users interact.

---

## The Number That Surprised Us

During development, I ran a test: how long does it take for ZEMA 360 to fully process a new order — from "order placed" to "escrow held, fulfillment assigned, seller notified, tracking link sent to buyer" — without any human action?

On a confirmed order with an established seller: **23 seconds**.

The equivalent manual workflow (checking the order, updating fulfillment, sending WhatsApp messages to both parties, logging the escrow hold) takes 8–12 minutes.

That's not a small efficiency gain. For a seller managing forty orders a week, it's the difference between running a business and being consumed by one.

---

## What We Learned

**Qwen's tool-calling is production-grade.** The structured output from function calls is reliable enough to drive real financial operations. We ran hundreds of test runs and saw well under 1% malformed responses, all caught by retry logic.

**MCP makes agents composable.** Because every tool is just an HTTP call behind a standard interface, we can add new capabilities to the agent (a new payment method, a new courier integration) by writing one MCP tool, with no changes to the reasoning layer. The agents pick up new tools automatically.

**HITL is a product feature, not a safety crutch.** Enterprise customers don't want fully autonomous finance. They want to see everything, approve at one touch, and know the system ran the analysis. ZEMA 360's approval flow isn't a limitation — it's why an enterprise finance director would trust it.

**Real deployment changes everything.** Testing on real Nigerian sellers, with real orders, real WhatsApp numbers, and real Paystack payouts, surfaced edge cases no synthetic test would find: sellers who respond to `/negotiate` in Yoruba, phone numbers formatted with leading zeros, products where the price was negotiated down to ₦1 (buyer and seller testing the system). We handled all of them.

---

## What's Next

ZEMA 360 launches as a product — **fairprice.ng/zema360** — with an enterprise API (POST `/api/zema360/process-order`) for businesses that want to plug their own operations into the agent network. Starter plan is free. Scale plan includes the full autonomous Ops Squad.

The seller-onboarding pipeline (photo → Qwen-VL → structured listing → WhatsApp confirm) will ship to all sellers, not just WhatsApp-native ones. A seller with a phone and a product photo will be able to list in under two minutes, with no login, no form, and no friction.

And we're expanding the memory layer. Right now it's per-seller. The next version adds per-buyer trust scores, so the Finance agent can decide whether to auto-approve escrow release based on that buyer's track record — with no human approval needed for verified repeat buyers.

The vision: a commerce OS that runs itself, with humans setting the rules and approving the exceptions.

---

## Try It

- **Live platform:** [fairprice.ng](https://fairprice.ng)
- **GitHub:** [github.com/saintzema/ratel-shop](https://github.com/saintzema/ratel-shop)
- **ZEMA 360:** [fairprice.ng/zema360](https://fairprice.ng/zema360)

Built with Qwen `qwen-max` + `qwen-vl-max` · Alibaba DashScope · Alibaba Function Compute · Alibaba OSS · Next.js 15 · Neon PostgreSQL · Paystack · Meta WhatsApp Cloud API

---

*Emmanuel Ezeji is the founder of ZEMA Technologies and FairPrice.ng. He builds AI infrastructure for Africa's informal economy.*
