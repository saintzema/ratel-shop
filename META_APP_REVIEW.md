# Meta App Review — FairPrice.ng Marketplace

App ID `1000061022523807` · Business portfolio `fairprice.ng`
Instagram app ID `36492600663671781` · IG account `zema_tech_chief`
Test seller store: **Global Stores** → `https://www.fairprice.ng/store/global-stores`

---

## 0. Read this first — cut the submission down

**Your submission currently queues ~25 permissions. The code requests 7.**

Every extra permission is a separate description, a separate screencast, and a
separate reason for a reviewer to reject the whole submission. Meta rejects an
entire request if *any* single permission looks unjustified — and you cannot
justify a permission whose feature does not exist yet. Reviewers check that the
screencast shows the permission actually being used in a shipped product.

Exactly what the code asks for today:

| OAuth flow | File | Scopes requested |
|---|---|---|
| Facebook Login for Business | `frontend/src/app/api/seller/facebook/auth/route.ts` | `pages_show_list`, `pages_read_engagement`, `pages_manage_posts` |
| Instagram Business Login | `frontend/src/app/api/seller/instagram/auth/route.ts` | `instagram_business_basic`, `instagram_business_content_publish`, `instagram_business_manage_messages`, `instagram_business_manage_comments` |

### Submit these 7 (+ `public_profile`, which is automatic)

```
pages_show_list
pages_read_engagement
pages_manage_posts
instagram_business_basic
instagram_business_content_publish
instagram_business_manage_messages
instagram_business_manage_comments
```

### Remove these from the submission

Click **edit your submission** at the top of the Allowed usage page and drop
every permission below. Re-request them later, individually, once the matching
feature actually ships.

| Remove | Why |
|---|---|
| `instagram_basic`, `instagram_content_publish`, `instagram_manage_messages`, `instagram_manage_comments`, `instagram_manage_contents` | **Legacy Instagram Graph API family.** We use Instagram *Business* Login (`instagram_business_*`). These are the old equivalents via Facebook Login — requesting both families signals you don't know which API you're on, and we never call these. |
| `Instagram Public Content Access` | Reads *other people's* public IG content. We never do this. Also drags in `instagram_basic` + `pages_read_engagement` as dependencies. |
| `Human Agent` | Requires `pages_messaging`, which we don't request. This is for human support agents replying in Messenger past the 24h window. Not built. |
| `whatsapp_business_messaging`, `whatsapp_business_management`, `whatsapp_business_manage_events` | Ziva uses WhatsApp **deep links** (`wa.me`), not the Cloud API. No WhatsApp Business API integration exists to demo. |
| `catalog_management` | We import *from* Instagram into our own catalog. We never write to a Meta catalog. |
| `business_management` | Only needed to manage Business Manager assets programmatically. We don't. |
| `pages_manage_ads`, `ads_management`, `ads_read`, `Marketing API Access Tier` | The paid Meta-ads boost add-on is built but has never placed a live ad. **Submit this as a second, separate request after you've run one real campaign** — you cannot pass the "required API test calls" gate without real ad activity, and a failed ads request would sink the Instagram/Pages approval alongside it. |

Trimming to 7 turns a submission you cannot complete into one you can finish
today. The two Meta-ads permissions are the only real loss, and they're blocked
on test calls anyway.

---

## 1. Unblock the screencast upload field

The Reviewer instructions page says:

> Before you can add reviewer instructions, you'll need to specify platforms for this app.

**The screencast upload is locked until the app declares a platform.** Settings →
Basic currently has an empty iOS Bundle ID, "This field is required" under
Android Package Names, and a blank Site URL — so zero platforms are complete.

**Settings → Basic → scroll to the bottom → + Add Platform → Website**, then set
Site URL to exactly:

```
https://www.fairprice.ng
```

> **"This URL contains an invalid domain"** — you pasted the label with the value
> (`Site URL: https://www.fairprice.ng`). Paste the URL only, with no prefix, no
> trailing slash, and no spaces.

Website is the correct platform: the OAuth flow, the connect screens, and every
publish action happen on fairprice.ng. Don't fill in the iOS/Android blocks —
they want App Store / Play Store IDs you don't have, and the Capacitor app is a
WebView pointed at the same site.

---

## 2. Screen recording rules (these get people rejected)

