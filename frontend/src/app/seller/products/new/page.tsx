"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Check, ChevronLeft, Plus, X, Save, TrendingUp, Info, Upload, ImagePlus, Trash2, Globe, Loader2, Package } from "lucide-react";
import { formatPrice, wrapInCDN, getProxiedImageUrl } from "@/lib/utils";
import Link from "next/link";
import { motion, Reorder } from "framer-motion";
import { DataSyncService } from "@/lib/sync-store";
import { useRouter, useSearchParams } from "next/navigation";
import { CATEGORIES } from "@/lib/types";
import { PriceDiscoveryModal } from "@/components/modals/PriceDiscoveryModal";
import { ProductSuggestion } from "@/lib/price-engine";
import { ProductImageSlot, TagsInput, formatPriceWithCommas } from "@/components/product/ProductFormComponents";
import { upload } from "@vercel/blob/client";

function NewProductContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    // Set by /sell when it auto-drafted a seller record for someone who
    // wasn't a seller yet — the product gets created first, then this
    // sends them to finish onboarding (bank details, KYC) instead of the
    // normal product-list redirect, since a draft-status seller isn't
    // actually able to receive payouts yet.
    const isQuickSell = searchParams.get("quickSell") === "1";
    const fileInputRef = useRef<HTMLInputElement>(null);
    const galleryFileRefs = useRef<Map<number, HTMLInputElement>>(new Map());

    const [formData, setFormData] = useState({
        name: "",
        category: "",
        subcategory: "",
        tags: [] as string[],
        price: "",
        stock: "1",
        description: "",
        highlights: [] as string[],
        specs: [] as { key: string; value: string }[],
        colors: "",
        image_url: "",
        images: [""],
        original_price: "",
        external_url: "",
        financing_available: false,
        financing_config: { enabled: false, deposit_percent: 0.15, interest_rate_pa: 0.25, max_tenor_months: 12 },
        contact_info: { show: false, phone: "", whatsapp: "" },
        variants: [] as { name: string; price: string; image_url: string; original_price: string }[],
        // Defaults to requiring delivery details (normal shipping checkout). Turning
        // this off is for in-person/consumable items (food, drinks) where a customer
        // just needs to pay — same fast checkout QR/payment links already use.
        require_delivery_details: true,
    });

    const [savedNumbers, setSavedNumbers] = useState<string[]>([]);
    const [minFinancingPrice, setMinFinancingPrice] = useState(300000);
    const [isPremium, setIsPremium] = useState(false);

    // Stable per-slot drag keys for the gallery reorder UI — formData.images is a plain
    // string[] (URLs can repeat, e.g. multiple empty "" slots while uploading), which
    // framer-motion's Reorder needs a unique `value` per item to track correctly. Kept in
    // sync with formData.images.length by whichever handler adds/removes/bulk-replaces it.
    const imageKeyCounter = useRef(0);
    const [imageKeys, setImageKeys] = useState<string[]>(() => formData.images.map(() => `img-${imageKeyCounter.current++}`));
    useEffect(() => {
        setImageKeys(prev => {
            if (prev.length === formData.images.length) return prev;
            if (prev.length < formData.images.length) {
                const added = Array.from({ length: formData.images.length - prev.length }, () => `img-${imageKeyCounter.current++}`);
                return [...prev, ...added];
            }
            return prev.slice(0, formData.images.length);
        });
    }, [formData.images.length]);

    const handleReorderImageKeys = (newKeys: string[]) => {
        const reordered = newKeys.map(k => formData.images[imageKeys.indexOf(k)]);
        setImageKeys(newKeys);
        setFormData(prev => ({ ...prev, images: reordered }));
    };

    useEffect(() => {
        try {
            const adminSettings = JSON.parse(localStorage.getItem('fp_admin_settings') || '{}');
            if (adminSettings.minFinancingPrice) setMinFinancingPrice(Number(adminSettings.minFinancingPrice));
        } catch {}

        try {
            const seller = DataSyncService.getCurrentSeller();
            if (seller && ['Pro', 'Plus', 'Growth', 'Scale'].includes(seller.subscription_plan || '')) {
                setIsPremium(true);
            }
            const user = DataSyncService.getCurrentUser();
            const numbers = new Set<string>();
            // phone_numbers could be a string in legacy data — guard with Array.isArray
            if (Array.isArray(seller?.phone_numbers)) seller.phone_numbers.forEach((n: string) => numbers.add(n));
            if (seller?.phone_number) numbers.add(seller.phone_number);
            if (user?.phone) numbers.add(user.phone);
            if (Array.isArray(user?.phone_numbers)) user.phone_numbers.forEach((n: string) => numbers.add(n));
            setSavedNumbers(Array.from(numbers).filter(Boolean));

            if (numbers.size > 0 && !formData.contact_info.phone) {
                const defaultNum = Array.from(numbers)[0];
                setFormData(prev => ({
                    ...prev,
                    contact_info: { ...prev.contact_info, phone: defaultNum, whatsapp: defaultNum }
                }));
            }
        } catch (err) {
            console.warn("NewProduct: seller/user data load error", err);
        }
    }, []);

    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isCalculatingBestPrice, setIsCalculatingBestPrice] = useState(false);
    const [isPriceDiscoveryOpen, setIsPriceDiscoveryOpen] = useState(false);
    const [priceAnalysis, setPriceAnalysis] = useState<any>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isFetchingImage, setIsFetchingImage] = useState(false);
    const [taxonomy, setTaxonomy] = useState<any[]>([]);
    const [aiErrorMsg, setAiErrorMsg] = useState<string | null>(null);

    // 1. Load Initial Data & Listen for Updates
    useEffect(() => {
        const loadTaxonomy = () => {
            const current = DataSyncService.getTaxonomy();
            setTaxonomy(current);
        };
        loadTaxonomy();
        window.addEventListener("sync-store-update", loadTaxonomy);
        return () => window.removeEventListener("sync-store-update", loadTaxonomy);
    }, []);

    // Dynamic price status update
    useEffect(() => {
        if (!formData.price || isNaN(parseInt(formData.price.replace(/,/g, ""))) || !priceAnalysis) return;
        const priceNum = parseInt(formData.price.replace(/,/g, ""));
        const marketAvg = priceAnalysis.marketAvg;
        let status = "fair";
        if (priceNum > marketAvg * 1.1) status = "overpriced";
        else if (priceNum < marketAvg * 0.8) status = "too_low";
        let salesProbability = status === "overpriced" ? "30%" : status === "too_low" ? "50%" : "85%";
        if (priceAnalysis.status !== status || priceAnalysis.salesProbability !== salesProbability) {
            setPriceAnalysis((prev: any) => ({ ...prev, status, salesProbability }));
        }
    }, [formData.price, priceAnalysis?.marketAvg]);

    // --- AI Content Generation ---
    const handleAIGenerate = async () => {
        if (!formData.name) {
            setAiErrorMsg("Enter a product name first so AI knows what to fill in.");
            return;
        }
        setIsGenerating(true);
        setAiErrorMsg(null);
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
                if (!inferredCategory) {
                    const nameLower = formData.name.toLowerCase();
                    for (const cat of taxonomy) {
                        if (nameLower.includes(cat.name.toLowerCase())) {
                            inferredCategory = cat.name.toLowerCase();
                            break;
                        }
                    }
                }

                setFormData(prev => ({
                    ...prev,
                    category: inferredCategory || prev.category,
                    description: content.description || prev.description,
                    highlights: content.highlights || prev.highlights,
                    specs: content.specs ? Object.entries(content.specs).map(([key, value]) => ({ key, value: String(value) })) : prev.specs,
                    subcategory: content.subcategory || prev.subcategory,
                    tags: content.tags || prev.tags,
                    colors: content.colors ? content.colors.join(", ") : prev.colors
                }));
            } else {
                const errData = await res.json().catch(() => ({}));
                setAiErrorMsg(errData.error || `AI Auto-Fill failed (${res.status}). Check that GEMINI_API_KEY is set in Vercel.`);
            }
        } catch (error) {
            console.error("AI Generation failed", error);
            setAiErrorMsg("AI Auto-Fill request failed. Check your internet connection.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleBestPrice = async () => {
        if (!formData.name) {
            setAiErrorMsg("Please enter a product name first.");
            return;
        }
        setIsCalculatingBestPrice(true);
        setAiErrorMsg(null);
        try {
            const currentPrice = parseInt(formData.price.replace(/,/g, "")) || 0;
            const res = await fetch("/api/gemini-price", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    productName: formData.name,
                    mode: "analyze",
                    anchorPrice: currentPrice || undefined,
                    category: formData.category
                })
            });

            if (res.ok) {
                const data = await res.json();
                if (data.recommendedPrice) {
                    const recommended = data.recommendedPrice;
                    const marketAvg = data.marketAverage || Math.round(recommended * 1.15);

                    // Map category from response
                    let mappedCat = formData.category;
                    let mappedSub = data.subcategory || formData.subcategory;
                    if (data.category) {
                        const match = taxonomy.find((c: any) =>
                            c.name.toLowerCase() === data.category.toLowerCase() ||
                            data.category.toLowerCase().includes(c.name.toLowerCase())
                        );
                        if (match) {
                            mappedCat = match.name.toLowerCase();
                            if (mappedSub) {
                                const subMatch = match.subcategories?.find((s: any) =>
                                    s.name.toLowerCase() === mappedSub.toLowerCase() ||
                                    mappedSub.toLowerCase().includes(s.name.toLowerCase())
                                );
                                if (subMatch) mappedSub = subMatch.name;
                            }
                        } else {
                            mappedCat = data.category.toLowerCase();
                        }
                    }

                    setFormData(prev => ({
                        ...prev,
                        price: recommended.toLocaleString(),
                        original_price: marketAvg.toLocaleString(),
                        category: mappedCat,
                        subcategory: mappedSub,
                        ...(data.tags?.length ? { tags: data.tags } : {})
                    }));

                    setPriceAnalysis({
                        marketAvg,
                        fairRangeLow: recommended,
                        status: "fair",
                        demand: "High",
                        salesProbability: "85%"
                    });
                } else {
                    setAiErrorMsg("Best Price returned no data. Try a more specific product name.");
                }
            } else {
                const errData = await res.json().catch(() => ({}));
                setAiErrorMsg(errData.error || `Best Price failed (${res.status}). Please try again.`);
            }
        } catch (error) {
            console.error("Best price calculation failed", error);
            setAiErrorMsg("Best Price request failed. Check your connection.");
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

    const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newPriceFormatted = formatPriceWithCommas(e.target.value);
        const numericPrice = parseInt(newPriceFormatted.replace(/,/g, ""));
        
        setFormData(prev => {
            const next = { ...prev, price: newPriceFormatted };
            // Auto-disable financing if price falls below min limit
            if (prev.financing_available && !isPremium && !isNaN(numericPrice) && numericPrice < minFinancingPrice) {
                next.financing_available = false;
            }
            return next;
        });
    };

    const handleOriginalPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, original_price: formatPriceWithCommas(e.target.value) }));
    };

    // --- Form Handlers ---
    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
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
                setFormData(prev => {
                    const newImages = [...prev.images];
                    newImages[index] = url;
                    return { ...prev, images: newImages };
                });
            });
        }
    };

    const handleGalleryUrlChange = (index: number, val: string) => {
        const newImages = [...formData.images];
        newImages[index] = val;
        setFormData(prev => ({ ...prev, images: newImages }));
    };

    const addGallerySlot = () => setFormData(prev => ({ ...prev, images: [...prev.images, ""] }));
    const removeGallerySlot = (index: number) => {
        const newImages = formData.images.filter((_, i) => i !== index);
        setFormData(prev => ({ ...prev, images: newImages.length ? newImages : [""] }));
    };

    const handleSubmit = async () => {
        const sellerId = DataSyncService.getCurrentSellerId();
        if (!sellerId || !formData.name || !formData.price || isSubmitting) return;

        setIsSubmitting(true);
        
        // Yield to allow UI to show loading state immediately
        await new Promise(resolve => setTimeout(resolve, 50));
        try {
            const generateSlug = (name: string) => {
                const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
                const randomSuffix = Math.random().toString(36).substring(2, 8);
                return `${baseSlug}-${randomSuffix}`;
            };

        const numericPrice = parseInt(formData.price.replace(/,/g, ""));


            const finalImageUrl = wrapInCDN(formData.image_url) || "/placeholder.png";
            const finalImages = formData.images.filter(url => url.trim() !== "").map(wrapInCDN);

            const currentSeller = DataSyncService.getCurrentSeller();
            const sellerLocation = currentSeller?.city && currentSeller?.state ? `${currentSeller.city}, ${currentSeller.state}` : currentSeller?.location || currentSeller?.street_address;
            
            let finalProductName = formData.name;
            if ((formData.category === 'cars' || formData.category === 'vehicles') && sellerLocation && !finalProductName.toLowerCase().includes(' in ')) {
                finalProductName = `${finalProductName} in ${sellerLocation}`;
            }

            const newProduct = {
                id: generateSlug(finalProductName),
                seller_id: sellerId,
                seller_name: currentSeller?.business_name || "New Store",
                name: finalProductName,
                category: (formData.category || "electronics") as any,
                price: isNaN(numericPrice) ? 0 : numericPrice,
                original_price: formData.original_price ? parseInt(formData.original_price.replace(/,/g, "")) : undefined,
                external_url: formData.external_url,
                original_price_flag: formData.original_price ? true : false,
                description: formData.description,
                subcategory: formData.subcategory,
                tags: formData.tags,
                colors: formData.colors.split(",").map(c => c.trim()).filter(Boolean),
                specs: formData.specs.reduce((acc, curr) => { if (curr.key) acc[curr.key] = curr.value; return acc; }, {} as Record<string, string>),
                image_url: finalImageUrl,
                images: finalImages,
                stock: parseInt(formData.stock) || 0,
                highlights: formData.highlights,
                price_flag: "fair" as const,
                avg_rating: 0,
                is_active: true,
                review_count: 0,
                sold_count: 0,
                created_at: new Date().toISOString(),
                financing_available: formData.financing_available,
                financing_config: { ...formData.financing_config, enabled: formData.financing_available },
                contact_info: formData.contact_info,
                variants: formData.variants.filter(v => v.name.trim() !== "").map((v, i) => ({
                    id: `var_${Date.now()}_${i}`,
                    name: v.name.trim(),
                    price: parseInt(v.price.replace(/,/g, "")) || 0,
                    original_price: v.original_price ? parseInt(v.original_price.replace(/,/g, "")) : undefined,
                    image_url: v.image_url ? wrapInCDN(v.image_url) : undefined,
                    is_default: false
                })),
                is_direct_payment: !formData.require_delivery_details,
            };

            // Save new numbers to seller profile for next time
            if (formData.contact_info.show && formData.contact_info.phone) {
                const currentSeller = DataSyncService.getCurrentSeller();
                if (currentSeller) {
                    const currentNumbers = currentSeller.phone_numbers || [];
                    const numbersToAdd = [];
                    if (formData.contact_info.phone && !currentNumbers.includes(formData.contact_info.phone)) {
                        numbersToAdd.push(formData.contact_info.phone);
                    }
                    if (formData.contact_info.whatsapp && !currentNumbers.includes(formData.contact_info.whatsapp)) {
                        numbersToAdd.push(formData.contact_info.whatsapp);
                    }
                    if (numbersToAdd.length > 0) {
                        DataSyncService.updateSeller(sellerId, {
                            phone_numbers: [...currentNumbers, ...numbersToAdd]
                        });
                    }
                }
            }

            await DataSyncService.addRawProduct(newProduct);

            // Track product listed
            if (typeof window !== "undefined" && (window as any).pendo) {
                (window as any).pendo.track("product_listed", {
                    product_name: finalProductName,
                    category: formData.category || "",
                    subcategory: formData.subcategory || "",
                    price: numericPrice || 0,
                    original_price: formData.original_price ? parseInt(formData.original_price.replace(/,/g, "")) : 0,
                    has_ai_description: !!formData.description && formData.description.length > 50,
                    image_count: finalImages.length,
                    has_variants: formData.variants.some(v => v.name.trim() !== ""),
                    has_financing: formData.financing_available,
                    has_specs: formData.specs.some(s => s.key.trim() !== ""),
                    stock_count: parseInt(formData.stock) || 0,
                });
            }

            if (isQuickSell) {
                // Product exists now, but this seller record was auto-drafted with no
                // bank/KYC info — send them to finish that instead of the product list,
                // carrying the new product id so onboarding can show "your product is
                // ready, just finish setup to publish it" rather than a blank flow.
                router.push(`/seller/onboarding?fromProduct=${encodeURIComponent(newProduct.id)}`);
            } else {
                router.push("/seller/products");
            }
        } catch (error) {
            console.error("Submission failed:", error);
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto py-10 px-4 sm:px-6">
            {/* Nav */}
            <Link href="/seller/products" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-8 group">
                <ChevronLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
                Back to Products
            </Link>

            {/* Header */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">New Listing</h1>
                    <p className="text-base text-gray-500 mt-2">Create a high-impact product listing with AI pricing guidance.</p>
                </div>
                <Button
                    variant="outline"
                    className="gap-2 border-gray-200 bg-green-600 text-white hover:bg-green-700 rounded-full text-sm font-semibold px-5 h-10"
                    onClick={handleAIGenerate}
                    disabled={isGenerating || !formData.name}
                >
                    <Sparkles className={`h-4 w-4 ${isGenerating ? "animate-spin" : ""}`} />
                    {isGenerating ? "Generating..." : "Auto-Fill with AI"}
                </Button>
            </motion.div>

            {aiErrorMsg && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-2 text-sm font-medium text-red-700 bg-red-50 px-5 py-3.5 rounded-2xl border border-red-200 mb-6">
                    <span className="flex-1">{aiErrorMsg}</span>
                    <button onClick={() => setAiErrorMsg(null)} className="text-red-400 hover:text-red-600 ml-2 shrink-0">✕</button>
                </motion.div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

                {/* ─── Left Column: Form ─── */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Section 1: Core Details — Name/AutoFill live in the header above, so
                        this must render first (both mobile and desktop) or a seller has to
                        scroll past two image sections just to type the name AutoFill needs. */}
                    <motion.section
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 }}
                        className="bg-white rounded-2xl border border-gray-200/60 shadow-sm p-8"
                    >
                        <h2 className="text-lg font-semibold text-gray-900 mb-6">Product Details</h2>
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Product Name</label>
                                    <Input
                                        placeholder="e.g. iPhone 15 Pro Max"
                                        className="rounded-xl h-12 text-base font-medium bg-gray-50 border-gray-200 focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
                                        value={formData.name}
                                        onChange={(e) => handleChange("name", e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Category</label>
                                    <select
                                        className="flex h-12 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none cursor-pointer text-gray-900"
                                        value={formData.category}
                                        onChange={(e) => handleChange("category", e.target.value)}
                                    >
                                        <option value="">Select Category</option>
                                        {/* Admin-only tabs (Trending, Best-Selling, Price Drop) are curated by admins — hide from sellers */}
                                        {taxonomy.filter(cat => !["trending", "best-selling", "best_selling", "price drop", "price-drop"].includes(cat.name.toLowerCase())).map(cat => (
                                            <option key={cat.id} value={cat.name.toLowerCase()}>{cat.name}</option>
                                        ))}
                                        {/* Fallback for hardcoded categories not in DB (exclude admin-only) */}
                                        {CATEGORIES.filter(c => !c.adminOnly && !taxonomy.some(db => db.name.toLowerCase() === c.value)).map(cat => (
                                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                                        ))}
                                        {/* Auto-select newly created custom category if it's in state but not in list yet */}
                                        {formData.category && !taxonomy.some(c => c.name.toLowerCase() === formData.category) && !CATEGORIES.some(c => c.value === formData.category) && (
                                            <option value={formData.category}>{formData.category.charAt(0).toUpperCase() + formData.category.slice(1)}</option>
                                        )}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Subcategory</label>
                                    <select
                                        className="flex h-12 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none cursor-pointer text-gray-900"
                                        value={formData.subcategory}
                                        onChange={(e) => handleChange("subcategory", e.target.value)}
                                    >
                                        <option value="">Select Subcategory</option>
                                        {taxonomy.find(c => c.name.toLowerCase() === formData.category.toLowerCase())?.children.map((sub: any) => (
                                            <option key={sub.id} value={sub.name}>{sub.name}</option>
                                        ))}
                                        {/* Fallback */}
                                        {CATEGORIES.find(c => c.value === formData.category)?.subcategories.map(sub => (
                                            <option key={sub} value={sub}>{sub}</option>
                                        ))}
                                    </select>
                                    {formData.subcategory === "other_custom" && (
                                        <Input
                                            placeholder="Enter custom subcategory..."
                                            className="rounded-xl mt-3 h-11 bg-white border-blue-200"
                                            onBlur={(e) => handleChange("subcategory", e.target.value)}
                                        />
                                    )}
                                </div>
                                <div className="space-y-2 col-span-1 md:col-span-2">
                                    <label className="text-sm font-medium text-gray-700">Product Tags (SEO)</label>
                                    <TagsInput
                                        tags={formData.tags}
                                        onChange={(tags) => handleChange("tags", tags)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Colors (comma separated)</label>
                                    <Input
                                        placeholder="e.g. Space Black, Silver, Gold"
                                        list="color-suggestions"
                                        className="rounded-xl h-12 text-base font-medium bg-gray-50 border-gray-200 focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
                                        value={formData.colors}
                                        onChange={(e) => handleChange("colors", e.target.value)}
                                    />
                                    <datalist id="color-suggestions">
                                        {DataSyncService.getUniqueColors().map(color => (
                                            <option key={color} value={color} />
                                        ))}
                                    </datalist>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Description</label>
                                <textarea
                                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 font-normal transition-all leading-relaxed min-h-[140px]"
                                    placeholder={isGenerating ? "AI is generating description..." : "Describe the key features and benefits..."}
                                    value={formData.description}
                                    onChange={(e) => handleChange("description", e.target.value)}
                                />
                            </div>
                            <label className="flex items-start gap-3 p-4 rounded-xl border border-gray-200 bg-gray-50 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.require_delivery_details}
                                    onChange={(e) => handleChange("require_delivery_details", e.target.checked)}
                                    className="mt-0.5 h-4 w-4 accent-brand-green-600"
                                />
                                <span>
                                    <span className="block text-sm font-medium text-gray-700">Require delivery details at checkout</span>
                                    <span className="block text-xs text-gray-500 mt-0.5">Turn off for in-person items (food, drinks) — checkout skips straight to payment, with delivery details folded away as optional in case the customer still wants it shipped.</span>
                                </span>
                            </label>
                        </div>
                    </motion.section>

                    {/* Section 2: Product Image */}
                    <motion.section
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-white rounded-2xl border border-gray-200/60 shadow-sm p-8"
                    >
                        <h2 className="text-lg font-semibold text-gray-900 mb-1">Product Image</h2>
                        <p className="text-sm text-gray-500 mb-6">Upload a main product photo or paste a URL.</p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 items-start">
                            <ProductImageSlot 
                                url={formData.image_url} 
                                onUrlChange={(url) => handleChange("image_url", url)}
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
                                        try {
                                            const res = await fetch(`/api/product-image?q=${encodeURIComponent(formData.name + ' official product high resolution')}`);
                                            if (res.ok) {
                                                const data = await res.json();
                                                if (data.imageUrl) {
                                                    handleChange('image_url', data.imageUrl);
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
                                                    handleChange('image_url', geminiData.image_url);
                                                    return;
                                                }
                                            }
                                            setAiErrorMsg('No image found. Try a more specific product name or upload manually.');
                                        } catch { setAiErrorMsg('Image search failed. Please try again.'); }
                                        finally { setIsFetchingImage(false); }
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

                    {/* Section 3: Visual Gallery Images */}
                    <motion.section
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-white rounded-2xl border border-gray-200/60 shadow-sm p-8"
                    >
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">Visual Gallery</h2>
                                <p className="text-sm text-gray-500 mt-1">Upload photos or videos, or paste direct links. Add a still image + a product video — shoppers see the image and the video plays on hover.</p>
                            </div>
                        </div>

                        {/* Single scrollable row, not a wrapping grid — see admin/products'
                            gallery for why: framer-motion's Reorder only compares position
                            along one axis, so a wrapping grid breaks drag-across-rows. */}
                        <Reorder.Group
                            as="div"
                            axis="x"
                            values={imageKeys}
                            onReorder={handleReorderImageKeys}
                            className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1"
                        >
                            {formData.images.map((url, i) => (
                                <Reorder.Item
                                    as="div"
                                    key={imageKeys[i]}
                                    value={imageKeys[i]}
                                    className="relative shrink-0 w-24 sm:w-28 cursor-grab active:cursor-grabbing"
                                >
                                    {i === 0 && (
                                        <span className="absolute -top-1 -left-1 z-10 bg-brand-green-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wide pointer-events-none">Main</span>
                                    )}
                                    <ProductImageSlot
                                        url={url}
                                        onUrlChange={(newUrl) => {
                                            const next = [...formData.images];
                                            next[i] = newUrl;
                                            setFormData(prev => ({ ...prev, images: next }));
                                        }}
                                        onFileSelect={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) uploadMedia(file, (url) => {
                                                setFormData(prev => {
                                                    const next = [...prev.images];
                                                    next[i] = url;
                                                    return { ...prev, images: next };
                                                });
                                            });
                                        }}
                                        className="mb-0"
                                    />
                                    {formData.images.length > 1 && (
                                        <button
                                            onClick={() => {
                                                setImageKeys(prev => prev.filter((_, idx) => idx !== i));
                                                setFormData(prev => ({
                                                    ...prev,
                                                    images: prev.images.filter((_, idx) => idx !== i)
                                                }));
                                            }}
                                            className="absolute -top-1 -right-1 h-6 w-6 bg-white border border-gray-200 text-gray-500 hover:text-rose-500 rounded-full shadow-md flex items-center justify-center z-10"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    )}
                                </Reorder.Item>
                            ))}
                            {formData.images.length < 8 && (
                                <button
                                    onClick={() => setFormData(prev => ({ ...prev, images: [...prev.images, ""] }))}
                                    className="aspect-square shrink-0 w-24 sm:w-28 border border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-gray-400 hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50 transition-all"
                                >
                                    <Plus className="h-4 w-4" />
                                </button>
                            )}
                        </Reorder.Group>
                    </motion.section>
                    {/* Section 4: Specifications */}
                    <motion.section
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-white rounded-2xl border border-gray-200/60 shadow-sm p-8"
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

                    {/* Section 4.5: Variants & Bundles */}
                    <motion.section
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-white rounded-2xl border border-gray-200/60 shadow-sm p-8"
                    >
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">Variants & Bundles <span className="text-xs ml-2 font-medium bg-indigo-50 text-indigo-600 px-2 py-1 rounded-full">Optional</span></h2>
                                <p className="text-sm text-gray-500 mt-1">Add options like "Solar Panel Included" or different models. These will be selectable on the product page.</p>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setFormData(p => ({
                                    ...p,
                                    variants: [...p.variants, { name: "", price: "", image_url: "", original_price: "" }]
                                }))}
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
                                            onClick={() => setFormData(p => ({
                                                ...p,
                                                variants: p.variants.filter((_, i) => i !== index)
                                            }))}
                                            className="absolute -top-2 -right-2 h-6 w-6 bg-white border border-gray-200 text-gray-400 hover:text-rose-500 rounded-full shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>

                                        {/* Variant Image */}
                                        <div className="w-[120px] shrink-0">
                                            <ProductImageSlot
                                                url={variant.image_url}
                                                onUrlChange={(newUrl) => {
                                                    const next = [...formData.variants];
                                                    next[index].image_url = newUrl;
                                                    setFormData(p => ({ ...p, variants: next }));
                                                }}
                                                onFileSelect={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) uploadMedia(file, (url) => {
                                                        setFormData(p => {
                                                            const next = [...p.variants];
                                                            next[index] = { ...next[index], image_url: url };
                                                            return { ...p, variants: next };
                                                        });
                                                    });
                                                }}
                                                className="mb-0 w-full rounded-lg"
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
                                <p className="text-sm text-gray-500 font-medium">No variants added yet</p>
                            </div>
                        )}
                    </motion.section>

                    {/* Section 5: Pricing & Inventory */}
                    <motion.section
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25 }}
                        className="bg-white rounded-2xl border border-gray-200/60 shadow-sm p-8"
                    >
                        <h2 className="text-lg font-semibold text-gray-900 mb-6">Pricing & Inventory</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                                        placeholder="0"
                                        className="rounded-xl pl-9 font-semibold h-12 text-base bg-gray-50 border-gray-200 focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
                                        value={formData.price}
                                        onChange={handlePriceChange}
                                    />
                                </div>
                            </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700 font-bold uppercase tracking-tight text-[10px] text-gray-400">Others' Price (₦) <span className="normal-case font-medium">— strikethrough</span></label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-sm">₦</span>
                                        <Input
                                            type="text"
                                            placeholder="Competitor price"
                                            className="rounded-xl pl-9 font-medium h-12 text-base bg-gray-50 border-gray-200 focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 text-gray-400 line-through"
                                            value={formData.original_price}
                                            onChange={handleOriginalPriceChange}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Initial Stock</label>
                                    <Input
                                        type="number"
                                        placeholder="1"
                                        className="rounded-xl h-12 text-base font-medium bg-gray-50 border-gray-200 focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
                                        value={formData.stock}
                                        onChange={(e) => handleChange("stock", e.target.value)}
                                    />
                                </div>
                            
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700 font-bold uppercase tracking-tight text-[10px] text-gray-400">Source Product Link <span className="normal-case font-medium">— cheapest competing store</span></label>
                                    <Input
                                        placeholder="https://... (Alibaba, Jumia, Amazon, etc.)"
                                        className="rounded-xl h-12 text-sm font-medium bg-gray-50 border-gray-200 focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
                                        value={formData.external_url}
                                        onChange={(e) => handleChange("external_url", e.target.value)}
                                    />
                                    {formData.external_url && (
                                        <p className="text-[10px] text-blue-500 mt-1 truncate px-1">Source: {formData.external_url}</p>
                                    )}
                                </div>
                            
                                {/* Financing & Ownership Toggle */}
                                <div className="mt-8 pt-8 border-t border-gray-100 col-span-1 md:col-span-2">
                                    <div className="bg-emerald-50/50 rounded-2xl p-6 border border-emerald-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                        <div className="flex gap-4">
                                            <div className="h-12 w-12 bg-white rounded-xl flex items-center justify-center text-emerald-600 shadow-sm shrink-0">
                                                <TrendingUp className="h-6 w-6" />
                                            </div>
                                            <div className="space-y-1">
                                                <h3 className="font-bold text-gray-900 leading-tight">Financing & Ownership</h3>
                                                <p className="text-xs text-gray-500 leading-relaxed max-w-sm">Enable <span className="text-emerald-600 font-bold uppercase tracking-tighter">Buy Now, Pay Later</span> for this product to attract 5x more buyers with 12–36 month payment plans. <br/><span className="text-[10px] text-gray-400 font-semibold italic mt-1 inline-block">Note: Products must be above ₦{minFinancingPrice.toLocaleString()} unless you are on a premium plan.</span></p>
                                            </div>
                                        </div>
                                        <div 
                                            onClick={() => {
                                                const currentPrice = parseInt(formData.price.replace(/,/g, ""));
                                                if (!formData.financing_available && !isPremium && (isNaN(currentPrice) || currentPrice < minFinancingPrice)) {
                                                    if (confirm(`Product price must be at least ₦${minFinancingPrice.toLocaleString()} to enable financing. Upgrade to a premium plan to bypass this limit. Click OK to view plans.`)) {
                                                        router.push("/seller/settings/billing");
                                                    }
                                                    return;
                                                }
                                                handleChange("financing_available", !formData.financing_available);
                                            }}
                                            className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${formData.financing_available ? 'bg-emerald-600' : 'bg-gray-200'}`}
                                        >
                                            <span
                                                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${formData.financing_available ? 'translate-x-5' : 'translate-x-0'}`}
                                            />
                                        </div>
                                    </div>
                                    
                                    {formData.financing_available && (
                                        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 border border-gray-100 p-4 rounded-xl animate-in fade-in slide-in-from-top-2 duration-300">
                                            <div className="space-y-1.5">
                                                <label className="text-[11px] font-semibold text-gray-600 uppercase">Deposit %</label>
                                                <div className="relative">
                                                    <Input 
                                                        type="number" 
                                                        min="5" max="95" 
                                                        className="rounded-lg h-9 text-sm border-gray-200" 
                                                        value={Math.round(formData.financing_config.deposit_percent * 100)}
                                                        onChange={(e) => setFormData(p => ({
                                                            ...p,
                                                            financing_config: { ...p.financing_config, deposit_percent: parseFloat(e.target.value) / 100 }
                                                        }))}
                                                    />
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs tracking-tight bg-white">%</span>
                                                </div>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[11px] font-semibold text-gray-600 uppercase">Interest Rate p.a.</label>
                                                <div className="relative">
                                                    <Input 
                                                        type="number" 
                                                        min="0" max="100" 
                                                        className="rounded-lg h-9 text-sm border-gray-200" 
                                                        value={Math.round(formData.financing_config.interest_rate_pa * 100)}
                                                        onChange={(e) => setFormData(p => ({
                                                            ...p,
                                                            financing_config: { ...p.financing_config, interest_rate_pa: parseFloat(e.target.value) / 100 }
                                                        }))}
                                                    />
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs tracking-tight bg-white">%</span>
                                                </div>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[11px] font-semibold text-gray-600 uppercase">Max Tenor (Mo)</label>
                                                <Input 
                                                    type="number" 
                                                    min="1" max="60" 
                                                    className="rounded-lg h-9 text-sm border-gray-200" 
                                                    value={formData.financing_config.max_tenor_months}
                                                    onChange={(e) => setFormData(p => ({
                                                        ...p,
                                                        financing_config: { ...p.financing_config, max_tenor_months: parseInt(e.target.value) || 12 }
                                                    }))}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                                
                                {/* Seller Contact Info (Vehicles/Cars Only) */}
                                {(formData.category === "cars" || formData.category === "vehicles") && (
                                    <div className="mt-8 pt-8 border-t border-gray-100 col-span-1 md:col-span-2">
                                        <div className="bg-blue-50/50 rounded-2xl p-6 border border-blue-100 flex flex-col gap-6">
                                            <div className="flex items-start sm:items-center justify-between gap-4">
                                                <div className="flex gap-4">
                                                    <div className="h-12 w-12 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm shrink-0">
                                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <h3 className="font-bold text-gray-900 leading-tight">Seller Contact Info</h3>
                                                        <p className="text-xs text-gray-500 leading-relaxed max-w-sm">Allow buyers to contact you directly via phone or WhatsApp for this vehicle.</p>
                                                    </div>
                                                </div>
                                                <div 
                                                    onClick={() => setFormData(p => ({ ...p, contact_info: { ...p.contact_info, show: !p.contact_info.show } }))}
                                                    className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${formData.contact_info.show ? 'bg-blue-600' : 'bg-gray-200'}`}
                                                >
                                                    <span
                                                        className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${formData.contact_info.show ? 'translate-x-5' : 'translate-x-0'}`}
                                                    />
                                                </div>
                                            </div>
                                            
                                            {formData.contact_info.show && (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300">
                                                    <div className="space-y-2">
                                                        <label className="text-sm font-medium text-gray-700">Phone Number</label>
                                                        <div className="relative">
                                                            <Input
                                                                type="text"
                                                                list="saved-numbers-phone"
                                                                placeholder="e.g. 08012345678"
                                                                className="rounded-xl h-12 text-base font-medium bg-white border-blue-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                                                value={formData.contact_info.phone}
                                                                onChange={(e) => setFormData(p => ({ ...p, contact_info: { ...p.contact_info, phone: e.target.value } }))}
                                                            />
                                                            <datalist id="saved-numbers-phone">
                                                                {savedNumbers.map(n => <option key={`phone-${n}`} value={n} />)}
                                                            </datalist>
                                                        </div>
                                                        {savedNumbers.length > 0 && !savedNumbers.includes(formData.contact_info.phone || "") && formData.contact_info.phone && (
                                                            <p className="text-[10px] text-blue-600 font-medium px-1">This new number will be saved for future listings.</p>
                                                        )}
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-sm font-medium text-gray-700">WhatsApp Number</label>
                                                        <div className="relative">
                                                            <Input
                                                                type="text"
                                                                list="saved-numbers-wa"
                                                                placeholder="e.g. 08012345678"
                                                                className="rounded-xl h-12 text-base font-medium bg-white border-blue-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                                                value={formData.contact_info.whatsapp}
                                                                onChange={(e) => setFormData(p => ({ ...p, contact_info: { ...p.contact_info, whatsapp: e.target.value } }))}
                                                            />
                                                            <datalist id="saved-numbers-wa">
                                                                {savedNumbers.map(n => <option key={`wa-${n}`} value={n} />)}
                                                            </datalist>
                                                        </div>
                                                        <p className="text-[10px] text-gray-500 px-1">Include country code if outside Nigeria, otherwise 080... format is fine.</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                        </div>
                    </motion.section>

                    {/* Sticky Publish Bar */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="sticky bottom-6 bg-white/90 backdrop-blur-xl rounded-2xl border border-gray-200/60 shadow-lg p-4 flex items-center justify-between"
                    >
                        <Link href="/seller/products">
                            <Button variant="ghost" className="rounded-xl font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100 h-11 px-5">
                                Cancel
                            </Button>
                        </Link>
                        <Button
                            id="publish-listing-btn"
                            onClick={handleSubmit}
                            disabled={!formData.name || !formData.price || isSubmitting}
                            className="bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-semibold shadow-sm h-11 px-7 text-sm transition-all hover:shadow-md disabled:opacity-40"
                        >
                            {isSubmitting ? (
                                <span className="flex items-center gap-2">
                                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Publishing...
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    <Save className="h-4 w-4" />
                                    Publish Listing
                                </span>
                            )}
                        </Button>
                    </motion.div>
                </div>

                {/* ─── Right Column: AI Price Intelligence ─── */}
                <div className="lg:col-span-1">
                    <div className="sticky top-24 space-y-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200/60 overflow-hidden relative"
                        >
                            <div className="flex items-center gap-3 mb-6">
                                <div className="h-9 w-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-sm">
                                    <Sparkles className="h-4 w-4 text-white" />
                                </div>
                                <h3 className="font-semibold text-base text-gray-900">Price Intelligence</h3>
                            </div>

                            {!formData.price ? (
                                <div className="text-center py-12 text-gray-400">
                                    <TrendingUp className="h-10 w-10 mx-auto opacity-20 mb-3" />
                                    <p className="text-sm font-medium">Enter a price to see real-time market analysis.</p>
                                </div>
                            ) : isAnalyzing ? (
                                <div className="text-center py-12 space-y-4">
                                    <div className="h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
                                    <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wider">Analyzing Market...</p>
                                </div>
                            ) : priceAnalysis && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                                    <div className={`p-4 rounded-xl border ${priceAnalysis.status === "fair" ? "bg-emerald-50 border-emerald-100" : priceAnalysis.status === "too_low" ? "bg-amber-50 border-amber-100" : "bg-rose-50 border-rose-100"}`}>
                                        <div className="flex items-center gap-2 mb-2">
                                            {priceAnalysis.status === "fair" ? (
                                                <Check className="h-4 w-4 text-emerald-600" />
                                            ) : (
                                                <Info className={`h-4 w-4 ${priceAnalysis.status === "too_low" ? "text-amber-600" : "text-rose-600"}`} />
                                            )}
                                            <span className={`font-bold text-sm ${priceAnalysis.status === "fair" ? "text-emerald-700" : priceAnalysis.status === "too_low" ? "text-amber-700" : "text-rose-700"}`}>
                                                {priceAnalysis.status === "fair" ? "Competitive Price" : priceAnalysis.status === "too_low" ? "Below Market Average" : "Above Market Average"}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-600 leading-relaxed">
                                            {priceAnalysis.status === "fair"
                                                ? "This price is optimized for high conversion. You qualify for the 'Fair Price' badge."
                                                : priceAnalysis.status === "too_low"
                                                    ? "Your listing is significantly below the market average. This might reduce your profit margins."
                                                    : `Your listing is above similar products. Consider lowering to boost sales.`
                                            }
                                        </p>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-500 font-medium">Market Average</span>
                                            <span className="font-semibold text-gray-900 tabular-nums">{formatPrice(priceAnalysis.marketAvg)}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-emerald-600 font-medium">Recommended</span>
                                            <span className="font-bold text-emerald-600 tabular-nums">{formatPrice(priceAnalysis.fairRangeLow)}</span>
                                        </div>
                                        <div className="h-px bg-gray-100 my-2" />
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-0.5">Predicted Sales</p>
                                                <p className="text-xl font-bold text-gray-900 tabular-nums">{priceAnalysis.salesProbability}</p>
                                            </div>
                                            <div className="h-8 w-8 bg-yellow-50 rounded-full flex items-center justify-center">
                                                <TrendingUp className="h-4 w-4 text-yellow-600" />
                                            </div>
                                        </div>
                                    </div>

                                    {priceAnalysis.status === "overpriced" && (
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            className="w-full h-9 rounded-xl text-xs font-semibold bg-gray-100 hover:bg-gray-200 transition-colors"
                                            onClick={() => handleChange("price", priceAnalysis.marketAvg.toLocaleString())}
                                        >
                                            Apply Recommended Price
                                        </Button>
                                    )}
                                </motion.div>
                            )}
                        </motion.div>
                    </div>
                </div>
            </div>
            <PriceDiscoveryModal
                isOpen={isPriceDiscoveryOpen}
                onClose={() => setIsPriceDiscoveryOpen(false)}
                productName={formData.name}
                onSelect={handlePriceSelect}
            />
        </div>
    );
}

import { Suspense } from "react";
export default function NewProduct() {
    return (
        <Suspense fallback={
            <div className="max-w-3xl mx-auto py-20 flex items-center justify-center">
                <div className="h-6 w-6 border-2 border-gray-300 border-t-emerald-600 rounded-full animate-spin" />
            </div>
        }>
            <NewProductContent />
        </Suspense>
    );
}
