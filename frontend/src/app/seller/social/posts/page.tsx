"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DataSyncService } from "@/lib/sync-store";
import { useAuth } from "@/context/AuthContext";
import { formatPrice } from "@/lib/utils";
import { PaystackCheckout } from "@/components/payment/PaystackCheckout";
import { Heart, MessageCircle, Eye, ExternalLink, ChevronLeft, Loader2, Instagram, Megaphone, X } from "lucide-react";

interface MyPost {
    id: string;
    mediaId: string;
    permalink: string | null;
    caption: string | null;
    publishedAt: string;
    likeCount: number | null;
    commentsCount: number | null;
    reach: number | null;
}

// Fallback only. The real value comes from the server (GET /api/seller/facebook/promote
// returns markupPct from SystemSetting) — hardcoding it here meant that the moment an
// admin changed the markup, the seller was charged the stale amount and the server then
// rejected the payment for being short: money taken, no campaign.
const DEFAULT_MARKUP_PCT = 20;

export default function MyInstagramPostsPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [posts, setPosts] = useState<MyPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [promoteTarget, setPromoteTarget] = useState<MyPost | null>(null);
    const [budgetNaira, setBudgetNaira] = useState("5000");
    const [days, setDays] = useState("3");
    const [showPaystack, setShowPaystack] = useState(false);
    const [promoting, setPromoting] = useState(false);
    const [promoteError, setPromoteError] = useState<string | null>(null);
    const [markupPct, setMarkupPct] = useState<number>(DEFAULT_MARKUP_PCT);
    const [promoteSuccess, setPromoteSuccess] = useState(false);

    const authHeaders = () => {
        const tok = typeof window !== "undefined" ? localStorage.getItem("fp_token") : null;
        return { "Content-Type": "application/json", ...(tok ? { Authorization: `Bearer ${tok}` } : {}) };
    };

    useEffect(() => {
        const sellerId = DataSyncService.getCurrentSellerId();
        if (!sellerId) {
            router.push("/seller/login");
            return;
        }
        // Authoritative markup for pricing the boost — see DEFAULT_MARKUP_PCT above.
        fetch("/api/seller/facebook/promote", { headers: authHeaders() })
            .then(r => r.ok ? r.json() : null)
            .then(d => { if (typeof d?.markupPct === "number") setMarkupPct(d.markupPct); })
            .catch(() => { /* keep the default */ });

        fetch("/api/seller/instagram/my-posts", { headers: authHeaders() })
            .then(async r => {
                const data = await r.json();
                if (!r.ok) throw new Error(data.error || "Failed to load");
                return data;
            })
            .then(data => setPosts(data.posts || []))
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, [router]);

    const budgetNum = Math.max(0, parseInt(budgetNaira) || 0);
    const daysNum = Math.max(1, parseInt(days) || 1);
    const totalNaira = Math.round(budgetNum * (1 + markupPct / 100));

    const openPromote = (post: MyPost) => {
        setPromoteTarget(post);
        setPromoteError(null);
        setPromoteSuccess(false);
    };

    const onPaystackSuccess = async (reference: string) => {
        setShowPaystack(false);
        if (!promoteTarget) return;
        setPromoting(true);
        setPromoteError(null);
        try {
            const res = await fetch("/api/seller/facebook/promote", {
                method: "POST",
                headers: authHeaders(),
                body: JSON.stringify({
                    platform: "instagram",
                    postId: promoteTarget.mediaId,
                    budgetNaira: budgetNum,
                    days: daysNum,
                    paystackReference: reference,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                setPromoteError(data.error || "Couldn't start the boost.");
                return;
            }
            setPromoteSuccess(true);
        } catch {
            setPromoteError("Payment went through but we couldn't reach our server to start the boost — contact support with your payment reference.");
        } finally {
            setPromoting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
            <div className="max-w-3xl mx-auto py-6 sm:py-8 px-4 space-y-6 pb-24">
                <div className="flex items-center gap-3">
                    <Link href="/seller/social" className="p-2 rounded-full hover:bg-gray-100">
                        <ChevronLeft className="h-5 w-5 text-gray-600" />
                    </Link>
                    <div>
                        <h1 className="text-xl font-black text-gray-900 flex items-center gap-2"><Instagram className="h-5 w-5 text-[#E1306C]" /> My Posts</h1>
                        <p className="text-xs text-gray-500 font-medium">Real, live performance for posts published via FairPrice.</p>
                    </div>
                </div>

                {loading && (
                    <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
                )}
                {error && (
                    <div className="text-center py-16 bg-white/70 rounded-3xl border border-gray-100">
                        <p className="text-sm text-gray-500 font-medium">{error}</p>
                        <Link href="/seller/integrations/meta" className="text-xs text-indigo-600 font-bold hover:underline mt-2 inline-block">Connect Instagram →</Link>
                    </div>
                )}
                {!loading && !error && posts.length === 0 && (
                    <div className="text-center py-16 bg-white/70 rounded-3xl border border-gray-100">
                        <p className="text-sm text-gray-500 font-medium">No posts published via FairPrice yet.</p>
                        <Link href="/seller/social" className="text-xs text-indigo-600 font-bold hover:underline mt-2 inline-block">Go to Social Composer →</Link>
                    </div>
                )}

                <div className="space-y-3">
                    {posts.map(post => (
                        <div key={post.id} className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-100 shadow-sm p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-sm text-gray-800 line-clamp-2">{post.caption || "(no caption)"}</p>
                                    <p className="text-[10px] text-gray-400 font-bold mt-1">{new Date(post.publishedAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}</p>
                                </div>
                                {post.permalink && (
                                    <a href={post.permalink} target="_blank" rel="noopener noreferrer" className="shrink-0 p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700">
                                        <ExternalLink className="h-4 w-4" />
                                    </a>
                                )}
                            </div>
                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                                <div className="flex items-center gap-4">
                                    <span className="flex items-center gap-1.5 text-xs font-bold text-gray-600"><Heart className="h-3.5 w-3.5 text-rose-500" /> {post.likeCount ?? "—"}</span>
                                    <span className="flex items-center gap-1.5 text-xs font-bold text-gray-600"><MessageCircle className="h-3.5 w-3.5 text-blue-500" /> {post.commentsCount ?? "—"}</span>
                                    <span className="flex items-center gap-1.5 text-xs font-bold text-gray-600"><Eye className="h-3.5 w-3.5 text-violet-500" /> {post.reach ?? "—"} reach</span>
                                </div>
                                <button
                                    onClick={() => openPromote(post)}
                                    className="flex items-center gap-1.5 text-xs font-bold text-white bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1.5 rounded-full hover:from-amber-600 hover:to-orange-600 transition-colors"
                                >
                                    <Megaphone className="h-3.5 w-3.5" /> Promote
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Promote modal */}
            {promoteTarget && (
                <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4">
                    <div className="w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-3xl p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-black text-gray-900 flex items-center gap-2"><Megaphone className="h-5 w-5 text-amber-500" /> Promote this post</h3>
                            <button onClick={() => setPromoteTarget(null)} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400"><X className="h-4 w-4" /></button>
                        </div>

                        {promoteSuccess ? (
                            <div className="text-center py-6">
                                <p className="text-sm font-bold text-emerald-700">Boost started! 🎉</p>
                                <p className="text-xs text-gray-500 mt-1">Your ad is live and running for {daysNum} day{daysNum !== 1 ? "s" : ""}.</p>
                                <button onClick={() => setPromoteTarget(null)} className="mt-4 text-xs font-bold text-indigo-600 hover:underline">Close</button>
                            </div>
                        ) : (
                            <>
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total budget (₦)</label>
                                    <input
                                        type="number" min={1000} step={500}
                                        value={budgetNaira}
                                        onChange={(e) => setBudgetNaira(e.target.value)}
                                        className="w-full h-11 rounded-xl border border-gray-200 px-3 text-sm font-bold"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Run for how many days?</label>
                                    <input
                                        type="number" min={1} max={30}
                                        value={days}
                                        onChange={(e) => setDays(e.target.value)}
                                        className="w-full h-11 rounded-xl border border-gray-200 px-3 text-sm font-bold"
                                    />
                                </div>
                                <div className="bg-gray-50 rounded-xl p-3 text-xs space-y-1">
                                    <div className="flex justify-between text-gray-500"><span>Ad spend</span><span className="font-bold text-gray-900">{formatPrice(budgetNum)}</span></div>
                                    <div className="flex justify-between text-gray-500"><span>Platform fee ({markupPct}%)</span><span className="font-bold text-gray-900">{formatPrice(totalNaira - budgetNum)}</span></div>
                                    <div className="flex justify-between font-black text-gray-900 pt-1 border-t border-gray-200"><span>Total</span><span>{formatPrice(totalNaira)}</span></div>
                                </div>
                                {promoteError && <p className="text-xs text-rose-600 font-medium">{promoteError}</p>}
                                <button
                                    onClick={() => setShowPaystack(true)}
                                    disabled={promoting || budgetNum < 1000}
                                    className="w-full h-12 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold disabled:opacity-50"
                                >
                                    {promoting ? "Starting boost…" : `Pay ${formatPrice(totalNaira)} & Boost`}
                                </button>
                                <p className="text-[10px] text-gray-400 text-center">Runs as a real Facebook/Instagram ad from your published post. We handle the ad account — you just fund the boost.</p>
                            </>
                        )}
                    </div>
                </div>
            )}

            {showPaystack && promoteTarget && user?.email && (
                <PaystackCheckout
                    amount={totalNaira * 100}
                    email={user.email}
                    onSuccess={onPaystackSuccess}
                    onClose={() => setShowPaystack(false)}
                    metadata={{ purpose: "ad_boost", postId: promoteTarget.mediaId }}
                    autoStart
                />
            )}
        </div>
    );
}
