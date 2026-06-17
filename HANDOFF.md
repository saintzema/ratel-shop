# FairPrice.ng — Agent Handoff Document

> Paste everything below the line into a new Claude Code chat to continue work with full context.

---

## SYSTEM CONTEXT (read first)

You are continuing work on **FairPrice.ng** (repo dir name `RatelShop`), a Nigerian buy-and-sell-on-credit marketplace ("BUY & SELL ON CREDIT, NO WAHALA"). Next.js 15 App Router frontend in `frontend/`, Prisma + Neon Postgres, deployed on Vercel. The live site is **fairprice.ng**.

### Repo layout
- Working dir: `/Users/admin/Projects/RatelShop`
- App code: `/Users/admin/Projects/RatelShop/frontend`
- Git: branch `dev` is what Vercel builds & deploys. `main` is protected.

### NON-NEGOTIABLE USER RULES (these override everything)
1. **NEVER push to `main` without explicit per-session authorization.** `dev` is fine to push freely. Main pushes must be requested by the user each time.
2. **This is a LIVE production DB.** NEVER delete any record or tamper with data without explicit permission. Prisma migrations against the live DB require explicit permission.
3. **No "Co-Authored-By: Claude" in commit messages.** (Already removed; keep it out of all future commits.)
4. **Do NOT change anything major** (homepage, NavSearch, search results page, hero, etc.) without the user's consent. Bug fixes to the area you're asked about are fine; sweeping redesigns are not.
5. **Never show AltBank** to front-facing users in the UI (internal financing provider only).
6. **ALWAYS run `npx tsc --noEmit` in `frontend/` before pushing.** Vercel fails the build on type errors. Run from inside `frontend/` (root has no tsc).
7. The user's date context: treat "today" as provided by the harness. User email: techzema@gmail.com.

### Commands
- Type check: `cd /Users/admin/Projects/RatelShop/frontend && npx tsc --noEmit`
- Commit/push: only to `dev` unless told otherwise.
- git add with bracket paths needs quotes: `git add "src/app/seller/products/[id]/edit/page.tsx"`

---

## ARCHITECTURE NOTES (critical mental model)

### DataSyncService (`frontend/src/lib/sync-store.ts`, ~4400 lines)
The heart of the app. A singleton that mirrors the Postgres DB into `localStorage` and keeps them in sync. Key behaviors:

- **`syncWithDB()`** fetches `/api/products?all=true` etc. and merges into localStorage with a last-write-wins strategy by `updated_at` timestamp.
- **COMPRESSION (important!):** When storing products in localStorage, `syncWithDB` **strips** `description`, `highlights`, `specs`, and `images` (line ~502, `const { description, highlights, specs, images, ...lightweight } = p`) to save localStorage quota. These heavy fields live only in the DB and must be re-fetched from `/api/products/[id]` for detail/edit views.
- **`_pendingEdits` Set** (persisted to `fp_pending_product_edits`): protects locally-edited products from being overwritten by a background sync until the DB write confirms. Same pattern for sellers (`_pendingSellerEdits`).
- **`addRawProduct(product, persist)`** — adds a product preserving its real `seller_id`. USE THIS for programmatic adds.
- **`addProduct()`** — LEGACY, hardcodes `seller_id: "sel_001"` / `"TechHub Lagos"`. Products added this way fail `getApprovedProducts()`. Avoid.
- **`getApprovedProducts()`** — filters to sellers where `status==="active" || verified===true || kyc_status==="approved"`.
- **`promoteFromCache(id, persist)` / addToSearchCache** — search-cache layer for globally-sourced (Gemini) products.
- **DATA_VERSION** (line ~284, currently `"20"`): bumping it wipes ALL localStorage keys on next load to force a reseed. Don't bump casually.
- **`seedDemoData()`**: only seeds `SEED_PRODUCTS`/`SEED_SELLERS` from `lib/data.ts` if localStorage is empty AND DB is offline. This is why the user sometimes sees "seeded/hardcoded" products with Unsplash images.
- Homepage & many views listen for `window.addEventListener("sync-store-update", ...)` to live-refresh.

### Next.js 15 gotcha — `useSearchParams` needs Suspense
Any client component calling `useSearchParams()` MUST be wrapped in `<Suspense>` or SSR prerender throws, surfacing as the root error boundary `FP_GENERAL_FLT` (defined in `frontend/src/app/error.tsx`, shows when `error.digest` is empty). When you see FP_GENERAL_FLT, suspect either (a) a missing Suspense boundary, or (b) an uncaught runtime throw in a mount effect.

