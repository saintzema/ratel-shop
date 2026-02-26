"use client";

import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { MessageSquare, Package, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { DemoStore } from "@/lib/demo-store";

interface Message {
    id: string;
    from: string;
    subject: string;
    body: string;
    date: string;
    read: boolean;
    type: "order_update" | "seller_message" | "system" | "promo";
    orderId?: string;
}

export default function MessagesPage() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [selected, setSelected] = useState<Message | null>(null);

    useEffect(() => {
        // Load from localStorage or generate demo messages
        const saved = localStorage.getItem("ratel_user_messages");
        if (saved) {
            setMessages(JSON.parse(saved));
        } else {
            const orders = DemoStore.getOrders();
            const demo: Message[] = [
                {
                    id: "msg_1", from: "FairPrice", subject: "Welcome to FairPrice! 🎉",
                    body: "Welcome to FairPrice, Nigeria's first AI-regulated marketplace. We're glad to have you! Start shopping and enjoy fair prices verified by our AI.\n\nNeed help? Chat with Ziva, our AI assistant, anytime.",
                    date: new Date(Date.now() - 86400000 * 3).toISOString(), read: true, type: "system"
                },
                {
                    id: "msg_2", from: "FairPrice Deals", subject: "🔥 Flash Sale: Up to 60% off Electronics",
                    body: "Don't miss our weekend flash sale! Samsung, Apple, and more — all AI-verified fair prices.\n\nShop now before stock runs out.",
                    date: new Date(Date.now() - 86400000).toISOString(), read: false, type: "promo"
                },
                ...(orders.length > 0 ? [{
                    id: "msg_3", from: "FairPrice Shipping", subject: `Order ${orders[0].id.slice(0, 12)}... Update`,
                    body: `Your order has been confirmed and is being prepared for shipping. You can track your order using the link below.\n\nEstimated delivery: 3-5 business days.`,
                    date: orders[0].created_at, read: false, type: "order_update" as const, orderId: orders[0].id
                }] : [])
            ];
            setMessages(demo);
            localStorage.setItem("ratel_user_messages", JSON.stringify(demo));
        }
    }, []);

    const markRead = (id: string) => {
        const updated = messages.map(m => m.id === id ? { ...m, read: true } : m);
        setMessages(updated);
        localStorage.setItem("ratel_user_messages", JSON.stringify(updated));
    };

    const unreadCount = messages.filter(m => !m.read).length;

    const getIcon = (type: string) => {
        switch (type) {
            case "order_update": return <Package className="h-5 w-5 text-blue-500" />;
            case "seller_message": return <MessageSquare className="h-5 w-5 text-emerald-500" />;
            case "promo": return <AlertCircle className="h-5 w-5 text-orange-500" />;
            default: return <CheckCircle className="h-5 w-5 text-emerald-500" />;
        }
    };

    return (
        <div className="min-h-screen bg-white flex flex-col font-sans">
            <Navbar />
            <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-blue-50 rounded-xl"><MessageSquare className="h-5 w-5 text-blue-600" /></div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Your Messages</h1>
                        <p className="text-sm text-gray-500">{unreadCount > 0 ? `${unreadCount} unread` : "All caught up!"}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Message List */}
                    <div className="md:col-span-1 space-y-2 max-h-[600px] overflow-y-auto">
                        {messages.length === 0 ? (
                            <div className="text-center py-12 text-gray-400">
                                <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No messages yet</p>
                            </div>
                        ) : (
                            messages.map(msg => (
                                <button
                                    key={msg.id}
                                    onClick={() => { setSelected(msg); markRead(msg.id); }}
                                    className={`w-full text-left p-3 rounded-xl border transition-all ${selected?.id === msg.id ? "border-emerald-500 bg-emerald-50/50" : msg.read ? "border-gray-100 bg-white hover:bg-gray-50" : "border-blue-200 bg-blue-50/30 hover:bg-blue-50"}`}
                                >
                                    <div className="flex items-start gap-2">
                                        {getIcon(msg.type)}
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm truncate ${msg.read ? "text-gray-700" : "font-bold text-gray-900"}`}>{msg.subject}</p>
                                            <p className="text-xs text-gray-500 mt-0.5">{msg.from} · {new Date(msg.date).toLocaleDateString()}</p>
                                        </div>
                                        {!msg.read && <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />}
                                    </div>
                                </button>
                            ))
                        )}
                    </div>

                    {/* Message Detail */}
                    <div className="md:col-span-2 border border-gray-200 rounded-2xl p-6 min-h-[400px]">
                        {selected ? (
                            <div>
                                <div className="flex items-start justify-between mb-4 pb-4 border-b border-gray-100">
                                    <div>
                                        <h2 className="text-lg font-bold text-gray-900">{selected.subject}</h2>
                                        <p className="text-sm text-gray-500">From {selected.from} · {new Date(selected.date).toLocaleString()}</p>
                                    </div>
                                    <div className="flex items-center gap-1">{getIcon(selected.type)}</div>
                                </div>
                                <div className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{selected.body}</div>
                                {selected.orderId && (
                                    <Link href={`/account/orders`} className="mt-4 inline-block text-sm text-emerald-600 font-bold hover:underline">
                                        View Order →
                                    </Link>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-400">
                                <div className="text-center">
                                    <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-40" />
                                    <p className="text-sm">Select a message to read</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
