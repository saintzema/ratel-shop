"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Check, ChevronLeft, Plus, X, Save, TrendingUp, Info, Upload, ImagePlus, Trash2, Globe, Loader2 } from "lucide-react";
import { formatPrice, wrapInCDN } from "@/lib/utils";
import Link from "next/link";
import { motion } from "framer-motion";
import { DataSyncService } from "@/lib/sync-store";
import { useRouter } from "next/navigation";
import { PriceEngine } from "@/lib/price-engine";
import { CATEGORIES } from "@/lib/types";
import { ProductImageSlot, TagsInput, formatPriceWithCommas } from "@/components/product/ProductFormComponents";

export default function NewProduct() {
    const router = useRouter();
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
        financing_config: { enabled: false, deposit_percent: 0.15, interest_rate_pa: 0.25, max_tenor_months: 12 }
    });

    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isCalculatingBestPrice, setIsCalculatingBestPrice] = useState(false);
    const [priceAnalysis, setPriceAnalysis] = useState<any>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isFetchingImage, setIsFetchingImage] = useState(false);

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
        if (!formData.name) return;
        setIsGenerating(true);
        try {
            const res = await fetch("/api/gemini-seller", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ productName: formData.name, category: formData.category })
            });
            if (res.ok) {
                const content = await res.json();

                // Infer category from AI response or product name
                const currentTaxonomy = DataSyncService.getTaxonomy();
                let inferredCategory = formData.category;

                if (content.category) {
                    const match = currentTaxonomy.find(c => c.name.toLowerCase() === content.category.toLowerCase());
                    if (match) inferredCategory = match.name.toLowerCase();
                } 
                
                if (!inferredCategory) {
                    const nameLower = formData.name.toLowerCase();
                    for (const cat of currentTaxonomy) {
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
            }
        } catch (error) {
            console.error("AI Generation failed", error);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleBestPrice = async () => {
        if (!formData.name) {
            alert("Please enter a product name first to get accurate price intelligence.");
            return;
        }
        setIsCalculatingBestPrice(true);
        setIsAnalyzing(true);
        try {
            const currentPrice = parseInt(formData.price.replace(/,/g, "")) || 0;
            const res = await fetch("/api/gemini-price", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    productName: formData.name, 
                    region: "Nigeria", 
                    mode: "analyze",
                    anchorPrice: currentPrice,
                    category: formData.category
                })
            });
            if (res.ok) {
                const data = await res.json();
                const marketAvg = data.marketAverage || 50000;
                const fairRangeLow = data.recommendedPrice || Math.round(marketAvg * 0.9);
                setPriceAnalysis({ 
                    marketAvg, 
                    fairRangeLow, 
                    status: "fair", 
                    demand: "High", 
                    salesProbability: "85%" 
                });
                setFormData(prev => ({ 
                    ...prev, 
                    price: fairRangeLow.toLocaleString(),
                    // Auto-fill subcategory, tags, and category from AI analysis
                    ...(data.subcategory ? { subcategory: data.subcategory } : {}),
                    ...(data.tags && Array.isArray(data.tags) ? { tags: data.tags } : {}),
                    ...(data.category ? { category: data.category } : {}),
                }));
            }
        } catch (error) {
            console.error("Price intelligence failed", error);
            const mockAvg = 50000;
            setPriceAnalysis({ marketAvg: mockAvg, fairRangeLow: Math.round(mockAvg * 0.9), status: "fair", demand: "High", salesProbability: "85%" });
        } finally {
            setIsCalculatingBestPrice(false);
            setIsAnalyzing(false);
        }
    };

    const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, price: formatPriceWithCommas(e.target.value) }));
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
                callback(canvas.toDataURL("image/jpeg", 0.6));
            };
            img.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
    };

    const handleMainImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) compressImage(file, (url) => setFormData(prev => ({ ...prev, image_url: url })));
    };

    const handleGalleryImageUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            compressImage(file, (url) => {
                const newImages = [...formData.images];
                newImages[index] = url;
                setFormData(prev => ({ ...prev, images: newImages }));
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
        try {
            const generateSlug = (name: string) => {
                const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
                const randomSuffix = Math.random().toString(36).substring(2, 8);
                return `${baseSlug}-${randomSuffix}`;
            };

        const numericPrice = parseInt(formData.price.replace(/,/g, ""));


            const finalImageUrl = wrapInCDN(formData.image_url) || "/placeholder.png";
            const finalImages = formData.images.filter(url => url.trim() !== "").map(wrapInCDN);

            const newProduct = {
                id: generateSlug(formData.name),
                seller_id: sellerId,
                seller_name: DataSyncService.getCurrentSeller()?.business_name || "New Store",
                name: formData.name,
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
            };

            await DataSyncService.addRawProduct(newProduct);
            router.push("/seller/products");
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

                {/* ─── Left Column: Form ─── */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Section 1: Product Image */}
                    <motion.section
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 }}
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
                                            alert('Could not find an image. Try a more specific product name or upload manually.');
                                        } catch { alert('Image search failed.'); }
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

                    {/* Section 2: Visual Gallery Images */}
                    <motion.section
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-white rounded-2xl border border-gray-200/60 shadow-sm p-8"
                    >
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">Visual Gallery</h2>
                                <p className="text-sm text-gray-500 mt-1">Upload photos or paste direct links to build your gallery grid.</p>
                            </div>
                        </div>
                
                        <div className="space-y-6">
                    {/* Fast URL Add */}
                    <div>
                        <Input 
                            placeholder="Paste image URLs (comma separated) & hit Enter to add"
                            className="rounded-xl text-sm bg-gray-50 border-gray-200 h-11 focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    const val = e.currentTarget.value;
                                    if (!val) return;
                                    const newUrls = val.split(',').map(u => u.trim()).filter(Boolean);
                                    setFormData(prev => {
                                        const current = prev.images.filter(x => x.trim() !== "");
                                        return { ...prev, images: [...current, ...newUrls] };
                                    });
                                    e.currentTarget.value = "";
                                }
                            }}
                        />
                    </div>

                    {/* Visual Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {formData.images.filter(url => url.trim() !== "").map((url, i) => (
                            <div key={`gallery-${i}`} className="group relative aspect-square bg-gray-50 rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:border-blue-400 transition-all flex items-center justify-center">
                                <img src={url} alt={`Gallery ${i + 1}`} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src = "/placeholder.png" }} />
                                
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                    <Button variant="ghost" size="icon" onClick={() => {
                                        const newImages = formData.images.filter(x => x.trim() !== "");
                                        newImages.splice(i, 1);
                                        setFormData(prev => ({ ...prev, images: newImages.length ? newImages : [""] }));
                                    }} className="h-8 w-8 text-white hover:text-red-400 hover:bg-white/20 rounded-full">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}

                        {/* Add New Slot (Upload File) */}
                        <div 
                            className="aspect-square bg-blue-50/50 border-2 border-dashed border-blue-200 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all text-blue-500"
                            onClick={() => galleryFileRefs.current.get(999)?.click()}
                        >
                            <ImagePlus className="h-6 w-6 mb-2" />
                            <span className="text-xs font-semibold">Upload Photo</span>
                            <input type="file" accept="image/*" className="hidden" ref={(el) => { if (el) galleryFileRefs.current.set(999, el); }} onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                    compressImage(file, (url) => {
                                        setFormData(prev => ({ ...prev, images: [...prev.images.filter(x => x.trim() !== ""), url] }));
                                    });
                                }
                                e.target.value = ''; // Reset
                            }} />
                        </div>
                    </div>
                        </div>
                    </motion.section>

                    {/* Section 3: Core Details */}
                    <motion.section
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
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
                                        {DataSyncService.getTaxonomy().map(cat => (
                                            <option key={cat.id} value={cat.name.toLowerCase()}>{cat.name}</option>
                                        ))}
                                        {/* Fallback */}
                                        {CATEGORIES.filter(c => !DataSyncService.getTaxonomy().some(db => db.name.toLowerCase() === c.value)).map(cat => (
                                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                                        ))}
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
                                        {DataSyncService.getTaxonomy().find(c => c.name.toLowerCase() === formData.category.toLowerCase())?.subcategories.map((sub: any) => (
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
                        </div>
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
                                        <p className="text-xs text-gray-500 leading-relaxed max-w-sm">Enable <span className="text-emerald-600 font-bold uppercase tracking-tighter">Buy Now, Pay Later</span> for this product to attract 5x more buyers with 12–36 month payment plans.</p>
                                    </div>
                                </div>
                                <div 
                                    onClick={() => handleChange("financing_available", !formData.financing_available)}
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
        </div>
    );
}
