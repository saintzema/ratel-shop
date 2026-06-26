"use client";

import { useEffect, useState, useRef, useCallback, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Product, CATEGORIES } from "@/lib/types";
import { DataSyncService } from "@/lib/sync-store";
import { PriceDiscoveryModal } from "@/components/modals/PriceDiscoveryModal";
import { ProductSuggestion } from "@/lib/price-engine";
import { formatPrice, wrapInCDN, getProxiedImageUrl } from "@/lib/utils";
import { ProductImageSlot, TagsInput, formatPriceWithCommas } from "@/components/product/ProductFormComponents";
import { upload } from "@vercel/blob/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { motion } from "framer-motion";
import {
    ChevronLeft,
    Save,
    ImagePlus,
    X,
    Plus,
    Sparkles,
    Check,
    Upload,
    Trash2,
    Eye,
    Globe,
    Loader2,
    ShieldCheck,
    AlertTriangle,
    Package
} from "lucide-react";

function EditProductContent() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();
    const productId = params.id as string;
    const returnPage = searchParams.get("page") || "1";
    const fileInputRef = useRef<HTMLInputElement>(null);
    const galleryFileRefs = useRef<Map<number, HTMLInputElement>>(new Map());

    const [product, setProduct] = useState<Product | null>(null);
    const [minFinancingPrice, setMinFinancingPrice] = useState(300000);
    const [isPremium, setIsPremium] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        category: "",
        subcategory: "",
        tags: [] as string[],
        colors: "",
        price: "",
        description: "",
        highlights: [] as string[],
        specs: [] as { key: string; value: string }[],
        image_url: "",
        images: [""],
        stock: "",
        original_price: "",
        external_url: "",
        financing_available: false,
        financing_down_payment: "",
        financing_deposit_pct: 10,
        isDepositByPct: true,
        variants: [] as { name: string; price: string; image_url: string; original_price: string }[]
    });
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [isCalculatingBestPrice, setIsCalculatingBestPrice] = useState(false);
    const [isPriceDiscoveryOpen, setIsPriceDiscoveryOpen] = useState(false);
    const [priceAnalysis, setPriceAnalysis] = useState<any>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isFetchingImage, setIsFetchingImage] = useState(false);
    const [taxonomy, setTaxonomy] = useState<any[]>([]);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const isFormDirtyRef = useRef(false);
    const apiHydratedRef = useRef(false); // Tracks if we've fetched the full product from API

    // Mark form as dirty whenever the user makes any change
    const markDirty = useCallback(() => { isFormDirtyRef.current = true; }, []);

    // Hydrate heavy fields (description, highlights, specs, images) from DB API
    // The sync-store strips these fields for performance; this corrects that for the edit page.
    useEffect(() => {
        if (apiHydratedRef.current) return;
        const decoded = decodeURIComponent(productId);
        fetch(`/api/products/${decoded}`)
            .then(r => r.ok ? r.json() : null)
            .then((full: any) => {
                if (!full) return;
                apiHydratedRef.current = true;
                if (!isFormDirtyRef.current) {
                    setFormData(prev => ({
                        ...prev,
                        description: full.description != null ? full.description : prev.description,
                        highlights: full.highlights?.length ? full.highlights : prev.highlights,
                        specs: full.specs && Object.keys(full.specs).length
                            ? Object.entries(full.specs).map(([key, value]) => ({ key, value: String(value) }))
                            : prev.specs,
                        image_url: full.imageUrl || full.image_url || prev.image_url,
                        images: full.images?.length ? full.images : prev.images,
                        tags: full.tags?.length ? full.tags : prev.tags,
                    }));
                    // Also update the product state so handleSave has the full product
                    setProduct(prev => prev ? { ...prev, description: full.description, highlights: full.highlights, specs: full.specs, images: full.images, tags: full.tags } : prev);
                }
            })
            .catch(() => { /* silently fall back to localStorage version */ });
    }, [productId]);

    // 1. Load Initial Data & Listen for Updates
    useEffect(() => {
        const loadData = () => {
            try {
                const adminSettings = JSON.parse(localStorage.getItem('fp_admin_settings') || '{}');
                if (adminSettings.minFinancingPrice) setMinFinancingPrice(Number(adminSettings.minFinancingPrice));
            } catch {}

            const seller = DataSyncService.getCurrentSeller();
            if (seller && ['Pro', 'Growth', 'Scale'].includes(seller.subscription_plan || '')) {
                setIsPremium(true);
            }

            const currentTaxonomy = DataSyncService.getTaxonomy();
            setTaxonomy(currentTaxonomy);

            const allProducts = DataSyncService.getProducts({ includeInactiveSellers: true });
            const decodedId = decodeURIComponent(productId);
            const found = allProducts.find(p => String(p.id) === decodedId || String(p.id) === productId);
            if (found) {
                setProduct(found);
                // Only overwrite formData if the user hasn't made unsaved edits.
                // This prevents background sync-store-update events from reverting
                // pasted image URLs or other in-progress changes.
                if (!isFormDirtyRef.current) {
                    setFormData(prev => ({
                        ...prev,
                        name: found.name,
                        category: (found.category || "").toLowerCase(),
                        subcategory: found.subcategory || "",
                        tags: found.tags || [],
                        colors: found.colors ? found.colors.join(", ") : "",
                        price: found.price ? parseInt(String(found.price)).toLocaleString() : "",
                        description: found.description,
                        highlights: found.highlights || [],
                        specs: found.specs ? Object.entries(found.specs).map(([key, value]) => ({ key, value: String(value) })) : [],
                        image_url: found.image_url,
                        images: found.images?.length ? [...found.images] : [""],
                        stock: found.stock.toString(),
                        original_price: found.original_price ? found.original_price.toLocaleString() : "",
                        external_url: found.external_url || "",
                        financing_available: found.financing_available || false,
                        financing_down_payment: found.financing_down_payment?.toString() || "",
                        financing_deposit_pct: found.financing_deposit_pct || 10,
                        isDepositByPct: !!found.financing_deposit_pct,
                        variants: found.variants ? found.variants.map(v => ({
                            name: v.name,
                            price: v.price > 0 ? v.price.toLocaleString() : "",
                            original_price: v.original_price ? v.original_price.toLocaleString() : "",
                            image_url: v.image_url || ""
                        })) : []
                    }));
                }
            }
        };

        loadData();
        window.addEventListener("sync-store-update", loadData);
        return () => window.removeEventListener("sync-store-update", loadData);
    }, [productId]);

    const handleAIGenerate = async () => {
        if (!formData.name) return;
        setIsGenerating(true);
        setErrorMsg(null);
        try {
            const res = await fetch("/api/gemini-seller", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ productName: formData.name, category: formData.category })
            });
            if (res.ok) {
                const content = await res.json();
                let inferredCategory = formData.category;

                if (content.category) {
                    const match = taxonomy.find(c => c.name.toLowerCase() === content.category.toLowerCase());
                    if (match) {
                        inferredCategory = match.name.toLowerCase();
                    } else {
                        const fuzz = taxonomy.find(c =>
                            c.name.toLowerCase().includes(content.category.toLowerCase()) ||
                            content.category.toLowerCase().includes(c.name.toLowerCase())
                        );
                        if (fuzz) inferredCategory = fuzz.name.toLowerCase();
                    }
                }

                setFormData(prev => {
                    let newSpecs = prev.specs;
                    if (content.specs) {
                        try {
                            if (Array.isArray(content.specs)) {
                                newSpecs = content.specs.map((s: any) => {
                                    if (typeof s === 'string') {
                                        const parts = s.split(':');
                                        return { key: parts[0]?.trim() || '', value: parts[1]?.trim() || '' };
                                    }
                                    return { key: s.key || s.name || '', value: String(s.value || '') };
                                }).filter((s: any) => s.key && s.value);
                            } else if (typeof content.specs === 'object') {
                                newSpecs = Object.entries(content.specs).map(([key, value]) => ({ key, value: String(value) }));
                            }
                        } catch (e) {
                            console.error("Failed to parse AI specs", e);
                        }
                    }

                    return {
                        ...prev,
                        category: inferredCategory || prev.category,
                        description: content.description || prev.description,
                        highlights: content.highlights || prev.highlights,
                        specs: newSpecs && newSpecs.length > 0 ? newSpecs : prev.specs,
                        subcategory: content.subcategory || prev.subcategory,
                        tags: content.tags || prev.tags,
                        colors: content.colors ? (Array.isArray(content.colors) ? content.colors.join(", ") : content.colors) : prev.colors
                    };
                });
            } else {
                const errData = await res.json().catch(() => ({}));
                setErrorMsg(errData.error || `AI Auto-Fill failed (${res.status}). Check that GEMINI_API_KEY is set in Vercel.`);
            }
        } catch (error) {
            setErrorMsg("AI Auto-Fill request failed. Check your internet connection.");
            console.error("AI Generation failed", error);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSpecChange = (index: number, field: 'key' | 'value', value: string) => {
        const newSpecs = [...formData.specs];
        newSpecs[index] = { ...newSpecs[index], [field]: value };
        setFormData(prev => ({ ...prev, specs: newSpecs }));
    };

    const addSpec = () => setFormData(prev => ({ ...prev, specs: [...prev.specs, { key: "", value: "" }] }));
    const removeSpec = (index: number) => {
        const newSpecs = formData.specs.filter((_, i) => i !== index);
        setFormData(prev => ({ ...prev, specs: newSpecs }));
    };

    const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newPriceFormatted = formatPriceWithCommas(e.target.value);
        const numericPrice = parseInt(newPriceFormatted.replace(/,/g, ""));
        
        setFormData(prev => {
            const next = { ...prev, price: newPriceFormatted };
            if (prev.financing_available && !isPremium && !isNaN(numericPrice) && numericPrice < minFinancingPrice) {
                next.financing_available = false;
            }
            return next;
        });
    };

    const handleOriginalPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, original_price: formatPriceWithCommas(e.target.value) });
    };

    const compressImage = (file: File, callback: (url: string) => void) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new window.Image();
            img.onload = () => {
                const canvas = document.createElement("canvas");
                let { width, height } = img;
                if (width > height && width > 500) { height *= 500 / width; width = 500; }
                else if (height > 500) { width *= 500 / height; height = 500; }
                canvas.width = width;
                canvas.height = height;
                canvas.getContext("2d")?.drawImage(img, 0, 0, width, height);
                // Upload to Vercel Blob so the URL persists in localStorage/admin.
                // Base64 data URLs get stripped by sync-store — Blob URLs don't.
                canvas.toBlob(async (blob) => {
                    if (blob) {
                        try {
                            const token = typeof window !== "undefined" ? localStorage.getItem("fp_token") : null;
                            const fd = new FormData();
                            fd.append("file", blob, `product-${Date.now()}.jpg`);
                            const res = await fetch("/api/upload", {
                                method: "POST",
                                headers: token ? { Authorization: `Bearer ${token}` } : {},
                                body: fd,
                            });
                            if (res.ok) {
                                const data = await res.json();
                                if (data.url) { callback(data.url); return; }
                            }
                        } catch { /* fall through to base64 */ }
                    }
                    callback(canvas.toDataURL("image/jpeg", 0.6));
                }, "image/jpeg", 0.6);
            };
            img.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
    };

    // Uploads any media file: images go through canvas compression, videos upload
    // directly to Vercel Blob via a client-side token (no function body-size limit).
    const uploadMedia = async (file: File, onDone: (url: string) => void) => {
        if (file.type.startsWith("video/")) {
            try {
                const token = typeof window !== "undefined" ? localStorage.getItem("fp_token") : null;
                const ext = file.name.split(".").pop() || "mp4";
                const filename = `product-videos/${Date.now()}.${ext}`;
                const blob = await upload(filename, file, {
                    access: "public",
                    handleUploadUrl: "/api/upload",
                    clientPayload: token || undefined,
                    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                });
                onDone(blob.url);
            } catch (err: any) {
                alert(`Video upload failed: ${err?.message || "Unknown error"}. Try a smaller file or use a video URL instead.`);
            }
        } else {
            compressImage(file, onDone);
        }
    };

    const handleMainImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) uploadMedia(file, (url) => setFormData(prev => ({ ...prev, image_url: url })));
    };

    const handleGalleryImageUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            uploadMedia(file, (url) => {
                // Use functional updater to avoid stale closure — async callback must read latest state
                setFormData(prev => {
                    const newImages = [...prev.images];
                    newImages[index] = url;
                    return { ...prev, images: newImages };
                });
            });
        }
    };

    const handleGalleryUrlChange = (index: number, val: string) => {
        // Use functional updater to avoid overwriting concurrent changes
        setFormData(prev => {
            const newImages = [...prev.images];
            newImages[index] = val;
            return { ...prev, images: newImages };
        });
    };

    const addGallerySlot = () => {
        setFormData({ ...formData, images: [...formData.images, ""] });
    };

    const removeGallerySlot = (index: number) => {
        const newImages = formData.images.filter((_, i) => i !== index);
        setFormData({ ...formData, images: newImages.length ? newImages : [""] });
    };

    const handleBestPrice = async () => {
        if (!formData.name) {
            alert("Please enter a product name first.");
            return;
        }
        setIsCalculatingBestPrice(true);
        setErrorMsg(null);
        try {
            const res = await fetch('/api/gemini-price', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productName: formData.name, mode: 'analyze', category: formData.category })
            });
            
            if (res.ok) {
                const best = await res.json();
                const fairPrice = best.approxPrice;
                const otherPrice = Math.round(fairPrice * 1.15);
                
                setFormData(prev => ({
                    ...prev,
                    price: fairPrice.toLocaleString(),
                    original_price: otherPrice.toLocaleString(),
                    category: best.category?.toLowerCase() || prev.category,
                    subcategory: best.subcategory || prev.subcategory,
                    description: best.description || prev.description,
                    tags: best.tags || prev.tags,
                    specs: best.specs ? Object.entries(best.specs).map(([k, v]) => ({ key: k, value: String(v) })) : prev.specs
                }));

                // Auto-calculate deposit if enabled
                if (formData.isDepositByPct) {
                    const deposit = Math.round(fairPrice * (formData.financing_deposit_pct / 100));
                    setFormData(prev => ({ ...prev, financing_down_payment: deposit.toLocaleString() }));
                }
            } else {
                setErrorMsg("Could not calculate Best Price. Falling back to manual entry.");
                setIsPriceDiscoveryOpen(true);
            }
        } catch (error) {
            console.error("Best Price calculation failed", error);
            setIsPriceDiscoveryOpen(true);
        } finally {
            setIsCalculatingBestPrice(false);
        }
    };

    const handlePriceSelect = (suggestion: ProductSuggestion) => {
        const currentTaxonomy = DataSyncService.getTaxonomy();
        let mappedCat = formData.category;
        let mappedSub = suggestion.subcategory || formData.subcategory;

        if (suggestion.category) {
            const match = taxonomy.find(c => 
                c.name.toLowerCase() === suggestion.category.toLowerCase() ||
                suggestion.category.toLowerCase().includes(c.name.toLowerCase())
            );
            if (match) {
                mappedCat = match.name.toLowerCase();
                // Also try to map subcategory if possible
                if (mappedSub) {
                    const subMatch = match.subcategories?.find((s: any) => 
                        s.name.toLowerCase() === mappedSub.toLowerCase() ||
                        mappedSub.toLowerCase().includes(s.name.toLowerCase())
                    );
                    if (subMatch) mappedSub = subMatch.name;
                }
            }
        }

        setFormData(prev => ({
            ...prev,
            price: suggestion.approxPrice.toLocaleString(),
            category: mappedCat,
            subcategory: mappedSub,
            tags: suggestion.tags || prev.tags,
            description: suggestion.description || prev.description,
            specs: suggestion.specs 
                ? Object.entries(suggestion.specs).map(([k, v]) => ({ key: k, value: String(v) })) 
                : prev.specs,
            image_url: suggestion.image_url || prev.image_url
        }));

        setPriceAnalysis({
            marketAvg: Math.round(suggestion.approxPrice * 1.15),
            fairRangeLow: suggestion.approxPrice,
            status: "fair",
            demand: "High",
            salesProbability: "85%"
        });

        setIsPriceDiscoveryOpen(false);
    };

    const handleSave = async () => {
        if (!product) return;
        setIsSaving(true);
        
        // Yield to allow UI to show loading state immediately
        await new Promise(resolve => setTimeout(resolve, 50));

        const numericPrice = parseInt(formData.price.replace(/,/g, ""));

        const finalImageUrl = wrapInCDN(formData.image_url);
        const finalImages = formData.images.filter(url => url.trim() !== "").map(wrapInCDN);

        const updates = {
            name: formData.name,
            category: (formData.category || "electronics") as any,
            price: isNaN(numericPrice) ? 0 : numericPrice,
            original_price: formData.original_price ? parseInt(formData.original_price.replace(/,/g, "")) : undefined,
            external_url: formData.external_url,
            description: formData.description,
            subcategory: formData.subcategory,
            tags: formData.tags,
            colors: formData.colors.split(",").map(c => c.trim()).filter(Boolean),
            specs: formData.specs.reduce((acc, curr) => { if (curr.key) acc[curr.key] = curr.value; return acc; }, {} as Record<string, string>),
            image_url: finalImageUrl,
            images: finalImages,
            stock: parseInt(formData.stock) || 0,
            highlights: formData.highlights,
            financing_available: formData.financing_available,
            financing_down_payment: formData.financing_available ? parseInt(formData.financing_down_payment.replace(/\D/g, "")) || 0 : 0,
            financing_deposit_pct: formData.financing_available ? formData.financing_deposit_pct : undefined,
            variants: formData.variants.filter(v => v.name.trim() !== "").map((v, i) => ({
                id: product.variants?.[i]?.id || `var_${Date.now()}_${i}`,
                name: v.name.trim(),
                price: parseInt(v.price.replace(/,/g, "")) || 0,
                original_price: v.original_price ? parseInt(v.original_price.replace(/,/g, "")) : undefined,
                image_url: v.image_url ? wrapInCDN(v.image_url) : undefined,
                is_default: false
            }))
        };

        // 1. Update localStorage for immediate UI feedback
        await DataSyncService.updateProduct(product.id, updates);

        // 2. Await the DB write directly so the products list page sees fresh data
        // when we navigate to it (the background write from updateProduct races with
        // the list-page fetch and often loses, showing stale data).
        try {
            await fetch("/api/products", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...product, ...updates }),
            });
        } catch { /* non-critical: background write in updateProduct is still in flight */ }

        setIsSaving(false);
        setSaved(true);
        isFormDirtyRef.current = false; // Reset dirty flag after successful save
        setTimeout(() => {
            setSaved(false);
            router.push(`/seller/products?page=${returnPage}`);
        }, 1000);
    };

    if (!product) {
        return (
            <div className="max-w-3xl mx-auto py-20 text-center text-gray-400">
                <p className="text-lg font-medium">Product not found.</p>
                <Link href={`/seller/products?page=${returnPage}`} className="text-blue-600 text-sm mt-2 inline-block hover:underline">← Back to Products</Link>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto py-10 px-4 sm:px-6">
            {/* Back Navigation */}
            <Link href={`/seller/products?page=${returnPage}`} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-8 group">
                <ChevronLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
                Back to Products
            </Link>

            {/* Page Header */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4"
            >
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Edit Product</h1>
                    <p className="text-base text-gray-500 mt-2">Update your listing details, images, and pricing.</p>
                </div>
                <Button
                    variant="outline"
                    className="gap-2 border-gray-200 text-gray-600 hover:bg-gray-50 rounded-full text-sm font-semibold px-5 h-10"
                    onClick={handleAIGenerate}
                    disabled={isGenerating || !formData.name}
                >
                    <Sparkles className={`h-4 w-4 ${isGenerating ? "animate-spin" : ""}`} />
                    {isGenerating ? "Generating..." : "Auto-Fill with AI"}
                </Button>
            </motion.div>

            {/* Success Banner */}
            {saved && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 text-sm font-semibold text-emerald-700 bg-emerald-50 px-5 py-3.5 rounded-2xl border border-emerald-200 mb-8"
                >
                    <Check className="h-5 w-5" /> Changes saved successfully!
                </motion.div>
            )}

            {/* Error Banner */}
            {errorMsg && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-2 text-sm font-medium text-red-700 bg-red-50 px-5 py-3.5 rounded-2xl border border-red-200 mb-8"
                >
                    <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    <span className="flex-1">{errorMsg}</span>
                    <button onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-red-600 ml-2">
                        <X className="h-4 w-4" />
                    </button>
                </motion.div>
            )}

            {/* ─── Section 1: Product Image ─── */}
            <motion.section
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="bg-white rounded-2xl border border-gray-200/60 shadow-sm p-8 mb-6"
            >
                <h2 className="text-lg font-semibold text-gray-900 mb-1">Product Image</h2>
                <p className="text-sm text-gray-500 mb-6">Upload a main image or paste a URL. Supported formats: PNG, JPG, WebP.</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 items-start">
                    <ProductImageSlot 
                        url={formData.image_url} 
                        onUrlChange={(url) => { markDirty(); setFormData(prev => ({ ...prev, image_url: url })); }}
                        onFileSelect={handleMainImageUpload}
                        label="Main Image"
                    />
                    <div className="pt-2">
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-4 text-[10px] font-black uppercase tracking-wider border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700 rounded-xl gap-1.5 w-full mb-4"
                            onClick={async () => {
                                if (!formData.name) return;
                                setIsFetchingImage(true);
                                setErrorMsg(null);
                                try {
                                    const res = await fetch(`/api/product-image?q=${encodeURIComponent(formData.name + ' official product high resolution')}&category=${encodeURIComponent(formData.category || '')}`);
                                    if (res.ok) {
                                        const data = await res.json();
                                        if (data.imageUrl) {
                                            setFormData(prev => ({ ...prev, image_url: data.imageUrl }));
                                            if (data.imageUrls && Array.isArray(data.imageUrls)) {
                                                setFormData(prev => ({ ...prev, images: data.imageUrls.slice(0, 8) }));
                                            }
                                            return;
                                        }
                                    }
                                    const geminiRes = await fetch('/api/gemini-price', {
                                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ productName: formData.name, mode: 'analyze', category: formData.category })
                                    });
                                    if (geminiRes.ok) {
                                        const geminiData = await geminiRes.json();
                                        if (geminiData.image_url?.startsWith('http')) {
                                            setFormData(prev => ({ ...prev, image_url: geminiData.image_url }));
                                            return;
                                        }
                                    }
                                    setErrorMsg('Could not find an image. Try a more specific product name or upload manually.');
                                } catch {
                                    setErrorMsg('Image search failed. Check your internet connection.');
                                } finally { setIsFetchingImage(false); }
                            }}
                            disabled={isFetchingImage || !formData.name}
                        >
                            {isFetchingImage ? (<><Loader2 className="h-3 w-3 animate-spin" /> Searching...</>) : (<><Globe className="h-3 w-3" /> Get Image from Web</>)}
                        </Button>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Photo Guidelines</p>
                        <ul className="text-[11px] text-gray-500 space-y-2">
                            <li className="flex gap-2"><span>•</span> White background preferred for SEO</li>
                            <li className="flex gap-2"><span>•</span> Show the product from the front</li>
                            <li className="flex gap-2"><span>•</span> High resolution leads to 2x more sales</li>
                        </ul>
                    </div>
                </div>
            </motion.section>

            {/* ─── Section 2: Visual Gallery Images ─── */}
            <motion.section
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-2xl border border-gray-200/60 shadow-sm p-8 mb-6"
            >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">Visual Gallery</h2>
                        <p className="text-sm text-gray-500 mt-1">Upload photos or videos, or paste direct links. Add a still image + a product video — shoppers see the image and the video plays on hover.</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {formData.images.map((url, i) => (
                        <div key={i} className="relative group">
                            <ProductImageSlot
                                url={url}
                                onUrlChange={(newUrl) => {
                                    markDirty();
                                    const next = [...formData.images];
                                    next[i] = newUrl;
                                    setFormData(prev => ({ ...prev, images: next }));
                                }}
                                onFileSelect={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        markDirty();
                                        uploadMedia(file, (url) => {
                                            setFormData(prev => {
                                                const next = [...prev.images];
                                                next[i] = url;
                                                return { ...prev, images: next };
                                            });
                                        });
                                    }
                                }}
                                className="mb-0"
                            />
                            {formData.images.length > 1 && (
                                <button
                                    onClick={() => {
                                        markDirty();
                                        setFormData(prev => ({
                                            ...prev,
                                            images: prev.images.filter((_, idx) => idx !== i)
                                        }));
                                    }}
                                    className="absolute -top-1 -right-1 h-5 w-5 bg-white border border-gray-100 text-gray-400 hover:text-rose-500 rounded-full shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                >
                                    <X className="h-2.5 w-2.5" />
                                </button>
                            )}
                        </div>
                    ))}
                    {formData.images.length < 8 && (
                        <button
                            onClick={() => {
                                markDirty();
                                setFormData(prev => ({ ...prev, images: [...prev.images, ""] }));
                            }}
                            className="aspect-square w-full border border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-gray-400 hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50 transition-all"
                        >
                            <Plus className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </motion.section>

            {/* ─── Section 3: Product Details ─── */}
            <motion.section
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="bg-white rounded-2xl border border-gray-200/60 shadow-sm p-8 mb-6"
            >
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Product Details</h2>

                <div className="space-y-6">
                    {/* Product Name & Category */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Product Name</label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="rounded-xl h-12 text-base font-medium bg-gray-50 border-gray-200 focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Category</label>
                            <select
                                className="flex h-12 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none cursor-pointer text-gray-900"
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value, subcategory: "" })}
                            >
                                <option value="">Select Category</option>
                                {/* Admin-only tabs (Trending, Best-Selling, Price Drop) are curated by admins — hide from sellers */}
                                {taxonomy.filter(cat => !["trending", "best-selling", "best_selling", "price drop", "price-drop"].includes(cat.name.toLowerCase())).map(cat => (
                                    <option key={cat.id} value={cat.name.toLowerCase()}>{cat.name}</option>
                                ))}
                                {/* Fallback for legacy categories or missing ones (exclude admin-only) */}
                                {CATEGORIES.filter(c => !c.adminOnly && !taxonomy.some(db => db.name.toLowerCase() === c.value)).map(cat => (
                                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                                ))}
                                {/* Hardcoded check for the current value if it's not in the list (e.g. legacy ampersand categories) */}
                                {formData.category && !taxonomy.some(c => c.name.toLowerCase() === formData.category) && !CATEGORIES.some(c => c.value === formData.category) && (
                                    <option value={formData.category}>{formData.category.charAt(0).toUpperCase() + formData.category.slice(1)}</option>
                                )}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Subcategory</label>
                            <div className="relative">
                                <select 
                                    className="flex h-12 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none cursor-pointer text-gray-900"
                                    value={formData.subcategory}
                                    onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                                >
                                    <option value="">Select Subcategory</option>
                                    {taxonomy.find(c => c.name.toLowerCase() === formData.category.toLowerCase())?.subcategories.map((sub: any) => (
                                        <option key={sub.id} value={sub.name}>{sub.name}</option>
                                    ))}
                                    {/* Legacy fallback */}
                                    {CATEGORIES.find(c => c.value === formData.category)?.subcategories.map(sub => (
                                        <option key={sub} value={sub}>{sub}</option>
                                    ))}
                                </select>
                                {formData.subcategory === "other_custom" && (
                                    <Input
                                        placeholder="Enter custom subcategory..."
                                        className="rounded-xl mt-3 h-11 bg-white border-blue-200"
                                        onBlur={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                                    />
                                )}
                            </div>
                        </div>
                        <div className="space-y-2 col-span-1 md:col-span-2">
                            <label className="text-sm font-medium text-gray-700">Product Tags (SEO)</label>
                            <TagsInput 
                                tags={formData.tags}
                                onChange={(tags) => setFormData({ ...formData, tags })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Colors (comma separated)</label>
                            <Input
                                placeholder="e.g. Space Black, Silver, Gold"
                                className="rounded-xl h-12 text-base font-medium bg-gray-50 border-gray-200 focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
                                value={formData.colors}
                                onChange={(e) => setFormData({ ...formData, colors: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Price & Stock — Side by side */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-gray-700">Price (₦)</label>
                                <button
                                    onClick={handleBestPrice}
                                    disabled={isCalculatingBestPrice}
                                    className="text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg px-3 py-1.5 transition-colors flex items-center gap-1.5 font-semibold"
                                >
                                    <Sparkles className={`h-3 w-3 ${isCalculatingBestPrice ? "animate-spin" : ""}`} />
                                    {isCalculatingBestPrice ? "Checking..." : "Best Price"}
                                </button>
                            </div>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-sm">₦</span>
                                <Input
                                    type="text"
                                    value={formData.price}
                                    onChange={handlePriceChange}
                                    className="rounded-xl pl-9 font-semibold h-12 text-base bg-gray-50 border-gray-200 focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
                                    placeholder="0"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 font-bold uppercase tracking-tight text-[10px] text-gray-400">Others' Price (₦) <span className="normal-case font-medium">— strikethrough</span></label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-sm">₦</span>
                                <Input
                                    type="text"
                                    value={formData.original_price}
                                    onChange={handleOriginalPriceChange}
                                    className="rounded-xl pl-9 font-medium h-12 text-base bg-gray-50 border-gray-200 focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 text-gray-400 line-through"
                                    placeholder="Competitor price"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Stock Quantity</label>
                            <Input
                                type="number"
                                value={formData.stock}
                                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                                className="rounded-xl h-12 text-base font-medium bg-gray-50 border-gray-200 focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
                                placeholder="0"
                            />
                        </div>
                    </div>

                    <div className="space-y-2 mb-6">
                        <label className="text-sm font-medium text-gray-700 font-bold uppercase tracking-tight text-[10px] text-gray-400">Source Product Link <span className="normal-case font-medium">— cheapest competing store</span></label>
                        <Input
                            placeholder="https://... (Alibaba, Jumia, Amazon, etc.)"
                            className="rounded-xl h-12 text-sm font-medium bg-gray-50 border-gray-200 focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
                            value={formData.external_url}
                            onChange={(e) => setFormData({ ...formData, external_url: e.target.value })}
                        />
                        {formData.external_url && (
                            <p className="text-[10px] text-blue-500 mt-1 truncate px-1">Source: {formData.external_url}</p>
                        )}
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Description</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows={5}
                            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 font-normal transition-all leading-relaxed"
                            placeholder="Describe your product in detail..."
                        />
                    </div>
                </div>
            </motion.section>

            {/* ─── Section 4: Specifications ─── */}
            <motion.section
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18 }}
                className="bg-white rounded-2xl border border-gray-200/60 shadow-sm p-8 mb-6"
            >
                <h2 className="text-lg font-semibold text-gray-900 mb-1">Specifications</h2>
                <p className="text-sm text-gray-500 mb-6">Add technical specs for detail-oriented buyers.</p>
                <div className="space-y-3">
                    {formData.specs.map((spec, index) => (
                        <div key={index} className="flex gap-3 group">
                            <Input
                                placeholder="Key (e.g. RAM)"
                                className="flex-1 bg-gray-50 border-gray-200 rounded-xl h-11 text-sm focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
                                value={spec.key}
                                onChange={(e) => handleSpecChange(index, "key", e.target.value)}
                            />
                            <Input
                                placeholder="Value (e.g. 16GB)"
                                className="flex-[2] bg-gray-50 border-gray-200 rounded-xl h-11 text-sm focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
                                value={spec.value}
                                onChange={(e) => handleSpecChange(index, "value", e.target.value)}
                            />
                            <Button size="icon" variant="ghost" className="h-11 w-11 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl" onClick={() => removeSpec(index)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full border border-dashed border-gray-200 text-gray-500 hover:text-blue-600 hover:bg-blue-50/50 h-11 rounded-xl text-xs font-semibold mt-2 transition-colors"
                        onClick={addSpec}
                    >
                        <Plus className="h-3 w-3 mr-2" /> Add Specification
                    </Button>
                </div>
            </motion.section>
            
            {/* ─── Section 4.5: Variants & Bundles ─── */}
            <motion.section
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.185 }}
                className="bg-white rounded-2xl border border-gray-200/60 shadow-sm p-8 mb-6"
            >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">Variants & Bundles <span className="text-xs ml-2 font-medium bg-indigo-50 text-indigo-600 px-2 py-1 rounded-full">Optional</span></h2>
                        <p className="text-sm text-gray-500 mt-1">Manage bundled options and product variants. Existing orders with older variants won't be affected.</p>
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                            markDirty();
                            setFormData(p => ({
                                ...p,
                                variants: [...p.variants, { name: "", price: "", image_url: "", original_price: "" }]
                            }));
                        }}
                        className="h-9 gap-1.5 text-sm"
                    >
                        <Plus className="h-4 w-4" /> Add Option
                    </Button>
                </div>

                {formData.variants.length > 0 ? (
                    <div className="space-y-4">
                        {formData.variants.map((variant, index) => (
                            <div key={index} className="grid grid-cols-1 md:grid-cols-[120px_1fr] gap-4 items-start p-4 bg-gray-50/50 rounded-xl border border-gray-100 relative group">
                                <button
                                    type="button"
                                    onClick={() => {
                                        markDirty();
                                        setFormData(p => ({
                                            ...p,
                                            variants: p.variants.filter((_, i) => i !== index)
                                        }));
                                    }}
                                    className="absolute -top-2 -right-2 h-6 w-6 bg-white border border-gray-200 text-gray-400 hover:text-rose-500 rounded-full shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                >
                                    <X className="h-3 w-3" />
                                </button>

                                {/* Variant Image */}
                                <div className="w-[120px] shrink-0">
                                    <ProductImageSlot
                                        url={variant.image_url}
                                        onUrlChange={(newUrl) => {
                                            markDirty();
                                            const next = [...formData.variants];
                                            next[index].image_url = newUrl;
                                            setFormData(p => ({ ...p, variants: next }));
                                        }}
                                        onFileSelect={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                markDirty();
                                                uploadMedia(file, (url) => {
                                                    setFormData(p => {
                                                        const next = [...p.variants];
                                                        next[index] = { ...next[index], image_url: url };
                                                        return { ...p, variants: next };
                                                    });
                                                });
                                            }
                                        }}
                                        className="mb-0 w-full rounded-lg"
                                        hideInput={true}
                                    />
                                </div>

                                {/* Variant Details */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                                    <div className="space-y-1.5 sm:col-span-2">
                                        <label className="text-xs font-medium text-gray-600">Option Name</label>
                                        <Input
                                            placeholder='e.g., "RIVER 3 Plus + Solar Panel"'
                                            value={variant.name}
                                            onChange={(e) => {
                                                markDirty();
                                                const next = [...formData.variants];
                                                next[index].name = e.target.value;
                                                setFormData(p => ({ ...p, variants: next }));
                                            }}
                                            className="h-10 text-sm bg-white border-gray-200"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-gray-600">Price (₦)</label>
                                        <Input
                                            placeholder="0"
                                            value={variant.price}
                                            onChange={(e) => {
                                                markDirty();
                                                const next = [...formData.variants];
                                                next[index].price = e.target.value.replace(/\D/g, "");
                                                setFormData(p => ({ ...p, variants: next }));
                                            }}
                                            className="h-10 text-sm bg-white border-gray-200"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-gray-600">Original Price (₦)</label>
                                        <Input
                                            placeholder="Optional"
                                            value={variant.original_price}
                                            onChange={(e) => {
                                                markDirty();
                                                const next = [...formData.variants];
                                                next[index].original_price = e.target.value.replace(/\D/g, "");
                                                setFormData(p => ({ ...p, variants: next }));
                                            }}
                                            className="h-10 text-sm bg-white border-gray-200 text-gray-500"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-6 bg-gray-50 border border-dashed border-gray-200 rounded-xl">
                        <Package className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-500 font-medium">No variants added to this product</p>
                    </div>
                )}
            </motion.section>
            
            {/* ─── Section 5: Financing & Ownership ─── */}
            <motion.section
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.19 }}
                className="bg-white rounded-2xl border border-gray-200/60 shadow-sm p-8 mb-6 overflow-hidden relative"
            >
                <div className="absolute top-0 right-0 p-8 opacity-5">
                    <ShieldCheck className="h-24 w-24 text-blue-600" />
                </div>
                
                <div className="flex items-center gap-3 mb-1">
                    <div className="bg-blue-50 p-2 rounded-lg">
                        <ShieldCheck className="h-5 w-5 text-blue-600" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900">Financing & Ownership</h2>
                </div>
                <p className="text-sm text-gray-500 mb-8 ml-10">Control how customers pay for this product. High-value items benefit from flexible payment plans.</p>

                <div className="ml-10 space-y-6">
                    <div className="flex items-center justify-between p-4 bg-gray-50/50 rounded-2xl border border-gray-100 hover:border-blue-200 transition-colors cursor-pointer group"
                        onClick={() => {
                            const currentPrice = parseInt(formData.price.replace(/,/g, ""));
                            if (!formData.financing_available && !isPremium && (isNaN(currentPrice) || currentPrice < minFinancingPrice)) {
                                if (confirm(`Product price must be at least ₦${minFinancingPrice.toLocaleString()} to enable financing. Upgrade to a premium plan to bypass this limit. Click OK to view plans.`)) {
                                    router.push("/seller/settings/billing");
                                }
                                return;
                            }
                            setFormData(prev => ({ ...prev, financing_available: !prev.financing_available }));
                        }}
                    >
                        <div className="space-y-1">
                            <h3 className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors">Enable Buy Now, Pay Later (BNPL)</h3>
                            <p className="text-xs text-gray-500">Allow customers to pay in monthly installments (3, 6, 12, or 24 months). <br/><span className="text-[10px] text-gray-400 font-semibold italic mt-1 inline-block">Note: Products must be above ₦{minFinancingPrice.toLocaleString()} unless you are on a premium plan.</span></p>
                        </div>
                        <div className={`w-12 h-6 rounded-full transition-colors relative ${formData.financing_available ? 'bg-blue-600' : 'bg-gray-200'}`}>
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.financing_available ? 'left-7' : 'left-1 shadow-sm'}`} />
                        </div>
                    </div>
                    
                    {formData.financing_available && (
                        <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="bg-blue-50/30 rounded-2xl border border-blue-100/50 overflow-hidden"
                        >
                            <div className="p-5 space-y-4">
                                <div className="flex items-center gap-2 text-blue-700">
                                    <Check className="h-4 w-4" />
                                    <span className="text-xs font-bold uppercase tracking-wider">Granular Financing Terms</span>
                                </div>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between pl-1">
                                            <label className="text-[10px] font-black uppercase text-blue-600 tracking-widest">Deposit Amount (₦)</label>
                                            <button 
                                                onClick={() => setFormData(p => ({ ...p, isDepositByPct: !p.isDepositByPct }))}
                                                className="text-[10px] font-bold text-blue-400 hover:text-blue-600 transition-colors"
                                            >
                                                {formData.isDepositByPct ? "Switch to Manual Amount" : "Switch to Percentage"}
                                            </button>
                                        </div>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400 font-bold text-sm">₦</span>
                                            <Input
                                                type="text"
                                                value={formData.financing_down_payment}
                                                disabled={formData.isDepositByPct}
                                                onChange={(e) => {
                                                    const rawValue = e.target.value.replace(/\D/g, "");
                                                    const formatted = rawValue ? parseInt(rawValue).toLocaleString() : "";
                                                    const price = parseInt(formData.price.replace(/,/g, "")) || 0;
                                                    
                                                    setFormData(p => ({ 
                                                        ...p, 
                                                        financing_down_payment: formatted,
                                                        financing_deposit_pct: price > 0 ? Math.round((parseInt(rawValue) / price) * 100) : p.financing_deposit_pct
                                                    }));
                                                }}
                                                className={`rounded-xl pl-9 font-bold h-11 text-sm bg-white border-blue-100 focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 text-blue-900 ${formData.isDepositByPct ? 'opacity-50' : ''}`}
                                                placeholder="e.g. 50,000"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-blue-600 tracking-widest pl-1">Deposit Percentage (%)</label>
                                        <div className="relative">
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-400 font-bold text-sm">%</span>
                                            <Input
                                                type="number"
                                                value={formData.financing_deposit_pct}
                                                onChange={(e) => {
                                                    const pct = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                                                    const price = parseInt(formData.price.replace(/,/g, "")) || 0;
                                                    const amount = Math.round(price * (pct / 100));
                                                    
                                                    setFormData(p => ({ 
                                                        ...p, 
                                                        financing_deposit_pct: pct,
                                                        financing_down_payment: amount.toLocaleString(),
                                                        isDepositByPct: true
                                                    }));
                                                }}
                                                className="rounded-xl pr-9 font-bold h-11 text-sm bg-white border-blue-100 focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 text-blue-900"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <p className="text-[10px] text-blue-500/70 font-medium leading-relaxed mt-1.5 px-1">
                                    The upfront cost a buyer pays. {formData.isDepositByPct ? `Currently set to ${formData.financing_deposit_pct}% of the product price.` : "Adjust either the amount or percentage to update both."}
                                </p>
                            </div>
                        </motion.div>
                    )}
                </div>
            </motion.section>

            {/* ─── Section 5: Vehicle Identity (Conditional) ─── */}
            {formData.category === "vehicles" && (
                <motion.section
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.19 }}
                    className="bg-gradient-to-br from-amber-50/40 to-orange-50/40 rounded-2xl border border-amber-100 shadow-sm p-8 mb-6"
                >
                    <div className="flex items-center gap-2 mb-1">
                        <Check className="h-4 w-4 text-amber-600" />
                        <h2 className="text-lg font-bold text-gray-900 leading-tight">Vehicle Identity & History</h2>
                    </div>
                    <p className="text-xs text-amber-700 font-medium mb-6 uppercase tracking-wider">Required for Loan Approval & FairPrice Inspection</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-700 uppercase tracking-widest pl-1">Mileage (km)</label>
                            <Input
                                type="number"
                                placeholder="e.g. 45000"
                                className="h-11 bg-white border-amber-100 rounded-xl font-bold"
                                value={formData.specs.find(s => s.key.toLowerCase() === "mileage")?.value || ""}
                                onChange={(e) => {
                                    const index = formData.specs.findIndex(s => s.key.toLowerCase() === "mileage");
                                    if (index >= 0) handleSpecChange(index, "value", e.target.value);
                                    else setFormData(prev => ({ ...prev, specs: [...prev.specs, { key: "Mileage", value: e.target.value }] }));
                                }}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-700 uppercase tracking-widest pl-1">Transmission</label>
                            <select
                                className="flex h-11 w-full rounded-xl border border-amber-100 bg-white px-4 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/10 focus:border-amber-500 transition-all appearance-none cursor-pointer"
                                value={formData.specs.find(s => s.key.toLowerCase() === "transmission")?.value || ""}
                                onChange={(e) => {
                                    const index = formData.specs.findIndex(s => s.key.toLowerCase() === "transmission");
                                    if (index >= 0) handleSpecChange(index, "value", e.target.value);
                                    else setFormData(prev => ({ ...prev, specs: [...prev.specs, { key: "Transmission", value: e.target.value }] }));
                                }}
                            >
                                <option value="">Select</option>
                                <option value="Automatic">Automatic</option>
                                <option value="Manual">Manual</option>
                                <option value="CVT">CVT</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-700 uppercase tracking-widest pl-1">Fuel Type</label>
                            <select
                                className="flex h-11 w-full rounded-xl border border-amber-100 bg-white px-4 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/10 focus:border-amber-500 transition-all appearance-none cursor-pointer"
                                value={formData.specs.find(s => s.key.toLowerCase() === "fuel type")?.value || ""}
                                onChange={(e) => {
                                    const index = formData.specs.findIndex(s => s.key.toLowerCase() === "fuel type");
                                    if (index >= 0) handleSpecChange(index, "value", e.target.value);
                                    else setFormData(prev => ({ ...prev, specs: [...prev.specs, { key: "Fuel Type", value: e.target.value }] }));
                                }}
                            >
                                <option value="">Select</option>
                                <option value="Petrol">Petrol</option>
                                <option value="Diesel">Diesel</option>
                                <option value="Electric">Electric</option>
                                <option value="Hybrid">Hybrid</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-700 uppercase tracking-widest pl-1">Accident History</label>
                            <select
                                className="flex h-11 w-full rounded-xl border border-amber-100 bg-white px-4 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/10 focus:border-amber-500 transition-all appearance-none cursor-pointer"
                                value={formData.specs.find(s => s.key.toLowerCase() === "accident history")?.value || ""}
                                onChange={(e) => {
                                    const index = formData.specs.findIndex(s => s.key.toLowerCase() === "accident history");
                                    if (index >= 0) handleSpecChange(index, "value", e.target.value);
                                    else setFormData(prev => ({ ...prev, specs: [...prev.specs, { key: "Accident History", value: e.target.value }] }));
                                }}
                            >
                                <option value="None">None / Clean</option>
                                <option value="Minor">Minor (Scratches/Dents)</option>
                                <option value="Moderate">Moderate Repairs</option>
                                <option value="Significant">Significant (Salvage/Restored)</option>
                            </select>
                        </div>
                    </div>
                </motion.section>
            )}

            {/* ─── Sticky Save Bar ─── */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="sticky bottom-6 bg-white/90 backdrop-blur-xl rounded-2xl border border-gray-200/60 shadow-lg p-4 flex items-center justify-between"
            >
                <Link href="/seller/products">
                    <Button variant="ghost" className="rounded-xl font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100 h-11 px-5">
                        Cancel
                    </Button>
                </Link>
                <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-semibold shadow-sm h-11 px-7 text-sm transition-all hover:shadow-md"
                >
                    {isSaving ? (
                        <span className="flex items-center gap-2">
                            <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Saving...
                        </span>
                    ) : (
                        <span className="flex items-center gap-2">
                            <Save className="h-4 w-4" />
                            Save Changes
                        </span>
                    )}
                </Button>
            </motion.div>

            <PriceDiscoveryModal
                isOpen={isPriceDiscoveryOpen}
                onClose={() => setIsPriceDiscoveryOpen(false)}
                productName={formData.name}
                onSelect={handlePriceSelect}
            />
        </div>
    );
}

export default function EditProduct() {
    return (
        <Suspense fallback={
            <div className="max-w-3xl mx-auto py-20 text-center text-gray-400">
                <div className="h-6 w-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin mx-auto mb-4" />
                <p className="text-sm font-medium">Loading product editor...</p>
            </div>
        }>
            <EditProductContent />
        </Suspense>
    );
}