- **Show the login.** Start at signed-out `fairprice.ng`, sign in, and navigate
  to the feature. A recording that opens on an already-authenticated dashboard
  is the single most common rejection.
- **Show the Meta consent dialog** with the permission scopes visible on screen.
- **Show the end result** — the live post, the reply landing, the imported product.
- **Never cut.** One continuous take per permission. No edits, no speed-ups.
- **English UI**, screen text readable, 720p or better, MP4 or MOV.
- Reviewers are not FairPrice users. Narrate with on-screen actions, slowly.

One recording may cover several permissions if the flow genuinely exercises them
together — upload the same file to each permission and say so in the description.

---

## 3. Per-permission: description + exact actions to record

Paste each description into **"Describe how your app uses this permission or
feature"**, then upload the matching recording.

---

### `pages_show_list`

**Description:**
> FairPrice.ng is a Nigerian marketplace where sellers run an online store. Sellers connect their own Facebook Page so they can publish their product listings to it from our Social Composer. We use pages_show_list solely to retrieve the list of Pages the seller administers, so we can present those Pages for them to choose which one to link. Without it we cannot show the seller their own Pages and they would have no way to select a publishing target. We store only the selected Page's ID and name.

**Record — `screencast-pages.mp4`** (also covers `pages_read_engagement` and `pages_manage_posts`):
1. Open `https://www.fairprice.ng` signed out. Sign in as the seller.
2. Go to **Seller Dashboard → App Integrations**.
3. Click **Connect App** on the Facebook/Meta card.
4. On Facebook's consent screen, **pause so the requested permissions are readable**.
5. Approve. You land back on FairPrice.
6. **Show the list of your Pages being displayed**, and select one. ← `pages_show_list`
7. The card now reads **Connected** with the Page name shown. ← `pages_read_engagement`
8. Go to **Social Composer**, pick a product, select **Facebook**, click **Post now**. ← `pages_manage_posts`
9. Click **View post** and let the live post on the Facebook Page fill the screen.

---

### `pages_read_engagement`

**Description:**
> After a seller links their Facebook Page, we read the Page's basic metadata (name and ID) to confirm the connection succeeded and to display the connected Page name in the seller's App Integrations screen, so the seller can verify they linked the correct Page before publishing. This permission is also a Meta-required dependency of pages_manage_posts, which we use to publish the seller's product listings to their own Page. We do not read visitor posts or comment threads.

**Record:** same file as `pages_show_list` — steps 6–7 show the Page name read back and displayed.

---

### `pages_manage_posts`

**Description:**
> Sellers on FairPrice.ng list products for sale. Our Social Composer lets a seller take a product they have listed and publish it as a post to their own Facebook Page in one tap, with the caption formatted for Facebook and a link back to their FairPrice storefront. We use pages_manage_posts exclusively to create these posts on the Page the seller explicitly connected, and only when the seller presses "Post now" or schedules a post for a time they chose. We never post without an explicit seller action. This is core functionality: our sellers are small Nigerian businesses whose customers are on Facebook, and removing it would eliminate the main reason they connect a Page.

**Record:** same file — steps 8–9 show the post being created and the live result.

---

### `instagram_business_basic`

**Description:**
> FairPrice.ng sellers connect their own Instagram Business or Creator account so they can publish product listings to it and import their existing posts into their FairPrice product catalog. We use instagram_business_basic to obtain the connected account's ID and username, to display which account is linked in the seller's App Integrations screen, and to fetch the seller's own recent media for the Instagram Catalog Sync import feature. It is also the Meta-required base permission for every other Instagram Business scope we request. We only ever access the account the seller personally authorized.

**Record — `screencast-instagram.mp4`** (also covers `instagram_business_content_publish`):
1. Open `https://www.fairprice.ng` signed out. Sign in as the seller.
2. **Seller Dashboard → App Integrations** → Instagram card → **Connect App**.
3. On Instagram's consent screen, **pause so the permissions are readable**. Approve.
4. Back on FairPrice, show the card reading **Connected** with **@zema_tech_chief** displayed. ← `instagram_business_basic`
5. Scroll to **Instagram Catalog Sync** — show the seller's own posts loaded in the grid. ← still `instagram_business_basic`
6. Go to **Social Composer**, pick a product, select **Instagram**, press **Post now**. ← `instagram_business_content_publish`
7. Click **View post** and let the live Instagram post fill the screen.

