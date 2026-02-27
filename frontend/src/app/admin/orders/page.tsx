"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ShieldAlert, CheckCircle, Package, Send, AlertTriangle, MessageSquare, Bot, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useNotification } from "@/components/ui/NotificationProvider";

export default function AdminOrdersTakeoverPage() {
    const [activeTab, setActiveTab] = useState<"all" | "active_chats" | "flagged">("active_chats");
    const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
    const [chatInput, setChatInput] = useState("");
    const { showNotification } = useNotification();

    // Mock Active Orders with Ziva Chats
    const [activeOrders, setActiveOrders] = useState([
        {
            id: "ORD-99812",
            customer: "Emily Johnson",
            product: "Apple iPhone 15 Pro Max - 256GB Platinum",
            amount: "₦1,850,000",
            status: "processing",
            zivaActive: true,
            flagged: true,
            messages: [
                { id: "1", sender: "ziva", text: "Order received! I'm Ziva, your Concierge for the iPhone 15 Pro Max.", timestamp: "10:42 AM" },
                { id: "2", sender: "user", text: "Are there actual photos of the titanium finish?", timestamp: "10:45 AM" },
                { id: "3", sender: "ziva", text: "I am requesting real-time photos of the actual unit from the merchant's warehouse.", timestamp: "10:45 AM" },
                { id: "4", sender: "user", text: "Okay, I also need to make sure the battery health is 100%. If not, cancel it.", timestamp: "10:47 AM" }
            ]
        },
        {
            id: "ORD-77421",
            customer: "Michael Adebayo",
            product: "Samsung QLED 4K 65\" Smart TV",
            amount: "₦850,000",
            status: "shipped",
            zivaActive: true,
            flagged: false,
            messages: [
                { id: "1", sender: "ziva", text: "Your TV is being prepared for dispatch.", timestamp: "09:00 AM" },
                { id: "2", sender: "user", text: "When will it arrive in Abuja?", timestamp: "11:20 AM" },
                { id: "3", sender: "ziva", text: "Based on your location, estimated delivery is within 2-4 business days.", timestamp: "11:21 AM" }
            ]
        }
    ]);

    const handleTakeover = () => {
        if (!selectedOrder) return;

        // Mark Ziva as inactive
        const updated = activeOrders.map(o => o.id === selectedOrder.id ? { ...o, zivaActive: false, flagged: false } : o);
        setActiveOrders(updated);
        setSelectedOrder({ ...selectedOrder, zivaActive: false, flagged: false });

        // Inject system message
        const takeoverMsg = {
            id: Date.now().toString(),
            sender: "system",
            text: "Human agent (Superadmin) has joined the chat.",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setSelectedOrder((prev: any) => ({ ...prev, messages: [...prev.messages, takeoverMsg] }));

        showNotification({
            type: "success",
            title: "Chat Taken Over",
            message: `You are now interacting directly with ${selectedOrder.customer}`
        });
    };

    const handleSendMessage = () => {
        if (!chatInput.trim() || !selectedOrder) return;

        // If Admin sends a message, they automatically takeover if they haven't already
        if (selectedOrder.zivaActive) {
            handleTakeover();
        }

        const newMsg = {
            id: Date.now().toString(),
            sender: "admin",
            text: chatInput,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setSelectedOrder((prev: any) => ({ ...prev, messages: [...prev.messages, newMsg] }));
        setChatInput("");
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
                            .filter(o => activeTab === "flagged" ? o.flagged : true)
                            .map(order => (
                                <div
                                    key={order.id}
                                    onClick={() => setSelectedOrder(order)}
                                    className={`p-4 rounded-xl cursor-pointer border transition-all ${selectedOrder?.id === order.id ? "border-black shadow-md bg-gray-50" : "border-gray-100 hover:border-gray-300 hover:shadow-sm"}`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="font-bold text-gray-900">{order.customer}</span>
                                        <span className="text-[10px] text-gray-500 font-mono">{order.id}</span>
                                    </div>
                                    <p className="text-xs text-gray-600 line-clamp-1 mb-3">{order.product}</p>

                                    <div className="flex justify-between items-center">
                                        <Badge className={`${order.zivaActive ? "bg-brand-green-100 text-brand-green-700" : "bg-blue-100 text-blue-700"} border-none text-[10px]`}>
                                            {order.zivaActive ? <><Bot className="w-3 h-3 mr-1" /> Ziva Active</> : <><ShieldAlert className="w-3 h-3 mr-1" /> Admin Handling</>}
                                        </Badge>
                                        {order.flagged && <AlertTriangle className="w-4 h-4 text-red-500" />}
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
                                    <h2 className="font-bold text-lg text-gray-900">{selectedOrder.customer}</h2>
                                    <p className="text-xs text-gray-500 font-medium">Order: <span className="font-mono text-gray-900">{selectedOrder.id}</span> • {selectedOrder.product}</p>
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
                            {selectedOrder.flagged && selectedOrder.zivaActive && (
                                <div className="bg-red-50 px-4 py-2 border-b border-red-100 flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 text-red-600" />
                                    <span className="text-xs font-bold text-red-800">High Urgency: Customer mentioned cancellation. Human intervention recommended.</span>
                                </div>
                            )}

                            {/* Messages Area */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/30">
                                {selectedOrder.messages.map((msg: any) => (
                                    <div key={msg.id} className={`flex ${msg.sender === "user" ? "justify-start" : msg.sender === "system" ? "justify-center" : "justify-end"}`}>
                                        {msg.sender === "system" ? (
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-100 px-3 py-1 rounded-full">{msg.text}</span>
                                        ) : (
                                            <div className={`max-w-[70%] flex flex-col ${msg.sender === "user" ? "items-start" : "items-end"}`}>
                                                <div className="flex items-center gap-2 mb-1 px-1">
                                                    {msg.sender === "ziva" && <span className="text-[10px] font-bold text-brand-green-600">Ziva AI</span>}
                                                    {msg.sender === "admin" && <span className="text-[10px] font-bold text-blue-600">You (Admin)</span>}
                                                    {msg.sender === "user" && <span className="text-[10px] font-bold text-gray-500">Customer</span>}
                                                    <span className="text-[9px] text-gray-400">{msg.timestamp}</span>
                                                </div>
                                                <div className={`px-4 py-2.5 rounded-2xl text-[13px] ${msg.sender === "user"
                                                    ? "bg-white border border-gray-200 text-gray-800 rounded-tl-sm shadow-sm"
                                                    : msg.sender === "ziva"
                                                        ? "bg-brand-green-50 border border-brand-green-100 text-brand-green-900 rounded-tr-sm"
                                                        : "bg-blue-600 text-white rounded-tr-sm shadow-sm"
                                                    }`}>
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
                                        <Button size="icon" variant="ghost" className="w-9 h-9 text-gray-400 hover:text-gray-600 rounded-lg">
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
