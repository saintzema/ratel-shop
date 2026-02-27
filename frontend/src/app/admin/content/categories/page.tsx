"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    FolderTree,
    Plus,
    Edit2,
    Trash2,
    ChevronRight,
    ChevronDown,
    ChevronLeft,
    GripVertical,
    Tag,
    Package
} from "lucide-react";
import Link from "next/link";

interface Category {
    id: string;
    name: string;
    slug: string;
    product_count: number;
    children: Category[];
    expanded?: boolean;
}

const INITIAL_CATEGORIES: Category[] = [
    {
        id: "cat_1", name: "Electronics", slug: "electronics", product_count: 42, children: [
            { id: "cat_1_1", name: "Smartphones", slug: "smartphones", product_count: 15, children: [] },
            { id: "cat_1_2", name: "Laptops", slug: "laptops", product_count: 12, children: [] },
            { id: "cat_1_3", name: "Audio & Headphones", slug: "audio-headphones", product_count: 8, children: [] },
            { id: "cat_1_4", name: "Wearables", slug: "wearables", product_count: 7, children: [] },
        ]
    },
    {
        id: "cat_2", name: "Fashion", slug: "fashion", product_count: 38, children: [
            { id: "cat_2_1", name: "Men's Clothing", slug: "mens-clothing", product_count: 14, children: [] },
            { id: "cat_2_2", name: "Women's Clothing", slug: "womens-clothing", product_count: 16, children: [] },
            { id: "cat_2_3", name: "Shoes & Sneakers", slug: "shoes-sneakers", product_count: 8, children: [] },
        ]
    },
    {
        id: "cat_3", name: "Home & Living", slug: "home-living", product_count: 25, children: [
            { id: "cat_3_1", name: "Kitchen", slug: "kitchen", product_count: 10, children: [] },
            { id: "cat_3_2", name: "Decor", slug: "decor", product_count: 8, children: [] },
            { id: "cat_3_3", name: "Bedding", slug: "bedding", product_count: 7, children: [] },
        ]
    },
    {
        id: "cat_4", name: "Beauty & Health", slug: "beauty-health", product_count: 20, children: [
            { id: "cat_4_1", name: "Skincare", slug: "skincare", product_count: 12, children: [] },
            { id: "cat_4_2", name: "Haircare", slug: "haircare", product_count: 8, children: [] },
        ]
    },
    {
        id: "cat_5", name: "Gaming", slug: "gaming", product_count: 15, children: [
            { id: "cat_5_1", name: "Consoles", slug: "consoles", product_count: 5, children: [] },
            { id: "cat_5_2", name: "Accessories", slug: "gaming-accessories", product_count: 10, children: [] },
        ]
    },
];

