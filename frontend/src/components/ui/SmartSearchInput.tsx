"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, Clock, ChevronRight, X } from "lucide-react";
import { DemoStore } from "@/lib/demo-store";
import { cn } from "@/lib/utils";

interface SmartSearchInputProps {
    placeholder?: string;
    onSearch: (query: string) => void;
    containerClassName?: string;
    className?: string;
    inputTextColor?: string;
    placeholderColor?: string;
    showGlobalSearch?: boolean; // Not strictly handled manually here, but kept for interface compatibility
    hideSearchIcon?: boolean;
    value?: string;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export function SmartSearchInput({
    placeholder = "Search...",
    onSearch,
    containerClassName,
    className,
    inputTextColor = "text-gray-900",
    placeholderColor = "text-gray-400",
    hideSearchIcon = false,
    value: controlledValue,
    onChange: controlledOnChange,
    onKeyDown: controlledOnKeyDown,
}: SmartSearchInputProps) {
    const [query, setQuery] = useState("");
    const [isFocused, setIsFocused] = useState(false);
    const [recentSearches, setRecentSearches] = useState<string[]>([]);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Sync with controlled value if used
    const actualQuery = controlledValue !== undefined ? controlledValue : query;

    // Load recent searches from localStorage
    useEffect(() => {
        try {
            const saved = localStorage.getItem("fp_recent_searches");
            if (saved) {
                setRecentSearches(JSON.parse(saved));
            }
        } catch (e) {
            console.error("Failed to load recent searches", e);
        }
    }, []);

    // Generate predictive suggestions based on catalog
    useEffect(() => {
        if (actualQuery.trim().length < 2) {
            setSuggestions([]);
            return;
        }

        const q = actualQuery.toLowerCase();
        const catalog = DemoStore.getApprovedProducts();
        
        // Extract names, categories, and tags
        const pool = new Set<string>();
        catalog.forEach(p => {
            if (p.name.toLowerCase().includes(q)) pool.add(p.name);
            if (p.category.toLowerCase().includes(q)) pool.add(p.category);
            
            // Generate some smart combinations (Category + Keyword)
            const words = p.name.split(' ');
            if (words.length > 1 && words[0].toLowerCase().includes(q)) {
                 pool.add(`${words[0]} ${words[1] || ''}`.trim());
            }
        });

        const sortedSuggestions = Array.from(pool)
            .sort((a, b) => {
                // Exact start match ranks higher
                const aStartsWith = a.toLowerCase().startsWith(q) ? -1 : 1;
                const bStartsWith = b.toLowerCase().startsWith(q) ? -1 : 1;
                if (aStartsWith !== bStartsWith) return aStartsWith - bStartsWith;
                return a.length - b.length; // Shorter strings rank higher
            })
            .slice(0, 5); // Max 5 suggestions

        setSuggestions(sortedSuggestions);
    }, [actualQuery]);

    // Handle clicks outside the dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsFocused(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const saveRecentSearch = (term: string) => {
        if (!term.trim()) return;
        try {
            let updated = [term.trim(), ...recentSearches.filter(s => s.toLowerCase() !== term.trim().toLowerCase())];
            updated = updated.slice(0, 3); // Max 3 recent searches
            setRecentSearches(updated);
            localStorage.setItem("fp_recent_searches", JSON.stringify(updated));
        } catch (e) {
            console.error("Failed to save recent search", e);
        }
    };

    const handleSearchExecution = (term: string) => {
        saveRecentSearch(term);
        setIsFocused(false);
        if (controlledValue === undefined) {
             setQuery(term);
        }
        onSearch(term);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (controlledOnKeyDown) controlledOnKeyDown(e);
        if (e.key === 'Enter') {
            handleSearchExecution(actualQuery);
        }
    };

    const removeRecentSearch = (e: React.MouseEvent, term: string) => {
        e.stopPropagation();
        const updated = recentSearches.filter(s => s !== term);
        setRecentSearches(updated);
        localStorage.setItem("fp_recent_searches", JSON.stringify(updated));
    };

    return (
        <div ref={wrapperRef} className={cn("relative flex items-center w-full", containerClassName)}>
            {!hideSearchIcon && (
                <div className="absolute left-3 pointer-events-none">
                     <Search className="h-4 w-4 text-gray-400" />
                </div>
            )}
            
            <input
                type="text"
                placeholder={placeholder}
                value={actualQuery}
                onChange={(e) => {
                    if (controlledOnChange) controlledOnChange(e);
                    if (controlledValue === undefined) setQuery(e.target.value);
                }}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsFocused(true)}
                className={cn(
                    "w-full h-full bg-transparent focus:outline-none appearance-none font-medium",
                    !hideSearchIcon ? "pl-9" : "pl-4",
                    inputTextColor,
                    className
                )}
            />

            {/* Suggestions & Recent Searches Dropdown */}
            {isFocused && (actualQuery.trim().length > 0 || recentSearches.length > 0) && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl overflow-hidden z-[100] border border-gray-100 flex flex-col">
                    
                    {/* Predictive Suggestions */}
                    {actualQuery.trim().length >= 2 && suggestions.length > 0 && (
                        <div className="flex flex-col border-b border-gray-100 py-2">
                            {suggestions.map((suggestion, idx) => (
                                <button
                                    key={`sug-${idx}`}
                                    onClick={() => handleSearchExecution(suggestion)}
                                    className="w-full text-left px-4 py-2 hover:bg-emerald-50 text-[13px] md:text-sm text-gray-700 transition-colors flex items-center justify-between group"
                                >
                                    <div className="flex items-center gap-2">
                                        <Search className="h-3.5 w-3.5 text-emerald-600 group-hover:scale-110 transition-transform" />
                                        <span dangerouslySetInnerHTML={{
                                            __html: suggestion.replace(new RegExp(actualQuery, 'gi'), match => `<strong class="text-gray-900">${match}</strong>`)
                                        }} />
                                    </div>
                                    <ChevronRight className="h-3.5 w-3.5 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Recent Searches */}
                    {recentSearches.length > 0 && actualQuery.trim().length === 0 && (
                        <div className="flex flex-col py-2">
                            <div className="px-4 py-1.5 flex items-center justify-between">
                                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Recent Searches</span>
                            </div>
                            {recentSearches.map((term, idx) => (
                                <div
                                    key={`rec-${idx}`}
                                    className="w-full text-left px-4 py-2 hover:bg-gray-50 text-[13px] md:text-sm text-gray-600 transition-colors flex items-center justify-between cursor-pointer group"
                                    onClick={() => handleSearchExecution(term)}
                                >
                                    <div className="flex items-center gap-2">
                                        <Clock className="h-3.5 w-3.5 text-gray-400" />
                                        <span>{term}</span>
                                    </div>
                                    <button 
                                        onClick={(e) => removeRecentSearch(e, term)} 
                                        className="p-1 text-gray-300 hover:text-red-500 rounded-full hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
