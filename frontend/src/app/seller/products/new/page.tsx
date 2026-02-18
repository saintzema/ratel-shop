"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Check, ChevronLeft, Plus, X, Save, TrendingUp, Info } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import Link from "next/link";
import { motion } from "framer-motion";
import { DemoStore } from "@/lib/demo-store";
import { useRouter } from "next/navigation";

// Mock AI generation function
const generateAIContent = (name: string, category: string) => {
    const isPhone = name.toLowerCase().includes("iphone") || name.toLowerCase().includes("samsung") || category === "phones";
    const isLaptop = name.toLowerCase().includes("macbook") || name.toLowerCase().includes("dell") || category === "computers";

    if (isPhone) {
        return {
            description: `Experience the future with the ${name}. Featuring a stunning display, all-day battery life, and a professional-grade camera system. Designed for durability with aerospace-grade materials.`,
            highlights: [
                "Super Retina XDR display for immersive viewing",
                "Advanced camera system for pro-level photos",
                "All-day battery life for uninterrupted usage",
                "Ceramic Shield front, tougher than any smartphone glass",
                "5G capable for superfast downloads"
            ],
            specs: {
                "Screen Size": "6.7 Inches",
                "Resolution": "2796 x 1290 pixels",
                "Processor": "A17 Pro",
                "RAM": "8 GB",
                "Storage": "256 GB",
                "Battery": "4422 mAh",
                "Camera": "48MP Main + 12MP Ultra Wide + 12MP Telephoto"
            }
        };
    } else if (isLaptop) {
        return {
            description: `Unleash your creativity with the ${name}. Powered by the latest processor, it handles intensive tasks with ease. The liquid retina display brings your work to life with vibrant colors and sharp detail.`,
            highlights: [
                "Powerful performance for demanding workflows",
                "Stunning Liquid Retina display",
                "Up to 18 hours of battery life",
                "Quiet, fanless design",
                "Studio-quality mics and 1080p FaceTime HD camera"
            ],
            specs: {
                "Screen Size": "14 Inches",
                "Processor": "M3 Pro",
                "RAM": "16 GB",
                "Storage": "512 GB SSD",
                "Graphics": "14-core GPU",
                "Ports": "Thunderbolt 4, HDMI, SDXC, MagSafe 3"
            }
        };
    }

    return {
        description: `Premium quality ${name} designed for excellence. Built with high-grade materials to ensure longevity and superior performance. A perfect addition to your lifestyle.`,
        highlights: [
            "Premium build quality and durability",
            "Designed for optimal performance",
            "Sleek and modern aesthetic",
            "Easy to use and maintain",
            "Excellent value for money"
        ],
        specs: {
            "Material": "Premium Composite",
            "Weight": "1.2 kg",
            "Dimensions": "20 x 15 x 5 cm",
            "Warranty": "1 Year Manufacturer Warranty"
        }
    };
};

