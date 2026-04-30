"use client";

import { useState, useEffect } from "react";
import {
    Search,
    Filter,
    MoreVertical,
    ShieldAlert,
    CheckCircle2,
    Eye,
    Trash2,
    Tag,
    DollarSign,
    Box,
    Flag,
    ArrowUpRight,
    ArrowDownRight,
    AlertCircle,
    Globe,
    ExternalLink,
    RefreshCw,
    Loader2,
    Edit2,
    Edit,
    X,
    Plus,
    Flame, // Added Flame icon
    Timer,
    Zap, // Added Zap
    CheckCircle2 as CheckIcon, // Added CheckIcon to avoid conflicts
    Settings,
    Sparkles,
    ChevronLeft,
    ChevronRight
} from "lucide-react";
import { Pagination } from "@/components/ui/Pagination";
import { DataSyncService } from "@/lib/sync-store";
import { ProductCategory, CATEGORIES } from "@/lib/types";
import { ProductImageSlot, TagsInput, formatPriceWithCommas } from "@/components/product/ProductFormComponents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, wrapInCDN, getProxiedImageUrl } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export default function CatalogControl() {
    const [searchTerm, setSearchTerm] = useState("");
    const [filter, setFilter] = useState<"all" | "flagged" | "fair" | "global" | "cache">("all");
    const [sort, setSort] = useState<"date_desc" | "date_asc" | "price_desc" | "price_asc" | "category_asc">("date_desc");
    const [products, setProducts] = useState<any[]>([]);
    const [cachedProducts, setCachedProducts] = useState<any[]>([]);
    const [editingCacheProduct, setEditingCacheProduct] = useState<any | null>(null);
    const [cacheEditFields, setCacheEditFields] = useState<{ name: string; price: string; image_url: string; description: string }>({ name: '', price: '', image_url: '', description: '' });
    const [selectedCacheIds, setSelectedCacheIds] = useState<string[]>([]);

    const [scrapedProducts, setScrapedProducts] = useState<any[]>([]);
    const [isScraping, setIsScraping] = useState(false);
    const [scrapeUrl, setScrapeUrl] = useState("");

    // Bulk Actions & Images State
    const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
    const [isHandlingImages, setIsHandlingImages] = useState(false);

    // Pagination State
    const [itemsPerPage, setItemsPerPage] = useState(50);
    const [currentPage, setCurrentPage] = useState(1);
    const [cacheItemsPerPage, setCacheItemsPerPage] = useState(50);
    const [currentCachePage, setCurrentCachePage] = useState(1);

    // Curation State
    const [trendingIds, setTrendingIds] = useState<Set<string>>(new Set());
    const [sponsoredIds, setSponsoredIds] = useState<Set<string>>(new Set());
    const [dealProductIds, setDealProductIds] = useState<Set<string>>(new Set());

    // Edit Modal State
    const [editingProduct, setEditingProduct] = useState<any | null>(null);
    const [inlineEditId, setInlineEditId] = useState<string | null>(null);
    const [inlineEditName, setInlineEditName] = useState("");
    const [editName, setEditName] = useState("");
    const [editCategory, setEditCategory] = useState("");
    const [editSubcategory, setEditSubcategory] = useState("");
    const [editColors, setEditColors] = useState("");
    const [editDescription, setEditDescription] = useState("");
    const [editSpecs, setEditSpecs] = useState<{ key: string; value: string }[]>([]);
    const [editPrice, setEditPrice] = useState("");
    const [editOriginalPrice, setEditOriginalPrice] = useState("");
    const [editImage, setEditImage] = useState("");
    const [editExternalUrl, setEditExternalUrl] = useState("");
    const [editImages, setEditImages] = useState<string[]>([]);
    const [editTags, setEditTags] = useState<string[]>([]);
    const [editFinancingConfig, setEditFinancingConfig] = useState<any>(null);
    const [editFinancingAvailable, setEditFinancingAvailable] = useState(false);
    const [editFinancingDownPayment, setEditFinancingDownPayment] = useState("");
    const [editSlug, setEditSlug] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [isCalculatingBestPrice, setIsCalculatingBestPrice] = useState(false);
    const [isFetchingImage, setIsFetchingImage] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);

    // Sync Modal State
    const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncReport, setSyncReport] = useState<any[]>([]);
    const [profitMargin, setProfitMargin] = useState("25");
    const [syncProgress, setSyncProgress] = useState<{ current: number; total: number; currentName: string }>({ current: 0, total: 0, currentName: "" });
    const [selectedSyncIds, setSelectedSyncIds] = useState<string[]>([]);
    const [isPromoting, setIsPromoting] = useState(false);
    
    // Deal Modal State
    const [isDealModalOpen, setIsDealModalOpen] = useState(false);
    const [dealProduct, setDealProduct] = useState<any | null>(null);
    const [dealDiscount, setDealDiscount] = useState("15");
    const [dealDurationHours, setDealDurationHours] = useState("24");

    useEffect(() => {
        const load = () => {
            const all = DataSyncService.getProducts();
            console.log("Admin Catalog detected update. Items:", all.length);
            setProducts(all);
            
            setCachedProducts(DataSyncService.getAllCachedProducts());

            const trending = new Set<string>();
            const sponsored = new Set<string>();
            const deals = new Set<string>();
            
            all.forEach(p => {
                if (p.is_trending) trending.add(p.id);
                if (p.is_sponsored) sponsored.add(p.id);
            });

            const activeDeals = DataSyncService.getDeals();
            activeDeals.forEach(d => {
                if (d.is_active && d.product_id) {
                    deals.add(d.product_id);
                }
            });

            setTrendingIds(trending);
            setSponsoredIds(sponsored);
            setDealProductIds(deals);
        };

        // Initial load
        load();

        // Run taxonomy management once separately to avoid event loops
        DataSyncService.syncTaxonomy().then(() => {
            DataSyncService.migrateTaxonomyIfNeeded(CATEGORIES);
        });

        window.addEventListener("storage", load);
        window.addEventListener("sync-store-update", load);
        return () => {
            window.removeEventListener("storage", load);
            window.removeEventListener("sync-store-update", load);
        };
    }, []);

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filter, sort]);

    useEffect(() => {
        setCurrentCachePage(1);
    }, [searchTerm, sort]);

    let filtered = products.filter(p => {
        const matchesSearch = (p.name || "").toLowerCase().includes(searchTerm.toLowerCase()) || (p.seller_name || "").toLowerCase().includes(searchTerm.toLowerCase());
        const isGlobal = p._source === "global" || p.seller_id === "global-partners" || (p.seller_name || "").toLowerCase().includes("global store");
        const matchesFilter = filter === "all" ||
            (filter === "flagged" && p.price_flag !== "fair") ||
            (filter === "fair" && p.price_flag === "fair") ||
            (filter === "global" && isGlobal);
        return matchesSearch && matchesFilter;
    });

    filtered = filtered.sort((a, b) => {
        if (sort === "date_desc") {
            return (new Date(b.created_at || 0).getTime()) - (new Date(a.created_at || 0).getTime());
        } else if (sort === "date_asc") {
            return (new Date(a.created_at || 0).getTime()) - (new Date(b.created_at || 0).getTime());
        } else if (sort === "price_desc") {
            return b.price - a.price;
        } else if (sort === "price_asc") {
            return a.price - b.price;
        } else if (sort === "category_asc") {
            return (a.category || "").localeCompare(b.category || "");
        }
        return 0;
    });
    
    // Main Catalog Pagination
    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const paginatedProducts = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const handleUpdateImages = async () => {
        setIsHandlingImages(true);
        // We scan everything currently present globally (local & cache)
        const allItems = [...products, ...cachedProducts];
        let updated = 0;
        let scanned = 0;
        let failed = 0;
        
        for (const item of allItems) {
            const currentImg = item.image_url || "";
            const lower = currentImg.toLowerCase();
            
            // Comprehensive broken-image detection
            const isBroken = 
                currentImg === "" ||
                currentImg === "/placeholder.png" ||
                lower.includes('placeholder') ||
                lower.includes('no photo') ||
                lower.includes('no-image') ||
                lower.includes('no_image') ||
                lower.includes('n/a') ||
                currentImg.startsWith('/assets/images') ||
                // Catch proxied placeholders like /api/image-cdn?url=...placeholder...
                (currentImg.includes('/api/image-cdn') && lower.includes('placeholder'));
            
            if (isBroken) {
                scanned++;
                try {
                    // Use category for smarter search results
                    const catQuery = item.category ? `&cat=${encodeURIComponent(item.category)}` : "";
                    const res = await fetch(`/api/product-image?q=${encodeURIComponent(item.name + ' product official')}${catQuery}`);
                    if (res.ok) {
                        const data = await res.json();
                        if (data.imageUrl) {
                            const cdnUrl = wrapInCDN(data.imageUrl);
                            if (item.cached_at) {
                                DataSyncService.updateSearchCacheProduct(item.id, { image_url: cdnUrl });
                            } else {
                                DataSyncService.updateProduct(item.id, { 
                                    image_url: cdnUrl, 
                                    images: data.imageUrls ? data.imageUrls.slice(0, 5).map((u: string) => wrapInCDN(u)) : [cdnUrl]
                                });
                            }
                            updated++;
                        } else {
                            failed++;
                        }
                    } else {
                        failed++;
                        console.warn(`Image search returned ${res.status} for "${item.name}"`);
                    }
                } catch(e) {
                    failed++;
                    console.error("Failed to update image for", item.name, e);
                }
                // 1.2s delay keeps bulk scan well under the 60 req/min rate limit
                await new Promise(r => setTimeout(r, 1200));
            }
        }
        
        setProducts(DataSyncService.getProducts());
        setCachedProducts(DataSyncService.getAllCachedProducts());
        setIsHandlingImages(false);
        alert(`Global Image Scan Complete.\n\n✅ Updated: ${updated} products\n⚠️ Not found: ${failed}\n📦 Total scanned: ${scanned} of ${allItems.length}`);
    };

    const handleToggleTrending = async (id: string) => {
        const isTrending = await DataSyncService.toggleTrending(id);
        const newSet = new Set(trendingIds);
        if (isTrending) newSet.add(id); else newSet.delete(id);
        setTrendingIds(newSet);
    };

    const handleToggleSponsored = async (id: string) => {
        const isSponsored = await DataSyncService.toggleSponsored(id);
        const newSet = new Set(sponsoredIds);
        if (isSponsored) newSet.add(id); else newSet.delete(id);
        setSponsoredIds(newSet);
    };

    const handleBestPrice = async () => {
        if (!editName) return;
        setIsCalculatingBestPrice(true);
        setAiError(null);
        try {
            const currentPrice = parseInt(editPrice.replace(/,/g, "")) || 0;
            const res = await fetch("/api/gemini-price", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    productName: editName,
                    mode: "analyze",
                    anchorPrice: currentPrice,
                    category: editCategory
                })
            });

            if (res.ok) {
                const data = await res.json();
                if (data.recommendedPrice) {
                    setEditPrice(formatPriceWithCommas(data.recommendedPrice));
                    if (data.subcategory) setEditSubcategory(data.subcategory);
                    if (data.tags && Array.isArray(data.tags)) setEditTags(data.tags);
                    if (data.category) setEditCategory(data.category);
                } else {
                    setAiError("Best Price returned no price data. Try a more specific product name.");
                }
            } else {
                const errData = await res.json().catch(() => ({}));
                setAiError(errData.error || `Best Price failed (${res.status}). Please try again.`);
            }
        } catch (error) {
            console.error("Best price calculation failed", error);
            setAiError("Best Price request failed. Check your connection.");
        } finally {
            setIsCalculatingBestPrice(false);
        }
    };

    const handleGetImage = async () => {
        if (!editName) return;
        setIsFetchingImage(true);
        setAiError(null);
        try {
            const catQuery = editCategory ? `&cat=${encodeURIComponent(editCategory)}` : "";
            const res = await fetch(`/api/product-image?q=${encodeURIComponent(editName + ' official product high resolution')}${catQuery}`);
            if (res.ok) {
                const data = await res.json();
                if (data.imageUrl) {
                    setEditImage(wrapInCDN(data.imageUrl));
                    if (data.imageUrls && Array.isArray(data.imageUrls) && data.imageUrls.length > 0) {
                        setEditImages(data.imageUrls.slice(0, 8).map(wrapInCDN));
                    }
                    return;
                }
            }

            const geminiRes = await fetch('/api/gemini-price', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productName: editName, mode: 'analyze', category: editCategory })
            });
            if (geminiRes.ok) {
                const geminiData = await geminiRes.json();
                if (geminiData.image_url && geminiData.image_url.startsWith('http')) {
                    setEditImage(wrapInCDN(geminiData.image_url));
                    return;
                }
            }

            setAiError('No image found. Try a more specific product name or upload manually.');
        } catch (error) {
            console.error('Image fetch failed:', error);
            setAiError('Image search failed. Please try again or upload manually.');
        } finally {
            setIsFetchingImage(false);
        }
    };

    const handleDelete = (id: string) => {
        if (confirm("Are you sure you want to remove this product from the platform? This action cannot be undone.")) {
            DataSyncService.deleteProduct(id);
        }
    };

    const handleEditSave = async () => {
        if (editingProduct) {
            const { category: normCat, subcategory: normSub } = DataSyncService.normalizeCategory(
                editCategory || editingProduct.category,
                editSubcategory || editingProduct.subcategory || ""
            );

            await DataSyncService.updateProduct(editingProduct.id, {
                name: editName || editingProduct.name,
                category: normCat as ProductCategory,
                subcategory: normSub,
                tags: editTags,
                colors: editColors.split(",").map(c => c.trim()).filter(Boolean),
                description: editDescription || editingProduct.description,
                specs: editSpecs.reduce((acc, curr) => { if (curr.key) acc[curr.key] = curr.value; return acc; }, {} as Record<string, string>),
                price: parseFloat(editPrice.replace(/,/g, '')) || editingProduct.price,
                original_price: editOriginalPrice ? parseFloat(editOriginalPrice.replace(/,/g, '')) : editingProduct.original_price,
                image_url: wrapInCDN(editImage || editingProduct.image_url),
                external_url: editExternalUrl || editingProduct.external_url,
                images: editImages.filter(Boolean).map(wrapInCDN),
                financing_available: editFinancingAvailable,
                financing_down_payment: editFinancingAvailable ? parseFloat(editFinancingDownPayment.replace(/,/g, '')) || 0 : 0,
                financing_config: editFinancingConfig,
                slug: editSlug
            });
            setEditingProduct(null);
        }
    };

    const handleAIGenerate = async () => {
        if (!editName) return;
        setIsGenerating(true);
        setAiError(null);
        try {
            const res = await fetch("/api/gemini-seller", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ productName: editName, category: editCategory })
            });
            if (res.ok) {
                const content = await res.json();
                if (content.description) setEditDescription(content.description);
                if (content.specs) setEditSpecs(Object.entries(content.specs).map(([key, value]) => ({ key, value: String(value) })));
                
                // Canonical Taxonomy Normalization
                const { category: normCat, subcategory: normSub } = DataSyncService.normalizeCategory(
                    content.category || editCategory, 
                    content.subcategory
                );
                setEditCategory(normCat);
                setEditSubcategory(normSub);

                if (content.tags && Array.isArray(content.tags)) setEditTags(content.tags);
                if (content.colors && Array.isArray(content.colors)) setEditColors(content.colors.join(", "));
            } else {
                const errData = await res.json().catch(() => ({}));
                setAiError(errData.error || `AI Auto-Fill failed (${res.status}). Check that GEMINI_API_KEY is set.`);
            }
        } catch (error) {
            console.error("AI Generation failed", error);
            setAiError("AI Auto-Fill request failed. Check your connection.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSpecChange = (index: number, field: 'key' | 'value', value: string) => {
        const newSpecs = [...editSpecs];
        newSpecs[index] = { ...newSpecs[index], [field]: value };
        setEditSpecs(newSpecs);
    };

    const handleInitiateSync = async () => {
        setIsSyncModalOpen(true);
        setIsSyncing(true);
        setSyncReport([]);

        // Filter to global store products only, cap at 20 per run to respect rate limits
        const globalProducts = products.filter(p =>
            p.seller_name?.toLowerCase().includes("global store") || p._source === "global"
        ).slice(0, 20);

        setSyncProgress({ current: 0, total: globalProducts.length, currentName: "" });

        const report: any[] = [];
        const margin = parseFloat(profitMargin) / 100;

        for (let i = 0; i < globalProducts.length; i++) {
            const p = globalProducts[i];
            setSyncProgress({ current: i + 1, total: globalProducts.length, currentName: p.name });

            let rawMarketPrice = p.price; // fallback: keep existing price
            try {
                const res = await fetch("/api/gemini-price", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        productName: p.name,
                        category: p.category,
                        mode: "analyze",
                        anchorPrice: p.price,
                    }),
                });
                if (res.ok) {
                    const data = await res.json();
                    // Use recommendedPrice → marketAverage → current as fallback chain
                    rawMarketPrice = data.recommendedPrice || data.marketAverage || p.price;
                }
            } catch { /* keep fallback */ }

            report.push({
                ...p,
                oldPrice: p.price,
                rawMarketPrice,
                suggestedPrice: rawMarketPrice * (1 + margin),
            });

            // 3.5s delay keeps bulk analysis well under the 20 req/min Gemini rate limit
            if (i < globalProducts.length - 1) {
                await new Promise(r => setTimeout(r, 3500));
            }
        }

        setSyncReport(report);
        // Auto-select products where suggested price differs by more than 5%
        setSelectedSyncIds(report.filter(r => Math.abs(r.suggestedPrice - r.oldPrice) / r.oldPrice > 0.05).map(r => r.id));
        setIsSyncing(false);
    };

    const handleMarginChange = (val: string) => {
        setProfitMargin(val);
        const num = parseFloat(val) || 0;
        setSyncReport(prev => prev.map(r => ({
            ...r,
            suggestedPrice: r.rawMarketPrice * (1 + num / 100)
        })));
    };

    const handleApplySync = async () => {
        for (const id of selectedSyncIds) {
            const item = syncReport.find(r => r.id === id);
            if (item) {
                // Round to nearest hundred
                const roundedPrice = Math.ceil(item.suggestedPrice / 100) * 100;
                await DataSyncService.updateProduct(id, { price: roundedPrice });
            }
        }
        setIsSyncModalOpen(false);
        setProducts(DataSyncService.getProducts());
        alert("Selected global product prices successfully synced and updated.");
    };

    const [dealPriority, setDealPriority] = useState("1"); // 1 is highest priority

    const handlePromoteToDeal = () => {
        if (!dealProduct) return;
        const discountPct = parseInt(dealDiscount) || 15;
        const hours = parseInt(dealDurationHours) || 24;
        const priority = parseInt(dealPriority) || 1;
        const endAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
        const startAt = new Date().toISOString();
        
        DataSyncService.addDeal({
            product_id: dealProduct.id,
            product: dealProduct,
            discount_pct: discountPct,
            start_at: startAt,
            end_at: endAt,
            is_active: true,
            deal_priority: priority
        });

        // Notify the product's seller about the deal
        const sellers = DataSyncService.getSellers();
        const productSeller = sellers.find(s => s.id === dealProduct.seller_id || s.user_id === dealProduct.seller_id);
        if (productSeller) {
            DataSyncService.addNotification({
                userId: productSeller.owner_email || productSeller.id,
                type: "promo",
                message: `🔥 Your product "${dealProduct.name}" has been promoted to Hottest Deals by the Admin! ${discountPct}% off for ${hours} hours.`,
                link: "/deals"
            });
            
            fetch('/api/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: productSeller.owner_email || 'demo@fairprice.store',
                    subject: `Product Promoted to Hot Deals`,
                    type: 'security_alert',
                    data: {
                        storeName: productSeller.business_name,
                        message: `Congratulations! Your product "${dealProduct.name}" has been selected and promoted to Hottest Deals by the platform administrators! ${discountPct}% off for ${hours} hours.`
                    }
                })
            }).catch(() => {});
        }

        // Dispatch event so homepage picks up the new deal immediately
        window.dispatchEvent(new Event("sync-store-update"));

        setIsDealModalOpen(false);
        setDealProduct(null);
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <div className="flex items-center gap-3">
                        <h2 className="text-3xl font-black text-gray-900 tracking-tight">Catalog Control</h2>
                        <span className="bg-indigo-100 text-indigo-700 text-sm font-black px-3 py-1 rounded-full">{filtered.length}</span>
                    </div>
                    <p className="text-sm text-gray-500 font-bold uppercase tracking-wider mt-1">Platform-wide product monitoring & management</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="bg-white p-1.5 rounded-2xl border border-gray-100 flex gap-1">
                        {(["all", "global", "cache", "flagged", "fair"] as const).map((v) => (
                            <button
                                key={v}
                                onClick={() => setFilter(v)}
                                className={cn(
                                    "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                                    filter === v
                                        ? v === 'cache' ? "bg-blue-600 text-white shadow-lg" : "bg-indigo-600 text-white shadow-lg"
                                        : "text-gray-400 hover:text-gray-600"
                                )}
                            >
                                {v === 'cache' ? `Cache (${cachedProducts.length})` : v}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                        placeholder="Search by product name, seller, or ID..."
                        className="pl-12 h-14 bg-white border border-gray-100 rounded-[20px] text-sm font-medium shadow-sm focus-visible:ring-indigo-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-center">
                <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto shrink-0 scrollbar-hide">
                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest mr-2 whitespace-nowrap">Sort By</span>
                    <select
                        value={sort}
                        onChange={(e) => setSort(e.target.value as any)}
                        className="bg-white border border-gray-200 h-10 rounded-xl text-xs font-bold px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="date_desc">Newest First</option>
                        <option value="date_asc">Oldest First</option>
                        <option value="price_desc">Highest Price</option>
                        <option value="price_asc">Lowest Price</option>
                        <option value="category_asc">Category (A-Z)</option>
                    </select>
                </div>
                <Button onClick={handleInitiateSync} className="h-10 px-4 md:px-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[20px] font-black uppercase tracking-widest text-xs shadow-lg shadow-indigo-500/20 w-full md:w-auto shrink-0 whitespace-nowrap" title="Syncs prices for Global Stores items against live 3rd party APIs (e.g. Amazon, BestBuy)">
                    <Globe className="mr-2 h-4 w-4" /> Sync Global Prices
                </Button>
                <Button onClick={handleUpdateImages} disabled={isHandlingImages} className="h-10 px-4 md:px-8 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[20px] font-black uppercase tracking-widest text-xs shadow-lg shadow-emerald-500/20 w-full md:w-auto shrink-0 whitespace-nowrap" title="Scans DB to securely fetch proxy URLs for placeholder images">
                    {isHandlingImages ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Edit2 className="mr-2 h-4 w-4" />} 
                    {isHandlingImages ? "Scanning..." : "Update Images"}
                </Button>
            </div>

            {/* ════════ SEARCH CACHE TAB ════════ */}
            {filter === 'cache' ? (() => {
                const searchFilteredCache = cachedProducts
                    .filter(p => !searchTerm || (p.name || "").toLowerCase().includes(searchTerm.toLowerCase()) || (p.cache_query && p.cache_query.toLowerCase().includes(searchTerm.toLowerCase())))
                    .sort((a, b) => {
                        if (sort === "date_desc") return (new Date(b.created_at || b.cached_at || 0).getTime()) - (new Date(a.created_at || a.cached_at || 0).getTime());
                        if (sort === "date_asc") return (new Date(a.created_at || a.cached_at || 0).getTime()) - (new Date(b.created_at || b.cached_at || 0).getTime());
                        if (sort === "price_desc") return (b.price || 0) - (a.price || 0);
                        if (sort === "price_asc") return (a.price || 0) - (b.price || 0);
                        if (sort === "category_asc") return (a.category || "").localeCompare(b.category || "");
                        return 0;
                    });

                // Cache Pagination
                const totalCachePages = Math.ceil(searchFilteredCache.length / cacheItemsPerPage);
                const paginatedCacheProducts = searchFilteredCache.slice((currentCachePage - 1) * cacheItemsPerPage, currentCachePage * cacheItemsPerPage);

                const allIds = searchFilteredCache.map((p: any) => p.id);
                const isAllSelected = allIds.length > 0 && selectedCacheIds.length === allIds.length;
                const isIndeterminate = selectedCacheIds.length > 0 && selectedCacheIds.length < allIds.length;

                return (
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 bg-blue-50/50 flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-black text-blue-900">Search Result Cache</h3>
                                <p className="text-xs text-blue-600/70 mt-0.5">Products found via global search. Edit details and promote to your public catalog.</p>
                            </div>
                            <div className="flex items-center gap-3">
                                {selectedCacheIds.length > 0 && (
                                    <div className="flex gap-2">
                                        <button
                                            disabled={isPromoting}
                                            onClick={async () => {
                                                if (confirm(`Are you sure you want to add ${selectedCacheIds.length} items to your global platform catalog?`)) {
                                                    setIsPromoting(true);
                                                    try {
                                                        for (let id of selectedCacheIds) {
                                                            await DataSyncService.promoteFromCache(id);
                                                            DataSyncService.removeFromSearchCache(id);
                                                        }

                                                        setCachedProducts(DataSyncService.getAllCachedProducts());
                                                        setSelectedCacheIds([]);
                                                    } finally {
                                                        setIsPromoting(false);
                                                    }
                                                }
                                            }}
                                            className="text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
                                        >
                                            {isPromoting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} 
                                            Add Selected to Catalog ({selectedCacheIds.length})
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (confirm(`Are you sure you want to delete ${selectedCacheIds.length} items from the cache?`)) {
                                                    for (let id of selectedCacheIds) {
                                                        DataSyncService.removeFromSearchCache(id);
                                                    }
                                                    setCachedProducts(DataSyncService.getAllCachedProducts());
                                                    setSelectedCacheIds([]);
                                                }
                                            }}
                                            className="text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" /> Delete Selected
                                        </button>
                                    </div>
                                )}
                                <span className="text-xs font-black text-blue-700 bg-blue-100 px-3 py-1.5 rounded-full">{searchFilteredCache.length} cached</span>
                            </div>
                        </div>
                        {searchFilteredCache.length === 0 ? (
                            <div className="px-6 py-16 text-center">
                                <Globe className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                                <p className="text-sm font-bold text-gray-400">No cached search results yet.</p>
                                <p className="text-xs text-gray-400 mt-1">Products will appear here when users search via the global search.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                <div className="px-6 py-3 bg-gray-50/80 flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                                            checked={isAllSelected}
                                            ref={input => { if (input) input.indeterminate = isIndeterminate; }}
                                            onChange={(e) => {
                                                if (e.target.checked) setSelectedCacheIds(allIds);
                                                else setSelectedCacheIds([]);
                                            }}
                                        />
                                        <span className="text-[10px] font-black tracking-widest uppercase text-gray-500">Select All Items in Search</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black uppercase text-gray-400">Items per page</span>
                                        <select 
                                            value={cacheItemsPerPage} 
                                            onChange={(e) => { setCacheItemsPerPage(Number(e.target.value)); setCurrentCachePage(1); }}
                                            className="bg-transparent text-[10px] font-black text-gray-700 outline-none"
                                        >
                                            <option value={50}>50</option>
                                            <option value={100}>100</option>
                                            <option value={200}>200</option>
                                        </select>
                                    </div>
                                </div>

                                {paginatedCacheProducts
                                    .map((p: any) => (
                                        <div key={p.id} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50/50 transition-colors group">
                                            <input
                                                type="checkbox"
                                                className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                                                checked={selectedCacheIds.includes(p.id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) setSelectedCacheIds([...selectedCacheIds, p.id]);
                                                    else setSelectedCacheIds(selectedCacheIds.filter(id => id !== p.id));
                                                }}
                                            />
                                            <div className="h-16 w-16 rounded-2xl border border-gray-200 bg-white overflow-hidden flex-shrink-0 flex items-center justify-center p-1">
                                                <img src={getProxiedImageUrl(p.image_url)} alt={p.name} className="object-contain w-full h-full" onError={(e) => { e.currentTarget.src = '/assets/images/placeholder.png'; }} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <Link href={`/product/${p.id}`} className="text-sm font-bold text-gray-900 hover:text-indigo-600 transition-colors line-clamp-1">{p.name}</Link>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-xs font-bold text-blue-600">₦{p.price?.toLocaleString()}</span>
                                                    <span className="text-[10px] text-gray-400">·</span>
                                                    <span className="text-[10px] text-gray-400 uppercase">{p.category}</span>
                                                    {p.cache_query && <span className="text-[10px] text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded">Query: "{p.cache_query}"</span>}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => { setEditingCacheProduct(p); setCacheEditFields({ name: p.name, price: String(p.price || 0), image_url: p.image_url || '', description: p.description || '' }); }}
                                                    className="px-3 py-1.5 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                                                >
                                                    <Edit2 className="h-3 w-3 inline mr-1" />Edit
                                                </button>
                                                <button
                                                    disabled={isPromoting}
                                                    onClick={async () => {
                                                        setIsPromoting(true);
                                                        try {
                                                            await DataSyncService.promoteFromCache(p.id);
                                                            DataSyncService.removeFromSearchCache(p.id);
                                                            setCachedProducts(DataSyncService.getAllCachedProducts());
                                                        } finally {
                                                            setIsPromoting(false);
                                                        }
                                                    }}
                                                    className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
                                                >
                                                    {isPromoting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                                                    Add to Catalog
                                                </button>
                                                <button
                                                    onClick={() => { if (confirm('Remove from cache?')) { DataSyncService.removeFromSearchCache(p.id); setCachedProducts(DataSyncService.getAllCachedProducts()); } }}
                                                    className="px-2 py-1.5 text-xs text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        )}

                        {/* Search Cache Pagination UI */}
                        <Pagination 
                            currentPage={currentCachePage}
                            totalPages={totalCachePages}
                            onPageChange={setCurrentCachePage}
                            itemsPerPage={cacheItemsPerPage}
                            totalItems={searchFilteredCache.length}
                            onItemsPerPageChange={(val) => { setCacheItemsPerPage(val); setCurrentCachePage(1); }}
                            type="cached items"
                            className="bg-blue-50/30 border-blue-100"
                        />

                        {/* Cache Edit Modal */}
                        <Dialog open={!!editingCacheProduct} onOpenChange={() => setEditingCacheProduct(null)}>
                            <DialogContent className="max-w-lg">
                                <DialogHeader>
                                    <DialogTitle className="text-lg font-black">Edit Cached Product</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 py-2">
                                    <div><label className="text-xs font-bold text-gray-500 mb-1 block">Product Name</label><Input value={cacheEditFields.name} onChange={e => setCacheEditFields(p => ({ ...p, name: e.target.value }))} /></div>
                                    <div><label className="text-xs font-bold text-gray-500 mb-1 block">Price (₦)</label><Input type="text" value={cacheEditFields.price} onChange={e => setCacheEditFields(p => ({ ...p, price: e.target.value }))} /></div>
                                    <div><label className="text-xs font-bold text-gray-500 mb-1 block">Image URL</label><Input value={cacheEditFields.image_url} onChange={e => setCacheEditFields(p => ({ ...p, image_url: e.target.value }))} onBlur={e => setCacheEditFields(p => ({ ...p, image_url: wrapInCDN(e.target.value) }))} onPaste={e => { const txt = e.clipboardData.getData('text'); if (txt.startsWith('http')) setTimeout(() => setCacheEditFields(p => ({ ...p, image_url: wrapInCDN(txt) })), 0); }} placeholder="https://..." /></div>
                                    {cacheEditFields.image_url && <img src={getProxiedImageUrl(cacheEditFields.image_url)} alt="Preview" className="h-20 w-20 object-contain rounded-lg border" onError={(e) => { e.currentTarget.src = '/assets/images/placeholder.png'; }} />}
                                    <div><label className="text-xs font-bold text-gray-500 mb-1 block">Description</label><textarea className="w-full border rounded-lg p-2 text-sm min-h-[80px]" value={cacheEditFields.description} onChange={e => setCacheEditFields(p => ({ ...p, description: e.target.value }))} /></div>
                                </div>
                                <DialogFooter className="gap-2">
                                    <Button variant="outline" onClick={() => setEditingCacheProduct(null)}>Cancel</Button>
                                    <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => {
                                        DataSyncService.updateSearchCacheProduct(editingCacheProduct.id, {
                                            name: cacheEditFields.name,
                                            price: parseFloat(cacheEditFields.price.replace(/,/g, '')) || 0,
                                            image_url: cacheEditFields.image_url,
                                            description: cacheEditFields.description,
                                        });
                                        setCachedProducts(DataSyncService.getAllCachedProducts());
                                        setEditingCacheProduct(null);
                                    }}>Save Changes</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                );
            })() : (
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                    {selectedProductIds.length > 0 && (
                        <div className="px-6 py-4 border-b border-gray-100 bg-indigo-50/50 flex items-center justify-between">
                            <h3 className="text-sm font-black text-indigo-900">{selectedProductIds.length} Products Selected</h3>
                            <div className="flex gap-2">
                                <Button
                                    onClick={() => {
                                        if (confirm(`Delete ${selectedProductIds.length} selected products?`)) {
                                            for (let id of selectedProductIds) DataSyncService.deleteProduct(id);
                                            setProducts(DataSyncService.getProducts());
                                            setSelectedProductIds([]);
                                        }
                                    }}
                                    className="h-8 px-4 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg"
                                >
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete Selected
                                </Button>
                            </div>
                        </div>
                    )}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50/50">
                                    <th className="px-6 py-4 w-12 text-center">
                                        <input
                                            type="checkbox"
                                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer h-4 w-4"
                                            checked={filtered.length > 0 && selectedProductIds.length === filtered.length}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedProductIds(filtered.map(p => p.id));
                                                } else {
                                                    setSelectedProductIds([]);
                                                }
                                            }}
                                        />
                                    </th>
                                    <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Product Reference</th>
                                    <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Pricing Model</th>
                                    <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Origin / Seller</th>
                                    <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Trust Status</th>
                                    <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {paginatedProducts.map((p) => {
                                    const isGlobal = (p.seller_name || "").toLowerCase().includes("global store");
                                    return (
                                        <tr key={p.id} className="hover:bg-gray-50/50 transition-colors group">
                                            <td className="px-6 py-4 align-middle text-center">
                                                <input
                                                    type="checkbox"
                                                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer h-4 w-4"
                                                    checked={selectedProductIds.includes(p.id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) setSelectedProductIds([...selectedProductIds, p.id]);
                                                        else setSelectedProductIds(selectedProductIds.filter(id => id !== p.id));
                                                    }}
                                                />
                                            </td>
                                            <td className="px-6 py-4 align-middle">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-16 w-16 rounded-2xl border border-gray-100 bg-white overflow-hidden flex-shrink-0 flex items-center justify-center p-1 relative">
                                                        <img src={getProxiedImageUrl(p.image_url)} alt={p.name} className="object-contain w-full h-full mix-blend-multiply" onError={e => { e.currentTarget.style.display = 'none'; }} />
                                                        {p.price_flag !== "fair" && (
                                                            <div className="absolute top-1 left-1">
                                                                <div className="h-2 w-2 rounded-full bg-rose-500 shadow-sm"></div>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="min-w-0 max-w-[200px] lg:max-w-xs group/edit relative flex flex-col">
                                                        {inlineEditId === p.id ? (
                                                            <div className="flex items-center gap-1 mt-1">
                                                                <input
                                                                    type="text"
                                                                    value={inlineEditName}
                                                                    onChange={(e) => setInlineEditName(e.target.value)}
                                                                    className="w-full text-sm font-bold text-gray-900 border border-indigo-300 rounded px-1 min-w-[150px] focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                                    autoFocus
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter') {
                                                                            DataSyncService.updateProduct(p.id, { name: inlineEditName });
                                                                            setInlineEditId(null);
                                                                        } else if (e.key === 'Escape') setInlineEditId(null);
                                                                    }}
                                                                />
                                                                <button onClick={() => { DataSyncService.updateProduct(p.id, { name: inlineEditName }); setInlineEditId(null); }} className="text-emerald-600 hover:text-emerald-700">
                                                                    <CheckCircle2 className="h-4 w-4" />
                                                                </button>
                                                                <button onClick={() => setInlineEditId(null)} className="text-gray-400 hover:text-gray-600">
                                                                    <X className="h-4 w-4" />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <Link href={`/product/${p.id}`} className="hover:underline flex-1 truncate">
                                                                    <p className="font-bold text-gray-900 text-sm truncate" title={p.name}>{p.name}</p>
                                                                </Link>
                                                                <button onClick={() => { setInlineEditId(p.id); setInlineEditName(p.name); }} className="opacity-0 group-hover/edit:opacity-100 text-gray-400 hover:text-indigo-600 transition-opacity p-1 bg-white rounded shadow-sm border border-gray-100 shrink-0">
                                                                    <Edit className="h-3 w-3" />
                                                                </button>
                                                            </div>
                                                        )}
                                                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mt-1">{p.category}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 align-middle">
                                                <p className="text-base font-black text-gray-900">₦{p.price.toLocaleString()}</p>
                                                {p.original_price && (
                                                    <p className="text-[11px] text-gray-400 font-bold line-through mt-0.5">₦{p.original_price.toLocaleString()}</p>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 align-middle">
                                                <div className="flex items-center gap-2">
                                                    {isGlobal ? <Globe className="h-4 w-4 text-blue-500" /> : <Box className="h-4 w-4 text-gray-400" />}
                                                    <Link href={`/store/${p.seller_id}`} className="hover:underline">
                                                        <p className={cn("text-xs font-bold", isGlobal ? "text-blue-700 hover:text-blue-800" : "text-gray-600 hover:text-indigo-600")}>
                                                            {p.seller_name}
                                                        </p>
                                                    </Link>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 align-middle">
                                                {isGlobal && p.external_url ? (
                                                    <a href={p.external_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl transition-colors truncate max-w-[150px]" title={p.external_url}>
                                                        <ExternalLink className="h-3 w-3 shrink-0" />
                                                        View Source
                                                    </a>
                                                ) : (
                                                    <span className={cn(
                                                        "text-[10px] font-black uppercase px-2.5 py-1 rounded-full inline-flex items-center gap-1",
                                                        p.price_flag === "fair" ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                                                            p.price_flag === "too_low" ? "bg-rose-50 text-rose-600 border border-rose-100" : "bg-amber-50 text-amber-600 border border-amber-100"
                                                    )}>
                                                        {p.price_flag === "too_low" && <AlertCircle className="h-3 w-3" />}
                                                        {p.price_flag === "fair" && <CheckCircle2 className="h-3 w-3" />}
                                                        {p.price_flag}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 align-middle text-right">
                                                <div className="flex items-center justify-end gap-1 transition-opacity">
                                                    <Button
                                                        variant="ghost" size="icon"
                                                        onClick={() => handleToggleTrending(p.id)}
                                                        className={cn("h-8 w-8 rounded-xl transition-all duration-300", trendingIds.has(p.id) ? "text-orange-500 bg-orange-50 hover:bg-orange-100 shadow-sm" : "text-gray-400 hover:text-orange-500 hover:bg-orange-50")}
                                                        title={trendingIds.has(p.id) ? "Remove from Trending" : "Pin to Trending"}
                                                    >
                                                        <Flame className={cn("h-4 w-4", trendingIds.has(p.id) && "fill-orange-500 animate-pulse")} />
                                                    </Button>

                                                    <Button
                                                        variant="ghost" size="icon"
                                                        onClick={() => handleToggleSponsored(p.id)}
                                                        className={cn("h-8 w-8 rounded-xl transition-all duration-300", sponsoredIds.has(p.id) ? "text-yellow-500 bg-yellow-50 hover:bg-yellow-100 shadow-sm" : "text-gray-400 hover:text-yellow-500 hover:bg-yellow-50")}
                                                        title={sponsoredIds.has(p.id) ? "Remove Sponsored Status" : "Promote as Sponsored"}
                                                    >
                                                        <Zap className={cn("h-4 w-4", sponsoredIds.has(p.id) && "fill-yellow-500 animate-bounce-slow")} />
                                                    </Button>

                                                    <Button
                                                        variant="ghost" size="icon"
                                                        onClick={() => {
                                                            if (dealProductIds.has(p.id)) {
                                                                if (confirm(`Remove "${p.name}" from Daily Deals?`)) {
                                                                    DataSyncService.removeDealByProductId(p.id);
                                                                    setDealProductIds(new Set(DataSyncService.getDeals().map(d => d.product_id)));
                                                                }
                                                            } else {
                                                                setDealProduct(p);
                                                                setIsDealModalOpen(true);
                                                            }
                                                        }}
                                                        className={cn(
                                                            "h-8 w-8 rounded-xl transition-all duration-300",
                                                            dealProductIds.has(p.id) 
                                                                ? "text-purple-600 bg-purple-50 hover:bg-purple-100 shadow-sm" 
                                                                : "text-gray-400 hover:text-purple-600 hover:bg-purple-50"
                                                        )}
                                                        title={dealProductIds.has(p.id) ? "Remove from Daily Deals" : "Promote to Daily Deals"}
                                                    >
                                                        <Timer className={cn("h-4 w-4", dealProductIds.has(p.id) && "animate-spin-slow")} />
                                                    </Button>

                                                    <Button asChild size="icon" variant="ghost" className="h-8 w-8 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 transition-colors" title="View details">
                                                        <Link href={`/product/${p.id}`} target="_blank">
                                                            <Eye className="h-4 w-4" />
                                                        </Link>
                                                    </Button>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-8 w-8 rounded-xl hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                                                        title="Edit product"
                                                        onClick={() => {
                                                            setEditingProduct(p);
                                                            setEditName(p.name);
                                                            setEditCategory(p.category || "");
                                                            setEditSubcategory(p.subcategory || "");
                                                            setEditColors(p.colors ? p.colors.join(", ") : "");
                                                            setEditDescription(p.description || "");
                                                            setEditSpecs(p.specs ? Object.entries(p.specs).map(([key, value]) => ({ key, value: String(value) })) : []);
                                                            setEditPrice(formatPriceWithCommas(p.price));
                                                            setEditOriginalPrice(p.original_price ? formatPriceWithCommas(p.original_price) : "");
                                                            setEditImage(p.image_url);
                                                            setEditExternalUrl(p.external_url || "");
                                                            setEditImages(p.images?.length ? [...p.images] : [""]);
                                                            setEditTags(p.tags || []);
                                                            setEditFinancingConfig(p.financing_config || { enabled: false, deposit_percent: 0.15, interest_rate_pa: 0.25, max_tenor_months: 12 });
                                                            setEditFinancingAvailable(p.financing_available ?? false);
                                                            setEditFinancingDownPayment(p.financing_down_payment?.toString() || "");
                                                            setEditSlug(p.slug || p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""));
                                                        }}
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </Button>
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 rounded-xl hover:bg-rose-50 hover:text-rose-600 transition-colors" onClick={() => handleDelete(p.id)} title="Remove product">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Main Catalog Pagination UI */}
                    <Pagination 
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        itemsPerPage={itemsPerPage}
                        totalItems={filtered.length}
                        onItemsPerPageChange={(val) => { setItemsPerPage(val); setCurrentPage(1); }}
                        type="products"
                    />

                    {filtered.length === 0 && (
                        <div className="py-24 text-center bg-gray-50/50">
                            <div className="h-16 w-16 bg-white border border-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                                <Box className="h-8 w-8 text-gray-300" />
                            </div>
                            <h3 className="text-lg font-black text-gray-900 mt-1">No products found</h3>
                            <p className="text-sm text-gray-400 font-bold uppercase tracking-wider mt-1">Try adjusting your filters or search term</p>
                        </div>
                    )}
                </div>
            )}
            {/* Sync Global Prices Interactive Report Modal */}
            <Dialog open={isSyncModalOpen} onOpenChange={setIsSyncModalOpen}>
                <DialogContent className="max-w-4xl p-0 overflow-hidden rounded-[32px] border-gray-100 max-h-[90vh] flex flex-col">
                    <div className="p-8 border-b border-gray-100 bg-gray-50/50">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                                <Globe className="h-6 w-6 text-indigo-600" /> API Synchronization Report
                            </DialogTitle>
                            <p className="text-sm font-bold text-gray-400 mt-2">Compare real-time 3rd-party market prices and factor your profit margins.</p>
                        </DialogHeader>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8">
                        {isSyncing ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <RefreshCw className="h-12 w-12 text-indigo-600 animate-spin mb-6" />
                                <h3 className="text-xl font-black text-gray-900 mb-2">Fetching Live Market Prices via AI</h3>
                                {syncProgress.total > 0 && (
                                    <>
                                        <p className="text-sm font-black text-indigo-600 mb-1">{syncProgress.current} / {syncProgress.total} products analyzed</p>
                                        <p className="text-xs text-gray-400 font-bold max-w-xs truncate">{syncProgress.currentName}</p>
                                        <div className="w-64 h-2 bg-gray-100 rounded-full mt-4 overflow-hidden">
                                            <div className="h-full bg-indigo-500 rounded-full transition-all duration-500" style={{ width: `${(syncProgress.current / syncProgress.total) * 100}%` }} />
                                        </div>
                                    </>
                                )}
                                <p className="text-sm text-gray-500 font-bold uppercase tracking-widest mt-4">cars45.com • jiji.ng • Alibaba • Amazon</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100">
                                    <div>
                                        <h4 className="font-black text-indigo-900">Global Profit Margin Config</h4>
                                        <p className="text-xs text-indigo-600 font-bold mt-1">Applied to raw API prices automatically ({syncReport.length} items parsed)</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <label className="text-xs font-black uppercase tracking-widest text-indigo-400">Add Margin %</label>
                                        <Input
                                            type="number"
                                            value={profitMargin}
                                            onChange={(e) => handleMarginChange(e.target.value)}
                                            className="w-24 h-12 bg-white border-none shadow-sm rounded-xl font-black text-lg text-center"
                                        />
                                    </div>
                                </div>

                                <div className="border border-gray-100 rounded-3xl overflow-hidden">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                                <th className="px-5 py-4 w-12 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedSyncIds.length === syncReport.length && syncReport.length > 0}
                                                        onChange={(e) => setSelectedSyncIds(e.target.checked ? syncReport.map(r => r.id) : [])}
                                                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                    />
                                                </th>
                                                <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Product</th>
                                                <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Current Price</th>
                                                <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Raw API Avg</th>
                                                <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-indigo-600">New Target (+{profitMargin}%)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50 bg-white">
                                            {syncReport.map((r) => {
                                                const diff = ((r.suggestedPrice - r.oldPrice) / r.oldPrice) * 100;
                                                const isSelected = selectedSyncIds.includes(r.id);
                                                return (
                                                    <tr key={r.id} className={cn("transition-colors", isSelected ? "bg-indigo-50/20" : "")}>
                                                        <td className="px-5 py-4 text-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={isSelected}
                                                                onChange={(e) => {
                                                                    if (e.target.checked) setSelectedSyncIds([...selectedSyncIds, r.id]);
                                                                    else setSelectedSyncIds(selectedSyncIds.filter(id => id !== r.id));
                                                                }}
                                                                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                            />
                                                        </td>
                                                        <td className="px-5 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <img src={getProxiedImageUrl(r.image_url)} alt="" className="w-10 h-10 rounded-xl object-contain bg-gray-50 border border-gray-100 p-1" onError={e => { e.currentTarget.style.display = 'none'; }} />
                                                                <p className="text-xs font-bold text-gray-900 line-clamp-2 max-w-[200px]">{r.name}</p>
                                                            </div>
                                                        </td>
                                                        <td className="px-5 py-4 font-bold text-gray-500 text-sm">₦{Math.round(r.oldPrice).toLocaleString()}</td>
                                                        <td className="px-5 py-4 font-bold text-gray-500 text-sm">₦{Math.round(r.rawMarketPrice).toLocaleString()}</td>
                                                        <td className="px-5 py-4">
                                                            <div className="flex flex-col">
                                                                <span className="font-black text-indigo-700 text-sm">₦{(Math.ceil(r.suggestedPrice / 100) * 100).toLocaleString()}</span>
                                                                <span className={cn(
                                                                    "text-[10px] font-bold mt-0.5 uppercase tracking-widest",
                                                                    diff > 0 ? "text-emerald-500" : diff < 0 ? "text-rose-500" : "text-gray-400"
                                                                )}>
                                                                    {diff > 0 ? "+" : ""}{diff.toFixed(1)}% {diff > 0 ? "Boost" : "Drop"}
                                                                </span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>

                    {!isSyncing && (
                        <div className="p-6 border-t border-gray-100 bg-white flex items-center justify-between">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{selectedSyncIds.length} Products Selected to Update</p>
                            <div className="flex gap-3">
                                <Button variant="ghost" onClick={() => setIsSyncModalOpen(false)} className="rounded-2xl font-bold uppercase tracking-widest text-xs h-12 text-gray-400">Cancel</Button>
                                <Button onClick={handleApplySync} disabled={selectedSyncIds.length === 0} className="rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-xs h-12 shadow-lg shadow-indigo-500/20 px-8 flex items-center gap-2">
                                    <RefreshCw className="h-4 w-4" /> Apply {selectedSyncIds.length} Updates
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Promote to Deal Modal */}
            <Dialog open={isDealModalOpen} onOpenChange={setIsDealModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black flex items-center gap-2"><Timer className="text-purple-600" /> Promote to Deals</DialogTitle>
                    </DialogHeader>
                    {dealProduct && (
                        <div className="py-4 space-y-4">
                            <div className="flex items-center gap-4 bg-gray-50 p-3 rounded-xl border border-gray-100">
                                <img src={dealProduct.image_url || '/assets/images/placeholder.png'} alt="" className="w-12 h-12 rounded object-contain" onError={(e) => { e.currentTarget.src = '/assets/images/placeholder.png'; }} />
                                <div>
                                    <p className="font-bold text-sm text-gray-900 line-clamp-1">{dealProduct.name}</p>
                                    <p className="text-xs text-gray-500">Current: ₦{dealProduct.price.toLocaleString()}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 mb-1 block">Discount (%)</label>
                                    <Input type="number" value={dealDiscount} onChange={(e) => setDealDiscount(e.target.value)} min="1" max="99" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 mb-1 block">Duration (Hours)</label>
                                    <Input type="number" value={dealDurationHours} onChange={(e) => setDealDurationHours(e.target.value)} min="1" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 mb-1 block">Priority (1-5)</label>
                                    <Input type="number" value={dealPriority} onChange={(e) => setDealPriority(e.target.value)} min="1" max="5" title="1 is highest priority. Pins deal to the top of the homepage." />
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsDealModalOpen(false)}>Cancel</Button>
                        <Button onClick={handlePromoteToDeal} className="bg-purple-600 hover:bg-purple-700 text-white">Create Flash Deal</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Modal */}
            <Dialog open={!!editingProduct} onOpenChange={(open) => { if (!open) { setEditingProduct(null); setAiError(null); } }}>
                <DialogContent className="sm:max-w-lg p-0 overflow-hidden rounded-[32px] border-gray-100 max-h-[85vh] overflow-y-auto">
                    <div className="p-8">
                        {aiError && (
                            <div className="flex items-start gap-2 text-sm font-medium text-red-700 bg-red-50 px-4 py-3 rounded-xl border border-red-200 mb-5">
                                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                                <span className="flex-1">{aiError}</span>
                                <button onClick={() => setAiError(null)} className="text-red-400 hover:text-red-600 ml-1">
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        )}
                        <DialogHeader className="mb-6 flex flex-row items-center justify-between">
                            <div>
                                <DialogTitle className="text-2xl font-black text-gray-900 tracking-tight">Modify Details</DialogTitle>
                                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mt-1">{editingProduct?.name}</p>
                            </div>
                            <Button
                                variant="outline"
                                className="gap-2 border-indigo-200 text-indigo-600 hover:bg-indigo-50 rounded-xl text-xs font-black uppercase tracking-widest px-4 h-9"
                                onClick={handleAIGenerate}
                                disabled={isGenerating || !editName}
                            >
                                <RefreshCw className={cn("h-3 w-3", isGenerating && "animate-spin")} />
                                {isGenerating ? "Generating..." : "AI Auto-Fill"}
                            </Button>
                        </DialogHeader>

                        <div className="space-y-6">
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest pl-1">Main Product Image</label>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 px-3 text-[10px] font-black uppercase tracking-wider border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700 rounded-lg gap-1.5"
                                        onClick={handleGetImage}
                                        disabled={isFetchingImage || !editName}
                                    >
                                        {isFetchingImage ? (
                                            <>
                                                <Loader2 className="h-3 w-3 animate-spin" />
                                                Searching...
                                            </>
                                        ) : (
                                            <>
                                                <Globe className="h-3 w-3" />
                                                Get Image
                                            </>
                                        )}
                                    </Button>
                                </div>
                                <ProductImageSlot 
                                    url={editImage} 
                                    onUrlChange={setEditImage}
                                    onFileSelect={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            const reader = new FileReader();
                                            reader.onload = (ev) => setEditImage(ev.target?.result as string);
                                            reader.readAsDataURL(file);
                                        }
                                    }}
                                    label="Main Image"
                                />
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest pl-1">Gallery Images (Up to 8)</label>
                                <div className="grid grid-cols-4 gap-3">
                                    {editImages.map((url, i) => (
                                        <div key={i} className="relative group">
                                            <ProductImageSlot 
                                                url={url}
                                                onUrlChange={(newUrl) => {
                                                    const next = [...editImages];
                                                    next[i] = newUrl;
                                                    setEditImages(next);
                                                }}
                                                onFileSelect={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        const reader = new FileReader();
                                                        reader.onload = (ev) => {
                                                            const next = [...editImages];
                                                            next[i] = ev.target?.result as string;
                                                            setEditImages(next);
                                                        };
                                                        reader.readAsDataURL(file);
                                                    }
                                                }}
                                                className="mb-0"
                                            />
                                            {editImages.length > 1 && (
                                                <button 
                                                    onClick={() => setEditImages(editImages.filter((_, idx) => idx !== i))}
                                                    className="absolute -top-1 -right-1 h-5 w-5 bg-white border border-gray-100 text-gray-400 hover:text-rose-500 rounded-full shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                                >
                                                    <X className="h-2.5 w-2.5" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    {editImages.length < 8 && (
                                        <button 
                                            onClick={() => setEditImages([...editImages, ""])}
                                            className="aspect-square w-full border border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-gray-400 hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50 transition-all"
                                        >
                                            <Plus className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Product Name</label>
                                        <Input
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            className="bg-gray-50 border-gray-100 h-10 rounded-xl text-sm font-bold"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center justify-between">
                                            Category
                                            <button 
                                                onClick={async () => {
                                                    const newCat = prompt("Enter new global category name:");
                                                    if (newCat) {
                                                        await DataSyncService.createPersistentCategory(newCat);
                                                        setEditCategory(newCat.toLowerCase());
                                                    }
                                                }}
                                                className="text-indigo-500 hover:text-indigo-700"
                                            >
                                                <Plus className="h-3 w-3" />
                                            </button>
                                        </label>
                                        <select
                                            className="w-full bg-gray-50 border border-gray-100 h-10 rounded-xl text-sm font-bold px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            value={editCategory}
                                            onChange={(e) => {
                                                setEditCategory(e.target.value);
                                                setEditSubcategory("");
                                            }}
                                        >
                                            <option value="">Select Category</option>
                                            {DataSyncService.getTaxonomy().map(cat => (
                                                <option key={cat.id} value={cat.name}>{cat.name}</option>
                                            ))}
                                            {/* Minimal Fallback: Only show hardcoded if DB is totally empty */}
                                            {DataSyncService.getTaxonomy().length === 0 && CATEGORIES.map(cat => (
                                                <option key={cat.value} value={cat.label}>{cat.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center justify-between">
                                            Subcategory
                                            <button 
                                                onClick={async () => {
                                                    const currentTax = DataSyncService.getTaxonomy();
                                                    const dbCat = currentTax.find(c => c.name.toLowerCase() === editCategory.toLowerCase());
                                                    if (!dbCat) {
                                                        alert("Please select or create a valid Category first.");
                                                        return;
                                                    }
                                                    const newSub = prompt(`Enter new subcategory for ${dbCat.name}:`);
                                                    if (newSub) {
                                                        await DataSyncService.createPersistentSubcategory(dbCat.id, newSub);
                                                        setEditSubcategory(newSub);
                                                    }
                                                }}
                                                className="text-indigo-500 hover:text-indigo-700"
                                            >
                                                <Plus className="h-3 w-3" />
                                            </button>
                                        </label>
                                        <select
                                            className="w-full bg-gray-50 border border-gray-100 h-10 rounded-xl text-sm font-bold px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            value={editSubcategory}
                                            onChange={(e) => setEditSubcategory(e.target.value)}
                                        >
                                            <option value="">Select Subcategory</option>
                                            {DataSyncService.getTaxonomy().find(c => c.name.toLowerCase() === editCategory.toLowerCase())?.children?.map((sub: any) => (
                                                <option key={sub.id} value={sub.name}>{sub.name}</option>
                                            ))}
                                            {/* Minimal Fallback: Only show hardcoded if DB is totally empty */}
                                            {DataSyncService.getTaxonomy().length === 0 && CATEGORIES.find(c => c.label.toLowerCase() === editCategory.toLowerCase())?.subcategories.map(sub => (
                                                <option key={sub} value={sub}>{sub}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">SEO Tags</label>
                                        <TagsInput 
                                            tags={editTags}
                                            onChange={setEditTags}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Description</label>
                                    <textarea
                                        value={editDescription}
                                        onChange={(e) => setEditDescription(e.target.value)}
                                        className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 text-sm min-h-[100px] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest block mb-2">Specifications</label>
                                    <div className="space-y-2">
                                        {editSpecs.map((spec, i) => (
                                            <div key={i} className="flex gap-2">
                                                <Input value={spec.key} onChange={e => handleSpecChange(i, 'key', e.target.value)} placeholder="Key" className="bg-gray-50 h-9 text-xs font-bold" />
                                                <Input value={spec.value} onChange={e => handleSpecChange(i, 'value', e.target.value)} placeholder="Value" className="bg-gray-50 h-9 text-xs min-w-[150px]" />
                                                <Button size="icon" variant="ghost" onClick={() => setEditSpecs(editSpecs.filter((_, idx) => idx !== i))} className="h-9 w-9 text-rose-500 shrink-0"><Trash2 className="h-4 w-4" /></Button>
                                            </div>
                                        ))}
                                    </div>
                                    <Button variant="outline" size="sm" onClick={() => setEditSpecs([...editSpecs, { key: '', value: '' }])} className="text-xs h-8 mt-2 w-full border-dashed"><Plus className="h-3 w-3 mr-1" /> Add Spec</Button>
                                </div>

                                <div className="space-y-2 pt-4 border-t border-gray-100">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Our FairPrice (₦)</label>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 text-[9px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg px-2 gap-1"
                                                    onClick={handleBestPrice}
                                                    disabled={isCalculatingBestPrice}
                                                >
                                                    <Sparkles className={cn("h-2.5 w-2.5", isCalculatingBestPrice && "animate-spin")} />
                                                    {isCalculatingBestPrice ? "Checking..." : "Best Price"}
                                                </Button>
                                            </div>
                                            <Input
                                                type="text"
                                                value={editPrice}
                                                onChange={(e) => setEditPrice(formatPriceWithCommas(e.target.value))}
                                                className="bg-gray-50 border-gray-100 h-10 rounded-xl text-lg font-black"
                                                placeholder="FairPrice"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Others' Price (₦) <span className="text-gray-300 normal-case">— strikethrough</span></label>
                                            <Input
                                                type="text"
                                                value={editOriginalPrice}
                                                onChange={(e) => setEditOriginalPrice(formatPriceWithCommas(e.target.value))}
                                                className="bg-gray-50 border-gray-100 h-10 rounded-xl text-lg font-medium text-gray-400 line-through"
                                                placeholder="Competitor price"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Source Product Link <span className="text-gray-300 normal-case">— cheapest competing store</span></label>
                                    <Input
                                        value={editExternalUrl}
                                        onChange={(e) => setEditExternalUrl(e.target.value)}
                                        className="bg-gray-50 border-gray-100 h-10 rounded-xl text-sm font-medium"
                                        placeholder="https://... (Alibaba, Jumia, Temu, etc.)"
                                    />
                                    {editExternalUrl && (
                                        <a href={editExternalUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline truncate block">
                                            Open source link ↗
                                        </a>
                                    )}
                                </div>

                                <div className="space-y-4 pt-4 border-t border-gray-100">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-[12px] font-black uppercase text-gray-900 tracking-tight">Financing & Ownership</p>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Allow buyers to pay in installments</p>
                                        </div>
                                        <button
                                            onClick={() => setEditFinancingAvailable(!editFinancingAvailable)}
                                            className={cn(
                                                "w-12 h-6 rounded-full transition-all relative",
                                                editFinancingAvailable ? "bg-emerald-500" : "bg-gray-200"
                                            )}
                                        >
                                            <div className={cn(
                                                "absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm",
                                                editFinancingAvailable ? "right-1" : "left-1"
                                            )} />
                                        </button>
                                    </div>

                                    {editFinancingAvailable && (
                                        <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 animate-in fade-in slide-in-from-top-2 duration-300">
                                            <label className="text-[10px] font-black uppercase text-emerald-700 tracking-widest block mb-2">Required Downpayment (₦)</label>
                                            <div className="relative">
                                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-600" />
                                                <Input
                                                    type="text"
                                                    value={editFinancingDownPayment}
                                                    onChange={(e) => setEditFinancingDownPayment(e.target.value)}
                                                    className="pl-10 bg-white border-emerald-200 h-10 rounded-xl text-sm font-black text-emerald-900"
                                                    placeholder="e.g. 50,000"
                                                />
                                            </div>
                                            <p className="text-[10px] text-emerald-600/70 font-bold mt-2 uppercase tracking-tight">The minimum amount a user must pay upfront to secure the item.</p>
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">URL Slug <span className="text-gray-300 normal-case">— SEO clean URL</span></label>
                                    <Input
                                        value={editSlug}
                                        onChange={(e) => {
                                            const val = e.target.value.toLowerCase()
                                                .replace(/[^a-z0-9]+/g, "-")
                                                .replace(/(^-|-$)/g, "");
                                            setEditSlug(val);
                                        }}
                                        onPaste={(e) => {
                                            // Handle paste specifically for WordPress-like behavior
                                            setTimeout(() => {
                                                const val = (e.target as HTMLInputElement).value.toLowerCase()
                                                    .replace(/[^a-z0-9]+/g, "-")
                                                    .replace(/(^-|-$)/g, "");
                                                setEditSlug(val);
                                            }, 0);
                                        }}
                                        className="bg-gray-50 border-gray-100 h-10 rounded-xl text-sm font-medium"
                                        placeholder="product-name-slug"
                                    />
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">https://fairprice.ng/product/{editingProduct?.id}/{editSlug || 'slug'}</p>
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="mt-8 gap-3 sm:gap-0">
                            <Button variant="ghost" onClick={() => setEditingProduct(null)} className="rounded-2xl font-bold uppercase tracking-widest text-xs h-12 text-gray-400">Cancel</Button>
                            <Button
                                variant="outline"
                                className="rounded-2xl font-bold uppercase tracking-widest text-xs h-12 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                                onClick={async () => {
                                    if (!editName) return;
                                    setIsGenerating(true);
                                    try {
                                        const res = await fetch('/api/gemini-price', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ productName: editName, mode: 'search' })
                                        });
                                        if (res.ok) {
                                            const data = await res.json();
                                            const best = data.suggestions?.[0];
                                            if (best?.approxPrice) {
                                                setEditPrice(String(Math.round(best.approxPrice)));
                                                setEditOriginalPrice(String(Math.round(best.approxPrice * 1.15)));
                                            }
                                        }
                                    } catch { } finally { setIsGenerating(false); }
                                }}
                            >
                                {isGenerating ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <DollarSign className="h-3.5 w-3.5 mr-1" />}
                                Best Price
                            </Button>
                            <Button onClick={handleEditSave} className="rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-xs h-12 shadow-lg shadow-indigo-500/20 px-8">Update Product</Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