---

### `instagram_business_content_publish`

**Description:**
> This is the core of our Social Composer. A seller selects a product they have listed on FairPrice.ng and publishes it to their own connected Instagram Business account in one tap. We generate a caption within Instagram's limits, pad the product image to an aspect ratio Instagram accepts, and publish it via the content publishing API. Publishing happens only when the seller presses "Post now" or schedules a post for a time they explicitly chose. Our sellers are small Nigerian businesses for whom Instagram is the primary sales channel; posting each product manually is the single biggest chore this platform removes.

**Record:** same file as `instagram_business_basic` — steps 6–7. Make sure the live post is clearly visible at the end.

---

### `instagram_business_manage_messages`

**Description:**
> Sellers receive purchase enquiries as Instagram direct messages. FairPrice.ng gives sellers a unified inbox that shows those DMs alongside their FairPrice order messages, so a seller running a one-person business does not have to watch two apps to avoid missing a sale. We use instagram_business_manage_messages to read the seller's incoming DMs and to send their replies, only for the account the seller connected and only when the seller types and sends a reply themselves.

**Record — `screencast-ig-messages.mp4`:**
1. Signed out → sign in → **App Integrations**, show Instagram **Connected**.
2. From a **second phone/account**, send a DM to the connected IG account, e.g. *"Hi, is this still available?"*
3. In FairPrice, open **Seller Dashboard → Messages** (or Meta Business Suite → Unified Inbox).
4. Show the incoming DM appearing in the FairPrice inbox. ← read
5. Type a reply in FairPrice and send it. ← send
6. Cut to the Instagram app on the second account and **show the reply arriving**.

> Requires a real second Instagram account. Without step 6 this gets rejected.

---

### `instagram_business_manage_comments`

**Description:**
> When a seller publishes a product to Instagram through FairPrice.ng, buyers ask questions in the comments. We surface comments containing purchase intent in the seller's FairPrice dashboard and let the seller reply without leaving the platform, so enquiries on their listings are answered quickly. We use instagram_business_manage_comments to read comments on the connected account's own media and to publish the seller's replies, only when the seller writes and sends the reply.

**Record — `screencast-ig-comments.mp4`:**
1. Signed out → sign in → **App Integrations**, show Instagram **Connected**.
2. From a **second account**, comment on one of the connected account's posts, e.g. *"How much?"*
3. In FairPrice, open the **Meta Business Suite → unreplied comments** panel.
4. Show the comment appearing. ← read
5. Reply from within FairPrice. ← publish
6. Cut to Instagram and **show the reply under the post**.

**Also required:** this permission shows *"Please answer customized questions for tech provider."* Answer as a **Tech Provider** — you provide software to other businesses (Nigerian sellers) who connect their own IG accounts; you are not managing your own brand's presence.

---

## 4. Required API test calls

Several permissions show *"Ensure you have performed required API test calls."*
Go to **App Review → Testing**. A call takes up to 24h to register.

Every call is made simply by **using the live feature once** while connected —
no manual API work needed:

| Permission | Triggering action | Status |
|---|---|---|
| `pages_manage_posts` | Post a product to Facebook from the Social Composer | ✅ Done — live post confirmed |
| `pages_read_engagement` | Connect the Facebook Page | ✅ Done |
| `instagram_business_content_publish` | Post a product to Instagram | ✅ Done — confirmed working after the publishing scope was added |
| `instagram_business_manage_comments` | Reply to a comment from the dashboard | ⬜ Do this once while recording §3 |
| `instagram_business_manage_messages` | Reply to a DM from the dashboard | ⬜ Do this once while recording §3 |

Record the screencasts and the test calls tick themselves off.

---

## 5. Reviewer instructions (paste once, App Review → Reviewer instructions)

