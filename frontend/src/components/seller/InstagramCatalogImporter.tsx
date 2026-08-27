"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
    Instagram, Loader2, CheckSquare, Square, Package,
    RefreshCcw, Link2, AlertCircle, CheckCircle2, ExternalLink, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { DataSyncService } from "@/lib/sync-store";

/**
 * Fallback only. The importer used to hardcode this list, which is why a seller
 * importing car photos had no Vehicles option and everything landed under
 * Fashion. The real list comes from the live taxonomy (see useImportCategories)
 * so it matches what the rest of the app offers; this is what we fall back to
 * before the taxonomy has synced.
 */
const FALLBACK_CATEGORIES = ["Fashion", "Electronics", "Home", "Beauty", "Gaming", "Sports", "Food", "Accessories", "Health", "Uncategorized"];

/** The seller-selectable categories, taken from the synced DB taxonomy. */
function useImportCategories(): string[] {
    const [cats, setCats] = useState<string[]>(FALLBACK_CATEGORIES);

    useEffect(() => {
        const read = () => {
            const taxonomy = DataSyncService.getTaxonomy();
            if (!Array.isArray(taxonomy) || taxonomy.length === 0) return;
            const names = taxonomy
                .map((c: any) => String(c?.name || "").trim())
                .filter(Boolean)
                // Admin-curated rails aren't real product categories.
                .filter(n => !["trending", "best-selling", "best_selling", "price drop", "price-drop"].includes(n.toLowerCase()));
            if (names.length) setCats([...names, "Uncategorized"]);
        };
        read();
        window.addEventListener("sync-store-update", read);
        return () => window.removeEventListener("sync-store-update", read);
    }, []);

    return cats;
}

interface IgPost {
    id: string;
    media_url: string;
    caption: string;
    media_type: string;
    timestamp: string;
    permalink?: string;
}

interface EditProduct {
    igPostId: string;
    name: string;
    description: string;
    price: string;
    stock: string;
    category: string;
    imageUrl: string;
}

