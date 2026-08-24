# Before you send anything to the investor

These are **drafts prepared for review by a qualified Nigerian lawyer**. I am not
a lawyer and this is not legal or investment advice. Do not sign, and do not send
to the investor as final, until counsel has reviewed them.

---

## Status of the three blockers

| # | Question | Status |
|---|---|---|
| 1 | Which entity sells the equity? | ⚠️ **Still open — and it changed shape. Read below.** |
| 2 | Is the investor foreign? | ✅ **Resolved.** Investor is Nigerian, so **no Certificate of Capital Importation is required.** |
| 3 | What is the existing share capital? | ⚠️ Partly resolved — see §1 |

You have chosen the **SAFE / convertible route** (`05-SAFE-AGREEMENT.md`). That is
the option I would have suggested, and it means you do not have to fix a $55,000
price on the company today.

---

## 1. The entity question is now the whole deal

You told me:

- **FairPrice Merchants LLC** is a company *under* **ZEMA IT SOLUTIONS LTD**
- **ZEMA IT SOLUTIONS LTD** is the one with the CAC registration
- FairPrice is **100% yours**
- ZEMA IT is **80% yours**

That combination raises a problem worth solving before you sign anything.

### "LLC" is not a Nigerian company form

Nigeria has no "LLC". Under CAMA 2020 you have private companies limited by
shares (**Ltd**), public companies (**Plc**), companies limited by guarantee, and
business names. If **FairPrice Merchants LLC** is a *business name*, a trading
style, or a US-registered entity rather than a Nigerian company limited by shares,
then **it cannot issue shares at all** — there is no share capital to sell 10% of.

Your own description points that way: you say ZEMA IT is "the one which has a
registered CAC".

**Ask your lawyer one question first:** *is FairPrice Merchants LLC separately
incorporated at the CAC as a company limited by shares, with its own RC number and
issued share capital?*

### The answer decides everything downstream

**If YES — FairPrice Merchants Ltd is its own CAC company:**
This is the clean path. You own 100%, so you can issue to the investor without
anyone else's consent, and the investor's money and risk both sit on FairPrice
alone. Use that entity in `05-SAFE-AGREEMENT.md` and stop here.

**If NO — the only real company is ZEMA IT SOLUTIONS LTD:**
Then the SAFE has to be issued by ZEMA IT, and three consequences follow that you
should not discover after signing:

1. **You own 80% of ZEMA IT, not 100%.** Someone holds the other 20%. Issuing new
   shares dilutes them, and your Articles and CAMA 2020 pre-emption rules almost
   certainly give them a right to be offered those shares first, or at least to
   consent. **Talk to them before you talk to the investor.**

2. **The investor gets exposure to all of ZEMA IT, not to FairPrice.** Every other
   line of business ZEMA IT runs comes along with it — good and bad. And 10% of
   ZEMA IT is *not* 10% of FairPrice.

3. **You may be selling a stake in the wrong thing.** If FairPrice becomes the
   valuable asset, an investor holding ZEMA IT shares owns a slice of the holding
   company. That is workable, but it must be deliberate and it must be what both
   sides understood.

### Your position: Newco comes later — so the SAFE carries a substitution clause

You have said FairPrice Merchants Ltd will be incorporated, and the IP assigned to
it, **in future** rather than before this investment.

That is workable, and it is a genuine argument *for* the SAFE over straight equity:
**a SAFE issues no shares today**, so the question of which company issues them
only has to be answered at conversion — by which time the Newco can exist.

`05-SAFE-AGREEMENT.md` clause **2.5** handles it. In short:

- **ZEMA IT SOLUTIONS LTD signs the SAFE now** (it is the company that exists).
- If **FairPrice Merchants Ltd** is incorporated and the IP assigned to it before
  conversion, the SAFE is **novated** to that company — it assumes the obligations,
  ZEMA IT is released, and the Investor converts into the FairPrice company instead.
- **Cap, discount and amount are unchanged.** The Investor gives up nothing.
- If the Newco never happens, the SAFE converts into ZEMA IT as written.

### Two things this does not solve — raise both before signing

1. **You own 80% of ZEMA IT.** If conversion happens before the Newco exists, new
   shares are issued in ZEMA IT and your 20% co-owner is diluted. CAMA 2020 and your
   Articles very likely give them pre-emption rights or a consent right.
   **Speak to them before you sign, not at conversion.** A SAFE that cannot legally
   convert is worse than no SAFE.

2. **Tell the investor plainly which company they are signing with, and why.** They
   are signing with ZEMA IT and relying on clause 2.5 to move them to FairPrice
   later. Investors accept this routinely — but only when it is explained upfront.
   Discovering it later reads as concealment and will cost you the relationship.

**Do not paper this deal against "FairPrice.ng".** A brand is not a legal person
and cannot issue equity.

### The cleaner alternative, if you can afford the delay

Incorporate FairPrice Merchants Ltd first, assign the IP (Schedule 3 of the
subscription agreement is reusable), and have that company issue the SAFE directly.
A few weeks and some CAC fees. It removes clause 2.5, removes the co-owner
question, and gives the investor exactly what they think they are buying. If the
investor is not in a hurry, this is the better path.

---

## 2. Who owns the code?

Unchanged and still important: if you wrote the FairPrice codebase personally and
never assigned it to a company, the investor would be funding an entity that owns
nothing. The **IP Assignment** in `02-SHARE-SUBSCRIPTION-AGREEMENT.md` Schedule 3
transfers the domain, brand, source code and databases to the issuing company, and
should be executed at the same time as the SAFE.

This is the most common way early Nigerian deals fall apart in diligence.

---

## 3. Why the SAFE is the right call here

You are pricing a company that has built a great deal and sold relatively little.
Fixing $55,000 today would anchor every future round to that number.

Illustration at the terms drafted (cap $150,000, 20% discount):

| Next round values the company at | Straight equity | SAFE |
|---|---|---|
| $150,000 | 10% | ~4.6% |
| $500,000 | 10% | ~3.7% |

At a $500,000 round that difference is roughly **$31,500 of founder equity** —
about six times the cheque. If the investor prefers straight equity after seeing
this, that is a legitimate position and `01-TERM-SHEET.md` is ready.

**Ask your lawyer about the wrapper.** A SAFE is US venture practice, not a
Nigerian statutory instrument. Counsel may prefer a **convertible note under CAMA
2020**, which achieves identical economics with firmer local footing — especially
around recording the conversion at the CAC. Either is fine; the numbers do not
change.

---

## 4. The traction numbers are real — do not inflate them

`03-BUSINESS-MODEL-AND-METRICS.md` uses figures queried directly from the
production database. Some are weak. **Send them anyway.**

The number that gets asked about first: **zero orders in the last 30 days.** Have a
straight answer ready before the meeting.

Worth saying plainly, because it is now a selling point: during this build we found
and removed several things that would have failed technical diligence — fabricated
competitor prices attributed to Jumia and Konga, AI-generated customer reviews
shown to shoppers, demo reviews published to Google as real ones, and two
authentication holes (an open admin-settings write endpoint, and an unauthenticated
password overwrite that allowed takeover of any account). All fixed and verified in
production.

An investor's technical adviser looks for exactly these. Finding and fixing them
yourself is a far stronger position than having them found for you.