> **Test account** — email: `<create a reviewer test seller>` / password: `<set one>`
>
> FairPrice.ng is a Nigerian online marketplace. Sellers create a store, list products, and sell to buyers with escrow-protected payments. The Meta integration lets a seller connect their own Facebook Page and Instagram Business account so they can publish their product listings to those accounts and handle buyer enquiries from one place.
>
> To reproduce:
> 1. Go to https://www.fairprice.ng and sign in with the test account above.
> 2. Open the seller dashboard at https://www.fairprice.ng/seller/dashboard.
> 3. Go to **App Integrations** in the left sidebar.
> 4. Click **Connect App** on the Instagram card (or the Facebook card) and complete the Meta login. The connected account name appears on the card once linked.
> 5. Go to **Social Composer** in the left sidebar.
> 6. Select any product, tick Facebook and/or Instagram, and press **Post now**. A "View post" link to the published post appears on success.
> 7. Instagram DMs and comments on the connected account appear under **Messages** and can be replied to from there.
>
> All posting is initiated by the seller. Nothing is published automatically.

**Create a dedicated reviewer account** — don't hand over a real seller's
credentials, and don't use `techzema@gmail.com`. It needs a connected FB Page
and IG account, so create it, connect Meta accounts, and list 2–3 products.

---

## 6. Submission order

1. Trim the submission to the 7 permissions in §0.
2. Add the **Website** platform (§1) — unlocks every upload field.
3. Create the reviewer test account and list a few products.
4. Record the four screencasts in §3 (`pages`, `instagram`, `ig-messages`, `ig-comments`).
5. Paste each description, upload each recording, tick each allowed-usage box.
6. Confirm the test calls in §4 have registered under **Testing**.
7. Paste the reviewer instructions from §5.
8. Submit.
9. **Separately, later:** run one real Meta ad campaign through the boost add-on,
   then request `ads_management` / `ads_read` / `pages_manage_ads` /
   Marketing API Access Tier on their own.

---

## Appendix — OAuth configuration (verified working)

**Valid OAuth Redirect URIs** (Facebook Login for Business → Settings):

```
https://www.fairprice.ng/api/seller/facebook/callback
https://www.fairprice.ng/api/seller/instagram/callback
```

Both are pinned server-side in `frontend/src/lib/meta-oauth-redirect.ts` — in
production the origin is always the canonical `https://www.fairprice.ng`,
regardless of the host the request arrived on, because Meta's OAuth Strict Mode
requires a byte-exact match against the allowlist.

**App domains:** `fairprice.ng`, `www.fairprice.ng`

**`NEXT_PUBLIC_FACEBOOK_APP_ID` must be `1000061022523807`.** It was previously
set to `691643767008876` — a *different* Meta app whose allowlist did not contain
our redirect URIs, which is what produced the "URL Blocked" error. Fixed, and
Facebook posting has been confirmed live since.

**Deauthorize / data deletion callbacks:**

```
https://www.fairprice.ng/api/seller/instagram/deauthorize
https://www.fairprice.ng/api/seller/instagram/data-deletion
```

---

## 7. Phase 2 — the paid "Promote" / Meta-ads optimisation feature

### First, the thing that changes the whole answer

`frontend/src/lib/meta-ads.ts` creates campaigns against **our own ad account
using a System User token**:

```ts
const adAccountId = settings?.metaAdAccountId || process.env.META_AD_ACCOUNT_ID;
const accessToken = settings?.metaAdsAccessToken || process.env.META_ADS_ACCESS_TOKEN;
const adAccount = `act_${adAccountId}`;
await metaPost(`${adAccount}/campaigns`, { ... });
```

We are **not** spending from the seller's ad account with the seller's OAuth
token. That matters, because most `ads_management` App Review pain exists to
police apps that touch *other businesses'* ad accounts.

**A System User in your own Business Manager, holding `ads_management` on an ad
account your business owns, does not need those permissions granted through App
Review.** You assign them in Business Settings. So the ads permissions sitting
in your submission are largely solving a problem you don't have.

What you *do* need for the current architecture:

| Requirement | Where it comes from | Status |
|---|---|---|
| **Marketing API Standard Access** | App Review — the *access tier*, not a permission. The Basic tier can only touch ad accounts in dev mode; Standard is required to actually spend. | ⬜ Needed before the first live ad |
| **`ads_management` on our own ad account** | Business Settings → System User → assign ad account. No App Review. | ⬜ Assign the System User |
| **Business verification** | Already have the `FairPrice Merchants LLC` portfolio | ✅ |
| **`pages_manage_ads` from the seller** | Seller OAuth — required to use *their* Page as the ad's identity | ⬜ Phase 2 |

