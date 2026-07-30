"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DataSyncService } from "@/lib/sync-store";
import { Heart, MessageCircle, Eye, ExternalLink, ChevronLeft, Loader2, Instagram } from "lucide-react";

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

export default function MyInstagramPostsPage() {
    const router = useRouter();
    const [posts, setPosts] = useState<MyPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const sellerId = DataSyncService.getCurrentSellerId();
        if (!sellerId) {
            router.push("/seller/login");
            return;
        }
        const tok = typeof window !== "undefined" ? localStorage.getItem("fp_token") : null;
        fetch("/api/seller/instagram/my-posts", {
            headers: { ...(tok ? { Authorization: `Bearer ${tok}` } : {}) },
        })
            .then(async r => {
                const data = await r.json();
                if (!r.ok) throw new Error(data.error || "Failed to load");
                return data;
            })
            .then(data => setPosts(data.posts || []))
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, [router]);

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
                            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-50">
                                <span className="flex items-center gap-1.5 text-xs font-bold text-gray-600"><Heart className="h-3.5 w-3.5 text-rose-500" /> {post.likeCount ?? "—"}</span>
                                <span className="flex items-center gap-1.5 text-xs font-bold text-gray-600"><MessageCircle className="h-3.5 w-3.5 text-blue-500" /> {post.commentsCount ?? "—"}</span>
                                <span className="flex items-center gap-1.5 text-xs font-bold text-gray-600"><Eye className="h-3.5 w-3.5 text-violet-500" /> {post.reach ?? "—"} reach</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
