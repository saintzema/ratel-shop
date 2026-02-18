"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Product } from "@/lib/types";
import { DemoStore } from "@/lib/demo-store";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
    Search,
    Filter,
    Plus,
    Check,
    X,
    Edit3,
    Trash2,
    Package,
    AlertTriangle,
    ImagePlus,
    Save,
    Sparkles,
    TrendingUp
} from "lucide-react";

export default function SellerProducts() {
    const [products, setProducts] = useState<Product[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [editForm, setEditForm] = useState({ name: "", price: "", description: "", image_url: "", stock: "" });
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [isCalculatingBestPrice, setIsCalculatingBestPrice] = useState(false);

    const searchParams = useSearchParams();
    const router = useRouter();

    useEffect(() => {
        const sellerId = DemoStore.getCurrentSellerId();
        if (!sellerId) return;

        const loadProducts = () => {
            const allProducts = DemoStore.getProducts();
            setProducts(allProducts.filter(p => p.seller_id === sellerId));
        };

        loadProducts();
        window.addEventListener("storage", loadProducts);
        return () => window.removeEventListener("storage", loadProducts);
    }, []);

    // Handle ?edit=productId from price alerts
    useEffect(() => {
        const editId = searchParams.get("edit");
        if (editId && products.length > 0) {
            const product = products.find(p => p.id === editId) || DemoStore.getProducts().find(p => p.id === editId);
            if (product) {
                openEditModal(product);
                // Clear the query param so reloads/updates don't re-trigger
                router.replace("/seller/products", { scroll: false });
            }
        }
    }, [searchParams, products, router]);

    const openEditModal = (product: Product) => {
        setEditingProduct(product);
        setEditForm({
            name: product.name,
            price: product.price.toString(),
            description: product.description,
            image_url: product.image_url,
            stock: product.stock.toString(),
        });
    };

    const handleSave = () => {
        if (!editingProduct) return;

        DemoStore.updateProduct(editingProduct.id, {
            name: editForm.name,
            price: parseInt(editForm.price),
            description: editForm.description,
            image_url: editForm.image_url,
            stock: parseInt(editForm.stock),
        });

        setEditingProduct(null);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);

        // Reload
        const sellerId = DemoStore.getCurrentSellerId();
        if (sellerId) {
            setProducts(DemoStore.getProducts().filter(p => p.seller_id === sellerId));
        }
    };

    const handleDelete = (id: string) => {
        DemoStore.deleteProduct(id);
        setDeleteConfirm(null);
        const sellerId = DemoStore.getCurrentSellerId();
        if (sellerId) {
            setProducts(DemoStore.getProducts().filter(p => p.seller_id === sellerId));
        }
    };

    const handleBestPrice = () => {
        setIsCalculatingBestPrice(true);
        setTimeout(() => {
            // Mock logic: 1.1M is our standard demo "fair price"
            const currentPrice = parseInt(editForm.price) || 0;
            const fairPrice = 1100000;

            // If current is way off, suggest fair. If close, nudge it.
            let suggested = fairPrice;
            if (currentPrice > 0 && currentPrice < fairPrice * 0.8) suggested = Math.round(currentPrice * 1.1); // Nudge up

            setEditForm(prev => ({ ...prev, price: suggested.toString() }));
            setIsCalculatingBestPrice(false);
        }, 800);
    };

    const filtered = products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-8 max-w-6xl mx-auto py-8 text-gray-900">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Products</h1>
                    <p className="text-base text-gray-500 mt-1">Manage your inventory and pricing.</p>
                </div>
                <Link href="/seller/products/new">
                    <Button className="bg-ratel-green-600 hover:bg-ratel-green-700 text-white font-bold rounded-full px-6 shadow-lg shadow-ratel-green-600/20 transition-transform hover:scale-105">
                        <Plus className="h-5 w-5 mr-2" /> Add Product
                    </Button>
                </Link>
            </div>

            {saveSuccess && (
                <div className="flex items-center gap-2 text-sm font-bold text-emerald-600 bg-emerald-50 px-4 py-3 rounded-xl border border-emerald-200 animate-in fade-in slide-in-from-top-2">
                    <Check className="h-5 w-5" /> Product updated successfully — changes are live!
                </div>
            )}

            {/* Search */}
            <div className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col md:flex-row gap-4 shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
                    <Input
                        placeholder="Search products..."
                        className="pl-12 h-12 rounded-xl border-gray-200 bg-gray-50 focus:bg-white transition-colors"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <Button variant="outline" className="h-12 border-gray-200 text-gray-600 rounded-xl font-semibold gap-2">
                    <Filter className="h-4 w-4" /> Filter
                </Button>
            </div>

            {/* Products grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.length === 0 ? (
                    <div className="col-span-full bg-white rounded-2xl border border-gray-200 p-16 text-center shadow-sm">
                        <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Package className="h-10 w-10 text-gray-300" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-1">No products found</h3>
                        <p className="text-gray-400 text-sm font-medium">Try adjusting your search or add a new product.</p>
                    </div>
                ) : (
                    filtered.map((product) => (
                        <div key={product.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-lg transition-all duration-300 group">
                            {/* Product image */}
                            <div className="relative h-56 bg-[#F5F5F7] border-b border-gray-100 overflow-hidden">
                                <img
                                    src={product.image_url}
                                    alt={product.name}
                                    className="w-full h-full object-contain p-6 mix-blend-multiply transition-transform duration-500 group-hover:scale-110"
                                />
                                {/* Overlay actions */}
                                <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
                                    <Button
                                        onClick={() => openEditModal(product)}
                                        className="bg-white text-gray-900 hover:bg-gray-100 rounded-full h-10 px-4 text-sm font-bold shadow-xl transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 delay-75"
                                    >
                                        <Edit3 className="h-4 w-4 mr-2" /> Edit
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        onClick={() => setDeleteConfirm(product.id)}
                                        className="rounded-full h-10 px-4 text-sm font-bold shadow-xl transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 delay-100"
                                    >
                                        <Trash2 className="h-4 w-4 mr-2" /> Delete
                                    </Button>
                                </div>
                                {/* Price flag overlay */}
                                {product.price_flag === "overpriced" && (
                                    <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-3 py-1.5 bg-white/70 backdrop-blur-md rounded-full border border-red-500/20 shadow-xl font-bold text-[10px] text-red-500 uppercase tracking-widest">
                                        <AlertTriangle className="h-3.5 w-3.5" />
                                        Pricing Alert
                                    </div>
                                )}
                                {product.price_flag === "fair" && (
                                    <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-3 py-1.5 bg-white/70 backdrop-blur-md rounded-full border border-emerald-500/20 shadow-xl font-bold text-[10px] text-emerald-600 uppercase tracking-widest">
                                        <Check className="h-3.5 w-3.5" />
                                        Fair Price
                                    </div>
                                )}
                            </div>

                            {/* Product info */}
                            <div className="p-5">
                                <h3 className="font-bold text-base text-gray-900 truncate mb-1">{product.name}</h3>
                                <div className="flex items-end justify-between">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Price</span>
                                        <span className="text-xl font-black text-gray-900">{formatPrice(product.price)}</span>
                                    </div>
                                    <span className={`text-xs font-bold px-2 py-1 rounded-md ${product.stock < 10 ? "bg-red-50 text-red-600" : "bg-gray-100 text-gray-600"}`}>
                                        {product.stock < 10 ? `${product.stock} left` : `${product.stock} in stock`}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                                    <span className="text-[10px] font-mono text-gray-400">ID: {product.id.slice(0, 8)}</span>
                                    <Badge variant="outline" className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border-emerald-200">
                                        Active
                                    </Badge>
                                </div>
                            </div>

                            {/* Delete confirmation */}
                            {deleteConfirm === product.id && (
                                <div className="absolute inset-x-0 bottom-0 p-4 bg-red-50 border-t border-red-100 backdrop-blur-sm animate-in slide-in-from-bottom-2">
                                    <p className="text-sm text-red-800 font-bold mb-3 text-center">Are you sure you want to delete this?</p>
                                    <div className="flex gap-2 justify-center">
                                        <Button size="sm" variant="ghost" onClick={() => setDeleteConfirm(null)} className="h-8 text-xs font-bold hover:bg-red-100 text-red-700">
                                            Cancel
                                        </Button>
                                        <Button size="sm" variant="destructive" onClick={() => handleDelete(product.id)} className="h-8 text-xs font-bold px-4">
                                            Confirm Delete
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Edit Modal */}
            {editingProduct && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity" onClick={() => setEditingProduct(null)} />
                    <div className="relative bg-white rounded-[2rem] border border-gray-200 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100">
                            <div>
                                <h2 className="text-xl font-black text-gray-900 tracking-tight">Edit Product</h2>
                                <p className="text-xs text-gray-400 font-bold mt-0.5">UPDATE LISTING DETAILS</p>
                            </div>
                            <button onClick={() => setEditingProduct(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <X className="h-5 w-5 text-gray-400" />
                            </button>
                        </div>

                        {/* Form */}
                        <div className="p-8 space-y-6">
                            {/* Image Upload */}
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Product Image</label>

                                <div className="flex flex-col gap-4">
                                    <div className="relative group">
                                        <div className="h-48 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden cursor-pointer hover:border-ratel-green-500 hover:bg-ratel-green-50/10 transition-all duration-300">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        const reader = new FileReader();
                                                        reader.onloadend = () => {
                                                            setEditForm({ ...editForm, image_url: reader.result as string });
                                                        };
                                                        reader.readAsDataURL(file);
                                                    }
                                                }}
                                            />
                                            {editForm.image_url ? (
                                                <img src={editForm.image_url} alt="Preview" className="h-full w-full object-contain p-4 transition-transform group-hover:scale-105" />
                                            ) : (
                                                <div className="text-center text-gray-400 group-hover:text-ratel-green-500 transition-colors">
                                                    <div className="bg-white p-3 rounded-2xl shadow-sm inline-block mb-3">
                                                        <ImagePlus className="h-6 w-6" />
                                                    </div>
                                                    <p className="text-xs font-bold">Click to upload image</p>
                                                    <p className="text-[10px] mt-1 opacity-70">SVG, PNG, JPG or GIF</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="relative">
                                        <div className="absolute inset-0 flex items-center">
                                            <span className="w-full border-t border-gray-200" />
                                        </div>
                                        <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-wider">
                                            <span className="bg-white px-2 text-gray-400">Or use URL</span>
                                        </div>
                                    </div>

                                    <Input
                                        value={editForm.image_url}
                                        onChange={(e) => setEditForm({ ...editForm, image_url: e.target.value })}
                                        className="rounded-xl text-xs bg-gray-50 border-gray-200 h-10"
                                        placeholder="https://..."
                                    />
                                </div>
                            </div>

                            {/* Product Name */}
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Product Name</label>
                                <Input
                                    value={editForm.name}
                                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                    className="rounded-xl h-11 font-bold text-base"
                                />
                            </div>

                            {/* Price & Stock */}
                            <div className="grid grid-cols-2 gap-5">
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center justify-between mb-2">
                                        Price (₦)
                                        <button
                                            onClick={handleBestPrice}
                                            disabled={isCalculatingBestPrice}
                                            className="text-[9px] bg-ratel-green-50 text-ratel-green-700 hover:bg-ratel-green-100 rounded-md px-1.5 py-0.5 transition-colors flex items-center gap-1"
                                            title="Auto-set fair price"
                                        >
                                            <Sparkles className={`h-2.5 w-2.5 ${isCalculatingBestPrice ? "animate-spin" : ""}`} />
                                            {isCalculatingBestPrice ? "Checking..." : "Best Price"}
                                        </button>
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₦</span>
                                        <Input
                                            type="number"
                                            value={editForm.price}
                                            onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                                            className="rounded-xl pl-8 font-bold h-11"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Stock</label>
                                    <Input
                                        type="number"
                                        value={editForm.stock}
                                        onChange={(e) => setEditForm({ ...editForm, stock: e.target.value })}
                                        className="rounded-xl h-11 font-bold"
                                    />
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Description</label>
                                <textarea
                                    value={editForm.description}
                                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                    rows={4}
                                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ratel-green-500/20 font-medium transition-all"
                                />
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-8 py-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50 rounded-b-[2rem]">
                            <Button variant="ghost" onClick={() => setEditingProduct(null)} className="rounded-xl font-bold text-gray-500 hover:text-gray-900 hover:bg-white">
                                Cancel
                            </Button>
                            <Button onClick={handleSave} className="bg-ratel-green-600 hover:bg-ratel-green-700 text-white rounded-xl font-bold shadow-lg shadow-ratel-green-600/20 h-10 px-6 transform transition-transform hover:scale-105">
                                <Save className="h-4 w-4 mr-2" /> Save Changes
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