`pages_manage_ads` is the one genuinely seller-granted ads permission: an ad
promoting a seller's product should run under the seller's Page, and using
someone else's Page as an ad identity requires it. (The alternative is adding
each seller's Page to your Business Manager as a partner asset, which does not
scale to self-serve.)

### Permissions for the "optimise using best metrics" part

**None of this is built yet** — there is not a single `/insights` call anywhere
in the codebase. `meta-ads.ts` creates campaigns and ad sets and then never
reads back how they performed. So "auto-optimise using the best metrics" is
currently a campaign launcher, not an optimiser.

When you build it, the reads you'll need:

| Permission | Reads | Whose token |
|---|---|---|
| `ads_read` | Campaign spend, impressions, CPC, CPA, ROAS — the numbers the optimiser acts on | Our System User (no App Review, own account) |
| `read_insights` | Page-level organic reach/engagement, for comparing paid vs organic lift | Seller OAuth — **App Review** |
| `instagram_business_manage_insights` | Per-post IG reach, saves, profile visits — which creative to put money behind | Seller OAuth — **App Review** |

**`instagram_business_manage_insights` is in your queue and I did not classify it
in §0 — that was an omission.** Verdict: **remove it for now, keep it for Phase 2.**
The code never requests it in the Instagram OAuth scope list, so there is nothing
to record a screencast of, and an unusable permission is a rejection risk. It
becomes the *right* permission to request the moment the optimiser ships, because
"which of this seller's posts earned engagement" is exactly what decides where ad
spend goes.

### SEO — no Meta permission exists for this

Worth stating plainly: **SEO has nothing to do with Meta App Review.** Organic
search visibility is Google/Bing crawling fairprice.ng — structured data, sitemaps,
page titles, canonical URLs, storefront page speed. No Meta permission affects it,
and mentioning SEO in a Meta permission justification would read as unfocused to a
reviewer. Keep it out of the submission entirely; it's our own site's work.

### Phase 2 submission (after the first real campaign runs)

```
pages_manage_ads
ads_read
read_insights
instagram_business_manage_insights
Marketing API — Standard Access tier
```

Sequence, because the test-call gate is the blocker:

1. Assign the System User `ads_management` on the FairPrice ad account (Business Settings — no review).
2. Request **Marketing API Standard Access** on its own. This is a tier, not a permission, and can be requested without screencasts of seller flows.
3. Run **one real campaign** end to end through the Promote add-on and let it spend. This registers the required API test calls.
4. Build the insights read-back so the optimiser is real.
5. *Then* submit the five above, with a screencast showing a seller paying for Promote, the campaign going live, and the performance panel reading back real numbers.

Do not attach any of this to the Phase 1 submission. Phase 1 approves posting and
messaging — features that work today and can be demoed today. Bundling an
unbuildable ads demo alongside them risks the whole thing.

---

## 8. Running the required API test calls from the terminal

Meta's *"Ensure you have performed required API test calls"* gate is satisfied by
the app making a real call with the permission. Using the live feature does this
for you, but when a feature is awkward to trigger on demand — or you want the call
registered *now* rather than waiting for a buyer — run it directly.

Calls take **up to 24 hours** to appear under **App Review → Testing**.

### Set up your shell once

```bash
export FB_APP_ID="1000061022523807"
export FB_APP_SECRET="<Settings → Basic → App Secret>"
export PAGE_TOKEN="<Graph API Explorer → your Page → Generate Token>"
export IG_TOKEN="<the seller's Instagram Business token>"
export SYS_TOKEN="<Business Settings → System Users → Generate Token>"
export AD_ACCOUNT_ID="<Ads Manager account id, digits only, no act_ prefix>"
export PAGE_ID="<your Facebook Page id>"
export IG_USER_ID="<your Instagram Business account id>"
export GRAPH="https://graph.facebook.com/v21.0"
```

> Never commit these. `FB_APP_SECRET` and `SYS_TOKEN` grant full control of the app
> and the ad account respectively.

### Phase 1 permissions

**`pages_show_list`** — list the Pages this user administers:

```bash
curl -s "$GRAPH/me/accounts?fields=id,name,access_token&access_token=$PAGE_TOKEN" | head -c 800
```

**`pages_read_engagement`** — read Page metadata:

