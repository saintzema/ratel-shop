"use client";

import { useState, useEffect } from "react";
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

import { DataSyncService, INITIAL_CATEGORIES } from "@/lib/sync-store";

export default function CategoryManagement() {
    const [categories, setCategories] = useState<Category[]>([]);
    
    // Load categories on mount
    useEffect(() => {
        setCategories(DataSyncService.getCategories());
    }, []);

    const updateAndSave = (updater: React.SetStateAction<Category[]>) => {
        setCategories(prev => {
            const next = typeof updater === 'function' ? updater(prev) : updater;
            DataSyncService.setCategories(next);
            return next;
        });
    };
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

    const saveEdit = async (parentId?: string) => {
        if (!editingId) return;
        const type = parentId ? "subcategory" : "category";
        
        try {
            const res = await fetch("/api/admin/taxonomy", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: editingId, type, name: editName })
            });

            if (res.ok) {
                if (parentId) {
                    updateAndSave(prev => prev.map(c => c.id === parentId ? {
                        ...c,
                        children: c.children.map(ch => ch.id === editingId ? { ...ch, name: editName } : ch)
                    } : c));
                } else {
                    updateAndSave(prev => prev.map(c => c.id === editingId ? { ...c, name: editName } : c));
                }
                setEditingId(null);
                flash("Category permanently updated in database.");
            } else {
                const data = await res.json();
                flash(`Error: ${data.error || "Failed to update"}`);
            }
        } catch (error) {
            flash("Network error.");
        }
    };

    const deleteCategory = async (id: string, parentId?: string) => {
        if (!confirm("Delete this category? This action is permanent and will sync to the database.")) return;
        
        const type = parentId ? "subcategory" : "category";
        const performDelete = async (method: string, body?: any) => {
            const options: RequestInit = { method };
            if (body) {
                options.headers = { "Content-Type": "application/json" };
                options.body = JSON.stringify(body);
            }
            return fetch(method === "DELETE" ? `/api/admin/taxonomy?id=${id}&type=${type}` : "/api/admin/taxonomy", options);
        };

        try {
            let res = await performDelete("DELETE");
            
            // Fallback for 405 Method Not Allowed
            if (res.status === 405) {
                res = await performDelete("POST", { action: "delete", id, type });
            }

            if (res.ok) {
                if (parentId) {
                    updateAndSave(prev => prev.map(c => c.id === parentId ? { ...c, children: c.children.filter(ch => ch.id !== id) } : c));
                } else {
                    updateAndSave(prev => prev.filter(c => c.id !== id));
                }
                flash("Category permanently deleted.");
            } else {
                const data = await res.json();
                flash(`Error: ${data.error || "Failed to delete"}`);
            }
        } catch (error) {
            flash("Network error. Try again.");
        }
    };

    const addTopCategory = async () => {
        const name = newCatName.trim();
        if (!name) return;
        
        // Local duplicate check
        if (categories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
            flash("Error: Category already exists.");
            return;
        }

        try {
            const res = await fetch("/api/admin/taxonomy", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: "category", name })
            });

            if (res.ok) {
                const data = await res.json();
                updateAndSave(prev => [...prev, {
                    ...data.category,
                    product_count: 0,
                    children: [],
                }]);
                setNewCatName("");
                setShowAddForm(false);
                flash("Category added to database.");
            } else {
                const data = await res.json();
                flash(`Error: ${data.error || "Failed to add"}`);
            }
        } catch (error) {
            flash("Network error.");
        }
    };

    const addChildCategory = async (parentId: string) => {
        const name = newChildName.trim();
        if (!name) return;

        const parent = categories.find(c => c.id === parentId);
        if (parent?.children.some(ch => ch.name.toLowerCase() === name.toLowerCase())) {
            flash("Error: Subcategory already exists.");
            return;
        }

        try {
            const res = await fetch("/api/admin/taxonomy", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: "subcategory", name, categoryId: parentId })
            });

            if (res.ok) {
                const data = await res.json();
                updateAndSave(prev => prev.map(c => c.id === parentId ? {
                    ...c,
                    children: [...c.children, {
                        ...data.subcategory,
                        product_count: 0,
                        children: [],
                    }]
                } : c));
                setNewChildName("");
                setAddingChildTo(null);
                flash("Subcategory added to database.");
            } else {
                const data = await res.json();
                flash(`Error: ${data.error || "Failed to add"}`);
            }
        } catch (error) {
            flash("Network error.");
        }
    };

    const purgeDuplicates = () => {
        if (!confirm("Automatically remove duplicate category names?")) return;
        
        const seen = new Set();
        const next = categories.filter(c => {
            const key = c.name.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        }).map(c => ({
            ...c,
            children: c.children.filter((ch, i, arr) => arr.findIndex(x => x.name.toLowerCase() === ch.name.toLowerCase()) === i)
        }));

        updateAndSave(next);
        flash("Duplicates purged locally. Deletions from DB must be manual.");
    };

    const restoreDefaults = () => {
        if (!confirm("Restore default taxonomy? This will overwrite current categories with the system defaults (including Fans, Generators, etc.).")) return;
        updateAndSave(INITIAL_CATEGORIES);
        flash("Taxonomy restored to defaults.");
    };

    return (
        <div className="p-8 max-w-7xl mx-auto min-h-screen bg-gray-50/30">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
                <div className="flex items-center gap-4">
                    <Link href="/admin/dashboard" className="p-2 hover:bg-white rounded-xl transition-colors border border-transparent hover:border-gray-200">
                        <ChevronLeft className="h-5 w-5 text-gray-500" />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                            <FolderTree className="h-8 w-8 text-blue-600" />
                            Taxonomy <span className="text-blue-600">Engine</span>
                        </h1>
                        <p className="text-sm text-gray-500 font-medium mt-1">Manage global product categories and attributes</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <Button 
                        variant="outline"
                        onClick={restoreDefaults}
                        className="rounded-xl border-amber-200 text-amber-700 hover:bg-amber-50 h-11 px-6 font-bold text-xs uppercase tracking-widest"
                    >
                        Restore Defaults
                    </Button>
                    <Button 
                        variant="outline"
                        onClick={purgeDuplicates}
                        className="rounded-xl border-rose-200 text-rose-700 hover:bg-rose-50 h-11 px-6 font-bold text-xs uppercase tracking-widest"
                    >
                        Purge Duplicates
                    </Button>
                    <Button 
                        onClick={() => setShowAddForm(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-11 px-6 font-bold text-xs uppercase tracking-widest shadow-lg shadow-blue-500/20"
                    >
                        <Plus className="h-4 w-4 mr-2" /> New Category
                    </Button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-8">
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
                                            <div className="flex items-center gap-0.5 transition-opacity">
                                                <button onClick={() => { setAddingChildTo(cat.id); setNewChildName(""); }} className="p-1.5 hover:bg-gray-100 rounded-lg" title="Add subcategory">
                                                    <Plus className="h-3.5 w-3.5 text-gray-400" />
                                                </button>
                                                <button onClick={() => startEditing(cat)} className="p-1.5 hover:bg-gray-100 rounded-lg" title="Edit">
                                                    <Edit2 className="h-3.5 w-3.5 text-gray-400" />
                                                </button>
                                                <button onClick={() => deleteCategory(cat.id)} className="p-1.5 hover:bg-rose-50 rounded-lg" title="Delete">
                                                    <Trash2 className="h-3.5 w-3.5 text-rose-500 hover:text-rose-600" />
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
                                                <div className="flex items-center gap-0.5 transition-opacity">
                                                    <button onClick={() => startEditing(child)} className="p-1 hover:bg-gray-100 rounded" title="Edit">
                                                        <Edit2 className="h-3 w-3 text-gray-400" />
                                                    </button>
                                                    <button onClick={() => deleteCategory(child.id, cat.id)} className="p-1 hover:bg-rose-50 rounded" title="Delete">
                                                        <Trash2 className="h-3 w-3 text-rose-500 hover:text-rose-600" />
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
