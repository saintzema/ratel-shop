"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DataSyncService } from "@/lib/sync-store";
import { Product } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
import { Sparkles, Loader2, Copy, Check, MessageCircle, Facebook, Instagram, Music2, Twitter, Share2 } from "lucide-react";

// What's real vs. what's blocked on an external approval process the owner
// has to pursue themselves (Meta App Review/Business Verification for
// Instagram/Facebook feed publishing; a TikTok developer app + audit for
// their Content Posting API). WhatsApp/X/Facebook share dialogs below use
// each platform's own public share-intent URL — no API keys, no approval,
// genuinely work today. Instagram and TikTok have no equivalent web intent
// for arbitrary posts, so those are "copy caption, open the app" instead of
// silently claiming a one-click auto-post that isn't actually possible yet.
type PlatformKey = "whatsapp" | "facebook" | "x" | "instagram" | "tiktok";

const PLATFORMS: { key: PlatformKey; label: string; icon: any; mode: "share" | "manual" | "soon"; color: string }[] = [
    { key: "whatsapp", label: "WhatsApp", icon: MessageCircle, mode: "share", color: "#25D366" },
    { key: "facebook", label: "Facebook", icon: Facebook, mode: "share", color: "#1877F2" },
    { key: "x", label: "X", icon: Twitter, mode: "share", color: "#0F1419" },
    { key: "instagram", label: "Instagram", icon: Instagram, mode: "manual", color: "#E1306C" },
    { key: "tiktok", label: "TikTok", icon: Music2, mode: "soon", color: "#000000" },
];

export default function SellerSocialComposerPage() {
    const router = useRouter();
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [caption, setCaption] = useState("");
    const [generating, setGenerating] = useState(false);
    const [selectedPlatforms, setSelectedPlatforms] = useState<Set<PlatformKey>>(new Set(["whatsapp"]));
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState<string | null>(null);

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
        if (mine.length > 0) setSelectedProduct(mine[0]);
    }, [router]);

    const togglePlatform = (key: PlatformKey) => {
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

    const publish = () => {
        const text = `${caption}\n\n${productUrl}`;
        if (selectedPlatforms.has("whatsapp")) {
            shareToWhatsApp();
        }
        if (selectedPlatforms.has("x")) {
            window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(caption)}&url=${encodeURIComponent(productUrl)}`, "_blank");
        }
        if (selectedPlatforms.has("facebook")) {
            window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(productUrl)}`, "_blank");
        }
        if (selectedPlatforms.has("instagram") || selectedPlatforms.has("tiktok")) {
            copyCaption();
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
            <div className="max-w-3xl mx-auto py-6 sm:py-8 px-4 space-y-6 pb-24">
                {/* Header — matches the glassmorphism gradient hero pattern used across account/payments etc. */}
                <div className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-indigo-600 to-indigo-800 p-6 sm:p-7 rounded-3xl text-white shadow-xl shadow-indigo-500/20">
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
                    <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                    <div className="relative flex items-center gap-3">
                        <div className="p-3 bg-white/15 rounded-2xl backdrop-blur-md border border-white/10">
                            <Share2 className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-black tracking-tight">Social Composer</h1>
                            <p className="text-indigo-100 text-xs sm:text-sm font-medium mt-0.5">AI captions, one tap to every platform.</p>
                        </div>
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
                                <select
                                    className="w-full h-12 rounded-2xl border border-gray-200 px-4 text-sm font-semibold bg-gray-50/60 focus:bg-white focus:ring-2 focus:ring-indigo-500/30 transition-all"
                                    value={selectedProduct?.id || ""}
                                    onChange={(e) => setSelectedProduct(products.find(p => p.id === e.target.value) || null)}
                                >
                                    {products.map(p => <option key={p.id} value={p.id}>{p.name} — {formatPrice(p.price)}</option>)}
                                </select>
                            </div>

                            {selectedProduct && (
                                <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-gray-50 to-gray-50/50 rounded-2xl border border-gray-100">
                                    {selectedProduct.image_url && (
                                        <img src={selectedProduct.image_url} alt="" className="w-14 h-14 rounded-xl object-cover shadow-sm" />
                                    )}
                                    <div>
                                        <p className="font-bold text-gray-900 text-sm">{selectedProduct.name}</p>
                                        <p className="text-xs text-gray-500 font-medium">{formatPrice(selectedProduct.price)}</p>
                                    </div>
                                </div>
                            )}

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
                                <div className="grid grid-cols-5 gap-2">
                                    {PLATFORMS.map(({ key, label, icon: Icon, mode, color }) => {
                                        const active = selectedPlatforms.has(key);
                                        return (
                                            <motion.button
                                                key={key}
                                                whileTap={mode !== "soon" ? { scale: 0.94 } : undefined}
                                                onClick={() => mode !== "soon" && togglePlatform(key)}
                                                disabled={mode === "soon"}
                                                title={mode === "soon" ? "Coming soon — needs a TikTok developer app + platform review" : mode === "manual" ? "Instagram has no direct-post API without Meta's approval yet — this copies your caption so you can paste it in" : key === "whatsapp" ? "Opens your phone's share sheet with the image ready — pick WhatsApp, then My Status" : undefined}
                                                className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 text-[10px] font-bold transition-all ${
                                                    mode === "soon" ? "opacity-35 cursor-not-allowed border-gray-100 bg-gray-50" :
                                                    active ? "border-transparent shadow-lg" : "border-gray-200 text-gray-500 hover:border-gray-300 bg-white"
                                                }`}
                                                style={active && mode !== "soon" ? { backgroundColor: `${color}14`, borderColor: `${color}40`, color } : undefined}
                                            >
                                                <Icon className="h-5 w-5" />
                                                {label}
                                                {mode === "manual" && <span className="text-[8px] text-gray-400 font-normal">copy only</span>}
                                                {mode === "soon" && <span className="text-[8px] text-gray-400 font-normal">soon</span>}
                                            </motion.button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="flex gap-3 pt-1">
                                <motion.div whileTap={{ scale: 0.98 }} className="flex-1">
                                    <Button
                                        onClick={publish}
                                        disabled={!caption.trim() || selectedPlatforms.size === 0}
                                        className="w-full h-12 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold shadow-lg shadow-emerald-500/25"
                                    >
                                        Share to {selectedPlatforms.size} platform{selectedPlatforms.size !== 1 ? "s" : ""}
                                    </Button>
                                </motion.div>
                                <Button variant="outline" onClick={copyCaption} disabled={!caption.trim()} className="h-12 rounded-2xl px-4 border-gray-200 bg-white/60">
                                    {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                                </Button>
                            </div>
                        </div>
                        <p className="text-xs text-gray-400 px-1">
                            On your phone, WhatsApp opens your native share sheet with the photo ready — tap WhatsApp, then My Status. X and Facebook open that platform's own share window, pre-filled — one tap to confirm and it's posted. Instagram and TikTok don't offer a way to publish directly from other apps without special platform approval, so those copy your caption for you to paste in manually.
                        </p>
                    </>
                )}
            </div>
        </div>
    );
}