```bash
curl -s "$GRAPH/$PAGE_ID?fields=id,name,fan_count,link&access_token=$PAGE_TOKEN"
```

**`pages_manage_posts`** — publish a post (this posts publicly; use a real product):

```bash
curl -s -X POST "$GRAPH/$PAGE_ID/feed" \
  -d "message=Now available on FairPrice.ng — check the verified market price before you buy." \
  -d "link=https://www.fairprice.ng/store/global-stores" \
  -d "access_token=$PAGE_TOKEN"
```

**`instagram_business_basic`** — read the connected account:

```bash
curl -s "$GRAPH/$IG_USER_ID?fields=id,username,media_count&access_token=$IG_TOKEN"
```

**`instagram_business_content_publish`** — two steps, container then publish:

```bash
# 1. Create the media container (image must be a public URL, 4:5–1.91:1)
CREATION_ID=$(curl -s -X POST "$GRAPH/$IG_USER_ID/media" \
  -d "image_url=https://www.fairprice.ng/<a-real-product-image>.jpg" \
  -d "caption=Verified fair price on FairPrice.ng" \
  -d "access_token=$IG_TOKEN" | python3 -c "import sys,json;print(json.load(sys.stdin).get('id',''))")
echo "container: $CREATION_ID"

# 2. Publish it
curl -s -X POST "$GRAPH/$IG_USER_ID/media_publish" \
  -d "creation_id=$CREATION_ID" -d "access_token=$IG_TOKEN"
```

**`instagram_business_manage_comments`** — read comments, then reply:

```bash
MEDIA_ID=$(curl -s "$GRAPH/$IG_USER_ID/media?fields=id&limit=1&access_token=$IG_TOKEN" \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['data'][0]['id'])")

curl -s "$GRAPH/$MEDIA_ID/comments?fields=id,text,username&access_token=$IG_TOKEN"

# Reply (needs a real comment id from above)
curl -s -X POST "$GRAPH/<COMMENT_ID>/replies" \
  -d "message=Thanks for asking — full price and details are on our FairPrice store." \
  -d "access_token=$IG_TOKEN"
```

**`instagram_business_manage_messages`** — read conversations, then reply:

```bash
curl -s "$GRAPH/$IG_USER_ID/conversations?platform=instagram&access_token=$IG_TOKEN"

curl -s -X POST "$GRAPH/$IG_USER_ID/messages" \
  -H "Content-Type: application/json" \
  -d '{"recipient":{"id":"<IGSID_FROM_ABOVE>"},"message":{"text":"Hi! Yes, it is still available."}}' \
  -d "access_token=$IG_TOKEN"
```

> A DM reply only works inside the 24-hour window after the user messaged you.
> Send yourself a DM from a second account first.

### Phase 2 — ads permissions

`ads_read` and `ads_management` run against **our own** ad account with the System
User token, so they need the permission assigned in **Business Settings → System
Users**, not App Review. These calls register them.

**`ads_read`** — the app now makes this call itself via `verifyAdsReadAccess()` in
`frontend/src/lib/meta-ads.ts`, and every load of `/api/seller/ads/insights`
issues real `/insights` reads. To fire it manually:

```bash
# Account reachable + token has ads_read
curl -s "$GRAPH/act_$AD_ACCOUNT_ID?fields=name,currency,account_status,amount_spent&access_token=$SYS_TOKEN"

# Campaign-level performance — the call the insights panel makes
curl -s "$GRAPH/act_$AD_ACCOUNT_ID/insights?fields=impressions,reach,clicks,spend,cpm,cpc,ctr,actions&date_preset=maximum&access_token=$SYS_TOKEN"
```

**`ads_management`** — creating a campaign. `createBoostCampaign()` does this for
real when a seller buys the Meta-ads add-on. Manually, and **note this spends
money** once the ad set is activated:

```bash
curl -s -X POST "$GRAPH/act_$AD_ACCOUNT_ID/campaigns" \
  -d "name=FairPrice Test Campaign" \
  -d "objective=OUTCOME_TRAFFIC" \
  -d "status=PAUSED" \
  -d "special_ad_categories=[]" \
  -d "access_token=$SYS_TOKEN"
```

Leave it `PAUSED` if you only need the call registered. A **paused campaign still
counts as an API call** but will not satisfy anyone reviewing whether the feature
genuinely works — for that you need a real campaign that actually delivers.

