# FairPrice.ng — Business Model & Current Metrics

Prepared for investor review. **Every figure below was queried directly from the
production database.** Nothing is projected, rounded up, or estimated unless the
line explicitly says so.

Data pulled: see git history of this file for the date of the snapshot.

---

## 1. What the business is

FairPrice.ng is a Nigerian marketplace with escrow-protected payments. Buyers get
price verification and the ability to negotiate; sellers get a storefront, order
management, invoicing, and one-tap publishing to Instagram and Facebook.

The differentiator is price transparency plus escrow, in a market where the
dominant behaviour is informal WhatsApp/Instagram selling with no buyer protection
and no price reference.

---

## 2. Revenue model — what is built and live

| # | Stream | Rate | Status |
|---|---|---|---|
| 1 | **Transaction commission** on escrow-settled orders | **2.5%** standard (per-seller override supported) | **Live** — 5 payouts processed |
| 2 | **Seller subscriptions** (Starter / Plus / Pro) | Tiered | **Live** — 5 of 17 sellers on paid tiers |
| 3 | **Listing boosts** — Starter ₦1,999 / Basic ₦4,999 / Premium ₦9,999 / VIP ₦24,999 | Per package | **Built**, no purchases yet |
| 4 | **Meta ads add-on** — we run the campaign, keep a markup | ₦6,500 (₦5,000 ad spend) | **Built**, never run a live campaign |
| 5 | **Quotes & invoices** with guest payment | Commission on payment | **Live** — 3 quotes created |

**Commission rate note for diligence:** the code default is **2.5%**
(`lib/commission.ts`), but the seller UI currently displays "3%" in one place and
"5%" in another. This is a real inconsistency that needs resolving before it is
shown to an investor who reads carefully — and before a seller disputes a payout.

---

## 3. Current traction — verified, unadjusted

### Users and supply
| Metric | Value |
|---|---|
| Registered users | **1,124** |
| Sellers (total) | **17** |
| Sellers (active) | **14** |
| Products listed | **318** |

### Seller subscription mix
| Plan | Sellers |
|---|---|
| Starter (free) | 12 |
| Plus | 3 |
| Pro | 2 |

**5 of 17 sellers (29%) are on a paid tier.** For a platform that has never run
paid acquisition, a 29% free-to-paid conversion on the supply side is the single
strongest number in this document.

### Transactions
| Metric | Value |
|---|---|
| Orders (all time) | **14** |
| — delivered | 12 |
| — processing | 1 |
| — pending | 1 |
| Cumulative order value (GMV) | **₦17,160,441** (~$11,100) |
| Average order value | **₦1,225,746** (~$790) |
| Payouts processed to sellers | **5** |
| Quotes/invoices created | **3** |

### Growth — the weak numbers, stated plainly
| Metric | Value |
|---|---|
| Orders in the last 30 days | **0** |
| New users in the last 30 days | **2** |
| Order dates | 2 May – 20 Jul 2026 |

**Read this honestly.** Order flow ran from May to July and has since stopped.
1,124 registered users against 14 orders is a ~1.2% lifetime conversion. The
platform is built and demonstrably works — real money moved, real payouts settled,
high-value transactions completed — but it is **not currently growing**, and no
customer acquisition has been funded.

That is precisely the gap this investment is meant to close. Say so directly; it
is a far stronger position than being caught claiming momentum that isn't there.

---

## 4. Unit economics, as they stand

At the current 2.5% commission and observed ₦1.23m average order value:

- **Revenue per order ≈ ₦30,600** (~$20)
- Cumulative commission on ₦17.16m GMV ≈ **₦429,000** (~$277)
- Plus subscription revenue from 5 paying sellers

The high AOV is doing the heavy lifting: at this basket size the platform only
needs modest order volume to be meaningful. **~330 orders/year at current AOV
produces roughly ₦10m (~$6,500) in commission alone** — before subscriptions,
boosts, or ads.

The honest counterweight: 14 orders over three months is far from that run-rate,
and AOV is computed from a small sample skewed by vehicle and solar listings. It
should not be treated as stable.

---

## 5. What the $5,500 is actually for

Be specific with the investor. Suggested allocation — adjust to your real plan:

| Use | Amount | Rationale |
|---|---|---|
| Customer acquisition (Meta ads) | $2,500 | The ads infrastructure is already built; nothing has ever been spent through it |
| Seller onboarding & activation | $1,200 | Supply is converting at 29% to paid; more sellers is the proven lever |
| Infrastructure (Vercel, Neon, AI APIs) | $900 | 12-month runway on current usage |
| App Store / Play / Meta compliance | $400 | Apple, Google, Meta App Review |
| Contingency | $500 | |

**$5,500 does not fund a salary.** Be clear that this is a capital-efficiency
round to prove acquisition works, not a runway round.

---

## 6. What is genuinely built

Not projections — this is shipped and in production at `https://www.fairprice.ng`:

- Marketplace with escrow, negotiation, and price verification
- Seller dashboard: products, orders, customers, analytics, discounts, payouts
- Quotes & invoices with guest payment (no account needed to pay)
- Instagram/Facebook publishing — **confirmed live posts on both**
- Instagram catalog import (posts → products)
- WhatsApp-based ordering and QR payments
- AI assistant (Ziva) for buyers, AI listing generation for sellers
- iOS app on TestFlight; Android in Play closed testing
- Paystack payments with automated seller settlement

### Known gaps — disclose these
- Meta App Review not yet approved (submission prepared, not filed)
- Apple App Store / Google Play public release not yet complete
- Meta ads add-on built but never run against a live campaign
- No paid acquisition has ever been executed
- The mobile app has had a run of stability bugs; a fix programme is in progress
  with the current session's work deployed

---

## 7. Questions the investor will ask — prepare answers

1. **Why zero orders in 30 days?**
2. **What happens if Jumia or Jiji copies escrow-plus-price-verification?**
3. **Who owns the IP** — the company, or you personally? (See `00-READ-THIS-FIRST.md`.)
4. **What is the CAC, and how do you know?** (You do not yet — it has never been measured. Say so.)
5. **Why 2.5% commission when Jumia charges far more?** What stops you raising it?
6. **Is there a co-founder, or is this a single-founder company?** Key-person risk.
7. **What does $5,500 actually change?** What is the specific milestone it buys?
