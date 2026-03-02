"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ShieldAlert, CheckCircle, Package, Send, AlertTriangle, MessageSquare, Bot, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useNotification } from "@/components/ui/NotificationProvider";
import { DemoStore } from "@/lib/demo-store";
import { Order } from "@/lib/types";

export default function AdminOrdersTakeoverPage() {
    const [activeTab, setActiveTab] = useState<"all" | "active_chats" | "flagged">("active_chats");
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [chatInput, setChatInput] = useState("");
    const [activeOrders, setActiveOrders] = useState<Order[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { showNotification } = useNotification();

    useEffect(() => {
        const load = () => {
            const all = DemoStore.getOrders();
            // Filter to orders that have chats, or just show all for demo purposes
            setActiveOrders(all.filter(o => o.chat_messages && o.chat_messages.length > 0));

            // Update selected order if it exists
            if (selectedOrder) {
                const updated = all.find(o => o.id === selectedOrder.id);
                if (updated) setSelectedOrder(updated);
            }
        };
        load();
        window.addEventListener("demo-store-update", load);
        window.addEventListener("storage", load);
        return () => {
            window.removeEventListener("demo-store-update", load);
            window.removeEventListener("storage", load);
        };
    }, [selectedOrder?.id]);

    const handleTakeover = () => {
        if (!selectedOrder) return;

        // Mark Ziva as inactive implicitly by sending a message
        DemoStore.addOrderMessage(selectedOrder.id, "system", "Human agent (Superadmin) has joined the chat.");

        showNotification({
            type: "success",
            title: "Chat Taken Over",
            message: `You are now interacting directly with ${selectedOrder.customer_name || 'Customer'}`
        });
    };



    const handleSendMessage = () => {
        if (!chatInput.trim() || !selectedOrder) return;
        DemoStore.addOrderMessage(selectedOrder.id, "admin", chatInput);
        setChatInput("");
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !selectedOrder) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            DemoStore.addOrderMessage(selectedOrder.id, "admin", "Sent an image", base64String);
        };
        reader.readAsDataURL(file);
    };

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto font-sans">
            <div className="mb-8 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Concierge Command Center</h1>
                    <p className="text-gray-500 mt-2 font-medium">Monitor live Ziva AI interactions and intervene in customer orders.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-200px)] min-h-[600px]">
                {/* Left Column: Orders List */}
                <div className="lg:col-span-1 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-gray-100 flex gap-2">
                        <Button
                            variant={activeTab === "active_chats" ? "default" : "outline"}
                            className={`flex-1 ${activeTab === "active_chats" ? "bg-black hover:bg-gray-800" : "text-gray-600 bg-gray-50 hover:bg-gray-100"}`}
                            onClick={() => setActiveTab("active_chats")}
                        >
                            Live Chats
                        </Button>
                        <Button
                            variant={activeTab === "flagged" ? "default" : "outline"}
                            className={`flex-1 ${activeTab === "flagged" ? "bg-red-600 hover:bg-red-700 text-white border-transparent" : "text-gray-600 bg-gray-50 hover:bg-gray-100"}`}
                            onClick={() => setActiveTab("flagged")}
                        >
                            Needs Help
                        </Button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                        {activeOrders
                            // Need to assume 'flagged' comes from user sentiment, right now we mock it as false unless we have a specific property. Let's just mock it.
                            .filter(o => activeTab === "flagged" ? false : true)
                            .map(order => (
                                <div
                                    key={order.id}
                                    onClick={() => setSelectedOrder(order)}
                                    className={`p-4 rounded-xl cursor-pointer border transition-all ${selectedOrder?.id === order.id ? "border-black shadow-md bg-gray-50" : "border-gray-100 hover:border-gray-300 hover:shadow-sm"} relative`}
                                >
                                    {order.unread_admin && (
                                        <div className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full border-2 border-white shadow-sm" />
                                    )}
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="font-bold text-gray-900 line-clamp-1">{order.customer_name || 'Anonymous User'}</span>
                                        <span className="text-[10px] text-gray-500 font-mono shrink-0 ml-2">#{order.id.substring(0, 8)}</span>
                                    </div>
                                    <p className="text-xs text-gray-600 line-clamp-1 mb-3">{order.product?.name || order.product_id}</p>

                                    <div className="flex justify-between items-center">
                                        <Badge className={`${order.zivaActive ? "bg-brand-green-100 text-brand-green-700" : "bg-blue-100 text-blue-700"} border-none text-[10px]`}>
                                            {order.zivaActive ? <><Bot className="w-3 h-3 mr-1" /> Ziva Active</> : <><ShieldAlert className="w-3 h-3 mr-1" /> Admin Handling</>}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>

                {/* Right Column: Active Chat Interface */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden relative">
                    {selectedOrder ? (
                        <>
                            {/* Chat Header */}
                            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                                <div>
                                    <h2 className="font-bold text-lg text-gray-900">{selectedOrder.customer_name || 'Customer'}</h2>
                                    <p className="text-xs text-gray-500 font-medium">Order: <span className="font-mono text-gray-900">#{selectedOrder.id.substring(0, 8)}</span> • {selectedOrder.product?.name || selectedOrder.product_id}</p>
                                </div>
                                {selectedOrder.zivaActive ? (
                                    <Button onClick={handleTakeover} className="bg-black hover:bg-gray-800 text-white font-bold h-9">
                                        <MessageSquare className="w-4 h-4 mr-2" /> Takeover from Ziva
                                    </Button>
                                ) : (
                                    <Badge className="bg-blue-100 text-blue-700 border-blue-200 px-3 py-1 font-bold">
                                        You are managing this chat
                                    </Badge>
                                )}
                            </div>

                            {/* Threat / Urgency Banner */}
                            {selectedOrder.zivaActive && selectedOrder.unread_admin && (
                                <div className="bg-red-50 px-4 py-2 border-b border-red-100 flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 text-red-600" />
                                    <span className="text-xs font-bold text-red-800">High Urgency: Unread messages from customer. Human intervention recommended.</span>
                                </div>
                            )}

                            {/* Messages Area */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/30">
                                {selectedOrder.chat_messages?.map((msg: any) => (
                                    <div key={msg.id} className={`flex ${msg.sender === "user" ? "justify-start" : msg.sender === "system" ? "justify-center" : "justify-end"}`}>
                                        {msg.sender === "system" ? (
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-100 px-3 py-1 rounded-full text-center max-w-[80%]">{msg.text}</span>
                                        ) : (
                                            <div className={`max-w-[70%] flex flex-col ${msg.sender === "user" ? "items-start" : "items-end"}`}>
                                                <div className="flex items-center gap-2 mb-1 px-1">
                                                    {msg.sender === "ziva" && <span className="text-[10px] font-bold text-brand-green-600">Ziva AI</span>}
                                                    {msg.sender === "admin" && <span className="text-[10px] font-bold text-blue-600">You (Admin)</span>}
                                                    {msg.sender === "seller" && <span className="text-[10px] font-bold text-amber-600">Seller</span>}
                                                    {msg.sender === "user" && <span className="text-[10px] font-bold text-gray-500">Customer</span>}
                                                    <span className="text-[9px] text-gray-400">{msg.timestamp}</span>
                                                </div>
                                                <div className={`px-4 py-2.5 rounded-2xl text-[13px] ${msg.sender === "user"
                                                    ? "bg-white border border-gray-200 text-gray-800 rounded-tl-sm shadow-sm"
                                                    : msg.sender === "ziva"
                                                        ? "bg-brand-green-50 border border-brand-green-100 text-brand-green-900 rounded-tr-sm"
                                                        : "bg-blue-600 text-white rounded-tr-sm shadow-sm"
                                                    }`}>
                                                    {msg.imageUrl && (
                                                        <div className="mb-2 rounded-xl overflow-hidden border border-black/10">
                                                            <img src={msg.imageUrl} className="max-w-full h-auto max-h-[200px] object-cover" alt="Upload" />
                                                        </div>
                                                    )}
                                                    {msg.text}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Input Area */}
                            <div className="p-4 bg-white border-t border-gray-100">
                                {selectedOrder.zivaActive && (
                                    <div className="text-center mb-3">
                                        <span className="text-xs text-gray-400">Typing a message will automatically take over the chat from Ziva.</span>
                                    </div>
                                )}
                                <div className="relative flex items-center">
                                    <Input
                                        className="pr-20 border-gray-200 h-12 rounded-xl focus:border-blue-500 focus:ring-blue-500/20 bg-gray-50"
                                        placeholder={selectedOrder.zivaActive ? "Type to take over..." : "Reply to customer..."}
                                        value={chatInput}
                                        onChange={(e) => setChatInput(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                                    />
                                    <div className="absolute right-1.5 flex gap-1">
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleImageUpload}
                                            accept="image/*"
                                            className="hidden"
                                        />
                                        <Button size="icon" variant="ghost" className="w-9 h-9 text-gray-400 hover:text-gray-600 rounded-lg" onClick={() => fileInputRef.current?.click()}>
                                            <ImageIcon className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            size="icon"
                                            className={`w-9 h-9 shadow-sm rounded-lg ${selectedOrder.zivaActive ? "bg-black text-white hover:bg-gray-800" : "bg-blue-600 text-white hover:bg-blue-700"}`}
                                            onClick={handleSendMessage}
                                        >
                                            <Send className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                <MessageSquare className="w-8 h-8 text-gray-300" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">No Chat Selected</h3>
                            <p className="text-sm text-gray-500 max-w-sm mt-1">Select a customer's active order chat from the left panel to monitor the AI or intervene.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
