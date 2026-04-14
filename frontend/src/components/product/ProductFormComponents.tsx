"use client";

import React, { useRef, useState, useEffect } from "react";
import { Upload, X, Image as ImageIcon, Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn, wrapInCDN } from "@/lib/utils";

/**
 * Smart Price Formatter
 * Formats a string/number with commas as thousands separators.
 */
export const formatPriceWithCommas = (val: string | number) => {
    if (val === null || val === undefined || val === "") return "";
    const clean = String(val).replace(/[^0-9]/g, "");
    if (!clean) return "";
    return parseInt(clean).toLocaleString();
};

/**
 * ProductImageSlot Component
 * A square preview box that triggers file upload on click.
 */
export function ProductImageSlot({
    url,
    onUrlChange,
    onFileSelect,
    label = "Select Image",
    className
}: {
    url: string;
    onUrlChange: (url: string) => void;
    onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
    label?: string;
    className?: string;
}) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    return (
        <div className={cn("space-y-3", className)}>
            <div 
                className="aspect-square w-full bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl overflow-hidden flex flex-col items-center justify-center relative group cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition-all"
                onClick={() => fileInputRef.current?.click()}
            >
                {url ? (
                    <>
                        <img src={url} alt="Preview" className="h-full w-full object-contain p-3 transition-transform group-hover:scale-105" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <p className="text-white text-xs font-bold uppercase tracking-widest">Change Image</p>
                        </div>
                    </>
                ) : (
                    <div className="text-center px-4">
                        <div className="h-12 w-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm group-hover:scale-110 transition-transform">
                            <Upload className="h-5 w-5 text-indigo-500" />
                        </div>
                        <p className="text-xs font-black text-gray-500 uppercase tracking-widest">{label}</p>
                        <p className="text-[10px] text-gray-400 mt-1">PNG, JPG, WebP</p>
                    </div>
                )}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={onFileSelect}
                />
            </div>
            <Input
                value={url}
                onChange={(e) => onUrlChange(e.target.value)}
                onBlur={(e) => onUrlChange(wrapInCDN(e.target.value))}
                className="rounded-xl text-xs bg-gray-50 border-gray-100 h-10 focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
                placeholder="Or paste URL..."
            />
        </div>
    );
}

/**
 * TagsInput Component
 * Shopify-style tag management.
 */
export function TagsInput({
    tags,
    onChange,
    className
}: {
    tags: string[];
    onChange: (tags: string[]) => void;
    className?: string;
}) {
    const [input, setInput] = useState("");

    const addTag = () => {
        const trimmed = input.trim();
        if (trimmed && !tags.includes(trimmed)) {
            onChange([...tags, trimmed]);
            setInput("");
        }
    };

    const removeTag = (tag: string) => {
        onChange(tags.filter((t) => t !== tag));
    };

    return (
        <div className={cn("space-y-3", className)}>
            <div className="flex flex-wrap gap-2 mb-1">
                {tags.map((tag) => (
                    <span 
                        key={tag} 
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-100 animate-in zoom-in-95 duration-200"
                    >
                        {tag}
                        <button onClick={() => removeTag(tag)} className="hover:text-indigo-900">
                            <X className="h-3 w-3" />
                        </button>
                    </span>
                ))}
            </div>
            <div className="relative">
                <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === ",") {
                            e.preventDefault();
                            addTag();
                        }
                    }}
                    placeholder="Add tags (Enter or comma to add)..."
                    className="rounded-xl bg-gray-50 border-gray-100 h-11 focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 pr-12"
                />
                <Button 
                    size="icon" 
                    variant="ghost" 
                    className="absolute right-1 top-1 h-9 w-9 text-indigo-500 hover:bg-indigo-50"
                    onClick={addTag}
                >
                    <Plus className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
