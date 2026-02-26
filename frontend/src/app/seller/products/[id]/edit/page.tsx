"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Product } from "@/lib/types";
import { DemoStore } from "@/lib/demo-store";
import { formatPrice } from "@/lib/utils";
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
        price: "",
        description: "",
        image_url: "",
        images: [""],
        stock: ""
    });
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [isCalculatingBestPrice, setIsCalculatingBestPrice] = useState(false);

    useEffect(() => {
        if (!productId) return;
        const allProducts = DemoStore.getProducts();
        const found = allProducts.find(p => p.id === productId);
        if (found) {
            setProduct(found);
            setFormData({
                name: found.name,
                price: found.price.toLocaleString(),
                description: found.description,
                image_url: found.image_url,
                images: found.images?.length ? [...found.images] : [""],
                stock: found.stock.toString()
            });
        }
    }, [productId]);

    const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value.replace(/\D/g, "");
        if (!rawValue) {
            setFormData({ ...formData, price: "" });
            return;
        }
        const formatted = parseInt(rawValue).toLocaleString();
        setFormData({ ...formData, price: formatted });
    };

    const handleMainImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData({ ...formData, image_url: reader.result as string });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleGalleryImageUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const newImages = [...formData.images];
                newImages[index] = reader.result as string;
                setFormData({ ...formData, images: newImages });
            };
            reader.readAsDataURL(file);
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

    const handleBestPrice = () => {
        setIsCalculatingBestPrice(true);
        setTimeout(() => {
            const currentPrice = parseInt(formData.price.replace(/,/g, "")) || 0;
            const fairPrice = 1100000;
            let suggested = fairPrice;
            if (currentPrice > 0 && currentPrice < fairPrice * 0.8) suggested = Math.round(currentPrice * 1.1);
            setFormData(prev => ({ ...prev, price: suggested.toLocaleString() }));
            setIsCalculatingBestPrice(false);
        }, 800);
    };

    const handleSave = () => {
        if (!product) return;
        setIsSaving(true);

        const numericPrice = parseInt(formData.price.replace(/,/g, ""));

        DemoStore.updateProduct(product.id, {
            name: formData.name,
            price: isNaN(numericPrice) ? 0 : numericPrice,
            description: formData.description,
            image_url: formData.image_url,
            images: formData.images.filter(url => url.trim() !== ""),
            stock: parseInt(formData.stock) || 0,
        });

        setTimeout(() => {
            setIsSaving(false);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        }, 600);
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
                className="mb-10"
            >
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Edit Product</h1>
                <p className="text-base text-gray-500 mt-2">Update your listing details, images, and pricing.</p>
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

                <div className="flex flex-col sm:flex-row gap-8">
                    {/* Preview */}
                    <div className="w-full sm:w-48 h-48 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl overflow-hidden flex items-center justify-center relative group cursor-pointer hover:border-gray-300 transition-colors"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        {formData.image_url ? (
                            <img src={formData.image_url} alt="Preview" className="h-full w-full object-contain p-3 transition-transform group-hover:scale-105" />
                        ) : (
                            <div className="text-center text-gray-400">
                                <Upload className="h-8 w-8 mx-auto mb-2" />
                                <p className="text-xs font-medium">Click to upload</p>
                            </div>
                        )}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleMainImageUpload}
                        />
                    </div>

                    {/* URL Input */}
                    <div className="flex-1 space-y-3">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Or paste image URL</label>
                        <Input
                            value={formData.image_url}
                            onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                            className="rounded-xl text-sm bg-gray-50 border-gray-200 h-11 focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
                            placeholder="https://example.com/image.jpg"
                        />
                        {formData.image_url && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setFormData({ ...formData, image_url: "" })}
                                className="text-xs text-red-500 hover:bg-red-50 h-8 rounded-lg"
                            >
                                <Trash2 className="h-3 w-3 mr-1.5" /> Remove Image
                            </Button>
                        )}
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
                        <p className="text-sm text-gray-500 mt-1">Add multiple images for your product gallery.</p>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={addGallerySlot}
                        className="rounded-full text-xs font-semibold gap-1.5 border-gray-200 hover:bg-gray-50 h-9 px-4"
                    >
                        <Plus className="h-3.5 w-3.5" /> Add Image
                    </Button>
                </div>

                <div className="space-y-4">
                    {formData.images.map((url, i) => (
                        <div key={`gallery-${i}`} className="flex items-start gap-4 group">
                            {/* Thumbnail Preview */}
                            <div
                                className="w-16 h-16 bg-gray-50 border border-gray-200 rounded-xl overflow-hidden flex items-center justify-center shrink-0 cursor-pointer hover:border-gray-300 transition-colors relative"
                                onClick={() => {
                                    const ref = galleryFileRefs.current.get(i);
                                    ref?.click();
                                }}
                            >
                                {url ? (
                                    <img
                                        src={url}
                                        alt={`Gallery ${i + 1}`}
                                        className="h-full w-full object-contain p-1"
                                        onError={(e) => {
                                            e.currentTarget.style.display = 'none';
                                        }}
                                    />
                                ) : (
                                    <ImagePlus className="h-5 w-5 text-gray-300" />
                                )}
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    ref={(el) => {
                                        if (el) galleryFileRefs.current.set(i, el);
                                    }}
                                    onChange={(e) => handleGalleryImageUpload(i, e)}
                                />
                            </div>

                            {/* URL Input */}
                            <div className="flex-1">
                                <Input
                                    value={url}
                                    onChange={(e) => handleGalleryUrlChange(i, e.target.value)}
                                    className="rounded-xl text-sm bg-gray-50 border-gray-200 h-11 focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
                                    placeholder={`Image URL ${i + 1} or click thumbnail to upload...`}
                                />
                            </div>

                            {/* Remove */}
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeGallerySlot(i)}
                                className="h-11 w-11 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl shrink-0"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
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
                    {/* Product Name */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Product Name</label>
                        <Input
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="rounded-xl h-12 text-base font-medium bg-gray-50 border-gray-200 focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
                        />
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
