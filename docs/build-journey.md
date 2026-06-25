# Building ZEMA 360: an autonomous order pipeline with a human at the money

*How we turned a live Nigerian marketplace into a multi-agent commerce OS — with UiPath Maestro, Qwen, and a WhatsApp approval loop — built with Claude Code.*

## The problem

We run [FairPrice.ng](https://fairprice.ng), an escrow marketplace for Nigeria's informal economy. Real sellers, real buyers, real money held in escrow. But every order carried the same invisible tax: a human had to check stock, arrange fulfillment, verify the Paystack escrow, and finally release funds. The work was repetitive — except for one step. Releasing money is a judgment call, and it was buried in the same manual queue as everything that wasn't.

So we set a constraint: **automate everything except the human judgment, and put the human exactly where the money moves.**

## The shape of the solution

ZEMA 360 is an "order ops squad" running on a **UiPath Maestro BPMN**. When a buyer places an order, FairPrice auto-triggers the process and the agents take over:

> New order → Inventory → Fulfillment → Finance → **human approval** → Release escrow → Notify buyer → Complete

At the finance checkpoint the BPMN pauses and sends a WhatsApp message to the approver — the channel Nigerian merchants already live in. One reply (`approve RUN-XXXX`) resumes the flow. If nobody approves in time, the order expires with escrow *held*. Funds never move without a human.

## Three bugs that taught us something

**1. The literal that wasn't evaluated.** Our approval poll kept returning 404. The cause was deceptively simple: UiPath was sending `?id={{ approvalId }}` as a *literal string* — the template braces were never interpolated. We could have chased the variable mapping forever. Instead we changed the poll to resolve by `orderId` — the one value guaranteed to be populated through the entire flow — and the whole class of "did the variable carry over?" problems evaporated.

**2. The migration that broke the build.** We wanted short, human-typable approval codes instead of long database IDs. The clean way was a new column — but our deploy pipeline runs `prisma db push` during build, and the schema change errored the deployment. The fix was to *not* add a column: `runId` was already short, uppercase, and indexed, so we used it as the approval handle. Constraint became feature.

**3. The data that downgraded itself.** A product detail page would show the right price and image, then silently flip to ₦0 and a placeholder a minute later. A lazy background fetch was returning a degraded record that *won* the resolution chain and clobbered the good server-rendered data. We made resolution non-downgrading: the freshest record wins for descriptive fields, but a real price or image can never be overwritten by a zero or a placeholder.

## What made it work

- **Trigger, don't block.** The order API fires the pipeline with `after()` — the buyer's checkout is never slowed, and a UiPath outage can never fail an order.
- **One entry point.** A token-guarded `/api/zema360/on-order` webhook lets any channel — web, WhatsApp, admin — start the same automation.
- **Human-in-the-loop is a design problem, not a feature.** The win wasn't the AI; it was isolating the *single* decision that needs a person and making it one tap on WhatsApp.

## Built with Claude Code

Every piece — the BPMN integration, the resilient poll loop, the timeout safeguards, the non-downgrading data resolution — was built with Claude Code, debugging live UiPath traces against a production codebase in real time.

## What's next

Per-order dynamic approval windows, Qwen-VL listing from seller photos, and opening the pipeline as an enterprise API so other merchants can run their own autonomous ops squad.

---

*ZEMA 360 is part of [FairPrice.ng](https://fairprice.ng), a Zema Technologies Group venture.*
