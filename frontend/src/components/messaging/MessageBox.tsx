"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, MessageCircle, ChevronLeft, Image as ImageIcon } from "lucide-react";
import { useMessages, Conversation, ChatMessage } from "@/context/MessageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function MessageBox() {
    const {
        conversations,
        isMessageBoxOpen,
        activeConversationId,
        closeMessageBox,
        sendMessage,
        markAsRead,
        openMessageBox,
    } = useMessages();

    const [input, setInput] = useState("");
    const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Sync active conversation from context
    useEffect(() => {
        if (activeConversationId) {
            // Find by conversationId or orderId
            const conv = conversations.find(c => c.id === activeConversationId || c.orderId === activeConversationId);
            if (conv) {
                setSelectedConvId(conv.id);
                markAsRead(conv.id);
            }
        }
    }, [activeConversationId, conversations, markAsRead]);

    // Auto-scroll on new messages
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [selectedConvId, conversations]);

    if (!isMessageBoxOpen) return null;

    const selectedConversation = conversations.find(c => c.id === selectedConvId);
    const showList = !selectedConvId || !selectedConversation;

    const handleSend = () => {
        if (!input.trim() || !selectedConvId) return;
        sendMessage(selectedConvId, { sender: "user", text: input.trim() });
        setInput("");
    };

    const handleSelectConversation = (conv: Conversation) => {
        setSelectedConvId(conv.id);
        markAsRead(conv.id);
    };

    const handleBack = () => {
        setSelectedConvId(null);
    };

    const formatTime = (ts: string) => {
        const d = new Date(ts);
        return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    };

    const formatDate = (ts: string) => {
        const d = new Date(ts);
        const today = new Date();
        if (d.toDateString() === today.toDateString()) return "Today";
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
        return d.toLocaleDateString([], { month: "short", day: "numeric" });
    };

    return (
        <AnimatePresence>
            {isMessageBoxOpen && (
                <div className="fixed inset-0 z-[9998] flex items-end md:items-center justify-center">
                    {/* Backdrop — shop UI visible faintly */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
                        onClick={closeMessageBox}
                    />

                    {/* Message Box */}
                    <motion.div
                        initial={{ opacity: 0, y: 60 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 60 }}
                        transition={{ type: "spring", damping: 30, stiffness: 350 }}
                        className="relative w-full md:w-[480px] h-[85vh] md:h-[600px] md:max-h-[80vh] flex flex-col overflow-hidden md:rounded-2xl rounded-t-2xl shadow-2xl border border-white/20"
                        style={{
                            background: "rgba(255, 255, 255, 0.92)",
                            backdropFilter: "blur(40px) saturate(180%)",
                            WebkitBackdropFilter: "blur(40px) saturate(180%)",
                        }}
                    >
                        {/* Header */}
                        <div className="px-5 py-4 border-b border-gray-200/60 flex items-center gap-3 shrink-0 bg-white/60">
                            {!showList && (
                                <button onClick={handleBack} className="p-1.5 -ml-1 rounded-full hover:bg-gray-100 transition-colors">
                                    <ChevronLeft className="h-5 w-5 text-gray-600" />
                                </button>
                            )}
                            <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-sm">
                                    <MessageCircle className="h-4 w-4 text-white" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="font-bold text-gray-900 text-sm leading-none truncate">
                                        {showList ? "Messages" : selectedConversation?.productName}
                                    </h3>
                                    <p className="text-[10px] text-emerald-600 font-medium mt-0.5">
                                        {showList
                                            ? `${conversations.length} conversation${conversations.length !== 1 ? "s" : ""}`
                                            : `Order ${selectedConversation?.orderId?.slice(0, 16) || ""}`
                                        }
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={closeMessageBox}
                                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                            >
                                <X className="h-4 w-4 text-gray-500" />
                            </button>
                        </div>

                        {/* Content */}
                        {showList ? (
                            /* Conversation List */
                            <div className="flex-1 overflow-y-auto">
                                {conversations.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-center px-8">
                                        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                                            <MessageCircle className="h-7 w-7 text-gray-300" />
                                        </div>
                                        <p className="text-sm font-bold text-gray-400">No messages yet</p>
                                        <p className="text-xs text-gray-400 mt-1">Your order conversations will appear here</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-gray-100">
                                        {conversations.map(conv => {
                                            const lastMsg = conv.messages[conv.messages.length - 1];
                                            return (
                                                <button
                                                    key={conv.id}
                                                    onClick={() => handleSelectConversation(conv)}
                                                    className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50/80 transition-colors text-left"
                                                >
                                                    <div className="w-11 h-11 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0 overflow-hidden">
                                                        {conv.productImage ? (
                                                            <img src={conv.productImage} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <MessageCircle className="h-5 w-5 text-gray-400" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between mb-0.5">
                                                            <p className="text-sm font-bold text-gray-900 truncate pr-2">{conv.productName}</p>
                                                            <span className="text-[10px] text-gray-400 font-medium shrink-0">
                                                                {formatDate(conv.lastUpdated)}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center justify-between">
                                                            <p className="text-xs text-gray-500 truncate pr-2">{lastMsg?.text || "No messages"}</p>
                                                            {conv.unreadCount > 0 && (
                                                                <span className="bg-emerald-500 text-white text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                                                                    {conv.unreadCount}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* Chat View */
                            <>
                                <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50/30">
                                    {selectedConversation?.messages.map((msg) => (
                                        <div
                                            key={msg.id}
                                            className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                                        >
                                            <div className={`max-w-[80%] space-y-1`}>
                                                {msg.sender !== "user" && (
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">
                                                        {msg.sender === "ziva" ? "Ziva AI" : msg.sender === "admin" ? "Support" : "Seller"}
                                                    </p>
                                                )}
                                                <div
                                                    className={`px-4 py-2.5 rounded-2xl text-[13px] leading-relaxed ${msg.sender === "user"
                                                            ? "bg-black text-white rounded-br-sm"
                                                            : "bg-white text-gray-800 border border-gray-100 shadow-sm rounded-bl-sm"
                                                        }`}
                                                >
                                                    {msg.text}
                                                </div>
                                                {msg.imageUrl && (
                                                    <div className="rounded-xl overflow-hidden border border-gray-200 bg-white">
                                                        <img src={msg.imageUrl} alt="Attachment" className="w-full max-h-48 object-contain bg-gray-50 p-1" />
                                                    </div>
                                                )}
                                                {msg.negotiation && (
                                                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs">
                                                        <p className="font-bold text-amber-800 mb-1">Counter Offer</p>
                                                        <p className="text-amber-700">{msg.negotiation.productName}: <strong>₦{msg.negotiation.counterPrice.toLocaleString()}</strong></p>
                                                    </div>
                                                )}
                                                <p className="text-[9px] text-gray-400 px-1">{formatTime(msg.timestamp)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Input */}
                                <div className="p-3 border-t border-gray-200/60 flex gap-2 items-center bg-white/60 shrink-0">
                                    <Input
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSend();
                                            }
                                        }}
                                        placeholder="Type a message..."
                                        className="flex-1 rounded-full h-10 text-sm bg-gray-50 border-gray-200 focus:bg-white"
                                    />
                                    <Button
                                        size="icon"
                                        onClick={handleSend}
                                        disabled={!input.trim()}
                                        className="rounded-full h-10 w-10 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                                    >
                                        <Send className="h-4 w-4" />
                                    </Button>
                                </div>
                            </>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
