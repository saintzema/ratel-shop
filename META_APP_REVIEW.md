# Meta App Review — FairPrice.ng Marketplace

App ID `1000061022523807` · Business portfolio `fairprice.ng`
Instagram app ID `36492600663671781` · IG account `fairprice.ng` (`17841440358019389`)

This is the operational checklist for getting the Meta integrations out of test
mode and into live use. Written against the current (use-case based) Meta
dashboard, not the older "Products → Add Product" layout.

---

## 1. Why Facebook connect currently fails

Pressing **Connect Page** sends the seller to Facebook and they land on
"Sorry, something went wrong" — they never come back to FairPrice. That error is
raised by Facebook *before* our callback runs, so nothing in our code can catch
or report it.

Our OAuth request (`src/app/api/seller/facebook/auth/route.ts`) asks for:

```
pages_show_list, pages_read_engagement, pages_manage_posts
```

**Neither of those permissions is attached to any configured use case.** The app
currently has: *Connect on WhatsApp*, *Instagram API*, and *Catalog API*. None of
them grants Page permissions — so Facebook rejects the authorization outright.

### Fix A — allowlist the redirect URI

**Left sidebar → Facebook Login for Business → Settings**

Under **Valid OAuth Redirect URIs**, add exactly:

```
https://www.fairprice.ng/api/seller/facebook/callback
```

Also confirm on that page:
- *Client OAuth Login* — **On**
- *Web OAuth Login* — **On**
- *Enforce HTTPS* — **On**

The URI must match character-for-character, including `https://`, the `www.`,
and no trailing slash. A mismatch here is the single most common cause of this
exact error.

### Fix B — add the Page permissions

**Left sidebar → Use cases → Add use case**, then pick the Page management use
case (listed as *"Manage everything on your Page"* / *"Manage Page posts"*
depending on rollout). Open its **Permissions and features** tab and confirm
these are present and at least *Ready for testing*:

| Permission | What we use it for |
|---|---|
| `pages_show_list` | List the Pages a seller manages so they can pick one |
| `pages_read_engagement` | Read Page identity to confirm the connection |
| `pages_manage_posts` | Publish the seller's product post to their Page |

Until these exist on a use case, **no redirect-URI fix will help** — Facebook has
nothing to prompt the user to grant.

---

## 2. Advanced Access requires App Review + a screen recording

Permissions marked *Standard Access* only work for people with a role on the app
(admins, developers, testers). For real sellers you need **Advanced Access**,
which requires App Review, and every review submission needs a **screencast**.

### What Meta wants in every screencast

They are checking one thing: *does a real user, in your live product, visibly
grant this permission and receive a visible benefit from it?* So each recording
must show, unbroken and without cuts:

1. A logged-in FairPrice seller on `https://www.fairprice.ng`
2. The seller **clicking the button that starts the Facebook/Instagram login**
3. The **Meta permission dialog appearing**, with the permission visible
4. The seller **granting** it
5. Returning to FairPrice and the feature **doing something real**
6. The **result** — the actual post live on Facebook/Instagram

Record at desktop resolution, no edits, no speed-ups, no voice-over needed. Meta
reviewers reject recordings that jump-cut past the permission dialog.

### Per-permission recordings

#### `pages_show_list` + `pages_read_engagement` + `pages_manage_posts`
**Route:** Seller Dashboard → Social Composer (`/seller/social`)
1. Log in as a seller, open **Social Composer**
2. On the Facebook row, click **Connect Page for auto-post →**
3. Show the Facebook login + the Page-selection dialog, grant access
4. Back on FairPrice, the Facebook row now reads *Auto-posts to <Page name>*
5. Pick a product, click **Generate with AI** for a caption
6. Toggle **Facebook** on, click **Share to 1 platform**
7. Show the green "Posted to your Facebook Page" result row
8. **Open the Page in a new tab and show the live post**

#### `instagram_business_basic`
Covered by the same flow via Instagram — show connecting the IG account and the
composer displaying *Auto-posts to @fairprice.ng*.

#### `instagram_business_content_publish`
**Route:** same composer.
1. Toggle **Instagram** on, select a product with a real photo
2. Click **Share to 1 platform**
3. Show the success row with the permalink
4. **Open the permalink and show the live Instagram post**

> Note the dashboard shows `instagram_business_content_publish` as
> "0 of 1 API call(s) required". You must make at least one successful live call
> before it can be submitted — doing the flow above satisfies that.

#### `instagram_business_manage_comments` / `instagram_business_manage_messages`
**Route:** Seller Dashboard → Messages / Instagram inbox.
Show a real comment or DM arriving on the connected IG account and the seller
reading/replying to it inside FairPrice.

#### `catalog_management`
**Route:** Instagram Catalog Sync on the seller dashboard.
Show selecting Instagram posts and importing them as FairPrice products.

#### `whatsapp_business_messaging` / `whatsapp_business_management`
Already **Completed** per the Testing page — no further recording needed unless
Meta asks.

---

## 3. Submission text

For each permission, the written justification should say plainly what the app
does with it. Keep it concrete — reviewers reject vague answers.

> **pages_manage_posts** — FairPrice.ng is a Nigerian marketplace. Sellers list
> products in our app and use our Social Composer to publish those product
> listings to their own Facebook Page. We use `pages_manage_posts` solely to
> create that post on the Page the seller explicitly connected and selected. We
> never post without the seller pressing Share, and we never post to Pages the
> seller has not connected.

Adapt the same shape for each: *who the user is, what they clicked, what we do
with the permission, what we never do.*

---

## 4. Before submitting — checklist

- [ ] Redirect URI added under Facebook Login for Business → Settings
- [ ] Page-permissions use case added, permissions present
- [ ] Verify the connect flow end-to-end as an app admin first (Standard Access
      works for you, so it should succeed before review)
- [ ] At least one successful live API call per permission being submitted
- [ ] Screencast recorded per permission, unbroken, showing the consent dialog
- [ ] Business Verification complete (**Review → Verification**)
- [ ] Privacy policy, ToS and data-deletion URLs reachable — currently set to
      `/legal/privacy`, `/legal/conditions`, `/legal/data-deletion`

> **Verified 2026-08-15:** all three resolve 200 —
> `/legal/privacy`, `/legal/conditions`, `/legal/data-deletion`
> (as do `/privacy` and `/terms`). No action needed.

---

## 5. Audience Network — not applicable yet

Meta's Audience Network onboarding asks for a **live Google Play or App Store
URL** before it will start integration. FairPrice is currently in Play *closed
testing* and TestFlight, so neither public store URL exists yet. This is blocked
on the apps being publicly released and cannot be completed now — come back to
it after launch.

Audience Network is also unrelated to the seller-facing Facebook/Instagram
posting work above; it monetises *our own* app with ads. Nothing in the
composer, catalog sync, or boost features depends on it.
