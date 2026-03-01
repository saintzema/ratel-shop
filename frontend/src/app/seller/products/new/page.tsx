"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Check, ChevronLeft, Plus, X, Save, TrendingUp, Info, Upload, ImagePlus, Trash2 } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import Link from "next/link";
import { motion } from "framer-motion";
import { DemoStore } from "@/lib/demo-store";
import { useRouter } from "next/navigation";
import { PriceEngine } from "@/lib/price-engine";

export default function NewProduct() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const galleryFileRefs = useRef<Map<number, HTMLInputElement>>(new Map());

    const [formData, setFormData] = useState({
        name: "",
        category: "",
        price: "",
        stock: "1",
        description: "",
        highlights: [] as string[],
        specs: [] as { key: string; value: string }[],
        subcategory: "",
        colors: "",
        image_url: "",
        images: [""]
    });

    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isCalculatingBestPrice, setIsCalculatingBestPrice] = useState(false);
    const [priceAnalysis, setPriceAnalysis] = useState<any>(null);

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
                setFormData(prev => ({
                    ...prev,
                    description: content.description || prev.description,
                    highlights: content.highlights || prev.highlights,
                    specs: content.specs ? Object.entries(content.specs).map(([key, value]) => ({ key, value: String(value) })) : prev.specs,
                    subcategory: content.subcategory || prev.subcategory,
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
            const res = await fetch("/api/gemini-price", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ productName: formData.name, region: "Nigeria", mode: "analyze" })
            });
            if (res.ok) {
                const data = await res.json();
                const marketAvg = data.marketAverage || 50000;
                const fairRangeLow = data.recommendedPrice || Math.round(marketAvg * 0.9);
                setPriceAnalysis({ marketAvg, fairRangeLow, status: "fair", demand: "High", salesProbability: "85%" });
                setFormData(prev => ({ ...prev, price: fairRangeLow.toLocaleString() }));
            }
        } catch (error) {
            console.error("Price intelligence failed", error);
            // Fallback
            const mockAvg = 50000;
            setPriceAnalysis({ marketAvg: mockAvg, fairRangeLow: Math.round(mockAvg * 0.9), status: "fair", demand: "High", salesProbability: "85%" });
        } finally {
            setIsCalculatingBestPrice(false);
            setIsAnalyzing(false);
        }
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

    const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value.replace(/\D/g, "");
        if (!rawValue) { setFormData(prev => ({ ...prev, price: "" })); return; }
        const formatted = parseInt(rawValue).toLocaleString();
        setFormData(prev => ({ ...prev, price: formatted }));
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

    const handleSubmit = () => {
        const sellerId = DemoStore.getCurrentSellerId();
        if (!sellerId || !formData.name || !formData.price) return;

        const numericPrice = parseInt(formData.price.replace(/,/g, ""));
        const newProduct = {
            id: `seller-${Date.now()}`,
            seller_id: sellerId,
            seller_name: "My Store",
            name: formData.name,
            category: (formData.category || "electronics") as any,
            price: isNaN(numericPrice) ? 0 : numericPrice,
            original_price: undefined,
            description: formData.description,
            subcategory: formData.subcategory,
            colors: formData.colors.split(",").map(c => c.trim()).filter(Boolean),
            specs: formData.specs.reduce((acc, curr) => { if (curr.key) acc[curr.key] = curr.value; return acc; }, {} as Record<string, string>),
            image_url: formData.image_url || "/placeholder.png",
            images: formData.images.filter(url => url.trim() !== ""),
            stock: parseInt(formData.stock) || 1,
            price_flag: "fair" as const,
            is_active: true,
            avg_rating: 0,
            review_count: 0,
            sold_count: 0,
            created_at: new Date().toISOString(),
        };

        DemoStore.addRawProduct(newProduct);
        router.push("/seller/products");
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
                    className="gap-2 border-gray-200 text-gray-600 hover:bg-gray-50 rounded-full text-sm font-semibold px-5 h-10"
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

                        <div className="flex flex-col sm:flex-row gap-8">
                            <div
                                className="w-full sm:w-48 h-48 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl overflow-hidden flex items-center justify-center relative group cursor-pointer hover:border-gray-300 transition-colors"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {formData.image_url ? (
                                    <img src={formData.image_url} alt="Preview" className="h-full w-full object-contain p-3 transition-transform group-hover:scale-105" />
                                ) : (
                                    <div className="text-center text-gray-400">
                                        <Upload className="h-8 w-8 mx-auto mb-2" />
                                        <p className="text-xs font-medium">Click to upload</p>
                                        <p className="text-[10px] text-gray-300 mt-0.5">or drag & drop</p>
                                    </div>
                                )}
                                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleMainImageUpload} />
                            </div>
                            <div className="flex-1 space-y-3">
                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Or paste image URL</label>
                                <Input
                                    value={formData.image_url}
                                    onChange={(e) => handleChange("image_url", e.target.value)}
                                    className="rounded-xl text-sm bg-gray-50 border-gray-200 h-11 focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
                                    placeholder="https://example.com/image.jpg"
                                />
                                {formData.image_url && (
                                    <Button variant="ghost" size="sm" onClick={() => handleChange("image_url", "")} className="text-xs text-red-500 hover:bg-red-50 h-8 rounded-lg">
                                        <Trash2 className="h-3 w-3 mr-1.5" /> Remove
                                    </Button>
                                )}
                            </div>
                        </div>
                    </motion.section>

                    {/* Section 2: Gallery Images */}
                    <motion.section
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-white rounded-2xl border border-gray-200/60 shadow-sm p-8"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">Gallery Images</h2>
                                <p className="text-sm text-gray-500 mt-1">Add multiple angles and views of your product.</p>
                            </div>
                            <Button variant="outline" size="sm" onClick={addGallerySlot} className="rounded-full text-xs font-semibold gap-1.5 border-gray-200 hover:bg-gray-50 h-9 px-4">
                                <Plus className="h-3.5 w-3.5" /> Add Image
                            </Button>
                        </div>
                        <div className="space-y-4">
                            {formData.images.map((url, i) => (
                                <div key={`gallery-${i}`} className="flex items-start gap-4">
                                    <div
                                        className="w-16 h-16 bg-gray-50 border border-gray-200 rounded-xl overflow-hidden flex items-center justify-center shrink-0 cursor-pointer hover:border-gray-300 transition-colors"
                                        onClick={() => galleryFileRefs.current.get(i)?.click()}
                                    >
                                        {url ? (
                                            <img src={url} alt={`Gallery ${i + 1}`} className="h-full w-full object-contain p-1" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                        ) : (
                                            <ImagePlus className="h-5 w-5 text-gray-300" />
                                        )}
                                        <input type="file" accept="image/*" className="hidden" ref={(el) => { if (el) galleryFileRefs.current.set(i, el); }} onChange={(e) => handleGalleryImageUpload(i, e)} />
                                    </div>
                                    <div className="flex-1">
                                        <Input
                                            value={url}
                                            onChange={(e) => handleGalleryUrlChange(i, e.target.value)}
                                            className="rounded-xl text-sm bg-gray-50 border-gray-200 h-11 focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
                                            placeholder={`Image URL ${i + 1} or click thumbnail to upload...`}
                                        />
                                    </div>
                                    <Button variant="ghost" size="icon" onClick={() => removeGallerySlot(i)} className="h-11 w-11 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl shrink-0">
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
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
                                        <option value="phones">Phones & Tablets</option>
                                        <option value="electronics">Electronics</option>
                                        <option value="vehicles">Vehicles</option>
                                        <option value="energy">Green Energy</option>
                                        <option value="fashion">Fashion</option>
                                        <option value="health">Health & Beauty</option>
                                        <option value="home">Home & Living</option>
                                        <option value="baby">Baby & Kids</option>
                                        <option value="fitness">Sports & Fitness</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Subcategory</label>
                                    <Input
                                        placeholder="e.g. Smartphones, Laptops"
                                        className="rounded-xl h-12 text-base font-medium bg-gray-50 border-gray-200 focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
                                        value={formData.subcategory}
                                        onChange={(e) => handleChange("subcategory", e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Colors (comma separated)</label>
                                    <Input
                                        placeholder="e.g. Space Black, Silver, Gold"
                                        className="rounded-xl h-12 text-base font-medium bg-gray-50 border-gray-200 focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
                                        value={formData.colors}
                                        onChange={(e) => handleChange("colors", e.target.value)}
                                    />
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
                            disabled={!formData.name || !formData.price}
                            className="bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-semibold shadow-sm h-11 px-7 text-sm transition-all hover:shadow-md disabled:opacity-40"
                        >
                            <Save className="h-4 w-4 mr-2" />
                            Publish Listing
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
                                    <div className={`p-4 rounded-xl border ${priceAnalysis.status === "fair" ? "bg-emerald-50 border-emerald-100" : "bg-rose-50 border-rose-100"}`}>
                                        <div className="flex items-center gap-2 mb-2">
                                            {priceAnalysis.status === "fair" ? (
                                                <Check className="h-4 w-4 text-emerald-600" />
                                            ) : (
                                                <Info className="h-4 w-4 text-rose-600" />
                                            )}
                                            <span className={`font-bold text-sm ${priceAnalysis.status === "fair" ? "text-emerald-700" : "text-rose-700"}`}>
                                                {priceAnalysis.status === "fair" ? "Competitive Price" : "Above Market Average"}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-600 leading-relaxed">
                                            {priceAnalysis.status === "fair"
                                                ? "This price is optimized for high conversion. You qualify for the 'Fair Price' badge."
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
