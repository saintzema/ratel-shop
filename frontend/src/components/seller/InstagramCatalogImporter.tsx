"use client";

import { useState } from "react";
import { DownloadCloud, Loader2, CheckSquare, Square, Package, Instagram } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { DataSyncService } from "@/lib/sync-store";
import { cn } from "@/lib/utils";

const MOCK_IG_POSTS = [
    { id: "ig_1", media_url: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800", caption: "Premium Leather Bag. Classic edition.", media_type: "IMAGE" },
    { id: "ig_2", media_url: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800", caption: "Classic Watch for everyday carry.", media_type: "IMAGE" },
    { id: "ig_3", media_url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800", caption: "Wireless headphones. 🎧", media_type: "IMAGE" },
    { id: "ig_4", media_url: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800", caption: "Step up your sneaker game. Limited stock!", media_type: "IMAGE" }
];

export function InstagramCatalogImporter() {
    const [handle, setHandle] = useState("");
    const [loading, setLoading] = useState(false);
    const [posts, setPosts] = useState<any[]>([]);
    const [selectedPosts, setSelectedPosts] = useState<string[]>([]);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    
    // Editor State
    const [currentEditIndex, setCurrentEditIndex] = useState(0);
    const [editingProducts, setEditingProducts] = useState<any[]>([]);

    const handleFetchPosts = async () => {
        const cleanHandle = handle.replace("@", "").trim();
        if (cleanHandle.length < 2) return;

        setLoading(true);
        try {
            // Simulated API call
            await new Promise(resolve => setTimeout(resolve, 1500));
            setPosts(MOCK_IG_POSTS);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const toggleSelection = (id: string) => {
        setSelectedPosts(prev => 
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        );
    };

    const openImportModal = () => {
        const selected = posts.filter(p => selectedPosts.includes(p.id));
        setEditingProducts(selected.map(p => ({
            id: p.id,
            name: p.caption.split('.')[0] || "Instagram Product",
            description: p.caption,
            price: "",
            stock: "10",
            category: "Fashion",
            image_url: p.media_url
        })));
        setCurrentEditIndex(0);
        setIsImportModalOpen(true);
    };

    const updateCurrentProduct = (field: string, value: string) => {
        const newProducts = [...editingProducts];
        newProducts[currentEditIndex] = { ...newProducts[currentEditIndex], [field]: value };
        setEditingProducts(newProducts);
    };

    const saveProductsToStore = () => {
        const sellerId = DataSyncService.getCurrentSellerId();
        if (!sellerId) return;

        editingProducts.forEach(prod => {
            const newProduct = {
                id: `prod_ig_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                seller_id: sellerId,
                name: prod.name,
                description: prod.description,
                price: parseFloat(prod.price) || 0,
                stock: parseInt(prod.stock) || 0,
                category: prod.category,
                image_url: prod.image_url,
                images: [],
                is_active: true,
                created_at: new Date().toISOString()
            };
            DataSyncService.addApprovedProduct(newProduct as any);
        });

        alert(`Successfully imported ${editingProducts.length} product(s) to your store!`);
        setIsImportModalOpen(false);
        setSelectedPosts([]);
        setPosts([]);
        setHandle("");
        
        window.dispatchEvent(new Event("sync-store-update"));
    };

    return (
        <div className="bg-white rounded-[32px] border border-gray-100 p-8 shadow-sm h-full flex flex-col">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-pink-50 rounded-xl">
                    <Instagram className="h-6 w-6 text-pink-600" />
                </div>
                <div>
                    <h3 className="text-xl font-black text-gray-900 leading-tight">Instagram Catalog Sync</h3>
                    <p className="text-xs text-gray-500 font-medium">Import your posts and turn them into products.</p>
                </div>
            </div>

            {posts.length === 0 ? (
                <div className="space-y-4 flex-1">
                    <div className="relative">
                        <Input 
                            placeholder="yourstore.ng"
                            value={handle}
                            onChange={(e) => setHandle(e.target.value)}
                            className="h-14 rounded-2xl pl-12 pr-32 border-gray-200 focus:ring-pink-500"
                        />
                        <div className="absolute left-4 top-4 h-6 w-6 text-gray-300 flex items-center justify-center font-bold text-xs">@</div>
                        <button 
                            onClick={handleFetchPosts}
                            disabled={loading || !handle}
                            className="absolute right-2 top-2 bottom-2 bg-gradient-to-r from-pink-600 to-purple-600 text-white px-6 rounded-xl font-black text-xs uppercase tracking-widest disabled:opacity-50 transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center"
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Fetch Posts"}
                        </button>
                    </div>
                    <div className="p-4 bg-pink-50/50 rounded-2xl border border-pink-100 mt-auto">
                        <p className="text-[10px] text-pink-800/70 font-bold leading-relaxed">
                            <strong>Tip:</strong> Ziva AI will analyze your recent Instagram posts and try to extract the product name and price based on the caption!
                        </p>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Select Posts to Import</h4>
                        <Button 
                            size="sm"
                            disabled={selectedPosts.length === 0}
                            onClick={openImportModal}
                            className="bg-gradient-to-r from-pink-600 to-purple-600 text-white font-bold rounded-xl h-8 text-xs shadow-md"
                        >
                            Edit & Import ({selectedPosts.length})
                        </Button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1">
                        {posts.map(post => {
                            const isSelected = selectedPosts.includes(post.id);
                            return (
                                <div 
                                    key={post.id} 
                                    className={`relative group rounded-2xl overflow-hidden cursor-pointer border-2 transition-all ${isSelected ? 'border-pink-500 shadow-sm' : 'border-transparent hover:border-gray-200'}`}
                                    onClick={() => toggleSelection(post.id)}
                                >
                                    <div className="aspect-square relative bg-gray-100">
                                        <img src={post.media_url} alt="" className="w-full h-full object-cover" />
                                        <div className="absolute top-2 right-2 z-10">
                                            {isSelected ? (
                                                <div className="bg-pink-600 text-white rounded-md">
                                                    <CheckSquare className="h-5 w-5" />
                                                </div>
                                            ) : (
                                                <div className="bg-white/80 text-gray-400 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Square className="h-5 w-5" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                    <Button variant="ghost" onClick={() => setPosts([])} className="w-full text-xs text-gray-500 font-bold mt-2">
                        Cancel
                    </Button>
                </div>
            )}

            {/* Import Editor Modal */}
            <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
                <DialogContent className="max-w-3xl p-0 overflow-hidden bg-gray-50 rounded-3xl">
                    <div className="flex h-[500px]">
                        {/* Sidebar: Selected Posts List */}
                        <div className="w-64 bg-white border-r border-gray-100 flex flex-col hidden md:flex">
                            <div className="p-4 border-b border-gray-100">
                                <h3 className="font-black text-gray-900 tracking-tight">Import Products ({editingProducts.length})</h3>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                                {editingProducts.map((p, idx) => (
                                    <button
                                        key={p.id}
                                        onClick={() => setCurrentEditIndex(idx)}
                                        className={cn(
                                            "w-full flex items-center gap-3 p-2 rounded-xl text-left transition-colors",
                                            currentEditIndex === idx ? "bg-pink-50 border border-pink-100" : "hover:bg-gray-50 border border-transparent"
                                        )}
                                    >
                                        <img src={p.image_url} alt="" className="h-10 w-10 rounded-lg object-cover bg-gray-100 shrink-0" />
                                        <div className="min-w-0 flex-1">
                                            <p className={cn("text-xs font-bold truncate", currentEditIndex === idx ? "text-pink-700" : "text-gray-700")}>{p.name}</p>
                                            <p className="text-[10px] text-emerald-600 font-bold mt-0.5">{p.price ? `₦${p.price}` : "Needs Price"}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Editor Area */}
                        {editingProducts.length > 0 && (
                            <div className="flex-1 flex flex-col bg-white overflow-hidden">
                                <div className="p-6 overflow-y-auto flex-1">
                                    <div className="flex flex-col sm:flex-row gap-6">
                                        <div className="w-full sm:w-40 shrink-0">
                                            <div className="aspect-square rounded-2xl overflow-hidden border border-gray-200 shadow-sm relative">
                                                <img src={editingProducts[currentEditIndex].image_url} alt="" className="w-full h-full object-cover" />
                                            </div>
                                        </div>
                                        <div className="flex-1 space-y-4">
                                            <div>
                                                <label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1.5 block">Product Name</label>
                                                <input 
                                                    type="text" 
                                                    value={editingProducts[currentEditIndex].name}
                                                    onChange={e => updateCurrentProduct("name", e.target.value)}
                                                    className="w-full px-4 h-11 rounded-xl border border-gray-200 focus:border-pink-500 focus:ring-2 focus:ring-pink-200 outline-none text-sm font-bold text-gray-900 transition-all"
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1.5 block">Price (₦)</label>
                                                    <input 
                                                        type="number" 
                                                        value={editingProducts[currentEditIndex].price}
                                                        onChange={e => updateCurrentProduct("price", e.target.value)}
                                                        placeholder="e.g. 15000"
                                                        className="w-full px-4 h-11 rounded-xl border border-gray-200 focus:border-pink-500 focus:ring-2 focus:ring-pink-200 outline-none text-sm font-bold text-gray-900 transition-all"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1.5 block">Stock</label>
                                                    <input 
                                                        type="number" 
                                                        value={editingProducts[currentEditIndex].stock}
                                                        onChange={e => updateCurrentProduct("stock", e.target.value)}
                                                        className="w-full px-4 h-11 rounded-xl border border-gray-200 focus:border-pink-500 focus:ring-2 focus:ring-pink-200 outline-none text-sm font-bold text-gray-900 transition-all"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1.5 block">Category</label>
                                                <select 
                                                    value={editingProducts[currentEditIndex].category}
                                                    onChange={e => updateCurrentProduct("category", e.target.value)}
                                                    className="w-full px-4 h-11 rounded-xl border border-gray-200 focus:border-pink-500 focus:ring-2 focus:ring-pink-200 outline-none text-sm font-bold text-gray-900 transition-all bg-white"
                                                >
                                                    <option>Fashion</option>
                                                    <option>Electronics</option>
                                                    <option>Home</option>
                                                    <option>Beauty</option>
                                                    <option>Gaming</option>
                                                    <option>Uncategorized</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1.5 block">Description</label>
                                                <textarea 
                                                    value={editingProducts[currentEditIndex].description}
                                                    onChange={e => updateCurrentProduct("description", e.target.value)}
                                                    className="w-full p-4 rounded-xl border border-gray-200 focus:border-pink-500 focus:ring-2 focus:ring-pink-200 outline-none text-sm text-gray-600 transition-all"
                                                    rows={4}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-1">
                                            {editingProducts.map((_, idx) => (
                                                <div 
                                                    key={idx} 
                                                    className={cn("h-2 rounded-full transition-all cursor-pointer", currentEditIndex === idx ? "w-4 bg-pink-500" : "w-2 bg-gray-300")}
                                                    onClick={() => setCurrentEditIndex(idx)}
                                                />
                                            ))}
                                        </div>
                                        <p className="text-xs text-gray-500 font-medium hidden sm:block">
                                            Product {currentEditIndex + 1} of {editingProducts.length}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="ghost" className="rounded-xl font-bold" onClick={() => setIsImportModalOpen(false)}>Cancel</Button>
                                        <Button 
                                            className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white rounded-xl font-bold px-6 shadow-md"
                                            onClick={saveProductsToStore}
                                        >
                                            <Package className="h-4 w-4 mr-2" /> Publish {editingProducts.length}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
