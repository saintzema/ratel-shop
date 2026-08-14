"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { DataSyncService } from "@/lib/sync-store";
import { Product } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
import { Sparkles, Loader2, Copy, Check, MessageCircle, Facebook, Instagram, Music2, Twitter, Share2, ExternalLink, Search, X, AlertCircle, CalendarClock } from "lucide-react";
import { Switch } from "@/components/ui/switch";

// What's real vs. what's blocked on an external approval process the owner
// has to pursue themselves (Meta App Review/Business Verification for
// Facebook feed publishing; a TikTok developer app + audit for their Content
// Posting API). WhatsApp/X/Facebook share dialogs below use each platform's
// own public share-intent URL — no API keys, no approval, genuinely work
// today. Instagram, once the seller has connected their account (same
// connection as the catalog importer), REALLY auto-publishes via the Graph
// API — not copy-only. TikTok has no equivalent for arbitrary posts yet.
type PlatformKey = "whatsapp" | "instagram" | "facebook" | "x" | "tiktok";

const PLATFORMS: { key: PlatformKey; label: string; icon: any; mode: "share" | "publish" | "manual" | "soon"; color: string }[] = [
    { key: "whatsapp", label: "WhatsApp", icon: MessageCircle, mode: "share", color: "#25D366" },
    { key: "instagram", label: "Instagram", icon: Instagram, mode: "manual", color: "#E1306C" },
    { key: "facebook", label: "Facebook", icon: Facebook, mode: "share", color: "#1877F2" },
    { key: "x", label: "X", icon: Twitter, mode: "share", color: "#0F1419" },
    { key: "tiktok", label: "TikTok", icon: Music2, mode: "soon", color: "#000000" },
];

// Hard caption ceilings per platform. One shared caption used to be sent verbatim
// everywhere, so anything over 280 chars was silently cut off by X's own intent
// URL with no warning, and an over-length Instagram caption failed at the API with
// a raw Graph error.
const CAPTION_LIMITS: Partial<Record<PlatformKey, number>> = {
    x: 280,
    instagram: 2200,
    facebook: 63206,
};

/** Trim a caption to fit a platform, leaving room for the appended product URL. */
function truncateForPlatform(text: string, platform: PlatformKey, url = ""): string {
    const limit = CAPTION_LIMITS[platform];
    if (!limit) return text;
    // X counts every URL as a fixed 23 chars regardless of real length (t.co).
    const reserved = platform === "x" && url ? 24 : 0;
    const room = limit - reserved;
    return text.length <= room ? text : `${text.slice(0, Math.max(0, room - 1)).trimEnd()}…`;
}

/**
 * Adapt one written caption to each platform's actual conventions, rather than
 * blasting identical text everywhere. Same message, native-looking in each feed:
 * Instagram expects hashtags, X wants it short with the link doing the work,
 * WhatsApp reads as a direct message, Facebook can carry the full text + link.
 */
function formatForPlatform(
    text: string,
    platform: PlatformKey,
    opts: { url?: string; productName?: string; price?: number; category?: string }
): string {
    const { url = "", productName = "", price, category } = opts;
    const base = text.trim();

    if (platform === "instagram") {
        // Instagram posts can't carry a clickable link in the caption, so pointing
        // at the profile link is the convention rather than pasting a dead URL.
        const tagSource = [category, ...productName.split(/\s+/)].filter(Boolean) as string[];
        const tags = Array.from(
            new Set(
                tagSource
                    .map(w => w.replace(/[^a-z0-9]/gi, "").toLowerCase())
                    .filter(w => w.length > 2)
                    .slice(0, 5)
            )
        ).map(w => `#${w}`);
        const hashtags = [...tags, "#fairpriceng", "#naijamarket"].join(" ");
        return truncateForPlatform(`${base}\n\nLink in bio to order safely.\n\n${hashtags}`, "instagram");
    }

    if (platform === "x") {
        // The URL is appended separately by the intent params, so keep it out of
        // the text and leave room for t.co's fixed 23-char cost.
        return truncateForPlatform(base, "x", url);
    }

    if (platform === "whatsapp") {
        const priceLine = typeof price === "number" && price > 0 ? `\n\nPrice: ₦${price.toLocaleString()}` : "";
        return `${base}${priceLine}${url ? `\n\n${url}` : ""}`;
    }

    // Facebook: full text plus the link, no hashtag padding (they read as spam there).
    return truncateForPlatform(`${base}${url ? `\n\n${url}` : ""}`, "facebook");
}

function SellerSocialComposerContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const preselectProductId = searchParams.get("product");
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [productSearch, setProductSearch] = useState("");
    const [pickerOpen, setPickerOpen] = useState(false);
    const [caption, setCaption] = useState("");
    const [generating, setGenerating] = useState(false);
    const [selectedPlatforms, setSelectedPlatforms] = useState<Set<PlatformKey>>(new Set(["whatsapp"]));
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // Distinguishes "the connection check itself failed" from "not connected".
    const [connectionWarning, setConnectionWarning] = useState<string | null>(null);
    const [igConnected, setIgConnected] = useState<boolean | null>(null); // null = still checking
    const [igUsername, setIgUsername] = useState<string | null>(null);
    const [fbConnected, setFbConnected] = useState<boolean | null>(null);
    const [fbPageName, setFbPageName] = useState<string | null>(null);
    const [publishing, setPublishing] = useState(false);
    // Per-platform outcomes. This used to be a single object, so publishing to
    // Instagram AND Facebook overwrote the first result with the second: if IG
    // succeeded and FB failed, the seller saw only the FB error and no sign that
    // IG had actually posted — and on a double success, only one permalink.
    const [results, setResults] = useState<
        { platform: PlatformKey; ok: boolean; permalink?: string | null; message: string }[]
    >([]);

    const addResult = (r: { platform: PlatformKey; ok: boolean; permalink?: string | null; message: string }) =>
        setResults(prev => [...prev.filter(p => p.platform !== r.platform), r]);

    // Scheduling only applies to the platforms we can publish to server-side.
    // Share-intent platforms (WhatsApp/X) need the seller's own browser at the
    // moment of posting, so there's nothing to queue.
    const [scheduleMode, setScheduleMode] = useState(false);
    const [scheduleAt, setScheduleAt] = useState("");
    const [scheduling, setScheduling] = useState(false);

    const authHeaders = () => {
        const tok = typeof window !== "undefined" ? localStorage.getItem("fp_token") : null;
        return { "Content-Type": "application/json", ...(tok ? { Authorization: `Bearer ${tok}` } : {}) };
    };

    useEffect(() => {
        const sellerId = DataSyncService.getCurrentSellerId();
        const sellerInfo = DataSyncService.getCurrentSeller();
        if (!sellerId) {
            router.push("/seller/login");
            return;
        }
        const all = DataSyncService.getProducts({ includeInactiveSellers: true });
        const mine = all.filter((p: any) => p.seller_id === sellerId || (sellerInfo && p.seller_id === sellerInfo.user_id));
        setProducts(mine);
        if (mine.length > 0) {
            const preselect = preselectProductId ? mine.find(p => p.id === preselectProductId) : null;
            setSelectedProduct(preselect || mine[0]);
        }

        // Reuses the same connection the Instagram catalog importer already
        // established under Integrations — a seller who connected there
        // never has to reconnect here, this just checks the same account.
        // A failed probe is NOT the same as "not connected" — both used to collapse
        // to the same disconnected state, so a 500 or an expired token looked
        // identical to never having connected, and the seller got sent round the
        // connect flow again for no reason. Track the difference.
        fetch("/api/seller/instagram/posts", { headers: authHeaders() })
            .then(async r => {
                const data = await r.json().catch(() => null);
                if (!r.ok) throw new Error(data?.error || `Instagram check failed (${r.status})`);
                return data;
            })
            .then(data => {
                setIgConnected(!!data?.connected);
                setIgUsername(data?.username || null);
            })
            .catch((e) => {
                setIgConnected(false);
                setConnectionWarning(prev => prev || `Instagram: ${e.message}`);
            });

        fetch("/api/seller/facebook/status", { headers: authHeaders() })
            .then(async r => {
                const data = await r.json().catch(() => null);
                if (!r.ok) throw new Error(data?.error || `Facebook check failed (${r.status})`);
                return data;
            })
            .then(data => {
                setFbConnected(!!data?.connected);
                setFbPageName(data?.pageName || null);
            })
            .catch((e) => {
                setFbConnected(false);
                setConnectionWarning(prev => prev || `Facebook: ${e.message}`);
            });
        // preselectProductId is read on mount to pick the initial product; it was
        // missing from the dep list.
    }, [router, preselectProductId]);

    // Instagram/Facebook's real publish mode is only available once connected
    // — a seller who hasn't connected yet still sees the platform as an
    // option, but selecting it prompts them to connect rather than silently
    // trying (and failing) to publish, or silently degrading to copy-only.
    const igMode: "publish" | "manual" | "checking" = igConnected === null ? "checking" : igConnected ? "publish" : "manual";
    const fbMode: "publish" | "manual" | "checking" = fbConnected === null ? "checking" : fbConnected ? "publish" : "manual";

    const togglePlatform = (key: PlatformKey) => {
        // Instagram had no working fallback before a seller connects (the old
        // "copy only" mode was the exact thing being fixed) — so turning it on
        // unconnected sends the seller to connect instead of toggling on a
        // platform with nothing to publish to. Facebook is different: it
        // already has a real, always-working share-intent fallback (opens
        // Facebook's own share dialog) even without a Page connected, so its
        // toggle stays available either way — connecting just upgrades it to a
        // real auto-post silently, no forced redirect on the main toggle.
        if (key === "instagram" && igMode === "manual" && !selectedPlatforms.has(key)) {
            router.push("/seller/integrations/meta");
            return;
        }
        setSelectedPlatforms(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key); else next.add(key);
            return next;
        });
    };

    const connectFacebook = (e: { stopPropagation: () => void }) => {
        e.stopPropagation(); // don't also trigger the tile's own toggle
        const tok = typeof window !== "undefined" ? localStorage.getItem("fp_token") : null;
        setError(null);
        fetch("/api/seller/facebook/auth", { headers: { accept: "application/json", ...(tok ? { Authorization: `Bearer ${tok}` } : {}) } })
            .then(async r => {
                const data = await r.json().catch(() => null);
                if (!r.ok || !data?.url) throw new Error(data?.error || "Couldn't start Facebook sign-in.");
                return data;
            })
            .then(data => { window.location.href = data.url; })
            // The empty catch here meant a failed auth start did literally nothing —
            // the seller clicked Connect and the button just sat there.
            .catch(err => setError(err.message || "Couldn't start Facebook sign-in. Please try again."));
    };

    const productUrl = selectedProduct
        ? `https://www.fairprice.ng/product/${selectedProduct.id}/${(selectedProduct as any).slug || ""}`
        : "";

    // The strictest caption ceiling among the platforms currently selected.
    const { tightestLimit, tightestLimitPlatform } = (() => {
        let limit: number | null = null;
        let platform = "";
        selectedPlatforms.forEach(key => {
            const cap = CAPTION_LIMITS[key];
            if (cap !== undefined && (limit === null || cap < limit)) {
                limit = cap;
                platform = PLATFORMS.find(p => p.key === key)?.label || key;
            }
        });
        return { tightestLimit: limit as number | null, tightestLimitPlatform: platform };
    })();

    const generateCaption = async () => {
        if (!selectedProduct) return;
        setGenerating(true);
        setError(null);
        try {
            // Tell the generator which platform this is for — the route already
            // supported a `platform` hint (hashtags for Instagram, short for X),
            // the composer just never sent one, so every caption came back generic.
            const primaryPlatform: PlatformKey =
                (["instagram", "x", "facebook", "whatsapp", "tiktok"] as PlatformKey[]).find(p => selectedPlatforms.has(p))
                || "instagram";

            const res = await fetch("/api/seller/social-caption", {
                method: "POST",
                headers: authHeaders(),
                body: JSON.stringify({
                    productName: selectedProduct.name,
                    price: selectedProduct.price,
                    description: selectedProduct.description,
                    platform: primaryPlatform,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || "Couldn't generate a caption right now.");
                return;
            }
            setCaption(data.caption);
        } catch {
            setError("Couldn't reach the AI caption service — check your connection and try again.");
        } finally {
            setGenerating(false);
        }
    };

    const copyCaption = () => {
        navigator.clipboard.writeText(`${caption}\n\n${productUrl}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // WhatsApp has no public API/URL scheme for posting directly to a user's
    // Status — that's deliberate on WhatsApp's part (no third-party site can
    // auto-post to someone's Status, for spam/abuse reasons). The closest real
    // thing: the Web Share API opens the phone's native OS share sheet, and
    // WhatsApp (including "My Status" as a destination within it) is one of
    // the apps that sheet offers — one button press gets there, picking
    // "Status" inside WhatsApp is one more tap by WhatsApp's own design, not
    // something any website can skip. Falls back to the wa.me chat-share link
    // (opens a chat, not Status) on desktop or browsers without file sharing.
    const shareToWhatsApp = async () => {
        window.open(`https://wa.me/?text=${encodeURIComponent(captionFor("whatsapp"))}`, "_blank");
    };

    // Same native-share-sheet upgrade as before (photo attached, reaches
    // WhatsApp Status), but ONLY when WhatsApp is the sole selected platform.
    // When multiple platforms are selected, every window.open below needs to
    // fire synchronously within this one click — an awaited fetch()/blob()
    // beforehand (which the native share path requires) breaks that user-
    // activation chain in most browsers' popup blockers, which was exactly
    // the observed bug: only the first `window.open` after the async gap
    // succeeded, the rest got silently blocked until re-triggered.
    const shareToWhatsAppRich = async () => {
        const text = `${caption}\n\n${productUrl}`;
        if (navigator.share && selectedProduct?.image_url) {
            try {
                const res = await fetch(selectedProduct.image_url);
                const blob = await res.blob();
                const file = new File([blob], "product.jpg", { type: blob.type || "image/jpeg" });
                if ((navigator as any).canShare?.({ files: [file] })) {
                    await navigator.share({ files: [file], text });
                    return;
                }
            } catch { /* fall through to chat-share link below */ }
        }
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    };

    // One place that knows how to render the caption for a given platform.
    const captionFor = (platform: PlatformKey) =>
        formatForPlatform(caption, platform, {
            url: productUrl,
            productName: selectedProduct?.name || "",
            price: selectedProduct?.price,
            category: (selectedProduct as any)?.category,
        });

    const publishToInstagram = async () => {
        if (!selectedProduct?.image_url) {
            addResult({ platform: "instagram", ok: false, message: "This product has no image to publish." });
            return false;
        }
        try {
            const res = await fetch("/api/seller/instagram/publish", {
                method: "POST",
                headers: authHeaders(),
                body: JSON.stringify({
                    imageUrl: selectedProduct.image_url,
                    // Formatted for Instagram (hashtags, link-in-bio) and trimmed to
                    // the 2200-char ceiling it hard-rejects past.
                    caption: captionFor("instagram"),
                    productId: selectedProduct.id,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                addResult({ platform: "instagram", ok: false, message: data.error || "Couldn't publish to Instagram." });
                return false;
            }
            addResult({ platform: "instagram", ok: true, permalink: data.permalink || null, message: "Posted to Instagram" });
            return true;
        } catch {
            addResult({ platform: "instagram", ok: false, message: "Couldn't reach Instagram — check your connection." });
            return false;
        }
    };

    const publishToFacebook = async () => {
        if (!selectedProduct?.image_url) {
            addResult({ platform: "facebook", ok: false, message: "This product has no image to publish." });
            return false;
        }
        try {
            const res = await fetch("/api/seller/facebook/publish", {
                method: "POST",
                headers: authHeaders(),
                body: JSON.stringify({
                    imageUrl: selectedProduct.image_url,
                    caption: captionFor("facebook"),
                    productId: selectedProduct.id,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                addResult({ platform: "facebook", ok: false, message: data.error || "Couldn't publish to Facebook." });
                return false;
            }
            addResult({ platform: "facebook", ok: true, permalink: data.permalink || null, message: "Posted to your Facebook Page" });
            return true;
        } catch {
            addResult({ platform: "facebook", ok: false, message: "Couldn't reach Facebook — check your connection." });
            return false;
        }
    };

    const schedulablePlatforms = (["instagram", "facebook"] as PlatformKey[]).filter(
        p => selectedPlatforms.has(p) && (p === "instagram" ? igMode === "publish" : fbMode === "publish")
    );

    const schedulePost = async () => {
        setError(null);
        setResults([]);
        if (!selectedProduct?.image_url) {
            setError("This product needs a photo before it can be scheduled.");
            return;
        }
        if (schedulablePlatforms.length === 0) {
            setError("Scheduling needs a connected Instagram or Facebook account — WhatsApp and X open a share window, which has to happen while you're here.");
            return;
        }
        setScheduling(true);
        try {
            const res = await fetch("/api/seller/social-schedule", {
                method: "POST",
                headers: authHeaders(),
                body: JSON.stringify({
                    platforms: schedulablePlatforms,
                    // Store the platform-formatted caption, so what's queued is exactly
                    // what will post — the worker doesn't re-derive it later.
                    caption: captionFor(schedulablePlatforms[0]),
                    imageUrl: selectedProduct.image_url,
                    productId: selectedProduct.id,
                    scheduledAt: new Date(scheduleAt).toISOString(),
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || "Couldn't schedule this post.");
                return;
            }
            schedulablePlatforms.forEach(p =>
                addResult({
                    platform: p,
                    ok: true,
                    message: `Scheduled for ${new Date(data.scheduledAt).toLocaleString()}`,
                })
            );
            setScheduleMode(false);
            setScheduleAt("");
        } catch {
            setError("Couldn't reach the scheduler — check your connection and try again.");
        } finally {
            setScheduling(false);
        }
    };

    const publish = async () => {
        setError(null);
        setResults([]);
        const multiplePlatforms = selectedPlatforms.size > 1;

        // Every window.open must fire in this same synchronous pass when more
        // than one platform is selected — see shareToWhatsAppRich's comment.
        if (selectedPlatforms.has("whatsapp")) {
            if (multiplePlatforms) shareToWhatsApp();
            else shareToWhatsAppRich();
            addResult({ platform: "whatsapp", ok: true, message: "WhatsApp share opened" });
        }
        if (selectedPlatforms.has("x")) {
            const xText = captionFor("x");
            window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(xText)}&url=${encodeURIComponent(productUrl)}`, "_blank");
            addResult({
                platform: "x",
                ok: true,
                message: xText.length < caption.length ? "X opened (caption shortened to fit 280)" : "X post composer opened",
            });
        }
        if (selectedPlatforms.has("tiktok")) {
            copyCaption();
            addResult({ platform: "tiktok", ok: true, message: "Caption copied — paste it in the TikTok app" });
        }

        // Both API publishes share one `publishing` flag around the whole block.
        // Setting/clearing it separately per platform made the button flicker back
        // to enabled in the gap between the Instagram and Facebook calls.
        const needsApiPublish =
            (selectedPlatforms.has("instagram") && igMode === "publish") ||
            (selectedPlatforms.has("facebook") && fbMode === "publish");
        if (needsApiPublish) setPublishing(true);

        if (selectedPlatforms.has("instagram")) {
            if (igMode === "publish") {
                await publishToInstagram();
            } else {
                copyCaption();
                addResult({ platform: "instagram", ok: true, message: "Caption copied — paste it in the Instagram app" });
            }
        }
        if (selectedPlatforms.has("facebook")) {
            if (fbMode === "publish") {
                await publishToFacebook();
            } else {
                window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(productUrl)}`, "_blank");
                addResult({ platform: "facebook", ok: true, message: "Facebook share dialog opened" });
            }
        }

        if (needsApiPublish) setPublishing(false);
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
            <div className="max-w-3xl mx-auto py-6 sm:py-8 px-4 space-y-6 pb-24">
                {/* Header — matches the glassmorphism gradient hero pattern used across account/payments etc. */}
                <div className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-indigo-600 to-indigo-800 p-6 sm:p-7 rounded-3xl text-white shadow-xl shadow-indigo-500/20">
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
                    <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                    <div className="relative flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-white/15 rounded-2xl backdrop-blur-md border border-white/10">
                                <Share2 className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl sm:text-2xl font-black tracking-tight">Social Composer</h1>
                                <p className="text-indigo-100 text-xs sm:text-sm font-medium mt-0.5">AI captions, one tap to every platform.</p>
                            </div>
                        </div>
                        {igConnected && (
                            <Link href="/seller/social/posts" className="shrink-0 text-[10px] sm:text-xs font-bold bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/10 rounded-full px-3 py-2 transition-colors">
                                My Posts
                            </Link>
                        )}
                    </div>
                </div>

                {products.length === 0 ? (
                    <div className="text-center py-16 bg-white/70 backdrop-blur-xl rounded-3xl border border-gray-100 shadow-sm">
                        <p className="text-gray-500 font-medium">Add a product first — then come back here to promote it.</p>
                    </div>
                ) : (
                    <>
                        <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-gray-100 shadow-sm p-5 sm:p-6 space-y-5">
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Product</label>

                                {/* Selected-product summary doubles as the toggle to reopen the picker —
                                    same "tap the current selection to change it" pattern as most pickers,
                                    rather than always showing the full list expanded. */}
                                {selectedProduct && !pickerOpen ? (
                                    <button
                                        type="button"
                                        onClick={() => setPickerOpen(true)}
                                        className="w-full flex items-center gap-3 p-3 bg-gradient-to-r from-gray-50 to-gray-50/50 rounded-2xl border border-gray-100 hover:border-gray-200 transition-colors text-left"
                                    >
                                        {selectedProduct.image_url && (
                                            <img src={selectedProduct.image_url} alt="" className="w-14 h-14 rounded-xl object-cover shadow-sm shrink-0" />
                                        )}
                                        <div className="min-w-0 flex-1">
                                            <p className="font-bold text-gray-900 text-sm truncate">{selectedProduct.name}</p>
                                            <p className="text-xs text-gray-500 font-medium">{formatPrice(selectedProduct.price)}</p>
                                        </div>
                                        <span className="text-[10px] font-bold text-indigo-600 shrink-0">Change</span>
                                    </button>
                                ) : (
                                    <div className="space-y-2">
                                        <div className="relative group">
                                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                                            <Input
                                                autoFocus={!!selectedProduct}
                                                placeholder="Search your products…"
                                                className="pl-10 pr-9 h-12 rounded-2xl border-gray-200 bg-gray-50/60 focus:bg-white text-sm font-semibold"
                                                value={productSearch}
                                                onChange={(e) => setProductSearch(e.target.value)}
                                            />
                                            {productSearch && (
                                                <button onClick={() => setProductSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400">
                                                    <X className="h-3.5 w-3.5" />
                                                </button>
                                            )}
                                        </div>
                                        <div className="border border-gray-100 rounded-2xl max-h-64 overflow-y-auto divide-y divide-gray-50">
                                            {products
                                                .filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()))
                                                .map(p => (
                                                    <button
                                                        key={p.id}
                                                        type="button"
                                                        onClick={() => { setSelectedProduct(p); setPickerOpen(false); setProductSearch(""); }}
                                                        className={`w-full flex items-center gap-3 p-2.5 text-left hover:bg-gray-50 transition-colors ${selectedProduct?.id === p.id ? "bg-indigo-50/60" : ""}`}
                                                    >
                                                        {p.image_url && <img src={p.image_url} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />}
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-sm font-semibold text-gray-900 truncate">{p.name}</p>
                                                            <p className="text-xs text-gray-500">{formatPrice(p.price)}</p>
                                                        </div>
                                                        {selectedProduct?.id === p.id && <Check className="h-4 w-4 text-indigo-600 shrink-0" />}
                                                    </button>
                                                ))}
                                            {products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase())).length === 0 && (
                                                <p className="text-xs text-gray-400 text-center py-6">No products match "{productSearch}"</p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Caption</label>
                                    <motion.div whileTap={{ scale: 0.96 }}>
                                        <Button
                                            size="sm"
                                            onClick={generateCaption}
                                            disabled={generating || !selectedProduct}
                                            className="h-8 rounded-full text-xs font-bold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-md shadow-indigo-500/20 px-4"
                                        >
                                            {generating ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
                                            {caption ? "Regenerate" : "Generate with AI"}
                                        </Button>
                                    </motion.div>
                                </div>
                                <Textarea
                                    value={caption}
                                    onChange={(e) => setCaption(e.target.value)}
                                    placeholder="Write your own caption, or generate one with AI — you can always edit it."
                                    className="min-h-[120px] rounded-2xl border-gray-200 bg-gray-50/60 focus:bg-white"
                                />
                                {/* Shows the TIGHTEST limit across the selected platforms, so
                                    a seller posting to X + Instagram sees the 280 ceiling
                                    before publishing rather than discovering the truncation
                                    after the fact. */}
                                {tightestLimit !== null && (
                                    <p className={`text-[11px] font-bold text-right ${caption.length > tightestLimit ? "text-rose-600" : "text-gray-400"}`}>
                                        {caption.length} / {tightestLimit}
                                        {caption.length > tightestLimit && ` — will be shortened for ${tightestLimitPlatform}`}
                                    </p>
                                )}
                                {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
                                {/* A failed connection CHECK is different from being
                                    disconnected — say so, rather than silently showing
                                    "not connected" and sending them round the OAuth
                                    flow again for what may be a transient 500. */}
                                {connectionWarning && (
                                    <p className="flex items-start gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 font-medium">
                                        <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                        <span>Couldn&apos;t check your connection ({connectionWarning}). Auto-posting may be unavailable — reconnect under Integrations if this persists.</span>
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Post to</label>
                                <div className="space-y-1.5">
                                    {PLATFORMS.map(({ key, label, icon: Icon, mode: staticMode, color }) => {
                                        // Instagram has no fallback pre-connection (gated off entirely until
                                        // connected). Facebook always has a working share-intent fallback, so
                                        // "not yet connected" maps to the same always-usable "share" mode it
                                        // had before, not a disabled state — connecting just upgrades it.
                                        const mode = key === "instagram" ? igMode
                                            : key === "facebook" ? (fbMode === "checking" ? "checking" : fbMode === "publish" ? "publish" : "share")
                                            : staticMode;
                                        const active = selectedPlatforms.has(key);
                                        const disabled = mode === "soon" || mode === "checking";
                                        const subtitle =
                                            mode === "soon" ? "Coming soon" :
                                            mode === "checking" ? "Checking connection…" :
                                            mode === "manual" ? "Not connected — tap to connect" :
                                            mode === "publish" && key === "instagram" ? (igUsername ? `Auto-posts to @${igUsername}` : "Auto-posts to your account") :
                                            mode === "publish" && key === "facebook" ? (fbPageName ? `Auto-posts to ${fbPageName}` : "Auto-posts to your Page") :
                                            undefined;
                                        return (
                                            <div
                                                key={key}
                                                onClick={() => !disabled && togglePlatform(key)}
                                                title={mode === "soon" ? "Coming soon — needs a TikTok developer app + platform review" : mode === "manual" ? "Connect your Instagram account under Integrations to auto-publish here" : key === "whatsapp" ? "Opens your phone's share sheet with the image ready — pick WhatsApp, then My Status" : undefined}
                                                className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all ${
                                                    disabled ? "opacity-40 cursor-not-allowed border-gray-100 bg-gray-50" :
                                                    "cursor-pointer border-gray-200 hover:border-gray-300 bg-white"
                                                }`}
                                                style={active && !disabled ? { backgroundColor: `${color}0F`, borderColor: `${color}40` } : undefined}
                                            >
                                                <Icon className="h-5 w-5 shrink-0" style={active && !disabled ? { color } : undefined} />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold" style={active && !disabled ? { color } : undefined}>{label}</p>
                                                    {subtitle && <p className="text-[10px] text-gray-400 font-medium truncate">{subtitle}</p>}
                                                    {key === "facebook" && mode === "share" && (
                                                        <button onClick={connectFacebook} className="text-[10px] font-bold text-indigo-600 hover:underline">
                                                            Connect Page for auto-post →
                                                        </button>
                                                    )}
                                                </div>
                                                <Switch checked={active && !disabled} disabled={disabled} onCheckedChange={() => !disabled && togglePlatform(key)} />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* One row per platform, so a mixed success/failure run reports
                                both instead of the last result silently replacing the rest. */}
                            {results.length > 0 && (
                                <div className="space-y-2">
                                    {results.map(r => {
                                        const label = PLATFORMS.find(p => p.key === r.platform)?.label || r.platform;
                                        const body = (
                                            <>
                                                {r.ok ? <Check className="h-3.5 w-3.5 shrink-0" /> : <AlertCircle className="h-3.5 w-3.5 shrink-0" />}
                                                <span className="flex-1 text-left">{label}: {r.message}</span>
                                                {r.ok && r.permalink && <ExternalLink className="h-3 w-3 shrink-0" />}
                                            </>
                                        );
                                        const cls = `flex items-center gap-2 text-xs font-bold rounded-xl px-3 py-2 border ${
                                            r.ok
                                                ? "text-emerald-700 bg-emerald-50 border-emerald-100"
                                                : "text-red-700 bg-red-50 border-red-200"
                                        }`;
                                        return r.ok && r.permalink ? (
                                            <a key={r.platform} href={r.permalink} target="_blank" rel="noopener noreferrer" className={cls}>
                                                {body}
                                            </a>
                                        ) : (
                                            <div key={r.platform} className={cls}>{body}</div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Post later. Only offered when at least one connected
                                platform is selected — WhatsApp/X open a share window
                                that needs the seller present, so there's nothing to queue. */}
                            {schedulablePlatforms.length > 0 && (
                                <div className="rounded-2xl border border-gray-200 bg-white/60 p-3 space-y-3">
                                    <label className="flex items-center justify-between cursor-pointer">
                                        <span className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                            <CalendarClock className="h-4 w-4 text-indigo-500" />
                                            Schedule for later
                                        </span>
                                        <Switch checked={scheduleMode} onCheckedChange={setScheduleMode} />
                                    </label>
                                    {scheduleMode && (
                                        <>
                                            <Input
                                                type="datetime-local"
                                                value={scheduleAt}
                                                onChange={(e) => setScheduleAt(e.target.value)}
                                                min={new Date(Date.now() + 10 * 60 * 1000).toISOString().slice(0, 16)}
                                                className="h-11 rounded-xl border-gray-200"
                                            />
                                            <p className="text-[11px] text-gray-500">
                                                Will post automatically to {schedulablePlatforms.map(p => PLATFORMS.find(x => x.key === p)?.label).join(" and ")}.
                                                {selectedPlatforms.size > schedulablePlatforms.length &&
                                                    " Your other selected platforms open a share window, so they can't be scheduled — post those now."}
                                            </p>
                                        </>
                                    )}
                                </div>
                            )}

                            <div className="flex gap-3 pt-1">
                                <motion.div whileTap={{ scale: 0.98 }} className="flex-1">
                                    {scheduleMode ? (
                                        <Button
                                            onClick={schedulePost}
                                            disabled={!caption.trim() || !scheduleAt || scheduling}
                                            className="w-full h-12 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-500 hover:from-indigo-500 hover:to-violet-400 text-white font-bold shadow-lg shadow-indigo-500/25"
                                        >
                                            {scheduling ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CalendarClock className="h-4 w-4 mr-2" />}
                                            Schedule post
                                        </Button>
                                    ) : (
                                        <Button
                                            onClick={publish}
                                            disabled={!caption.trim() || selectedPlatforms.size === 0 || publishing}
                                            className="w-full h-12 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold shadow-lg shadow-emerald-500/25"
                                        >
                                            {publishing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                                            Share to {selectedPlatforms.size} platform{selectedPlatforms.size !== 1 ? "s" : ""}
                                        </Button>
                                    )}
                                </motion.div>
                                <Button variant="outline" onClick={copyCaption} disabled={!caption.trim()} className="h-12 rounded-2xl px-4 border-gray-200 bg-white/60">
                                    {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                                </Button>
                            </div>
                        </div>
                        <p className="text-xs text-gray-400 px-1">
                            Connected Instagram and Facebook Page accounts publish for real — no copying, no leaving FairPrice. On your phone (when Instagram is your only selection), WhatsApp opens your native share sheet with the photo ready — tap WhatsApp, then My Status; with multiple platforms selected it uses the plain share link instead, so every platform's window can open together. X opens Twitter's own share window, pre-filled — one tap to confirm and it's posted. Facebook does the same until you connect a Page (link in its row above), after which it posts for real too. TikTok doesn't offer a way to publish directly from other apps without special platform approval, so that copies your caption for you to paste in manually.
                        </p>
                    </>
                )}
            </div>
        </div>
    );
}

export default function SellerSocialComposerPage() {
    return (
        <Suspense fallback={<div className="max-w-3xl mx-auto py-16 text-center text-gray-400 text-sm">Loading…</div>}>
            <SellerSocialComposerContent />
        </Suspense>
    );
}