**`pages_manage_ads`** — this one *is* seller-granted and does need App Review. It
authorises using the seller's Page as the ad's identity. There is no useful manual
call: it is exercised when `createBoostCampaign()` builds an ad creative whose
`object_story_id` belongs to the seller's Page.

### Verifying what a token can actually do

Before recording anything, confirm the token carries the scopes you think it does:

```bash
curl -s "$GRAPH/debug_token?input_token=$PAGE_TOKEN&access_token=$FB_APP_ID|$FB_APP_SECRET" \
  | python3 -m json.tool
```

The `scopes` array in the response is the definitive answer. If a permission is
missing there, no amount of re-recording will help — reconnect the account with
the correct scope requested first. This is exactly how the Instagram publishing
failure was diagnosed: the token simply never carried
`instagram_business_content_publish`.

---

## 9. The ads product — what now exists, and what still doesn't

For the Phase 2 submission you will be asked to demonstrate a working ads feature.
Here is the honest state of it.

### Built

| Piece | File | Status |
|---|---|---|
| Campaign creation (Campaign → AdSet → Creative → Ad, with rollback on partial failure) | `lib/meta-ads.ts` → `createBoostCampaign()` | Built, never run live |
| Insights read-back (impressions, reach, clicks, spend, CPM, CPC, CTR, link clicks) | `lib/meta-ads.ts` → `fetchCampaignInsights()` | **New** |
| Seller-facing performance API, joined to on-platform conversions | `api/seller/ads/insights` | **New** |
| Contact attribution — WhatsApp click and phone reveal now recorded | `ProductClient.tsx` → `/track` | **New** |
| Boost packages and pricing | `lib/boost-packages.ts` | Built |
| Payment before campaign creation (Paystack, reference verified server-side) | `api/seller/facebook/promote` | Built |

### The metric that makes this a real product

Meta reports impressions and clicks. It cannot tell a Nigerian seller the only
thing they actually care about: **did anyone message me?**

`/api/seller/ads/insights` now closes that loop, returning per campaign:

- `contacts` — phone reveals + WhatsApp chats started on the boosted product
- `contactRatePct` — contacts ÷ link clicks
- `costPerContactNaira` — what the seller paid ÷ contacts

That is the number to put on screen, and the number to sell the add-on on. "₦6,500
produced 23 people who messaged you, at ₦283 each" is a proposition a market
trader understands immediately. "₦6,500 produced 14,000 impressions" is not.

### Still missing before Phase 2 is honest

1. **No campaign has ever run.** Everything above is untested against live
   delivery. Run one real campaign end to end before submitting.
2. **No optimiser.** The insights are read but nothing acts on them. "Auto-optimise
   using the best metrics" would require: pause underperformers, shift budget to
   the best creative, and a rule engine deciding when. Do not claim this to Meta
   or to an investor until it exists.
3. **No UI panel yet.** The API returns the data; nothing renders it. A seller
   cannot see any of this in the dashboard.
4. **`read_insights` / `instagram_business_manage_insights` not requested.** The
   OAuth scope lists don't ask for them, so organic-vs-paid comparison is
   impossible today.

### Sequence

1. Assign `ads_management` + `ads_read` to the System User in Business Settings.
2. Run `verifyAdsReadAccess()` — or the curl above — to register `ads_read`.
3. Request **Marketing API Standard Access** on its own (a tier, not a permission;
   needs no seller screencast).
4. Run **one real campaign** that actually delivers. This registers the
   `ads_management` calls and gives you real insight numbers.
5. Build the seller-facing panel so the screencast has something to show.
6. Only then submit `pages_manage_ads`, `ads_read`, `read_insights`,
   `instagram_business_manage_insights`.

---

## 10. SEO — separate from Meta, and worth doing properly

No Meta permission affects organic search. Keep SEO out of the App Review
submission entirely. It matters for the same goal — putting sellers' products in
front of buyers with purchase intent — so it is tracked here, separately.

Google Search Console currently reports on `fairprice.ng`:

| Issue | Type | Status |
|---|---|---|
| Missing field `validFrom` in `offers` | Merchant listings, non-critical | Fixed — `validFrom` added to Offer schema |
| Missing field `review` | Product snippets, non-critical | **Correctly absent** — see below |
| Missing field `aggregateRating` | Product snippets, non-critical | **Correctly absent** — see below |