export default function CategoryManagement() {
    const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
    const [expanded, setExpanded] = useState<Set<string>>(new Set(["cat_1"]));
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");
    const [showAddForm, setShowAddForm] = useState(false);
    const [newCatName, setNewCatName] = useState("");
    const [addingChildTo, setAddingChildTo] = useState<string | null>(null);
    const [newChildName, setNewChildName] = useState("");
    const [statusMsg, setStatusMsg] = useState<string | null>(null);

    const flash = (msg: string) => {
        setStatusMsg(msg);
        setTimeout(() => setStatusMsg(null), 2500);
    };

    const toggleExpand = (id: string) => {
        setExpanded(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const startEditing = (cat: Category) => {
        setEditingId(cat.id);
        setEditName(cat.name);
    };

    const saveEdit = (parentId?: string) => {
        if (parentId) {
            setCategories(prev => prev.map(c => c.id === parentId ? {
                ...c,
                children: c.children.map(ch => ch.id === editingId ? { ...ch, name: editName, slug: editName.toLowerCase().replace(/\s+/g, "-") } : ch)
            } : c));
        } else {
            setCategories(prev => prev.map(c => c.id === editingId ? { ...c, name: editName, slug: editName.toLowerCase().replace(/\s+/g, "-") } : c));
        }
        setEditingId(null);
        flash("Category updated.");
    };

    const deleteCategory = (id: string, parentId?: string) => {
        if (!confirm("Delete this category?")) return;
        if (parentId) {
            setCategories(prev => prev.map(c => c.id === parentId ? { ...c, children: c.children.filter(ch => ch.id !== id) } : c));
        } else {
            setCategories(prev => prev.filter(c => c.id !== id));
        }
        flash("Category deleted.");
    };

    const addTopCategory = () => {
        if (!newCatName.trim()) return;
        setCategories(prev => [...prev, {
            id: `cat_${Date.now()}`,
            name: newCatName,
            slug: newCatName.toLowerCase().replace(/\s+/g, "-"),
            product_count: 0,
            children: [],
        }]);
        setNewCatName("");
        setShowAddForm(false);
        flash("Category added.");
    };

    const addChildCategory = (parentId: string) => {
        if (!newChildName.trim()) return;
        setCategories(prev => prev.map(c => c.id === parentId ? {
            ...c,
            children: [...c.children, {
                id: `cat_${Date.now()}`,
                name: newChildName,
                slug: newChildName.toLowerCase().replace(/\s+/g, "-"),
                product_count: 0,
                children: [],
            }]
        } : c));
        setNewChildName("");
        setAddingChildTo(null);
        flash("Subcategory added.");
    };

    return (
        <div className="space-y-8 max-w-4xl">
            <div className="flex items-center justify-between">
                <div>
                    <Link href="/admin/settings" className="inline-flex items-center gap-1 text-xs font-bold text-gray-400 hover:text-gray-600 mb-3">
                        <ChevronLeft className="h-3 w-3" /> Back to Settings
                    </Link>
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight">Taxonomy & Categories</h2>
                    <p className="text-sm text-gray-500 font-bold uppercase tracking-wider mt-1">Organize products into categories and subcategories</p>
                </div>
                <Button onClick={() => setShowAddForm(!showAddForm)} className="bg-brand-green-600 hover:bg-brand-green-700 text-white rounded-xl font-bold text-xs px-5 h-10">
                    <Plus className="h-4 w-4 mr-1.5" /> Add Category
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Top-Level</p>
                    <p className="text-2xl font-black text-gray-900 mt-1">{categories.length}</p>
                </div>
                <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Subcategories</p>
                    <p className="text-2xl font-black text-gray-900 mt-1">{categories.reduce((sum, c) => sum + c.children.length, 0)}</p>
                </div>
                <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Products</p>
                    <p className="text-2xl font-black text-gray-900 mt-1">{categories.reduce((sum, c) => sum + c.product_count, 0)}</p>
                </div>
            </div>

            {/* Add Form */}
            {showAddForm && (
                <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm flex gap-3">
                    <Input placeholder="Category name" value={newCatName} onChange={e => setNewCatName(e.target.value)} className="rounded-xl flex-1" />
                    <Button onClick={addTopCategory} disabled={!newCatName.trim()} className="bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-bold px-5">Add</Button>
                    <Button variant="ghost" onClick={() => setShowAddForm(false)} className="rounded-xl text-xs font-bold text-gray-400">Cancel</Button>
                </div>
            )}

            {/* Category Tree */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden divide-y divide-gray-100">
                {categories.map(cat => {
                    const isExpanded = expanded.has(cat.id);
                    return (
                        <div key={cat.id}>
                            {/* Parent Category */}
                            <div className="flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors group">
                                <button onClick={() => toggleExpand(cat.id)} className="p-0.5">
                                    {cat.children.length > 0 ? (
                                        isExpanded ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />
                                    ) : <div className="w-4" />}
                                </button>
                                <FolderTree className="h-4 w-4 text-brand-green-600 shrink-0" />

                                {editingId === cat.id ? (
                                    <div className="flex gap-2 flex-1">
                                        <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-8 text-sm rounded-lg flex-1" />
                                        <Button size="sm" onClick={() => saveEdit()} className="h-8 rounded-lg text-xs bg-gray-900 text-white">Save</Button>
                                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-8 rounded-lg text-xs text-gray-400">Cancel</Button>
                                    </div>
                                ) : (
                                    <div className="flex-1 flex items-center justify-between">
                                        <div>
                                            <span className="font-bold text-sm text-gray-900">{cat.name}</span>
                                            <span className="text-[10px] text-gray-400 ml-2 font-mono">/{cat.slug}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge className="bg-gray-100 text-gray-500 hover:bg-gray-100 border-none text-[10px] font-bold">
                                                <Package className="h-3 w-3 mr-1" /> {cat.product_count}
                                            </Badge>
                                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => { setAddingChildTo(cat.id); setNewChildName(""); }} className="p-1.5 hover:bg-gray-100 rounded-lg" title="Add subcategory">
                                                    <Plus className="h-3.5 w-3.5 text-gray-400" />
                                                </button>
                                                <button onClick={() => startEditing(cat)} className="p-1.5 hover:bg-gray-100 rounded-lg" title="Edit">
                                                    <Edit2 className="h-3.5 w-3.5 text-gray-400" />
                                                </button>
                                                <button onClick={() => deleteCategory(cat.id)} className="p-1.5 hover:bg-rose-50 rounded-lg" title="Delete">
                                                    <Trash2 className="h-3.5 w-3.5 text-gray-300 hover:text-rose-500" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Add Subcategory Form */}
                            {addingChildTo === cat.id && (
                                <div className="pl-14 pr-5 py-3 bg-gray-50 flex gap-2">
                                    <Input placeholder="Subcategory name" value={newChildName} onChange={e => setNewChildName(e.target.value)} className="h-8 text-sm rounded-lg flex-1" />
                                    <Button size="sm" onClick={() => addChildCategory(cat.id)} disabled={!newChildName.trim()} className="h-8 rounded-lg text-xs bg-gray-900 text-white">Add</Button>
                                    <Button size="sm" variant="ghost" onClick={() => setAddingChildTo(null)} className="h-8 rounded-lg text-xs text-gray-400">Cancel</Button>
                                </div>
                            )}

                            {/* Children */}
                            {isExpanded && cat.children.map(child => (
                                <div key={child.id} className="flex items-center gap-3 pl-14 pr-5 py-3 hover:bg-gray-50 transition-colors group border-t border-gray-50">
                                    <Tag className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                                    {editingId === child.id ? (
                                        <div className="flex gap-2 flex-1">
                                            <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-7 text-xs rounded-lg flex-1" />
                                            <Button size="sm" onClick={() => saveEdit(cat.id)} className="h-7 rounded-lg text-[10px] bg-gray-900 text-white">Save</Button>
                                            <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-7 rounded-lg text-[10px] text-gray-400">Cancel</Button>
                                        </div>
                                    ) : (
                                        <div className="flex-1 flex items-center justify-between">
                                            <div>
                                                <span className="text-sm text-gray-700">{child.name}</span>
                                                <span className="text-[10px] text-gray-400 ml-2 font-mono">/{child.slug}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] text-gray-400 font-bold">{child.product_count} products</span>
                                                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => startEditing(child)} className="p-1 hover:bg-gray-100 rounded" title="Edit">
                                                        <Edit2 className="h-3 w-3 text-gray-400" />
                                                    </button>
                                                    <button onClick={() => deleteCategory(child.id, cat.id)} className="p-1 hover:bg-rose-50 rounded" title="Delete">
                                                        <Trash2 className="h-3 w-3 text-gray-300 hover:text-rose-500" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    );
                })}
            </div>

            {/* Status Toast */}
            {statusMsg && (
                <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-6 py-3.5 rounded-2xl shadow-2xl text-sm font-bold z-50">
                    {statusMsg}
                </div>
            )}
        </div>
    );
}
