"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Image as ImageIcon, Box, HelpCircle, Truck, PackageCheck, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Product } from "@/lib/types";

interface Message {
    id: string;
    sender: "user" | "ziva" | "admin";
    text: string;
    timestamp: Date;
    imageUrl?: string;
}

interface PostOrderChatProps {
    isOpen: boolean;
    onClose: () => void;
    product: Product | null;
    orderId?: string;
}

const QUICK_ACTIONS = [
    { id: "images", label: "Request Real Images", icon: <ImageIcon className="h-3.5 w-3.5" /> },
    { id: "shipping", label: "Shipping Timeline", icon: <Truck className="h-3.5 w-3.5" /> },
    { id: "warranty", label: "Warranty Info", icon: <HelpCircle className="h-3.5 w-3.5" /> },
    { id: "condition", label: "Confirm Condition", icon: <Box className="h-3.5 w-3.5" /> },
];

export function PostOrderConciergeChat({ isOpen, onClose, product, orderId }: PostOrderChatProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Initialize chat when opened
    useEffect(() => {
        if (isOpen && messages.length === 0 && product) {
            setMessages([
                {
                    id: Date.now().toString(),
                    sender: "ziva",
                    text: `Order received! I'm Ziva, your dedicated FairPrice Concierge for the ${product.name}. How can I assist you with this order before final fulfillment?`,
                    timestamp: new Date(),
                }
            ]);
        }
    }, [isOpen, product, messages.length]);

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    if (!isOpen) return null;

    const handleSend = (text: string = input) => {
        if (!text.trim()) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            sender: "user",
            text,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMsg]);
        setInput("");
        setIsTyping(true);

        // Mock Ziva Response
        setTimeout(() => {
            let zivaText = "I've notified the merchant. Our human concierge team is also monitoring this request and will step in shortly if needed.";
            let imageUrl: string | undefined = undefined;

            const lowerText = text.toLowerCase();
            if (lowerText.includes("image") || lowerText.includes("picture") || lowerText.includes("photo")) {
                zivaText = "I am requesting real-time photos of the actual unit from the merchant's warehouse. As soon as they upload them, they will appear here. You'll also receive a notification when the images are ready.";
            } else if (lowerText.includes("ship") || lowerText.includes("delivery")) {
                zivaText = "Your item is currently being prepared. Based on your location, estimated delivery is within 2-4 business days once handed over to our logistics partners.";
            } else if (lowerText.includes("warranty") || lowerText.includes("guarantee")) {
                zivaText = "This product is covered by FairPrice's strict Escrow Protection. Your funds will not be released to the seller until you confirm the item matches the description.";
            }

            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                sender: "ziva",
                text: zivaText,
                timestamp: new Date()
            }]);
            setIsTyping(false);
        }, 1500);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 sm:p-6 pb-20 sm:pb-6">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[75vh] sm:h-[600px] font-sans"
                    >
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white/80 backdrop-blur-xl relative z-20">
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <div className="w-10 h-10 rounded-full bg-brand-green-100 flex items-center justify-center border-2 border-white shadow-sm overflow-hidden">
                                        <span className="font-black text-brand-green-700 text-lg">Z</span>
                                    </div>
                                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 leading-none">Order Concierge</h3>
                                    <p className="text-[11px] font-medium text-emerald-600 mt-1">Ziva AI & Support Team active</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-500 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Product Context Banner */}
                        {product && (
                            <div className="bg-gray-50 px-4 py-3 flex items-center gap-3 border-b border-gray-100 shrink-0">
                                <img src={product.image_url} alt={product.name} className="w-10 h-10 rounded-lg object-cover bg-white border border-gray-200" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-gray-900 truncate">{product.name}</p>
                                    <p className="text-[10px] text-gray-500 font-medium">Order {orderId || "#RS-PENDING"}</p>
                                </div>
                            </div>
                        )}

                        {/* Chat Area */}
                        <div
                            ref={scrollRef}
                            className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-gray-50/50"
                        >
                            <div className="text-center pb-4">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Today, {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                            </div>

                            {messages.map((msg) => (
                                <motion.div
                                    key={msg.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                                >
                                    <div className={`flex gap-2 max-w-[85%] ${msg.sender === "user" ? "flex-row-reverse" : "flex-row"}`}>

                                        {/* Avatar */}
                                        <div className="shrink-0 mt-auto">
                                            {msg.sender === "ziva" ? (
                                                <div className="w-6 h-6 rounded-full bg-brand-green-100 flex items-center justify-center border border-brand-green-200">
                                                    <span className="text-[10px] font-bold text-brand-green-700">Z</span>
                                                </div>
                                            ) : msg.sender === "admin" ? (
                                                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center border border-blue-200">
                                                    <span className="text-[10px] font-bold text-blue-700">A</span>
                                                </div>
                                            ) : null}
                                        </div>

                                        {/* Message Bubble */}
                                        <div className="flex flex-col gap-1">
                                            <div
                                                className={`px-4 py-2.5 rounded-2xl text-[13px] leading-relaxed relative ${msg.sender === "user"
                                                    ? "bg-black text-white rounded-br-sm"
                                                    : "bg-white text-gray-800 border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)] rounded-bl-sm"
                                                    }`}
                                            >
                                                {msg.text}
                                            </div>

                                            {msg.imageUrl && (
                                                <div className="mt-1 rounded-xl overflow-hidden border border-gray-200 bg-white">
                                                    <img src={msg.imageUrl} alt="Received from seller" className="w-full max-h-48 object-contain bg-gray-50 p-2" />
                                                </div>
                                            )}
                                        </div>

                                    </div>
                                </motion.div>
                            ))}

                            {isTyping && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                                    <div className="flex gap-2 max-w-[80%] flex-row">
                                        <div className="shrink-0 mt-auto">
                                            <div className="w-6 h-6 rounded-full bg-brand-green-100 flex items-center justify-center border border-brand-green-200">
                                                <span className="text-[10px] font-bold text-brand-green-700">Z</span>
                                            </div>
                                        </div>
                                        <div className="px-4 py-3 rounded-2xl bg-white border border-gray-100 shadow-sm rounded-bl-sm flex gap-1.5 items-center">
                                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </div>

                        {/* Quick Actions (only show if no messages from user yet to keep UI clean, or always show for utility) */}
                        <div className="px-4 py-3 bg-white border-t border-gray-100 shrink-0">
                            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                                {QUICK_ACTIONS.map(action => (
                                    <button
                                        key={action.id}
                                        onClick={() => handleSend(action.label)}
                                        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-full text-[11px] font-semibold border border-gray-200 transition-colors"
                                    >
                                        {action.icon}
                                        {action.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Input Area */}
                        <div className="p-4 bg-white border-t border-gray-100 shrink-0">
                            <div className="relative flex items-center">
                                <Input
                                    className="pr-12 bg-gray-50 border-gray-200 h-11 rounded-full text-sm focus:bg-white transition-colors"
                                    placeholder="Ask a question about this layout..."
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSend();
                                        }
                                    }}
                                />
                                <Button
                                    size="icon"
                                    className="absolute right-1 w-9 h-9 rounded-full bg-black hover:bg-gray-800 text-white shadow-sm"
                                    onClick={() => handleSend()}
                                    disabled={!input.trim()}
                                >
                                    <Send className="w-4 h-4" />
                                </Button>
                            </div>
                            <div className="text-center mt-3">
                                <p className="text-[9px] text-gray-400 font-medium">End-to-end encrypted • Escrow Protected</p>
                            </div>
                        </div>

                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
