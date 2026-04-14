"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Product, CATEGORIES } from "@/lib/types";
import { DataSyncService } from "@/lib/sync-store";
import { formatPrice } from "@/lib/utils";
import { ProductImageSlot, TagsInput, formatPriceWithCommas } from "@/components/product/ProductFormComponents";
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
    Eye
} from "lucide-react";

export default function EditProduct() {
    const params = useParams();
    const router = useRouter();
    const productId = params.id as string;
    const fileInputRef = useRef<HTMLInputElement>(null);
    const galleryFileRefs = useRef<Map<number, HTMLInputElement>>(new Map());

    const [product, setProduct] = useState<Product | null>(null);
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
        stock: ""
    });
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [isCalculatingBestPrice, setIsCalculatingBestPrice] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        if (!productId) return;
        const allProducts = DataSyncService.getProducts({ includeInactiveSellers: true });
        const found = allProducts.find(p => p.id === productId);
        if (found) {
            setProduct(found);
            setFormData({
                name: found.name,
                category: found.category || "",
                subcategory: found.subcategory || "",
                tags: found.tags || [],
                colors: found.colors ? found.colors.join(", ") : "",
                price: found.price ? parseInt(String(found.price)).toLocaleString() : "",
                description: found.description,
                highlights: found.highlights || [],
                specs: found.specs ? Object.entries(found.specs).map(([key, value]) => ({ key, value: String(value) })) : [],
                image_url: found.image_url,
                images: found.images?.length ? [...found.images] : [""],
                stock: found.stock.toString()
            });
        }
    }, [productId]);

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
        setFormData({ ...formData, price: formatPriceWithCommas(e.target.value) });
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
        setFormData({ ...formData, images: newImages });
    };

    const addGallerySlot = () => {
        setFormData({ ...formData, images: [...formData.images, ""] });
    };

    const removeGallerySlot = (index: number) => {
        const newImages = formData.images.filter((_, i) => i !== index);
        setFormData({ ...formData, images: newImages.length ? newImages : [""] });
    };

    const handleBestPrice = async () => {
        if (!formData.name) return;
        setIsCalculatingBestPrice(true);
        try {
            const currentPrice = parseInt(formData.price.replace(/,/g, "")) || 0;
            const res = await fetch("/api/gemini-price", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    productName: formData.name, 
                    mode: "analyze",
                    anchorPrice: currentPrice,
                    category: formData.category
                })
            });

            if (res.ok) {
                const data = await res.json();
                if (data.recommendedPrice) {
                    setFormData(prev => ({ ...prev, price: data.recommendedPrice.toLocaleString() }));
                }
            }
        } catch (error) {
            console.error("Best price calculation failed", error);
        } finally {
            setIsCalculatingBestPrice(false);
        }
    };

    const handleSave = async () => {
        if (!product) return;
        setIsSaving(true);

        const numericPrice = parseInt(formData.price.replace(/,/g, ""));

        const wrapCDN = (url: string) => {
            if (!url) return url;
            const lower = url.toLowerCase();
            if (lower.startsWith('http') && !lower.includes('/api/image-cdn')) {
                return `/api/image-cdn?url=${encodeURIComponent(url)}`;
            }
            return url;
        };

        const finalImageUrl = wrapCDN(formData.image_url);
        const finalImages = formData.images.filter(url => url.trim() !== "").map(wrapCDN);

        await DataSyncService.updateProduct(product.id, {
            name: formData.name,
            category: (formData.category || "electronics") as any,
            price: isNaN(numericPrice) ? 0 : numericPrice,
            description: formData.description,
            subcategory: formData.subcategory,
            tags: formData.tags,
            colors: formData.colors.split(",").map(c => c.trim()).filter(Boolean),
            specs: formData.specs.reduce((acc, curr) => { if (curr.key) acc[curr.key] = curr.value; return acc; }, {} as Record<string, string>),
            image_url: finalImageUrl,
            images: finalImages,
            stock: parseInt(formData.stock) || 0,
            highlights: formData.highlights
        });

        setIsSaving(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    if (!product) {
        return (
            <div className="max-w-3xl mx-auto py-20 text-center text-gray-400">
                <p className="text-lg font-medium">Product not found.</p>
                <Link href="/seller/products" className="text-blue-600 text-sm mt-2 inline-block hover:underline">← Back to Products</Link>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto py-10 px-4 sm:px-6">
            {/* Back Navigation */}
            <Link href="/seller/products" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-8 group">
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
                        onUrlChange={(url) => setFormData({ ...formData, image_url: url })}
                        onFileSelect={handleMainImageUpload}
                        label="Main Image"
                    />
                    <div className="pt-2">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Photo Guidelines</p>
                        <ul className="text-[11px] text-gray-500 space-y-2">
                            <li className="flex gap-2"><span>•</span> White background preferred for SEO</li>
                            <li className="flex gap-2"><span>•</span> Show the product from the front</li>
                            <li className="flex gap-2"><span>•</span> High resolution leads to 2x more sales</li>
                        </ul>
                    </div>
                </div>
            </motion.section>

            {/* ─── Section 2: Gallery Images ─── */}
            <motion.section
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-2xl border border-gray-200/60 shadow-sm p-8 mb-6"
            >
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">Gallery Images</h2>
                        <p className="text-sm text-gray-500 mt-1">Add up to 8 images for your product gallery.</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {formData.images.map((url, i) => (
                        <div key={`gallery-${i}`} className="relative group">
                            <ProductImageSlot 
                                url={url}
                                onUrlChange={(newUrl) => handleGalleryUrlChange(i, newUrl)}
                                onFileSelect={(e) => handleGalleryImageUpload(i, e)}
                                label={`Image ${i + 1}`}
                                className="mb-0"
                            />
                            {formData.images.length > 1 && (
                                <button 
                                    onClick={() => removeGallerySlot(i)}
                                    className="absolute -top-2 -right-2 h-6 w-6 bg-white border border-gray-200 text-gray-400 hover:text-red-500 rounded-full shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            )}
                        </div>
                    ))}
                    {formData.images.length < 8 && (
                        <button 
                            onClick={addGallerySlot}
                            className="aspect-square w-full border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-gray-400 hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50/30 transition-all gap-2"
                        >
                            <Plus className="h-6 w-6" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Add More</span>
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
                                {CATEGORIES.map(cat => (
                                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                                ))}
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
                                    {CATEGORIES.find(c => c.value === formData.category)?.subcategories.map(sub => (
                                        <option key={sub} value={sub}>{sub}</option>
                                    ))}
                                    <option value="other_custom">Custom Subcategory...</option>
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
        </div>
    );
}