### Image pipeline
- **`/api/image-cdn`** (`route.ts`, `dynamic="force-dynamic"`): lightweight proxy. Streams external image bytes with 30-day cache headers. Does NOT use Sharp (CPU/mem cost). Grounding/expired Google URLs → placeholder. `?thumb=1` → 302 redirect.
- **`/api/product-image`** (`revalidate=86400`): searches Serper.dev → Google CSE → Wikipedia for a product image by name+category. Rate-limited 60/min/IP.
- **`getProxiedImageUrl(raw)`** (`lib/utils.ts`): wraps a raw CDN URL in `/api/image-cdn?url=...` for safe browser loading. DB stores RAW urls (portable); UI uses proxied.
- **`/api/products` POST** supports `_imageOnly: true` mode: does a targeted `db.product.update()` of just `imageUrl`/`images` — **but throws P2025 (caught, returns skipped) if the product row doesn't exist yet.** ← this is central to the open bug below.

---

## WORK COMPLETED THIS SESSION (all on `dev`, pushed)

Commits (newest first):
- `8bd1935` Fix FP_GENERAL_FLT crashes, product data reversion, and data safety
- `bfeb2c3` Fix QR payment flow, avatar email, payment modal QR, Instagram auth
- `26802cd` Fix seller dashboard JSX error, Best Price API, and WhatsApp importer CTA
- (earlier) `e3dddfd`, `141d818` — PDP variant + financing, seller logo avatars + edit crash

### Fixes shipped & verified (tsc clean):
1. **Seller logo avatars** (`seller/layout.tsx`): sidebar + dropdown now render `logo_url` image; dropdown email falls back to `fp_user` localStorage email instead of showing raw `ID:`.
2. **Edit page crash** (`seller/products/[id]/edit/page.tsx`): wrapped in Suspense (was FP_GENERAL_FLT from `useSearchParams`). Also added **on-mount fetch of `/api/products/[id]`** to hydrate the stripped `description`/`highlights`/`specs`/`images` fields (fixes the "edits revert / descriptions wiped" bug).
3. **Products list page** (`seller/products/page.tsx`) + **orders** (`seller/orders/page.tsx`) + **new product** (`seller/products/new/page.tsx`): wrapped in Suspense.
4. **`seller/products/new` crash**: `phone_numbers.forEach` threw when the field was a string (legacy data). Guarded with `Array.isArray()` + try/catch. AI Auto-Fill now shows an error if name is empty instead of silently failing.
5. **Best Price button** (`seller/products/new`): calls `/api/gemini-price` (mode `analyze`) directly, auto-fills price + competitor price, no modal.
6. **PDP variant** (`product/[id]/[slug]/ProductClient.tsx`): `selectedVariantIndex` defaults to `-1` (base product) not `0`; base product card rendered first; variant price no longer hijacks main price.
7. **Financing visibility** (`lib/financing-utils.ts` `hasFinancing()` + `components/financing/FinancingOffer.tsx`): respects `product.financing_available === false`.
8. **Dashboard QR card** (`seller/dashboard/page.tsx`): FairPay header matching `/seller/dashboard/payments`; "Collect a Payment" always green; store link uses `window.location.origin`; added "Recent Payment Links" section + numbered "How it works"; Customer Scans / Instant Sync tiles.
9. **QR payment flow**: `checkout/direct/page.tsx` now reads BOTH `sellerId`/`seller_id` and `label`/`description` param aliases — the dashboard was generating `seller_id=` while checkout read `sellerId=`, so scans never landed in cart. Dashboard QR URL switched to `sellerId`+`label`.
10. **Payments modal** (`seller/dashboard/payments/page.tsx` `PaymentDetailModal`): now renders a `QRCodeCanvas` + "Save QR" download button for saved links.
11. **WhatsApp importer CTA** (`components/seller/WhatsAppCatalogImporter.tsx`): prominent green "+ Add Products" button; uses `addRawProduct` with real `seller_id` (was using broken `addProduct`).
12. **Instagram auth** (`api/seller/instagram/auth/route.ts`): seller lookup now falls back to `ownerEmail` (fixes "not a seller" for sellers whose `userId` differs). Importer card adds a Business/Creator requirement callout + Facebook Business AI link.
13. **`api/products` POST safe-update**: won't overwrite DB `description`/`highlights`/`images` with empty values when the stripped sync-store payload is sent (protects against the compression bug wiping content).

### NOT done (user must authorize):
- **Merge `dev` → `main`.** Reviewed: tsc clean, schema changes already live on prod (Vercel builds `dev`), no destructive ops. Waiting on user's go-ahead. To do it: `git checkout main && git merge dev && git push origin main` (or PR on GitHub).

---

## OPEN ISSUE TO FIX NEXT (user's current priority)

**NavSearch globally-fetched image does not persist with the product onto SRP or the auto-generated PDP.**