**On `review` and `aggregateRating`:** Google flags these as missing because a
product with ratings gets stars in search results, which lifts click-through
substantially. The temptation is to emit a rating for every product regardless.

**Do not.** Structured data must reflect what is on the page. Emitting invented or
default ratings is a
[structured data policy violation](https://developers.google.com/search/docs/appearance/structured-data/sd-policies)
and risks a manual action against the whole domain — losing far more traffic than
stars would ever gain. These fields should appear **only** for products with real
reviews, and stay absent otherwise. That is the current behaviour, and it is
correct.

The legitimate way to earn those stars is to collect real reviews — the
post-delivery review prompt already exists in the order flow.

---

## 11. "Something Went Wrong" when uploading a screencast

Meta's uploader fails with a generic dialog and no detail. Refreshing rarely
helps because the cause is usually the file or the browser, not the page.

Work through these in order.

### a) Re-encode the video — the most common fix

Meta's uploader is fussy about codecs. A `.mp4` container can still hold HEVC/
H.265 (everything QuickTime and iPhone screen recordings produce by default),
which the uploader rejects without saying so. Force **H.264 + AAC**:

```bash
ffmpeg -i input.mov \
  -vcodec libx264 -profile:v baseline -level 3.1 -pix_fmt yuv420p \
  -acodec aac -b:a 128k \
  -vf "scale=1280:-2" -r 30 \
  -movflags +faststart \
  screencast-ready.mp4
```

`-pix_fmt yuv420p` and `-profile:v baseline` matter most — they force the widely
compatible encoding. `+faststart` moves the index to the front of the file, which
some uploaders require to begin processing.

Check the result is genuinely H.264:

```bash
ffprobe -v error -select_streams v:0 -show_entries stream=codec_name -of csv=p=0 screencast-ready.mp4
# must print: h264
```

### b) Get the file under ~50 MB

Long recordings from a Mac are frequently 300 MB+. Add `-crf 28` to shrink hard:

```bash
ffmpeg -i input.mov -vcodec libx264 -crf 28 -preset slow -pix_fmt yuv420p \
  -acodec aac -b:a 96k -vf "scale=1280:-2" -movflags +faststart small.mp4
ls -lh small.mp4
```

Keep each recording to **2–4 minutes**. One permission per file.

### c) Disable extensions / use a clean browser profile

Your screenshots show a customised browser with extensions loaded. Ad blockers,
privacy extensions and script blockers routinely break Meta's chunked upload XHR —
and the failure surfaces as exactly this dialog.

Open `developers.facebook.com` in a **clean profile or private window with all
extensions disabled**, or try a different browser entirely. This alone resolves it
a large share of the time.

### d) The form session goes stale

The Allowed Usage page is marked "Auto-saved" and holds a session token that
expires. If the tab has been open a long while, the upload posts against a dead
token and fails generically.

Close every `developers.facebook.com` tab, sign out, sign back in, go straight to
the permission, and upload as the first thing you do.

### e) Last resort — a hosted link

If the uploader will not cooperate, some permission forms accept a URL in the
description field instead. Upload the recording as an **unlisted YouTube video**
or a public Google Drive link (set to "anyone with the link"), and add to the
description:

> Screencast: https://…  (uploader repeatedly failed; link provided instead)

Not ideal, and not accepted on every form, but better than a stalled submission.

---

## 12. Check your permission descriptions before submitting

A description that references a permission you are **not** requesting is a
rejection risk on its own — it tells the reviewer the submission and the product
disagree.

Currently in the `instagram_business_content_publish` description:

> "…instagram_manage_contents (delete) lets a seller remove a post FairPrice made
> for them if they change their mind, directly from the same dashboard."

`instagram_manage_contents` is a **legacy Graph API permission that this app does
not request and the code never calls** (see §0). Remove that sentence. Describe
only what `instagram_business_content_publish` does: creating the post.

Suggested replacement for that final sentence:

> Publishing happens only when the seller presses "Post now" or schedules a post
> for a time they explicitly chose. We never publish without an explicit seller
> action.

Read every description with the same question: **does this mention any permission
that is not in this submission, or any feature a reviewer cannot reproduce in the
live product?** If yes, cut it.
