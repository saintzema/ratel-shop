"use client";

import { useState } from "react";
import { Save, Image as ImageIcon, Link as LinkIcon, Plus, Trash2, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface HeroAdSlot {
    id: string;
    title: string;
    img: string;
    link: string;
    type?: 'offer' | 'ad';
}

interface HeroConfig {
    adSlots: HeroAdSlot[];
}

interface HeroManagerProps {
    config: HeroConfig | null;
    onSave: (config: HeroConfig) => Promise<void>;
    isLoading?: boolean;
}

const DEFAULT_AD_SLOTS: HeroAdSlot[] = [
    { id: 'ad1', title: 'Flash Sales', img: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=400', link: '/deals', type: 'offer' },
    { id: 'ad2', title: 'New Arrivals', img: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400', link: '/category/new', type: 'offer' },
    { id: 'ad3', title: 'Best Sellers', img: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400', link: '/search?sort=popular', type: 'offer' },
    { id: 'ad4', title: 'Price Checker', img: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400', link: '#', type: 'ad' }
];

export function HeroManager({ config, onSave, isLoading }: HeroManagerProps) {
    const [adSlots, setAdSlots] = useState<HeroAdSlot[]>(config?.adSlots || DEFAULT_AD_SLOTS);
    const [isSaving, setIsSaving] = useState(false);

    const handleUpdateSlot = (id: string, field: keyof HeroAdSlot, value: string) => {
        setAdSlots(prev => prev.map(slot => slot.id === id ? { ...slot, [field]: value } : slot));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onSave({ adSlots });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <LayoutGrid className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-gray-900">Hero Ad Grid</h3>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Manage the 4 slots next to the main slider</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {adSlots.map((slot, index) => (
                    <div key={slot.id} className="p-6 rounded-2xl bg-gray-50 border border-gray-100 space-y-4">
                        <div className="flex items-center justify-between">
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Slot {index + 1}: {slot.id}</h4>
                            <div className="flex gap-1.5">
                                <button 
                                    onClick={() => handleUpdateSlot(slot.id, 'type', 'offer')}
                                    className={cn(
                                        "text-[9px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-md border transition-all",
                                        slot.type === 'offer' ? "bg-emerald-500 text-white border-emerald-500" : "bg-white text-gray-400 border-gray-200"
                                    )}
                                >Offer</button>
                                <button 
                                    onClick={() => handleUpdateSlot(slot.id, 'type', 'ad')}
                                    className={cn(
                                        "text-[9px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-md border transition-all",
                                        slot.type === 'ad' ? "bg-blue-500 text-white border-blue-500" : "bg-white text-gray-400 border-gray-200"
                                    )}
                                >Ad</button>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Label / Title</label>
                                <Input 
                                    value={slot.title} 
                                    onChange={(e) => handleUpdateSlot(slot.id, 'title', e.target.value)}
                                    className="h-10 bg-white border-gray-200 rounded-xl font-bold text-xs"
                                    placeholder="e.g. Flash Sales"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 flex items-center gap-1">
                                    <ImageIcon className="h-3 w-3" /> Image URL
                                </label>
                                <Input 
                                    value={slot.img} 
                                    onChange={(e) => handleUpdateSlot(slot.id, 'img', e.target.value)}
                                    className="h-10 bg-white border-gray-200 rounded-xl font-medium text-[11px]"
                                    placeholder="https://..."
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 flex items-center gap-1">
                                    <LinkIcon className="h-3 w-3" /> Link / Action
                                </label>
                                <Input 
                                    value={slot.link} 
                                    onChange={(e) => handleUpdateSlot(slot.id, 'link', e.target.value)}
                                    className="h-10 bg-white border-gray-200 rounded-xl font-medium text-[11px]"
                                    placeholder="/category/..."
                                />
                            </div>
                        </div>

                        <div className="pt-2">
                            <div className="aspect-video w-full rounded-xl overflow-hidden bg-gray-200 relative group">
                                <img src={slot.img} alt={slot.title} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="text-[10px] font-black text-white uppercase tracking-widest bg-brand-green-600 px-2 py-1 rounded">Preview</span>
                                </div>
                                <div className="absolute bottom-2 left-2">
                                    <span className="text-[9px] font-black text-white uppercase tracking-wider bg-brand-green-600 px-1.5 py-0.5 rounded shadow-sm">{slot.title}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-8 flex justify-end pt-6 border-t border-gray-100">
                <Button 
                    disabled={isSaving || isLoading} 
                    onClick={handleSave} 
                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs h-12 px-8 flex items-center gap-2"
                >
                    {isSaving ? "Saving..." : <><Save className="h-4 w-4" /> Save Hero Grid</>}
                </Button>
            </div>
        </div>
    );
}
