"use client";

import { useEffect, useState } from "react";
import { NegotiationRequest, Product } from "@/lib/types";
import { DemoStore } from "@/lib/demo-store";
import { formatPrice, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    CheckCircle,
    XCircle,
    MessageSquare,
    Clock,
    Search,
    Send,
    ChevronLeft,
    Tag
} from "lucide-react";
import { Input } from "@/components/ui/input";

export default function NegotiationsPage() {
    const [negotiations, setNegotiations] = useState<NegotiationRequest[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [filter, setFilter] = useState<"all" | "pending" | "resolved">("all");
    const [search, setSearch] = useState("");

    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [counterPrice, setCounterPrice] = useState("");
    const [counterMessage, setCounterMessage] = useState("");

    useEffect(() => {
        const sellerId = DemoStore.getCurrentSellerId();
        if (!sellerId) return;

        const loadData = () => {
            const negs = DemoStore.getNegotiations(sellerId);
            setNegotiations(negs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
            setProducts(DemoStore.getProducts());
        };

        loadData();
        window.addEventListener("storage", loadData);
        return () => window.removeEventListener("storage", loadData);
    }, []);

    const handleAction = (id: string, status: "accepted" | "rejected") => {
        DemoStore.updateNegotiationStatus(id, status);
        const sellerId = DemoStore.getCurrentSellerId();
        if (sellerId) setNegotiations(DemoStore.getNegotiations(sellerId));
    };

    const handleCounterOffer = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedId || !counterPrice) return;

        DemoStore.sendCounterOffer(selectedId, Number(counterPrice), counterMessage);

        setCounterPrice("");
        setCounterMessage("");

        const sellerId = DemoStore.getCurrentSellerId();
        if (sellerId) setNegotiations(DemoStore.getNegotiations(sellerId));
    };

    const filteredNegs = negotiations
        .filter(n => {
            if (filter === "pending") return n.status === "pending" && !n.counter_status;
            if (filter === "resolved") return n.status !== "pending" || n.counter_status;
            return true;
        })
        .filter(n => {
            if (!search) return true;
            return n.customer_name.toLowerCase().includes(search.toLowerCase());
        });

    const activeNeg = negotiations.find(n => n.id === selectedId);
    const activeProduct = activeNeg ? products.find(p => p.id === activeNeg.product_id) : null;

    useEffect(() => {
        if (!selectedId && filteredNegs.length > 0) {
            setSelectedId(filteredNegs[0].id);
        }
    }, [filteredNegs, selectedId]);

    useEffect(() => {
        if (activeProduct && !counterPrice) {
            setCounterPrice(Math.round(activeProduct.price * 0.9).toString());
        }
    }, [activeProduct, selectedId]);

    return (
        <div className="h-[calc(100vh-6rem)] -mt-2 -mx-2 md:-mx-4 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col md:flex-row">

            {/* Sidebar List */}
            <div className={cn(
                "w-full md:w-[320px] lg:w-[380px] bg-gray-50/50 border-r border-gray-200 flex flex-col",
                selectedId ? "hidden md:flex" : "flex"
            )}>
                <div className="p-4 border-b border-gray-200 bg-white">
                    <h2 className="text-lg font-black text-gray-900 mb-3 tracking-tight">Messages</h2>
                    <div className="relative mb-3">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Search buyers..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 bg-gray-50 border-gray-200 h-9 rounded-xl text-sm"
                        />
                    </div>
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button
                            onClick={() => setFilter("all")}
                            className={cn("flex-1 text-xs font-bold py-1.5 rounded-md transition-colors", filter === "all" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}
                        >
                            All
                        </button>
                        <button
                            onClick={() => setFilter("pending")}
                            className={cn("flex-1 text-xs font-bold py-1.5 rounded-md transition-colors", filter === "pending" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700")}
                        >
                            Active
                        </button>
                        <button
                            onClick={() => setFilter("resolved")}
                            className={cn("flex-1 text-xs font-bold py-1.5 rounded-md transition-colors", filter === "resolved" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}
                        >
                            Resolved
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
                    {filteredNegs.length === 0 ? (
                        <div className="p-8 text-center text-gray-400 text-sm font-medium">No conversations found.</div>
                    ) : (
                        filteredNegs.map((neg) => {
                            const product = products.find(p => p.id === neg.product_id);
                            const isSelected = selectedId === neg.id;
                            const isPending = neg.status === "pending" && !neg.counter_status;

                            return (
                                <div
                                    key={neg.id}
                                    onClick={() => setSelectedId(neg.id)}
                                    className={cn(
                                        "p-4 cursor-pointer transition-colors relative hover:bg-white",
                                        isSelected ? "bg-blue-50/50 hover:bg-blue-50" : ""
                                    )}
                                >
                                    {isSelected && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600 rounded-r-full" />}
                                    <div className="flex gap-3">
                                        <div className="h-10 w-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold shrink-0">
                                            {neg.customer_name.charAt(0)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start mb-0.5">
                                                <h4 className="text-sm font-bold text-gray-900 truncate pr-2">{neg.customer_name}</h4>
                                                <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap">
                                                    {new Date(neg.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-600 truncate mb-1.5 font-medium">{product?.name || "Product"}</p>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-black text-gray-900">{formatPrice(neg.proposed_price)}</span>
                                                {isPending ? (
                                                    <span className="w-2 h-2 rounded-full bg-blue-500 ml-auto" />
                                                ) : (
                                                    <span className="text-[10px] font-bold text-gray-400 ml-auto uppercase tracking-wider">
                                                        {neg.status === "accepted" || neg.counter_status === "accepted" ? "Dealt" :
                                                            neg.status === "rejected" || neg.counter_status === "rejected" ? "Passed" : "Replied"}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className={cn(
                "flex-1 bg-white flex flex-col",
                !selectedId ? "hidden md:flex items-center justify-center" : "flex"
            )}>
                {!activeNeg || !activeProduct ? (
                    <div className="text-center">
                        <MessageSquare className="h-12 w-12 text-gray-200 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-gray-900 mb-1">Your Messages</h3>
                        <p className="text-sm text-gray-500">Select a conversation to view and respond to offers.</p>
                    </div>
                ) : (
                    <>
                        {/* Chat Header */}
                        <div className="h-16 px-4 md:px-6 border-b border-gray-200 flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-3">
                                <Button size="icon" variant="ghost" className="md:hidden -ml-2" onClick={() => setSelectedId(null)}>
                                    <ChevronLeft className="h-5 w-5" />
                                </Button>
                                <div className="h-9 w-9 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold shrink-0 text-sm shadow-sm ring-2 ring-white">
                                    {activeNeg.customer_name.charAt(0)}
                                </div>
                                <h2 className="text-sm font-bold text-gray-900">{activeNeg.customer_name}</h2>
                            </div>
                            <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-200">
                                <span className="text-[10px] font-bold text-gray-500 uppercase">Status:</span>
                                {activeNeg.status === "pending" && !activeNeg.counter_status && <span className="text-[11px] font-black text-blue-600 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" /> Pending Offer</span>}
                                {(activeNeg.counter_status === "pending" || activeNeg.status === "pending" && activeNeg.counter_status) && <span className="text-[11px] font-black text-amber-600">Awaiting Buyer</span>}
                                {(activeNeg.status === "accepted" || activeNeg.counter_status === "accepted") && <span className="text-[11px] font-black text-emerald-600">Deal Closed</span>}
                                {(activeNeg.status === "rejected" || activeNeg.counter_status === "rejected") && <span className="text-[11px] font-black text-red-600">Rejected</span>}
                            </div>
                        </div>

                        {/* Product Reference Card */}
                        <div className="p-4 bg-gray-50/50 border-b border-gray-100 flex gap-4 items-center">
                            <div className="h-14 w-14 bg-white rounded-xl border border-gray-200 flex items-center justify-center p-1 shrink-0 shadow-sm">
                                <img src={activeProduct.image_url} alt="" className="max-w-full max-h-full mix-blend-multiply" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-bold text-gray-900 truncate">{activeProduct.name}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="outline" className="bg-white text-[10px] font-bold text-gray-500 border-gray-200 py-0 h-5">Listed: {formatPrice(activeProduct.price)}</Badge>
                                </div>
                            </div>
                        </div>

                        {/* Message History */}
                        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">

                            {/* System Intro Message */}
                            <div className="flex justify-center">
                                <span className="bg-gray-100 text-gray-500 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                                    Offer Received on {new Date(activeNeg.created_at).toLocaleDateString()}
                                </span>
                            </div>

                            {/* Buyer Offer Bubble */}
                            <div className="flex items-end gap-2 max-w-[85%]">
                                <div className="h-8 w-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold shrink-0 text-xs shadow-sm">
                                    {activeNeg.customer_name.charAt(0)}
                                </div>
                                <div className="bg-gray-100 rounded-2xl rounded-bl-sm p-4 relative">
                                    <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm mb-2 flex items-center gap-3">
                                        <div className="h-10 w-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600">
                                            <Tag className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Proposed Price</p>
                                            <p className="text-lg font-black text-indigo-700 leading-none">{formatPrice(activeNeg.proposed_price)}</p>
                                        </div>
                                    </div>
                                    {activeNeg.message ? (
                                        <p className="text-sm text-gray-700">{activeNeg.message}</p>
                                    ) : (
                                        <p className="text-sm text-gray-500 italic">No additional message provided.</p>
                                    )}
                                </div>
                            </div>

                            {/* Seller Action / Counter Bubble */}
                            {activeNeg.status === "rejected" && !activeNeg.counter_status && (
                                <div className="flex justify-center">
                                    <span className="bg-red-50 text-red-600 border border-red-100 text-xs font-bold px-4 py-1.5 rounded-full flex items-center gap-1.5">
                                        <XCircle className="h-4 w-4" /> You rejected this offer.
                                    </span>
                                </div>
                            )}

                            {activeNeg.status === "accepted" && (
                                <div className="flex justify-center">
                                    <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 text-xs font-bold px-4 py-1.5 rounded-full flex items-center gap-1.5">
                                        <CheckCircle className="h-4 w-4" /> You accepted this offer.
                                    </span>
                                </div>
                            )}

                            {activeNeg.counter_price && (
                                <div className="flex items-end gap-2 max-w-[85%] ml-auto justify-end">
                                    <div className="bg-blue-600 text-white rounded-2xl rounded-br-sm p-4 relative shadow-md">
                                        <div className="bg-blue-700/50 rounded-xl p-3 mb-2 flex items-center gap-3">
                                            <div className="h-10 w-10 bg-white/20 rounded-full flex items-center justify-center text-white">
                                                <Tag className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-blue-200 uppercase tracking-wider mb-0.5">Your Counter Offer</p>
                                                <p className="text-lg font-black text-white leading-none">{formatPrice(activeNeg.counter_price)}</p>
                                            </div>
                                        </div>
                                        {activeNeg.counter_message && (
                                            <p className="text-sm text-blue-50">{activeNeg.counter_message}</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Buyer Response to Counter */}
                            {activeNeg.counter_status === "accepted" && (
                                <div className="flex justify-center">
                                    <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 text-xs font-bold px-4 py-1.5 rounded-full flex items-center gap-1.5">
                                        <CheckCircle className="h-4 w-4" /> Buyer accepted your counter offer!
                                    </span>
                                </div>
                            )}

                            {activeNeg.counter_status === "rejected" && (
                                <div className="flex justify-center">
                                    <span className="bg-red-50 text-red-600 border border-red-100 text-xs font-bold px-4 py-1.5 rounded-full flex items-center gap-1.5">
                                        <XCircle className="h-4 w-4" /> Buyer rejected your counter offer.
                                    </span>
                                </div>
                            )}

                        </div>

                        {/* Input Area */}
                        {activeNeg.status === "pending" && !activeNeg.counter_status && (
                            <div className="p-4 bg-white border-t border-gray-200 shadow-[0_-4px_24px_-8px_rgba(0,0,0,0.05)]">
                                <div className="flex gap-2 mb-4 justify-center md:justify-start">
                                    <Button onClick={() => handleAction(activeNeg.id, "accepted")} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full font-bold px-5 h-9 shadow-sm">
                                        <CheckCircle className="h-4 w-4 mr-1.5" /> Accept {formatPrice(activeNeg.proposed_price)}
                                    </Button>
                                    <Button onClick={() => handleAction(activeNeg.id, "rejected")} variant="outline" className="text-red-600 hover:bg-red-50 border-red-200 rounded-full font-bold px-5 h-9 bg-white transition-colors">
                                        Reject
                                    </Button>
                                </div>
                                <div className="relative flex items-center mb-2">
                                    <div className="absolute inset-x-0 h-px bg-gray-200"></div>
                                    <span className="relative bg-white px-2 text-[10px] font-bold text-gray-400 uppercase mx-auto">OR NEGOTIATE</span>
                                </div>
                                <form onSubmit={handleCounterOffer} className="flex flex-col sm:flex-row gap-3">
                                    <div className="w-full sm:w-1/3 relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-gray-500">₦</span>
                                        <Input
                                            type="number"
                                            value={counterPrice}
                                            onChange={(e) => setCounterPrice(e.target.value)}
                                            className="pl-8 bg-gray-50 border-gray-200 rounded-xl h-11 font-bold text-gray-900"
                                            placeholder="Your price"
                                            required
                                        />
                                    </div>
                                    <div className="flex-1 flex gap-2">
                                        <Input
                                            value={counterMessage}
                                            onChange={(e) => setCounterMessage(e.target.value)}
                                            className="flex-1 bg-gray-50 border-gray-200 rounded-xl h-11 text-sm shadow-inner"
                                            placeholder="Add a message..."
                                        />
                                        <Button type="submit" size="icon" className="h-11 w-11 rounded-xl bg-blue-600 hover:bg-blue-700 shrink-0 shadow-md">
                                            <Send className="h-5 w-5 text-white" />
                                        </Button>
                                    </div>
                                </form>
                            </div>
                        )}

                    </>
                )}
            </div>

        </div>
    );
}
