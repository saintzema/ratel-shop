import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { COUNTRY_CODES } from '@/lib/constants/countries';

export function CountryCodeSelect({ value, onChange }: { value: string, onChange: (code: string) => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const dropdownRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const filteredCountries = useMemo(() => {
        if (!searchQuery) return COUNTRY_CODES;
        const q = searchQuery.toLowerCase();
        return COUNTRY_CODES.filter(c => 
            c.country.toLowerCase().includes(q) || 
            c.code.includes(q)
        );
    }, [searchQuery]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        } else {
            setSearchQuery("");
        }
    }, [isOpen]);

    // Use the first country that matches the code, OR explicitly prefer Nigeria for +234, etc.
    // For duplicate codes like +1 (US, Canada), we just display the code in the button.
    const selectedCountry = COUNTRY_CODES.find(c => c.code === value) || COUNTRY_CODES.find(c => c.code === "+234");

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="h-12 px-3 rounded-xl border border-[#d2d2d7] bg-white flex items-center gap-2 hover:bg-gray-50 transition-all min-w-[90px]"
            >
                <span>{selectedCountry?.flag || "🌍"}</span>
                <span className="font-semibold text-sm">{value || "+234"}</span>
                <ChevronDown className={cn("h-3 w-3 text-gray-400 transition-transform", isOpen && "rotate-180")} />
            </button>
            
            {isOpen && (
                <div className="absolute z-50 top-full left-0 mt-1 w-64 bg-white rounded-xl border border-gray-200 shadow-2xl overflow-hidden flex flex-col">
                    <div className="p-2 border-b border-gray-100 bg-gray-50">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                ref={inputRef}
                                type="text"
                                placeholder="Search country or code..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-9 pl-9 pr-3 bg-white border border-gray-200 rounded-lg text-[13px] text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-green-500/30"
                            />
                        </div>
                    </div>
                    <div className="max-h-[240px] overflow-y-auto p-1 scrollbar-hide">
                        {filteredCountries.length > 0 ? filteredCountries.map((c, i) => (
                            <button
                                key={`${c.code}-${i}`}
                                type="button"
                                onClick={() => { onChange(c.code); setIsOpen(false); }}
                                className={cn(
                                    "w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors",
                                    value === c.code ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-gray-700 hover:bg-gray-100'
                                )}
                            >
                                <span className="text-base">{c.flag}</span>
                                <span className="flex-1 text-left font-medium truncate">{c.country}</span>
                                <span className="text-gray-400 text-xs font-mono shrink-0">{c.code}</span>
                            </button>
                        )) : (
                            <div className="px-4 py-6 text-center text-[13px] text-gray-500">
                                No countries found
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