export default function NewProduct() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        name: "",
        category: "",
        price: "",
        stock: "1",
        description: "",
        highlights: [] as string[],
        specs: [] as { key: string; value: string }[],
        images: ["/placeholder-product.jpg"]
    });

    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isCalculatingBestPrice, setIsCalculatingBestPrice] = useState(false);
    const [priceAnalysis, setPriceAnalysis] = useState<any>(null);
    const analysisTimerRef = useRef<NodeJS.Timeout | null>(null);

    // --- Price Analysis Logic ---
    useEffect(() => {
        if (!formData.price || isNaN(parseInt(formData.price))) {
            setPriceAnalysis(null);
            setIsAnalyzing(false);
            return;
        }

        setIsAnalyzing(true);
        if (analysisTimerRef.current) clearTimeout(analysisTimerRef.current);

        analysisTimerRef.current = setTimeout(() => {
            const priceNum = parseInt(formData.price);
            const marketAvg = 1100000;
            setPriceAnalysis({
                marketAvg: marketAvg,
                fairRangeLow: marketAvg * 0.95,
                fairRangeHigh: marketAvg * 1.05,
                status: priceNum > marketAvg * 1.1 ? "overpriced" : priceNum < marketAvg * 0.9 ? "suspicious" : "fair",
                demand: "High",
                salesProbability: priceNum < marketAvg * 1.02 ? "85%" : "40%"
            });
            setIsAnalyzing(false);
        }, 800);

        return () => {
            if (analysisTimerRef.current) clearTimeout(analysisTimerRef.current);
        };
    }, [formData.price]);

    // --- AI Content Generation ---
    const handleAIGenerate = () => {
        if (!formData.name) return;
        setIsGenerating(true);

        setTimeout(() => {
            const content = generateAIContent(formData.name, formData.category);
            setFormData(prev => ({
                ...prev,
                description: content.description,
                highlights: content.highlights,
                specs: Object.entries(content.specs).map(([key, value]) => ({ key, value }))
            }));
            setIsGenerating(false);
        }, 1500);
    };

    const handleBestPrice = () => {
        setIsCalculatingBestPrice(true);
        setTimeout(() => {
            // Mock logic: 1.1M is our standard demo "fair price"
            const fairPrice = 1100000;
            setFormData(prev => ({ ...prev, price: fairPrice.toString() }));
            setIsCalculatingBestPrice(false);
        }, 1000);
    };

    // --- Form Handlers ---
    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSpecChange = (index: number, field: 'key' | 'value', value: string) => {
        const newSpecs = [...formData.specs];
        newSpecs[index][field] = value;
        setFormData(prev => ({ ...prev, specs: newSpecs }));
    };

    const addSpec = () => {
        setFormData(prev => ({ ...prev, specs: [...prev.specs, { key: "", value: "" }] }));
    };

    const removeSpec = (index: number) => {
        const newSpecs = formData.specs.filter((_, i) => i !== index);
        setFormData(prev => ({ ...prev, specs: newSpecs }));
    };

    const handleSubmit = () => {
        const specsRecord: Record<string, string> = {};
        formData.specs.forEach(s => {
            if (s.key && s.value) specsRecord[s.key] = s.value;
        });

        DemoStore.addProduct({
            name: formData.name,
            category: formData.category || "electronics",
            price: parseInt(formData.price) || 0,
            original_price: parseInt(formData.price) * 1.1,
            description: formData.description,
            stock: parseInt(formData.stock) || 1,
            image_url: "/placeholder-product.jpg",
            highlights: formData.highlights,
            specs: specsRecord,
            images: [],
            recommended_price: 1100000
        } as any);

        router.push("/seller/products");
    };

    // --- Redesigned UI Sections ---
    const CoreDetailsSection = (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg p-6 md:p-8 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100"
        >
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900 tracking-tight">Core Details</h2>
                    <p className="text-sm text-gray-500 mt-1">Provide the essential information for your listing.</p>
                </div>
                <Button
                    size="sm"
                    variant="outline"
                    className="gap-2 border-ratel-green-200 text-ratel-green-700 hover:bg-ratel-green-50 rounded-full text-xs font-semibold px-4 h-8 transition-colors"
                    onClick={handleAIGenerate}
                    disabled={isGenerating || !formData.name}
                >
                    <Sparkles className={`h-3 w-3 ${isGenerating ? "animate-spin" : ""}`} />
                    {isGenerating ? "Generating..." : "Auto-Fill with AI"}
                </Button>
            </div>

            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-700">Product Name</label>
                        <Input
                            placeholder="e.g. iPhone 15 Pro Max"
                            className="bg-gray-50 border-gray-200 rounded-lg h-11 px-4 focus:ring-2 focus:ring-ratel-green-500/10 focus:border-ratel-green-500 transition-all"
                            value={formData.name}
                            onChange={(e) => handleChange("name", e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-700">Category</label>
                        <select
                            className="flex h-11 w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ratel-green-500/10 focus:border-ratel-green-500 transition-all appearance-none cursor-pointer text-gray-900"
                            value={formData.category}
                            onChange={(e) => handleChange("category", e.target.value)}
                        >
                            <option value="">Select Category</option>
                            <option value="phones">Phones & Tablets</option>
                            <option value="electronics">Electronics</option>
                            <option value="vehicles">Vehicles</option>
                            <option value="energy">Green Energy</option>
                            <option value="fashion">Fashion</option>
                        </select>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-700">Description</label>
                    <textarea
                        className="flex min-h-[140px] w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ratel-green-500/10 focus:border-ratel-green-500 transition-all resize-none text-gray-900 placeholder:text-gray-400"
                        placeholder={isGenerating ? "AI is generating description..." : "Describe the key features and benefits..."}
                        value={formData.description}
                        onChange={(e) => handleChange("description", e.target.value)}
                    />
                </div>
            </div>
        </motion.div>
    );

    const SpecsSection = (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-lg p-6 md:p-8 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100"
        >
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900 tracking-tight">Specifications</h2>
                    <p className="text-sm text-gray-500 mt-1">Detailed technical specs for rigorous buyers.</p>
                </div>
            </div>

            <div className="space-y-3">
                {formData.specs.map((spec, index) => (
                    <div key={index} className="flex gap-3 group">
                        <Input
                            placeholder="Key (e.g. RAM)"
                            className="flex-1 bg-gray-50 border-gray-200 rounded-lg h-10 px-3 text-sm focus:bg-white transition-colors"
                            value={spec.key}
                            onChange={(e) => handleSpecChange(index, "key", e.target.value)}
                        />
                        <Input
                            placeholder="Value (e.g. 16GB)"
                            className="flex-[2] bg-gray-50 border-gray-200 rounded-lg h-10 px-3 text-sm focus:bg-white transition-colors"
                            value={spec.value}
                            onChange={(e) => handleSpecChange(index, "value", e.target.value)}
                        />
                        <Button
                            size="icon"
                            variant="ghost"
                            className="h-10 w-10 text-gray-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => removeSpec(index)}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                ))}
                <Button
                    variant="ghost"
                    size="sm"
                    className="w-full border border-dashed border-gray-200 text-gray-500 hover:text-ratel-green-600 hover:bg-ratel-green-50/50 h-10 rounded-lg text-xs font-semibold mt-2 transition-colors"
                    onClick={addSpec}
                >
                    <Plus className="h-3 w-3 mr-2" /> Add Specification
                </Button>
            </div>
        </motion.div>
    );

    return (
        <div className="min-h-screen bg-[#E3E6E6] text-foreground transition-colors duration-300 font-sans">
            <div className="max-w-6xl mx-auto w-full px-4 py-8 md:py-12">
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <Link href="/seller/products" className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors mb-4">
                        <ChevronLeft className="h-3 w-3" /> Back to Products
                    </Link>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                                New Listing
                            </h1>
                            <p className="text-gray-500 mt-2 text-base max-w-2xl">
                                Create a high-impact product listing with AI pricing guidance.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <Button variant="ghost" className="text-gray-600 hover:bg-gray-100 font-medium">
                                Save Draft
                            </Button>
                        </div>
                    </div>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    {/* Left: Product Form */}
                    <div className="lg:col-span-2 space-y-6">
                        {CoreDetailsSection}
                        {SpecsSection}

                        {/* Price Section */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="bg-white rounded-lg p-6 md:p-8 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100"
                        >
                            <div className="flex items-center gap-3 mb-6">
                                <h2 className="text-lg font-semibold text-gray-900 tracking-tight">Pricing & Inventory</h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-gray-700">Initial Stock</label>
                                    <Input
                                        type="number"
                                        placeholder="1"
                                        className="bg-gray-50 border-gray-200 rounded-lg h-11 px-4 text-sm font-medium focus:ring-2 focus:ring-ratel-green-500/10 focus:border-ratel-green-500 transition-all"
                                        value={formData.stock}
                                        onChange={(e) => handleChange("stock", e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-medium text-gray-700">Your Price (₦)</label>
                                        <button
                                            onClick={handleBestPrice}
                                            disabled={isCalculatingBestPrice}
                                            className="text-[10px] bg-ratel-green-50 text-ratel-green-700 hover:bg-ratel-green-100 rounded-md px-2 py-1 transition-colors flex items-center gap-1 font-semibold"
                                            title="Auto-set fair price"
                                        >
                                            <Sparkles className={`h-3 w-3 ${isCalculatingBestPrice ? "animate-spin" : ""}`} />
                                            {isCalculatingBestPrice ? "Checking..." : "Use Best Price"}
                                        </button>
                                    </div>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-sm">₦</span>
                                        <Input
                                            type="number"
                                            placeholder="0"
                                            className="pl-8 bg-gray-50 border-gray-200 rounded-lg h-11 px-4 text-sm font-medium focus:ring-2 focus:ring-ratel-green-500/10 focus:border-ratel-green-500 transition-all"
                                            value={formData.price}
                                            onChange={(e) => handleChange("price", e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        <div className="flex justify-end pt-4 pb-20">
                            <Button
                                className="bg-gray-900 hover:bg-black text-white rounded-full px-8 h-12 font-semibold text-base shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all"
                                onClick={handleSubmit}
                                disabled={!formData.name || !formData.price}
                            >
                                <Save className="h-4 w-4 mr-2" />
                                Publish Listing
                            </Button>
                        </div>
                    </div>

                    {/* Right: AI Price Intelligence Panel */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-24 space-y-4">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 overflow-hidden relative"
                            >
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="h-8 w-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-sm">
                                        <Sparkles className="h-4 w-4 text-white" />
                                    </div>
                                    <h3 className="font-semibold text-base text-gray-900 tracking-tight">Price Intelligence</h3>
                                </div>

                                {!formData.price ? (
                                    <div className="text-center py-12 text-gray-400">
                                        <TrendingUp className="h-10 w-10 mx-auto opacity-20 mb-3" />
                                        <p className="text-sm font-medium">Enter a price to see real-time market analysis.</p>
                                    </div>
                                ) : isAnalyzing ? (
                                    <div className="text-center py-12 space-y-4">
                                        <div className="h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                                        <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wider">Analyzing Market...</p>
                                    </div>
                                ) : priceAnalysis && (
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                                        <div className={`p-4 rounded-lg border ${priceAnalysis.status === "fair" ? "bg-emerald-50 border-emerald-100" : "bg-rose-50 border-rose-100"}`}>
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
                                                    : `Your listing is ₦${formatPrice(parseInt(formData.price) - priceAnalysis.marketAvg)} higher than similar products. Consider lowering to boost sales.`
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
                                                className="w-full h-9 rounded-lg text-xs font-semibold bg-gray-100 hover:bg-gray-200 transition-colors"
                                                onClick={() => handleChange("price", priceAnalysis.marketAvg.toString())}
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
        </div>
    );
}