### Desired behavior (user's words, paraphrased)
When a user searches a query and the NavSearch dropdown shows globally-sourced (Gemini) results, the system should:
1. Fetch at least **one** quality image for the searched product from the query.
2. **Reuse that same fetched image** for all results in that same search query whose own image failed to fetch (image sharing within a query).
3. **Persist the image** (via the image-cdn → DB) so it stays attached to the product.
4. The image must **persist when results render on the SRP** (`/search`) AND when the globally-sourced product with its **auto-generated PDP** is clicked. Currently it does not — the PDP/SRP often shows a generic/placeholder/Unsplash image even though NavSearch had a good one.

### Root cause I identified (start here)
The flow is in `frontend/src/components/layout/Navbar.tsx`:
- Global results live only in React state + session cache. The product row is **created in the DB only when clicked**, via `promoteFromCache(...)` / `addRawProduct(...)` inside `navigateWithResults()` (~line 577-593).
- Background image hydration (the big effect ending ~line 839, `applyImageUpdate` ~line 726) fetches `/api/product-image` per result and then fires a **`_imageOnly: true`** POST to `/api/products` to persist the image (~line 794).
- **The bug:** `_imageOnly` mode calls `db.product.update()` which **throws P2025 and is silently skipped when the product row doesn't exist yet** (`api/products/route.ts` ~line 155-178). Since global products aren't in the DB until clicked, the hydrated image's persistence call almost always no-ops.
- **Race on click:** When the user clicks, the product is promoted/saved with whatever `image_url` it holds **at that instant**. If image hydration hasn't completed, it persists the placeholder. The auto-generated PDP then reads that placeholder from the DB.
- `validSharedImage` (the "reuse one image across the query" logic, ~line 442) only applies at click-time mapping, not as a persisted fallback, and only if SOME result already had a valid `image_url` in state at that moment.

### Suggested fix direction (verify before implementing; don't over-engineer)
- When promoting a clicked global product, ensure the **best available image** (its own hydrated image, else the query's `validSharedImage`, else a fresh synchronous `/api/product-image` call) is resolved BEFORE the DB write, so the PDP never persists a placeholder.
- Make `_imageOnly` persistence resilient when the row is missing: either (a) upsert minimal product on image-only if enough fields exist, or (b) have the hydration write into the search-cache/localStorage so that when the product is later promoted, the good image travels with it. Option (b) is lower-risk (no new DB rows for unclicked products).
- Confirm the SRP (`frontend/src/app/search/page.tsx`) reads images from `fp_nav_image_pool` / `fp_nav_search_results` session storage (already wired) and that the PDP for a `global-partners` product reads the persisted DB `imageUrl`. Trace `product/[id]/[slug]` data load to confirm where the placeholder creeps in.
- Keep changes minimal & scoped to image persistence — do NOT restructure NavSearch/SRP rendering (user rule #4).

### Key files for this issue
- `frontend/src/components/layout/Navbar.tsx` — global search, `navigateWithResults`, `applyImageUpdate`, hydration effect.
- `frontend/src/app/api/products/route.ts` — `_imageOnly` branch + `global-partners` upsert.
- `frontend/src/app/api/product-image/route.ts` — image search.
- `frontend/src/app/api/image-cdn/route.ts` — proxy.
- `frontend/src/app/search/page.tsx` — SRP, reads session image pool.
- `frontend/src/app/product/[id]/[slug]/ProductClient.tsx` — PDP.
- `frontend/src/lib/sync-store.ts` — `addRawProduct`, `promoteFromCache`, `updateSearchCacheProduct`, search cache.
- `frontend/src/lib/utils.ts` — `getProxiedImageUrl`.

### Verify after fixing
1. Search a query with global results → first result shows a real image quickly.
2. Other results in the same query without their own image reuse the shared one.
3. Click a global result → auto-generated PDP shows that exact image (not placeholder), and a reload still shows it (DB-persisted).
4. Go to SRP for the same query → cards show the persisted images, no duplicate `/api/product-image` calls in the Network tab for already-hydrated items.
5. `cd frontend && npx tsc --noEmit` clean before pushing to `dev`.

---

## ENV / INFRA QUICK FACTS
- Vercel builds branch `dev`. CLI may warn it's outdated — harmless.
- DB: Neon Postgres via `DATABASE_URL`. `prisma.config.ts` supplies the URL; `schema.prisma` datasource block is minimal (`provider = "postgresql"` only).
- `vercel.json` has a cron: `/api/cron/auto-release` hourly (escrow auto-release).
- Image search keys: `SERPER_API_KEY`, `GOOGLE_SEARCH_API_KEY`, `GOOGLE_SEARCH_CX`. Gemini: `GEMINI_API_KEY`. Meta/IG: `NEXT_PUBLIC_FACEBOOK_APP_ID`, `NEXT_PUBLIC_APP_URL`.