export function InstagramCatalogImporter() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const importCategories = useImportCategories();

    const [status, setStatus] = useState<"idle" | "loading" | "connected" | "error">("idle");
    const [username, setUsername] = useState<string | null>(null);
    const [posts, setPosts] = useState<IgPost[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [editProducts, setEditProducts] = useState<EditProduct[]>([]);
    const [editIdx, setEditIdx] = useState(0);
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState<{ created: number; message: string } | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [loadingMore, setLoadingMore] = useState(false);

    // Read fresh on every call — avoids stale null when the admin session token
    // was set after the component first rendered.
    const authHeaders = () => {
        const tok = typeof window !== "undefined" ? localStorage.getItem("fp_token") : null;
        return {
            "Content-Type": "application/json",
            ...(tok ? { Authorization: `Bearer ${tok}` } : {}),
        };
    };

    const fetchPosts = useCallback(async () => {
        setStatus("loading");
        setErrorMsg(null);
        try {
            const res = await fetch("/api/seller/instagram/posts", { headers: authHeaders() });
            const data = await res.json();
            if (data.connected) {
                setUsername(data.username || null);
                setPosts(data.posts || []);
                setNextCursor(data.nextCursor || null);
                setStatus("connected");
            } else if (data.expired) {
                setErrorMsg("Your Instagram connection has expired. Please reconnect.");
                setStatus("error");
            } else {
                setStatus("idle");
            }
        } catch {
            setStatus("error");
            setErrorMsg("Could not reach the server. Please try again.");
        }
    }, []); // eslint-disable-line

    // Instagram only returns one page (up to 30 raw items, fewer after filtering
    // to IMAGE/CAROUSEL_ALBUM) per call — older posts need this cursor to reach.
    const loadMorePosts = async () => {
        if (!nextCursor || loadingMore) return;
        setLoadingMore(true);
        try {
            const res = await fetch(`/api/seller/instagram/posts?after=${encodeURIComponent(nextCursor)}`, { headers: authHeaders() });
            const data = await res.json();
            if (data.connected) {
                setPosts(prev => [...prev, ...(data.posts || [])]);
                setNextCursor(data.nextCursor || null);
            }
        } catch {
            // leave nextCursor as-is so the button can just be retried
        } finally {
            setLoadingMore(false);
        }
    };

    // On mount: check URL params from OAuth redirect, then fetch posts
    useEffect(() => {
        const igConnected = searchParams.get("ig_connected");
        const igError = searchParams.get("ig_error");
        const igUser = searchParams.get("ig_user");

        if (igError === "no_ig_account") {
            setErrorMsg("No Instagram Business or Creator account found linked to your Facebook page. Make sure your Instagram account is connected to a Facebook Page as a Business/Creator account.");
            setStatus("error");
        } else if (igError === "incomplete_profile") {
            setErrorMsg("Instagram connected but we couldn't read your profile — please try connecting again.");
            setStatus("error");
        } else if (igError) {
            setErrorMsg("Instagram connection failed. Please try again.");
            setStatus("error");
        } else if (igConnected) {
            if (igUser) setUsername(decodeURIComponent(igUser));
            fetchPosts();
        } else {
            fetchPosts();
        }

        // Strip ig_connected/ig_user/ig_error (and any stray Instagram OAuth "#_=_" hash
        // artifact) from the URL/history once handled. Leaving them in place meant the
        // browser Back button re-navigated to this exact redirect URL, which could
        // re-trigger this effect against a stale state and previously surfaced as an
        // "Application error" on Back.
        if ((igConnected || igError || igUser || window.location.hash) && typeof window !== "undefined") {
            router.replace(pathname, { scroll: false });
        }
    }, []); // eslint-disable-line

    const connectInstagram = async () => {
        try {
            // Fetch with Bearer token so the server can authenticate the seller.
            // Direct browser navigation cannot send custom headers (token is in localStorage).
            const res = await fetch("/api/seller/instagram/auth", {
                headers: { ...authHeaders(), accept: "application/json" },
            });
            if (res.status === 401) {
                // A 401 here does not mean "not a seller" — it almost always means
                // the stored JWT has expired while the UI still shows a signed-in
                // user, which is why this fired for sellers sitting on their own
                // dashboard. Say what actually needs to happen.
                setErrorMsg("Your session has expired. Please sign out and sign back in, then reconnect Instagram.");
                setStatus("error");
                return;
            }
            if (res.status === 404) {
                setErrorMsg("No seller account found. Complete seller onboarding first.");
                setStatus("error");
                return;
            }
            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                setErrorMsg("Could not generate Instagram login link. Please try again.");
                setStatus("error");
            }
        } catch {
            setErrorMsg("Connection failed. Please check your network and try again.");
            setStatus("error");
        }
    };

    const toggleSelect = (id: string) =>
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

    const selectAll = () => setSelectedIds(posts.map(p => p.id));
    const clearSelection = () => setSelectedIds([]);

    const openImportEditor = () => {
        const selected = posts.filter(p => selectedIds.includes(p.id));
        setEditProducts(selected.map(p => ({
            igPostId: p.id,
            name: p.caption?.split(/[.!?\n]/)[0]?.replace(/#\S+/g, "").trim().slice(0, 80) || "Instagram Product",
            description: p.caption || "",
            price: "",
            stock: "10",
            category: "Fashion",
            imageUrl: p.media_url,
        })));
        setEditIdx(0);
        setImportResult(null);
        setIsImportOpen(true);
    };

    const updateProd = (field: keyof EditProduct, value: string) => {
        setEditProducts(prev => {
            const next = [...prev];
            next[editIdx] = { ...next[editIdx], [field]: value };
            return next;
        });
    };

    const handleImport = async () => {
        setImporting(true);
        try {
            const res = await fetch("/api/seller/instagram/import", {
                method: "POST",
                headers: authHeaders(),
                body: JSON.stringify({ products: editProducts }),
            });
            const data = await res.json();
            if (data.success) {
                setImportResult({ created: data.created, message: data.message });
                setSelectedIds([]);

                // Track Instagram catalog imported
                if (typeof window !== "undefined" && (window as any).pendo) {
                    const categories = [...new Set(editProducts.map(p => p.category).filter(Boolean))];
                    (window as any).pendo.track("instagram_catalog_imported", {
                        product_count: data.created || editProducts.length,
                        categories_assigned: categories.join(","),
                    });
                }

                // The import creates real Product rows server-side, but this component
                // never had them locally — dispatching sync-store-update alone told the
                // products page to re-read its LOCAL cache, which still didn't contain
                // the new products, so nothing appeared until a full reload re-synced
                // from the DB. Pull the real data down first, then fire the event.
                await DataSyncService.syncWithDB("products");
                window.dispatchEvent(new Event("sync-store-update"));
            } else {
                alert(data.error || "Import failed. Please try again.");
            }
        } catch {
            alert("Something went wrong. Please try again.");
        } finally {
            setImporting(false);
        }
    };

    // ── Render: Not connected ──────────────────────────────────────────────
    if (status === "idle" || status === "error") {
        return (
            <div className="bg-white rounded-[32px] border border-gray-100 p-8 shadow-sm flex flex-col gap-5">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-pink-50 to-purple-50 rounded-xl">
                        <Instagram className="h-6 w-6 text-pink-600" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-gray-900 leading-tight">Instagram Catalog Sync</h3>
                        <p className="text-xs text-gray-500 font-medium">Import your posts and turn them into live products.</p>
                    </div>
                </div>

                {errorMsg && (
                    <div className="flex gap-3 p-4 bg-rose-50 border border-rose-100 rounded-2xl text-sm text-rose-700">
                        <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                        <p className="font-medium leading-relaxed">{errorMsg}</p>
                    </div>
                )}

                <div className="p-4 bg-gradient-to-br from-pink-50/60 to-purple-50/60 rounded-2xl border border-pink-100 space-y-3">
                    <p className="text-xs text-gray-600 font-medium leading-relaxed">
                        Connect your <strong>Instagram Business</strong> or <strong>Creator account</strong> via Facebook Login.
                        Your posts will appear here so you can select, edit, and publish them as products in seconds.
                    </p>
                    <ul className="space-y-1.5">
                        {[
                            "Signs in with your Meta account securely",
                            "Reads your recent Instagram posts (images only)",
                            "You choose what to import — nothing is auto-posted",
                        ].map(t => (
                            <li key={t} className="flex items-center gap-2 text-[11px] font-bold text-gray-500">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> {t}
                            </li>
                        ))}
                    </ul>
                    <div className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 leading-relaxed">
                        ⚡ <strong>Requirement:</strong> Your Instagram account must be a <strong>Business</strong> or <strong>Creator</strong> account linked to a Facebook Page. Personal accounts are not supported by Meta.
                    </div>
                </div>

                <Button
                    onClick={connectInstagram}
                    className="h-12 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white font-bold rounded-2xl gap-2 shadow-lg shadow-pink-200"
                >
                    <Link2 className="h-4 w-4" />
                    {errorMsg ? "Reconnect Instagram" : "Connect Instagram via Meta"}
                </Button>

                {/* Alternative: Facebook Business Catalog import */}
                <div className="border-t border-gray-100 pt-4">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Or Import from Facebook Business</p>
                    <a
                        href="https://business.facebook.com/latest/business_ai/ai_home/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 rounded-2xl border border-blue-100 bg-blue-50/50 hover:bg-blue-50 hover:border-blue-200 transition-all group"
                    >
                        <div className="h-9 w-9 rounded-xl bg-[#1877F2] flex items-center justify-center shrink-0 shadow-md shadow-blue-200">
                            <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                            </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-gray-900">Facebook Business AI</p>
                            <p className="text-[10px] text-gray-500 font-medium">Use Meta&apos;s AI to manage your product catalog, then import via Instagram connect above</p>
                        </div>
                        <ExternalLink className="h-3.5 w-3.5 text-gray-400 group-hover:text-blue-500 transition-colors shrink-0" />
                    </a>
                </div>
            </div>
        );
    }

    // ── Render: Loading ───────────────────────────────────────────────────
    if (status === "loading") {
        return (
            <div className="bg-white rounded-[32px] border border-gray-100 p-8 shadow-sm flex items-center justify-center gap-3 text-gray-400 min-h-[200px]">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm font-bold">Loading your Instagram posts…</span>
            </div>
        );
    }

    // ── Render: Connected — post grid ─────────────────────────────────────
    return (
        <div className="bg-white rounded-[32px] border border-gray-100 p-8 shadow-sm flex flex-col gap-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-pink-50 to-purple-50 rounded-xl">
                        <Instagram className="h-6 w-6 text-pink-600" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-gray-900 leading-tight">Instagram Catalog Sync</h3>
                        <p className="text-xs font-bold text-pink-600">@{username} · {posts.length} posts</p>
                    </div>
                </div>
                <button
                    onClick={fetchPosts}
                    className="h-9 w-9 rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
                    title="Refresh posts"
                >
                    <RefreshCcw className="h-4 w-4 text-gray-400" />
                </button>
            </div>

            {/* Selection toolbar */}
            <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                    Select Posts to Import
                </span>
                <div className="flex items-center gap-2">
                    {selectedIds.length > 0
                        ? <button onClick={clearSelection} className="text-[11px] font-bold text-gray-400 hover:text-gray-600">Clear</button>
                        : <button onClick={selectAll} className="text-[11px] font-bold text-pink-600 hover:text-pink-700">Select All</button>
                    }
                    <Button
                        size="sm"
                        disabled={selectedIds.length === 0}
                        onClick={openImportEditor}
                        className="h-8 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white font-bold rounded-xl text-xs shadow-md disabled:opacity-40"
                    >
                        Edit &amp; Import ({selectedIds.length})
                    </Button>
                </div>
            </div>

            {/* Grid */}
            {/* auto-rows-min is what stops the tiles shrinking as more posts load:
                without an explicit row size, the grid distributes the container's
                height across however many rows exist, so every "Load older posts"
                squashed the images flatter. Rows now size to content and the box
                scrolls instead. Taller on desktop so the squares are actually
                legible. */}
            <div className="grid grid-cols-3 auto-rows-min gap-2.5 max-h-[380px] sm:max-h-[520px] overflow-y-auto overscroll-contain pr-0.5">
                {posts.map(post => {
                    const selected = selectedIds.includes(post.id);
                    return (
                        <div
                            key={post.id}
                            onClick={() => toggleSelect(post.id)}
                            className={cn(
                                "relative group rounded-2xl overflow-hidden cursor-pointer border-2 transition-all",
                                selected ? "border-pink-500 shadow-md shadow-pink-100" : "border-transparent hover:border-gray-200"
                            )}
                        >
                            <div className="aspect-square bg-gray-100">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={post.media_url} alt="" className="w-full h-full object-cover" />
                            </div>
                            <div className="absolute top-2 right-2 z-10">
                                {selected ? (
                                    <div className="bg-pink-600 text-white rounded-md p-0.5">
                                        <CheckSquare className="h-4 w-4" />
                                    </div>
                                ) : (
                                    <div className="bg-white/80 text-gray-400 rounded-md p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Square className="h-4 w-4" />
                                    </div>
                                )}
                            </div>
                            {post.caption && (
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <p className="text-[10px] text-white font-medium line-clamp-2 leading-tight">{post.caption}</p>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {nextCursor && (
                <button
                    onClick={loadMorePosts}
                    disabled={loadingMore}
                    className="w-full text-center text-[11px] font-bold text-pink-600 hover:text-pink-700 py-2 disabled:opacity-50"
                >
                    {loadingMore ? "Loading…" : "Load older posts"}
                </button>
            )}

            <div className="flex items-center justify-between pt-1 border-t border-gray-50">
                <button
                    onClick={connectInstagram}
                    className="text-[11px] font-bold text-gray-400 hover:text-pink-600 flex items-center gap-1 transition-colors"
                >
                    <Link2 className="h-3 w-3" /> Switch account
                </button>
                {posts.length > 0 && (
                    <a href={`https://instagram.com/${username}`} target="_blank" rel="noopener noreferrer"
                        className="text-[11px] font-bold text-gray-400 hover:text-pink-600 flex items-center gap-1 transition-colors">
                        View on Instagram <ExternalLink className="h-3 w-3" />
                    </a>
                )}
            </div>

            {/* Import Editor Modal */}
            <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
                {/* Was max-w-3xl with overflow-hidden and no height cap: on a phone the
                    editor's own content (image + name + price/stock/category + caption)
                    is taller than the viewport, so the bottom — including the Import
                    button — was clipped off with no way to reach it. Now it fills the
                    small screen, caps its height, and scrolls internally. */}
                <DialogContent className="w-[calc(100vw-1.5rem)] sm:w-auto max-w-3xl max-h-[90vh] p-0 overflow-y-auto overscroll-contain rounded-3xl bg-gray-50">
                    <DialogTitle className="sr-only">Edit & Import Instagram Products</DialogTitle>

                    {importResult ? (
                        // Success screen
                        <div className="flex flex-col items-center justify-center gap-5 p-12 text-center">
                            <div className="h-16 w-16 bg-emerald-50 rounded-full flex items-center justify-center">
                                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-gray-900">{importResult.created} Product{importResult.created !== 1 ? "s" : ""} Imported!</h3>
                                <p className="text-gray-500 text-sm mt-2 max-w-sm">{importResult.message}</p>
                            </div>
                            <Button
                                onClick={() => { setIsImportOpen(false); setImportResult(null); }}
                                className="h-12 px-8 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold"
                            >
                                Done
                            </Button>
                        </div>
                    ) : (
                        // Stacks on mobile. This was a fixed-height HORIZONTAL flex row:
                        // the sidebar hides under md, but the editor kept desktop
                        // proportions, so the fields and the Publish button sat off the
                        // right edge and the sheet scrolled sideways. Height is capped by
                        // viewport rather than a hard 520px so the editor stays reachable
                        // on a short screen with the keyboard open.
                        <div className="flex flex-col md:flex-row h-auto max-h-[78vh] md:h-[520px]">
                            {/* Sidebar */}
                            <div className="w-56 bg-white border-r border-gray-100 flex-col hidden md:flex">
                                <div className="p-4 border-b border-gray-100">
                                    <h3 className="font-black text-gray-900 text-sm">Import ({editProducts.length})</h3>
                                    <p className="text-[10px] text-gray-400 mt-0.5">Review each product before publishing</p>
                                </div>
                                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                                    {editProducts.map((p, idx) => (
                                        <button
                                            key={p.igPostId}
                                            onClick={() => setEditIdx(idx)}
                                            className={cn(
                                                "w-full flex items-center gap-2.5 p-2 rounded-xl text-left transition-colors",
                                                editIdx === idx ? "bg-pink-50 border border-pink-100" : "hover:bg-gray-50 border border-transparent"
                                            )}
                                        >
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={p.imageUrl} alt="" className="h-9 w-9 rounded-lg object-cover bg-gray-100 shrink-0" />
                                            <div className="min-w-0 flex-1">
                                                <p className={cn("text-xs font-bold truncate", editIdx === idx ? "text-pink-700" : "text-gray-700")}>{p.name}</p>
                                                <p className={cn("text-[10px] font-bold mt-0.5", p.price ? "text-emerald-600" : "text-rose-400")}>
                                                    {p.price ? `₦${parseInt(p.price).toLocaleString()}` : "⚠ Needs price"}
                                                </p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Editor */}
                            {editProducts[editIdx] && (
                                <div className="flex-1 min-w-0 flex flex-col bg-white overflow-hidden">
                                    <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
                                        <div className="flex flex-col sm:flex-row gap-4 sm:gap-5">
                                            {/* Image */}
                                            <div className="w-28 h-28 sm:w-36 sm:h-36 shrink-0 rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={editProducts[editIdx].imageUrl} alt="" className="w-full h-full object-cover" />
                                            </div>
                                            <div className="flex-1 space-y-3">
                                                <div>
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1 block">Product Name</label>
                                                    <input
                                                        value={editProducts[editIdx].name}
                                                        onChange={e => updateProd("name", e.target.value)}
                                                        className="w-full px-3 h-10 rounded-xl border border-gray-200 focus:border-pink-400 focus:ring-2 focus:ring-pink-100 outline-none text-sm font-bold text-gray-900"
                                                    />
                                                </div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1 block">Price (₦) <span className="text-rose-400">*</span></label>
                                                        <input
                                                            type="number"
                                                            value={editProducts[editIdx].price}
                                                            onChange={e => updateProd("price", e.target.value)}
                                                            placeholder="e.g. 15000"
                                                            className="w-full px-3 h-10 rounded-xl border border-gray-200 focus:border-pink-400 focus:ring-2 focus:ring-pink-100 outline-none text-sm font-bold text-gray-900"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1 block">Stock</label>
                                                        <input
                                                            type="number"
                                                            value={editProducts[editIdx].stock}
                                                            onChange={e => updateProd("stock", e.target.value)}
                                                            className="w-full px-3 h-10 rounded-xl border border-gray-200 focus:border-pink-400 focus:ring-2 focus:ring-pink-100 outline-none text-sm font-bold text-gray-900"
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1 block">Category</label>
                                                    <select
                                                        value={editProducts[editIdx].category}
                                                        onChange={e => updateProd("category", e.target.value)}
                                                        className="w-full px-3 h-10 rounded-xl border border-gray-200 focus:border-pink-400 outline-none text-sm font-bold text-gray-900 bg-white"
                                                    >
                                                        {importCategories.map(c => <option key={c}>{c}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1 block">Description</label>
                                            <textarea
                                                value={editProducts[editIdx].description}
                                                onChange={e => updateProd("description", e.target.value)}
                                                rows={3}
                                                className="w-full p-3 rounded-xl border border-gray-200 focus:border-pink-400 focus:ring-2 focus:ring-pink-100 outline-none text-sm text-gray-600 resize-none"
                                            />
                                        </div>
                                    </div>

                                    {/* Footer */}
                                    <div className="p-4 border-t border-gray-100 bg-gray-50/80 flex items-center justify-between">
                                        {/* Step dots */}
                                        <div className="flex items-center gap-3">
                                            <div className="flex gap-1">
                                                {editProducts.map((_, i) => (
                                                    <button
                                                        key={i}
                                                        onClick={() => setEditIdx(i)}
                                                        className={cn("rounded-full transition-all", editIdx === i ? "w-4 h-2 bg-pink-500" : "w-2 h-2 bg-gray-300 hover:bg-gray-400")}
                                                    />
                                                ))}
                                            </div>
                                            <span className="text-xs text-gray-500 font-medium hidden sm:block">
                                                {editIdx + 1} / {editProducts.length}
                                            </span>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="ghost"
                                                className="rounded-xl font-bold text-gray-500"
                                                onClick={() => setIsImportOpen(false)}
                                            >
                                                <X className="h-4 w-4 mr-1" /> Cancel
                                            </Button>
                                            <Button
                                                onClick={handleImport}
                                                disabled={importing || editProducts.some(p => !p.price)}
                                                className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white rounded-xl font-bold px-5 shadow-md disabled:opacity-50"
                                            >
                                                {importing ? (
                                                    <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Publishing…</>
                                                ) : (
                                                    <><Package className="h-4 w-4 mr-2" /> Publish {editProducts.length} Product{editProducts.length !== 1 ? "s" : ""}</>
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
