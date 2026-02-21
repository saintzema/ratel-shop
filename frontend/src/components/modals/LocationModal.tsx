"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, X, Check, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

import { NIGERIAN_STATES } from "@/lib/nigerian-states";

const ALL_LOCATIONS = NIGERIAN_STATES.flatMap(s =>
    s.cities.map(c => `${c}, ${s.state}`)
).sort();

interface LocationModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentLocation: string;
    onSelectLocation: (location: string) => void;
}

export function LocationModal({ isOpen, onClose, currentLocation, onSelectLocation }: LocationModalProps) {
    const [searchQuery, setSearchQuery] = useState("");

    const filteredLocations = ALL_LOCATIONS.filter(loc =>
        loc.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-300"
                    >
                        <div className="p-6 border-b border-gray-100 bg-gray-50">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-black font-bold text-lg">Choose your location</h3>
                                <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                                    <X className="h-5 w-5 text-gray-500" />
                                </button>
                            </div>
                            <p className="text-xs text-gray-500 mb-4">
                                Delivery options and speeds may vary for different locations.
                            </p>

                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    placeholder="Search city, e.g. Ikeja, Lagos"
                                    className="pl-9 text-black bg-white border-gray-200"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="max-h-[400px] overflow-y-auto p-2">
                            <div className="space-y-1">
                                {filteredLocations.length > 0 ? (
                                    filteredLocations.map((loc) => (
                                        <button
                                            key={loc}
                                            onClick={() => {
                                                onSelectLocation(loc);
                                                onClose();
                                            }}
                                            className={`w-full flex items-center justify-between p-3 rounded-lg text-sm font-medium transition-colors ${currentLocation === loc
                                                ? "bg-ratel-green-50 text-ratel-green-700"
                                                : "hover:bg-gray-100 text-gray-700"
                                                }`}
                                        >
                                            <span className="flex items-center gap-3">
                                                <MapPin className={`h-4 w-4 ${currentLocation === loc ? "text-ratel-green-600" : "text-gray-400"}`} />
                                                {loc}
                                            </span>
                                            {currentLocation === loc && <Check className="h-4 w-4 text-ratel-green-600" />}
                                        </button>
                                    ))
                                ) : (
                                    <div className="p-8 text-center text-gray-400 text-sm">
                                        No locations found for "{searchQuery}"
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 bg-ratel-orange text-black text-sm font-bold rounded-lg hover:bg-amber-500 transition-colors shadow-sm"
                            >
                                Done
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
