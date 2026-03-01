"use client";

import { useEffect, useState, useRef } from "react";
import { NegotiationRequest, Product, Order, SupportMessage } from "@/lib/types";
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
    Tag,
    Image as ImageIcon,
    MoreVertical,
    AlertTriangle,
    Undo2,
    Headphones,
    X
} from "lucide-react";
import { Input } from "@/components/ui/input";

// Unified Conversation Type
type ConversationType = "all" | "negotiation" | "order" | "dispute" | "return" | "support";

interface Conversation {
    id: string; // The ID of the neg or order or support msg
    type: "negotiation" | "order" | "dispute" | "return" | "support";
    customer_name: string;
    customer_id?: string;
    product_id?: string;
    product_name?: string;
    preview: string;
    updated_at: Date;
    unread: boolean;
    // Context linking
    negotiation?: NegotiationRequest;
    order?: Order;
    // mock support chat
    chat_messages: { sender: "seller" | "buyer" | "system"; text: string; timestamp: Date; imageUrl?: string }[];
}

export default function UniversalMessagesPage() {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [filter, setFilter] = useState<ConversationType>("all");
    const [search, setSearch] = useState("");

    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [chatMessage, setChatMessage] = useState("");
    const [counterPrice, setCounterPrice] = useState("");
    const [counterMessage, setCounterMessage] = useState("");
    const [selectedImagePreview, setSelectedImagePreview] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const sellerId = DemoStore.getCurrentSellerId();
        if (!sellerId) return;

        const loadData = () => {
            const allProds = DemoStore.getProducts();
            setProducts(allProds);

            const negs = DemoStore.getNegotiations(sellerId);
            const orders = DemoStore.getOrders().filter(o => o.seller_id === sellerId);

            const convos: Conversation[] = [];

            // Add Negotiations
            negs.forEach(neg => {
                const prod = allProds.find(p => p.id === neg.product_id);
                // convert chat messages
                const chatHistory = neg.chat_messages ? neg.chat_messages.map(m => ({
                    sender: m.sender as "seller" | "buyer",
                    text: m.text,
                    timestamp: new Date(m.timestamp)
                })) : [];

                convos.push({
                    id: `neg-${neg.id}`,
                    type: "negotiation",
                    customer_name: neg.customer_name,
                    customer_id: neg.customer_id,
                    product_id: neg.product_id,
                    product_name: prod?.name,
                    preview: chatHistory.length > 0 ? chatHistory[chatHistory.length - 1].text : "Sent an offer",
                    updated_at: new Date(neg.created_at),
                    unread: neg.status === "pending" && !neg.counter_status,
                    negotiation: neg,
                    chat_messages: chatHistory
                });
            });

            // Add Orders (Disputes & Returns)
            orders.forEach(order => {
                if (order.escrow_status === "disputed" || order.status === "returned") {
                    const prod = allProds.find(p => p.id === order.product_id);
                    const type = order.escrow_status === "disputed" ? "dispute" : "return";

                    convos.push({
                        id: `ord-${order.id}`,
                        type: type,
                        customer_name: order.customer_name || "Unknown Buyer",
                        customer_id: order.customer_id,
                        product_id: order.product_id,
                        product_name: prod?.name,
                        preview: type === "dispute" ? "Buyer opened a dispute regarding this order." : "Buyer requested a return for this order.",
                        updated_at: new Date(order.updated_at),
                        unread: true, // Mock unread for demo
                        order: order,
                        chat_messages: [
                            { sender: "system", text: type === "dispute" ? "Buyer opened a dispute regarding this order." : "Buyer requested a return for this order.", timestamp: new Date(order.updated_at) }
                        ]
                    });
                }
            });

            // Mock Support
            convos.push({
                id: "sup-1",
                type: "support",
                customer_name: "RatelShop Support",
                product_name: "Account Support",
                preview: "Hello! We noticed a high volume of transactions...",
                updated_at: new Date(Date.now() - 3600000), // 1 hour ago
                unread: false,
                chat_messages: [
                    { sender: "buyer", text: "Hello! We noticed a high volume of transactions on your store today. Please ensure all tracking IDs are updated.", timestamp: new Date(Date.now() - 3600000) }
                ]
            });

            // If a URL parameter specifies a customer id to message directly
            const params = new URLSearchParams(window.location.search);
            const directCustomer = params.get('customer');
            if (directCustomer) {
                // Mock a direct chat thread for this customer if it doesn't exist
                if (!convos.find(c => c.customer_id === directCustomer && c.type === "order")) {
                    convos.push({
                        id: `chat-${directCustomer}`,
                        type: "order", // general chat
                        customer_name: "Customer # " + directCustomer.substring(0, 4), // Fallback naming
                        customer_id: directCustomer,
                        preview: "Start a conversation",
                        updated_at: new Date(),
                        unread: false,
                        chat_messages: []
                    });
                }
            }

            setConversations(convos.sort((a, b) => b.updated_at.getTime() - a.updated_at.getTime()));
        };

        loadData();
        window.addEventListener("storage", loadData);
        return () => window.removeEventListener("storage", loadData);
    }, []);

    const filteredConvos = conversations
        .filter(c => filter === "all" || c.type === filter)
        .filter(c => !search || c.customer_name.toLowerCase().includes(search.toLowerCase()) || (c.product_name && c.product_name.toLowerCase().includes(search.toLowerCase())));

    const activeConvo = conversations.find(c => c.id === selectedId);
    const activeProduct = activeConvo?.product_id ? products.find(p => p.id === activeConvo.product_id) : null;
    const activeNeg = activeConvo?.negotiation;

    useEffect(() => {
        // Pre-fill counter price
        if (activeProduct && activeNeg && !counterPrice && activeNeg.status === "pending" && !activeNeg.counter_status) {
            setCounterPrice(Math.round(activeProduct.price * 0.9).toString());
        }
    }, [activeProduct, activeNeg, selectedId]);

    // Handle initial auto-select if direct message
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const directCustomer = params.get('customer');
        if (directCustomer && !selectedId && conversations.length > 0) {
            const directThread = conversations.find(c => c.customer_id === directCustomer);
            if (directThread) setSelectedId(directThread.id);
        }
    }, [conversations, selectedId]);

    const handleAction = (negId: string, status: "accepted" | "rejected") => {
        DemoStore.updateNegotiationStatus(negId, status);
        // Force reload by triggering a storage event manually or just state update
        window.dispatchEvent(new Event("storage"));
    };

    const handleCounterOffer = (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeNeg || !counterPrice) return;
        DemoStore.sendCounterOffer(activeNeg.id, Number(counterPrice), counterMessage);
        setCounterPrice("");
        setCounterMessage("");
        window.dispatchEvent(new Event("storage"));
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            if (event.target?.result) {
                // Show a preview string (data URI)
                setSelectedImagePreview(event.target.result as string);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeConvo || (!chatMessage.trim() && !selectedImagePreview)) return;

        // In a real app, logic branches based on conversation type (DemoStore handles negotiations)
        if (activeConvo.type === "negotiation" && activeConvo.negotiation) {
            DemoStore.addNegotiationMessage(activeConvo.negotiation.id, "seller", chatMessage || "[Image Attached]");
        } else {
            // Mock adding to local state for orders/disputes
            setConversations(prev => prev.map(c => {
                if (c.id === activeConvo.id) {
                    return {
                        ...c,
                        chat_messages: [...c.chat_messages, { sender: "seller", text: chatMessage, timestamp: new Date(), imageUrl: selectedImagePreview || undefined }]
                    };
                }
                return c;
            }));
        }

        setChatMessage("");
        setSelectedImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        window.dispatchEvent(new Event("storage")); // mostly for negotiations
    };

    const getConvoIcon = (type: string) => {
        switch (type) {
            case "negotiation": return <Tag className="h-4 w-4" />;
            case "order": return <MessageSquare className="h-4 w-4" />;
            case "dispute": return <AlertTriangle className="h-4 w-4" />;
            case "return": return <Undo2 className="h-4 w-4" />;
            case "support": return <Headphones className="h-4 w-4" />;
            default: return <MessageSquare className="h-4 w-4" />;
        }
    };

    const getConvoColor = (type: string) => {
        switch (type) {
            case "negotiation": return "bg-blue-100 text-blue-600";
            case "order": return "bg-indigo-100 text-indigo-600";
            case "dispute": return "bg-red-100 text-red-600";
            case "return": return "bg-amber-100 text-amber-600";
            case "support": return "bg-emerald-100 text-emerald-600";
            default: return "bg-gray-100 text-gray-600";
        }
    };

    return (
        <div className="h-[calc(100vh-6rem)] -mt-2 -mx-2 md:-mx-4 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col md:flex-row">

            {/* Sidebar List */}
            <div className={cn(
                "w-full md:w-[320px] lg:w-[380px] bg-gray-50/50 border-r border-gray-200 flex flex-col",
                selectedId ? "hidden md:flex" : "flex"
            )}>
                <div className="p-4 border-b border-gray-200 bg-white">
                    <h2 className="text-xl font-black text-gray-900 mb-3 tracking-tight">Inbox</h2>
                    <div className="relative mb-3">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Search messages..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 bg-gray-50 border-gray-200 h-10 rounded-xl text-sm"
                        />
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        {(["all", "negotiation", "dispute", "return", "support"] as ConversationType[]).map(t => (
                            <button
                                key={t}
                                onClick={() => setFilter(t)}
                                className={cn(
                                    "px-3 py-1.5 rounded-full text-[11px] font-bold capitalize whitespace-nowrap transition-colors border",
                                    filter === t ? "bg-gray-900 border-gray-900 text-white" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                                )}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
                    {filteredConvos.length === 0 ? (
                        <div className="p-12 text-center text-gray-400 text-sm font-medium flex flex-col items-center">
                            <MessageSquare className="h-8 w-8 text-gray-300 mb-3" />
                            No conversations match your filter.
                        </div>
                    ) : (
                        filteredConvos.map((convo) => {
                            const isSelected = selectedId === convo.id;
                            return (
                                <div
                                    key={convo.id}
                                    onClick={() => setSelectedId(convo.id)}
                                    className={cn(
                                        "p-4 cursor-pointer transition-colors relative hover:bg-white",
                                        isSelected ? "bg-indigo-50/50 hover:bg-indigo-50" : ""
                                    )}
                                >
                                    {isSelected && <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-600 rounded-r-full" />}
                                    <div className="flex gap-3">
                                        <div className="relative">
                                            <div className="h-12 w-12 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center text-indigo-700 font-bold shrink-0 shadow-inner">
                                                {convo.customer_name.charAt(0)}
                                            </div>
                                            <div className={cn("absolute -bottom-1 -right-1 p-1 rounded-full border-2 border-white", getConvoColor(convo.type))}>
                                                {getConvoIcon(convo.type)}
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                                            <div className="flex justify-between items-center mb-0.5">
                                                <h4 className={cn("text-sm truncate pr-2", convo.unread ? "font-black text-gray-900" : "font-semibold text-gray-700")}>
                                                    {convo.customer_name}
                                                </h4>
                                                <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap">
                                                    {convo.updated_at.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                </span>
                                            </div>
                                            {convo.product_name && (
                                                <p className="text-[11px] font-bold text-gray-400 truncate uppercase tracking-widest mb-0.5">{convo.product_name}</p>
                                            )}
                                            <p className={cn("text-xs truncate", convo.unread ? "font-semibold text-gray-900" : "text-gray-500 font-medium")}>
                                                {convo.preview}
                                            </p>
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
                "flex-1 bg-white flex flex-col relative",
                !selectedId ? "hidden md:flex items-center justify-center bg-gray-50/50" : "flex"
            )}>
                {!activeConvo ? (
                    <div className="text-center">
                        <MessageSquare className="h-16 w-16 text-gray-200 mx-auto mb-4" />
                        <h3 className="text-xl font-black text-gray-900 mb-1">Universal Inbox</h3>
                        <p className="text-sm text-gray-500 font-medium">Select a conversation to view negotiations, disputes, and messages.</p>
                    </div>
                ) : (
                    <>
                        {/* Chat Header */}
                        <div className="h-[72px] px-4 md:px-6 border-b border-gray-200 flex justify-between items-center shrink-0 bg-white z-10">
                            <div className="flex items-center gap-3">
                                <Button size="icon" variant="ghost" className="md:hidden -ml-2 text-gray-500" onClick={() => setSelectedId(null)}>
                                    <ChevronLeft className="h-5 w-5" />
                                </Button>
                                <div className="flex flex-col justify-center">
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-[15px] font-black text-gray-900">{activeConvo.customer_name}</h2>
                                        <Badge variant="outline" className={cn("capitalize text-[10px] px-2 py-0 border-0 shadow-none font-bold", getConvoColor(activeConvo.type))}>
                                            {activeConvo.type}
                                        </Badge>
                                    </div>
                                    {activeConvo.customer_id && <p className="text-[11px] text-gray-400 font-bold uppercase">Customer ID: {activeConvo.customer_id.substring(0, 8)}</p>}
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <Button size="icon" variant="ghost" className="text-gray-400 hover:text-gray-900">
                                    <MoreVertical className="h-5 w-5" />
                                </Button>
                            </div>
                        </div>

                        {/* Product/Context Reference Card */}
                        {activeProduct && (
                            <div className="p-3 bg-gray-50/80 border-b border-gray-100 flex gap-4 items-center shrink-0">
                                <div className="h-12 w-12 bg-white rounded-lg border border-gray-200 flex items-center justify-center p-1 shrink-0 shadow-sm">
                                    <img src={activeProduct.image_url} alt="" className="max-w-full max-h-full mix-blend-multiply" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-[13px] font-bold text-gray-900 truncate">{activeProduct.name}</h4>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[11px] font-black text-gray-500">{formatPrice(activeProduct.price)} listed</span>
                                        {activeConvo.order && <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md">Order #{activeConvo.order.id.substring(0, 8)}</span>}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Message History */}
                        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-gray-50/30">

                            {/* System Intro Label */}
                            <div className="flex justify-center my-4">
                                <span className="bg-white border border-gray-200 text-gray-400 text-[10px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-full shadow-sm">
                                    Conversation Started {activeConvo.updated_at.toLocaleDateString()}
                                </span>
                            </div>

                            {/* Render Chat History */}
                            {activeConvo.chat_messages.map((msg, idx) => {
                                if (msg.sender === "system") {
                                    return (
                                        <div key={idx} className="flex justify-center my-2">
                                            <span className="bg-amber-50 border border-amber-100 text-amber-700 text-[11px] font-bold px-4 py-2 rounded-xl flex items-center gap-1.5">
                                                <AlertTriangle className="h-3.5 w-3.5" />
                                                {msg.text}
                                            </span>
                                        </div>
                                    );
                                }
                                const isSeller = msg.sender === "seller";
                                return (
                                    <div key={idx} className={cn("flex w-full", isSeller ? "justify-end" : "justify-start")}>
                                        <div className="flex items-end gap-2 max-w-[85%]">
                                            {!isSeller && (
                                                <div className="h-8 w-8 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center text-indigo-700 font-bold shrink-0 text-xs shadow-inner mb-5">
                                                    {activeConvo.customer_name.charAt(0)}
                                                </div>
                                            )}
                                            <div className="flex flex-col gap-1">
                                                <div className={cn(
                                                    "rounded-2xl p-3.5 text-[13px] shadow-sm relative",
                                                    isSeller ? "bg-indigo-600 text-white rounded-br-sm" : "bg-white border border-gray-100 text-gray-800 rounded-bl-sm"
                                                )}>
                                                    {msg.imageUrl && (
                                                        <div className="mb-2 rounded-lg overflow-hidden border border-black/10">
                                                            <img src={msg.imageUrl} alt="attachment" className="max-w-[200px] sm:max-w-xs h-auto" />
                                                        </div>
                                                    )}
                                                    <p className="whitespace-pre-wrap">{msg.text}</p>
                                                </div>
                                                <span className={cn(
                                                    "text-[10px] font-semibold flex items-center gap-1",
                                                    isSeller ? "text-gray-400 justify-end" : "text-gray-400 justify-start"
                                                )}>
                                                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    {isSeller && <CheckCircle className="h-3 w-3 text-emerald-500" />}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Injection of specific Negotiation UI within chat stream */}
                            {activeConvo.type === "negotiation" && activeNeg && (
                                <>
                                    {/* Offer Request Bubble Injection if we don't naturally have it at index 0 */}
                                    {activeConvo.chat_messages.length === 0 && (
                                        <div className="flex items-end gap-2 max-w-[85%]">
                                            <div className="h-8 w-8 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center text-indigo-700 font-bold shrink-0 text-xs shadow-inner mb-5">
                                                {activeConvo.customer_name.charAt(0)}
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm p-4 relative shadow-sm">
                                                    <div className="bg-indigo-50/50 rounded-xl p-3 border border-indigo-50 mb-3 flex items-center gap-3">
                                                        <div className="h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
                                                            <Tag className="h-5 w-5" />
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-0.5">Proposed Price</p>
                                                            <p className="text-xl font-black text-indigo-700 leading-none">{formatPrice(activeNeg.proposed_price)}</p>
                                                        </div>
                                                    </div>
                                                    {activeNeg.message ? (
                                                        <p className="text-[13px] text-gray-700">{activeNeg.message}</p>
                                                    ) : (
                                                        <p className="text-[13px] text-gray-400 italic">No additional message provided.</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Accept/Reject Badges */}
                                    {activeNeg.status === "rejected" && !activeNeg.counter_status && (
                                        <div className="flex justify-center">
                                            <span className="bg-red-50 text-red-600 border border-red-100 text-[11px] font-bold px-4 py-1.5 rounded-full flex items-center gap-1.5">
                                                <XCircle className="h-3.5 w-3.5" /> You rejected this offer.
                                            </span>
                                        </div>
                                    )}

                                    {activeNeg.status === "accepted" && (
                                        <div className="flex justify-center">
                                            <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 text-[11px] font-bold px-4 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm">
                                                <CheckCircle className="h-3.5 w-3.5" /> You accepted this offer!
                                            </span>
                                        </div>
                                    )}

                                    {/* Counter Offer Bubble Inline */}
                                    {activeNeg.counter_price && (
                                        <div className="flex items-end gap-2 max-w-[85%] ml-auto justify-end">
                                            <div className="flex flex-col gap-1 text-right">
                                                <div className="bg-indigo-600 border-indigo-700 text-white rounded-2xl rounded-br-sm p-4 relative shadow-md">
                                                    <div className="bg-white/10 rounded-xl p-3 mb-2 flex items-center gap-3">
                                                        <div className="h-10 w-10 bg-white/20 rounded-full flex items-center justify-center text-white backdrop-blur-sm">
                                                            <Tag className="h-5 w-5" />
                                                        </div>
                                                        <div className="text-left">
                                                            <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest mb-0.5">Your Counter Offer</p>
                                                            <p className="text-xl font-black text-white leading-none">{formatPrice(activeNeg.counter_price)}</p>
                                                        </div>
                                                    </div>
                                                    {activeNeg.counter_message && (
                                                        <p className="text-[13px] text-indigo-50 text-left">{activeNeg.counter_message}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {/* Buyer responses to counter */}
                                    {activeNeg.counter_status === "accepted" && (
                                        <div className="flex justify-center">
                                            <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 text-[11px] font-bold px-4 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm">
                                                <CheckCircle className="h-3.5 w-3.5" /> Buyer accepted your counter offer! Checkout pending.
                                            </span>
                                        </div>
                                    )}

                                    {activeNeg.counter_status === "rejected" && (
                                        <div className="flex justify-center">
                                            <span className="bg-red-50 text-red-600 border border-red-100 text-[11px] font-bold px-4 py-1.5 rounded-full flex items-center gap-1.5">
                                                <XCircle className="h-3.5 w-3.5" /> Buyer rejected your counter offer.
                                            </span>
                                        </div>
                                    )}
                                </>
                            )}

                            {/* Scroll spacer */}
                            <div className="h-4" />
                        </div>

                        {/* Input Area */}
                        <div className="p-4 bg-white border-t border-gray-200 shadow-[0_-8px_30px_-15px_rgba(0,0,0,0.05)] z-20">

                            {selectedImagePreview && (
                                <div className="mb-3 relative inline-block">
                                    <div className="relative group">
                                        <img src={selectedImagePreview} alt="upload preview" className="h-20 w-20 object-cover rounded-xl border-2 border-indigo-100 shadow-sm" />
                                        <button onClick={() => setSelectedImagePreview(null)} className="absolute -top-2 -right-2 h-6 w-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md scale-95 hover:scale-105 transition-transform border-2 border-white">
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {activeConvo.type === "negotiation" && activeNeg && activeNeg.status === "pending" && !activeNeg.counter_status && (
                                <div className="mb-4 bg-gray-50/50 p-4 rounded-2xl border border-gray-100 shadow-inner">
                                    <div className="flex gap-2 justify-center sm:justify-start mb-4">
                                        <Button onClick={() => handleAction(activeNeg.id, "accepted")} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black px-6 shadow-sm flex-1 sm:flex-none">
                                            <CheckCircle className="h-4 w-4 mr-1.5 text-emerald-200" /> Accept {formatPrice(activeNeg.proposed_price)}
                                        </Button>
                                        <Button onClick={() => handleAction(activeNeg.id, "rejected")} variant="outline" className="text-red-600 hover:bg-red-50 border-red-100 rounded-xl font-black px-6 bg-white transition-colors flex-1 sm:flex-none">
                                            Reject
                                        </Button>
                                    </div>
                                    <div className="relative flex items-center mb-4 opacity-70">
                                        <div className="absolute inset-x-0 h-px bg-gray-200"></div>
                                        <span className="relative bg-gray-50 px-3 text-[10px] font-black text-gray-500 tracking-widest uppercase mx-auto">OR NEGOTIATE</span>
                                    </div>
                                    <form onSubmit={handleCounterOffer} className="p-1">
                                        <div className="flex flex-col sm:flex-row gap-2">
                                            <div className="w-full sm:w-[150px] relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-gray-400">₦</span>
                                                <Input
                                                    type="number"
                                                    value={counterPrice}
                                                    onChange={(e) => setCounterPrice(e.target.value)}
                                                    className="pl-8 bg-white border-gray-200 rounded-xl h-11 font-black text-gray-900 shadow-sm"
                                                    placeholder="Price"
                                                    required
                                                />
                                            </div>
                                            <div className="flex-1 flex gap-2">
                                                <Input
                                                    value={counterMessage}
                                                    onChange={(e) => setCounterMessage(e.target.value)}
                                                    className="flex-1 bg-white border-gray-200 rounded-xl h-11 text-[13px] shadow-sm font-medium focus-visible:ring-indigo-500"
                                                    placeholder="Add a message to your counter offer..."
                                                />
                                                <Button type="submit" className="h-11 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-black text-white shadow-md shadow-indigo-500/20 shrink-0">
                                                    Send Offer
                                                </Button>
                                            </div>
                                        </div>
                                    </form>
                                </div>
                            )}

                            <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="h-12 w-12 rounded-full border-gray-200 shrink-0 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <ImageIcon className="h-5 w-5" />
                                </Button>
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    ref={fileInputRef}
                                    onChange={handleImageUpload}
                                />
                                <Input
                                    value={chatMessage}
                                    onChange={(e) => setChatMessage(e.target.value)}
                                    className="flex-1 bg-gray-50 border-gray-100 rounded-full h-12 px-6 text-[13.px] font-medium shadow-inner focus-visible:ring-indigo-500 focus-visible:border-indigo-500 transition-all placeholder:text-gray-400"
                                    placeholder="Type your message..."
                                />
                                <Button
                                    type="submit"
                                    size="icon"
                                    className="h-12 w-12 rounded-full bg-indigo-600 hover:bg-indigo-700 shrink-0 shadow-md shadow-indigo-600/30 transition-transform active:scale-95 disabled:opacity-50"
                                    disabled={!chatMessage.trim() && !selectedImagePreview}
                                >
                                    <Send className="h-5 w-5 text-white ml-0.5" />
                                </Button>
                            </form>
                        </div>
                    </>
                )}
            </div>

        </div>
    );
}
