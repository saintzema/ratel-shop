"use client";

import { useEffect, useState } from "react";
import { NegotiationRequest, Product } from "@/lib/types";
import { DemoStore } from "@/lib/demo-store";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    CheckCircle,
    XCircle,
    MessageSquare,
    Clock,
    Filter
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function NegotiationsPage() {
    const [negotiations, setNegotiations] = useState<NegotiationRequest[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [filter, setFilter] = useState<"all" | "pending" | "accepted" | "rejected">("all");

    // Counter Offer State
    const [counterId, setCounterId] = useState<string | null>(null);
    const [counterPrice, setCounterPrice] = useState("");
    const [counterMessage, setCounterMessage] = useState("");

    useEffect(() => {
        const sellerId = DemoStore.getCurrentSellerId();
        if (!sellerId) return;

        const loadData = () => {
            setNegotiations(DemoStore.getNegotiations(sellerId));
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
        if (!counterId || !counterPrice) return;

        DemoStore.sendCounterOffer(counterId, Number(counterPrice), counterMessage);

        // Reset
        setCounterId(null);
        setCounterPrice("");
        setCounterMessage("");

        const sellerId = DemoStore.getCurrentSellerId();
        if (sellerId) setNegotiations(DemoStore.getNegotiations(sellerId));
    };

    const filteredNegs = filter === "all" ? negotiations : negotiations.filter(n => n.status === filter);

    const statusCounts = {
        all: negotiations.length,
        pending: negotiations.filter(n => n.status === "pending").length,
        accepted: negotiations.filter(n => n.status === "accepted").length,
        rejected: negotiations.filter(n => n.status === "rejected").length,
    };

    return (
        <div className="space-y-6 max-w-4xl">
            <div>
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                    Negotiations
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                    Review and respond to buyer price offers.
                </p>
            </div>

            {/* Filter chips */}
            <div className="flex gap-2 flex-wrap">
                {(["all", "pending", "accepted", "rejected"] as const).map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${filter === f
                            ? "bg-ratel-green-600 text-white shadow-md"
                            : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                            }`}
                    >
                        {f.charAt(0).toUpperCase() + f.slice(1)} ({statusCounts[f]})
                    </button>
                ))}
            </div>

            {/* Negotiations list */}
            <div className="space-y-3">
                {filteredNegs.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                        <MessageSquare className="h-12 w-12 text-gray-200 mx-auto mb-3" />
                        <p className="text-gray-400 text-sm font-medium">No {filter !== "all" ? filter : ""} negotiations found.</p>
                    </div>
                ) : (
                    filteredNegs.map((neg) => {
                        const product = products.find(p => p.id === neg.product_id);
                        if (!product) return null;

                        const discount = Math.round((1 - neg.proposed_price / product.price) * 100);
                        const isReplying = counterId === neg.id;

                        return (
                            <div
                                key={neg.id}
                                className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow"
                            >
                                <div className="flex gap-4">
                                    {/* Product image */}
                                    <div className="h-20 w-20 bg-gray-50 rounded-xl border border-gray-100 shrink-0 overflow-hidden">
                                        <img src={product.image_url} className="w-full h-full object-contain mix-blend-multiply p-2" alt="" />
                                    </div>

                                    {/* Details */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <h4 className="font-bold text-gray-900 text-sm">{product.name}</h4>
                                                <p className="text-xs text-gray-400 mt-0.5">
                                                    From <span className="font-semibold text-gray-600">{neg.customer_name}</span> · {new Date(neg.created_at).toLocaleDateString()}
                                                </p>
                                            </div>

                                            {neg.status === "pending" && (
                                                <div className="flex gap-2">
                                                    <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 text-[10px] font-bold py-0.5">
                                                        <Clock className="h-3 w-3 mr-1" /> Action Required
                                                    </Badge>
                                                    {neg.counter_status === "pending" && (
                                                        <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-[10px] font-bold py-0.5">
                                                            Counter Offer Sent
                                                        </Badge>
                                                    )}
                                                </div>
                                            )}
                                            {neg.status === "accepted" && (
                                                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] font-bold py-0.5">
                                                    <CheckCircle className="h-3 w-3 mr-1" /> Accepted
                                                </Badge>
                                            )}
                                            {neg.status === "rejected" && (
                                                <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px] font-bold py-0.5">
                                                    <XCircle className="h-3 w-3 mr-1" /> Rejected
                                                </Badge>
                                            )}
                                        </div>

                                        {/* Price comparison */}
                                        <div className="flex items-center gap-4 mt-3">
                                            <div>
                                                <span className="text-[10px] font-bold text-gray-400 uppercase block">Listed Price</span>
                                                <span className="text-sm font-medium text-gray-400 line-through">{formatPrice(product.price)}</span>
                                            </div>
                                            <div className="text-gray-300">→</div>
                                            <div>
                                                <span className="text-[10px] font-bold text-blue-600 uppercase block">Buyer's Offer</span>
                                                <span className="text-lg font-black text-gray-900">{formatPrice(neg.proposed_price)}</span>
                                            </div>
                                            <Badge variant="outline" className="text-xs border-orange-200 bg-orange-50 text-orange-700">
                                                -{discount}% off
                                            </Badge>
                                        </div>

                                        {neg.message && (
                                            <div className="mt-3 bg-blue-50 p-3 rounded-xl text-sm text-blue-800 border border-blue-100">
                                                <span className="font-bold">{neg.customer_name}:</span> "{neg.message}"
                                            </div>
                                        )}

                                        {/* Counter Offer sent display */}
                                        {neg.counter_price && (
                                            <div className="mt-3 bg-gray-50 p-3 rounded-xl text-sm border border-gray-100">
                                                <span className="font-bold text-gray-900">You offered:</span> {formatPrice(neg.counter_price)}
                                                {neg.counter_message && <span className="text-gray-500"> - "{neg.counter_message}"</span>}
                                                <div className="mt-1">
                                                    {neg.counter_status === "pending" && <span className="text-yellow-600 font-bold text-xs">Waiting for buyer response...</span>}
                                                    {neg.counter_status === "accepted" && <span className="text-emerald-600 font-bold text-xs">Buyer accepted!</span>}
                                                    {neg.counter_status === "rejected" && <span className="text-red-600 font-bold text-xs">Buyer rejected.</span>}
                                                </div>
                                            </div>
                                        )}

                                        {/* Actions */}
                                        {neg.status === "pending" && !neg.counter_status && !isReplying && (
                                            <div className="flex gap-2 mt-4">
                                                <Button
                                                    onClick={() => handleAction(neg.id, "accepted")}
                                                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs h-9 shadow-sm"
                                                >
                                                    <CheckCircle className="h-3.5 w-3.5 mr-1.5" /> Accept Offer
                                                </Button>
                                                <Button
                                                    onClick={() => {
                                                        setCounterId(neg.id);
                                                        setCounterPrice(Math.round(product.price * 0.9).toString()); // Default to 10% off
                                                    }}
                                                    variant="secondary"
                                                    className="bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl font-bold text-xs h-9"
                                                >
                                                    Counter Offer
                                                </Button>
                                                <Button
                                                    onClick={() => handleAction(neg.id, "rejected")}
                                                    variant="outline"
                                                    className="border-red-200 text-red-600 hover:bg-red-50 rounded-xl font-bold text-xs h-9"
                                                >
                                                    <XCircle className="h-3.5 w-3.5 mr-1.5" /> Reject
                                                </Button>
                                            </div>
                                        )}

                                        {/* Counter Offer Form */}
                                        {isReplying && (
                                            <form onSubmit={handleCounterOffer} className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200 animate-in fade-in slide-in-from-top-2">
                                                <h5 className="font-bold text-sm mb-3 text-gray-900">Send Counter Offer</h5>
                                                <div className="space-y-3">
                                                    <div>
                                                        <label className="text-xs font-bold text-gray-500 mb-1 block">Your Price (₦)</label>
                                                        <Input
                                                            type="number"
                                                            value={counterPrice}
                                                            onChange={e => setCounterPrice(e.target.value)}
                                                            className="bg-white"
                                                            placeholder="Enter amount"
                                                            required
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-bold text-gray-500 mb-1 block">Message (Optional)</label>
                                                        <Textarea
                                                            value={counterMessage}
                                                            onChange={e => setCounterMessage(e.target.value)}
                                                            className="bg-white h-20"
                                                            placeholder="e.g. This is the lowest I can go given the quality..."
                                                        />
                                                    </div>
                                                    <div className="flex gap-2 justify-end pt-1">
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => setCounterId(null)}
                                                            className="text-gray-500"
                                                        >
                                                            Cancel
                                                        </Button>
                                                        <Button
                                                            type="submit"
                                                            size="sm"
                                                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
                                                        >
                                                            Send Counter Offer
                                                        </Button>
                                                    </div>
                                                </div>
                                            </form>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
