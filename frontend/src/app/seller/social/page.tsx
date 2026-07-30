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
import { Sparkles, Loader2, Copy, Check, MessageCircle, Facebook, Instagram, Music2, Twitter, Share2, ExternalLink, Search, X } from "lucide-react";
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
    const [igConnected, setIgConnected] = useState<boolean | null>(null); // null = still checking
    const [igUsername, setIgUsername] = useState<string | null>(null);
    const [publishing, setPublishing] = useState(false);
    const [publishResult, setPublishResult] = useState<string | null>(null);

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
        fetch("/api/seller/instagram/posts", { headers: authHeaders() })
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                setIgConnected(!!data?.connected);
                setIgUsername(data?.username || null);
            })
            .catch(() => setIgConnected(false));
    }, [router]);

    // Instagram's real publish mode is only available once connected — a
    // seller who hasn't connected yet still sees Instagram as a platform
    // option, but selecting it prompts them to connect rather than silently
    // trying (and failing) to publish, or silently degrading to copy-only.
    const igMode: "publish" | "manual" | "checking" = igConnected === null ? "checking" : igConnected ? "publish" : "manual";

    const togglePlatform = (key: PlatformKey) => {
        // Turning Instagram on before it's connected sends the seller to connect
        // it (same OAuth flow the catalog importer uses) instead of silently
        // toggling on a platform that has nothing to actually publish to.
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

    const productUrl = selectedProduct
        ? `https://www.fairprice.ng/product/${selectedProduct.id}/${(selectedProduct as any).slug || ""}`
        : "";

    const generateCaption = async () => {
        if (!selectedProduct) return;
        setGenerating(true);
        setError(null);
        try {
            const res = await fetch("/api/seller/social-caption", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    productName: selectedProduct.name,
                    price: selectedProduct.price,
                    description: selectedProduct.description,
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
        const text = `${caption}\n\n${productUrl}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
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

    const publishToInstagram = async () => {
        if (!selectedProduct?.image_url) {
            setError("This product has no image to publish.");
            return false;
        }
        try {
            const res = await fetch("/api/seller/instagram/publish", {
                method: "POST",
                headers: authHeaders(),
                body: JSON.stringify({ imageUrl: selectedProduct.image_url, caption, productId: selectedProduct.id }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || "Couldn't publish to Instagram.");
                return false;
            }
            setPublishResult(data.permalink || null);
            return true;
        } catch {
            setError("Couldn't reach Instagram — check your connection and try again.");
            return false;
        }
    };

    const publish = async () => {
        setError(null);
        setPublishResult(null);
        const multiplePlatforms = selectedPlatforms.size > 1;

        // Every window.open must fire in this same synchronous pass when more
        // than one platform is selected — see shareToWhatsAppRich's comment.
        if (selectedPlatforms.has("whatsapp")) {
            if (multiplePlatforms) shareToWhatsApp();
            else shareToWhatsAppRich();
        }
        if (selectedPlatforms.has("x")) {
            window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(caption)}&url=${encodeURIComponent(productUrl)}`, "_blank");
        }
        if (selectedPlatforms.has("facebook")) {
            window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(productUrl)}`, "_blank");
        }
        if (selectedPlatforms.has("tiktok")) {
            copyCaption();
        }
        if (selectedPlatforms.has("instagram")) {
            if (igMode === "publish") {
                setPublishing(true);
                await publishToInstagram();
                setPublishing(false);
            } else {
                copyCaption();
            }
        }
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
                                {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
                            </div>

                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Post to</label>
                                <div className="space-y-1.5">
                                    {PLATFORMS.map(({ key, label, icon: Icon, mode: staticMode, color }) => {
                                        const mode = key === "instagram" ? igMode : staticMode;
                                        const active = selectedPlatforms.has(key);
                                        const disabled = mode === "soon" || mode === "checking";
                                        const subtitle =
                                            mode === "soon" ? "Coming soon" :
                                            mode === "checking" ? "Checking connection…" :
                                            mode === "manual" ? "Not connected — tap to connect" :
                                            mode === "publish" && key === "instagram" ? (igUsername ? `Auto-posts to @${igUsername}` : "Auto-posts to your account") :
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
                                                </div>
                                                <Switch checked={active && !disabled} disabled={disabled} onCheckedChange={() => !disabled && togglePlatform(key)} />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {publishResult && (
                                <a href={publishResult} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
                                    <Check className="h-3.5 w-3.5" /> Published to Instagram — view live post <ExternalLink className="h-3 w-3" />
                                </a>
                            )}

                            <div className="flex gap-3 pt-1">
                                <motion.div whileTap={{ scale: 0.98 }} className="flex-1">
                                    <Button
                                        onClick={publish}
                                        disabled={!caption.trim() || selectedPlatforms.size === 0 || publishing}
                                        className="w-full h-12 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold shadow-lg shadow-emerald-500/25"
                                    >
                                        {publishing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                                        Share to {selectedPlatforms.size} platform{selectedPlatforms.size !== 1 ? "s" : ""}
                                    </Button>
                                </motion.div>
                                <Button variant="outline" onClick={copyCaption} disabled={!caption.trim()} className="h-12 rounded-2xl px-4 border-gray-200 bg-white/60">
                                    {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                                </Button>
                            </div>
                        </div>
                        <p className="text-xs text-gray-400 px-1">
                            Connected Instagram accounts publish for real — no copying, no leaving FairPrice. On your phone (when Instagram is your only selection), WhatsApp opens your native share sheet with the photo ready — tap WhatsApp, then My Status; with multiple platforms selected it uses the plain share link instead, so every platform's window can open together. X and Facebook open that platform's own share window, pre-filled — one tap to confirm and it's posted. TikTok doesn't offer a way to publish directly from other apps without special platform approval, so that copies your caption for you to paste in manually.
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
