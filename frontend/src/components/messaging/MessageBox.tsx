"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X, Send, MessageCircle, ChevronLeft, Search,
    Bell, Check, CheckCheck, ShoppingBag, Megaphone,
    Truck, Sparkles, Package, Bot, Headphones, Store, Coins
} from "lucide-react";
import { useMessages, Conversation, ChatMessage } from "@/context/MessageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";

// ─── Notification types ─────────────────────────────────
interface AppNotification {
    id: string;
    type: string;
    message: string;
    read: boolean;
    timestamp: string;
    link?: string;
}

export function MessageBox() {
    const {
        conversations,
        isMessageBoxOpen,
        activeConversationId,
        closeMessageBox,
        sendMessage,
        markAsRead,
    } = useMessages();

    const { user } = useAuth();
    const [input, setInput] = useState("");
    const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<"chats" | "notifications">("chats");
    const [searchQuery, setSearchQuery] = useState("");
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Load notifications from database API
    const loadNotifications = useCallback(async () => {
        const email = user?.email;
        if (!email) { setNotifications([]); return; }
        try {
            const res = await fetch(`/api/notifications?user_email=${encodeURIComponent(email)}`);
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) {
                    setNotifications(data.map((n: any) => ({
                        id: String(n.id),
                        type: n.type || "system",
                        message: n.message,
                        read: n.read,
                        timestamp: n.timestamp,
                        link: n.link || undefined,
                    })));
                }
            }
        } catch (err) {
            console.error("Failed to load notifications from DB:", err);
        }
    }, [user?.email]);

    useEffect(() => {
        if (isMessageBoxOpen) {
            loadNotifications();
        }
    }, [isMessageBoxOpen, loadNotifications]);

    // Poll notifications while open
    useEffect(() => {
        if (!isMessageBoxOpen) return;
        const poll = setInterval(loadNotifications, 30000);
        return () => clearInterval(poll);
    }, [isMessageBoxOpen, loadNotifications]);

    // Mark all notifications as read when switching to notifications tab
    const handleTabSwitch = async (tab: "chats" | "notifications") => {
        setActiveTab(tab);
        if (tab === "notifications" && user?.email) {
            // Mark all as read in the database
            try {
                await fetch(`/api/notifications?mark_all=true&user_email=${encodeURIComponent(user.email)}`, {
                    method: "PATCH",
                });
                // Refresh to update local state
                await loadNotifications();
            } catch (err) {
                console.error("Failed to mark notifications as read:", err);
            }
        }
    };

    // Mark a single notification as read when clicked
    const handleNotifClick = async (notif: AppNotification) => {
        if (!notif.read) {
            try {
                await fetch(`/api/notifications?id=${notif.id}`, { method: "PATCH" });
                await loadNotifications();
            } catch (err) {
                console.error("Failed to mark notification as read:", err);
            }
        }
        if (notif.link && typeof window !== "undefined") {
            window.location.href = notif.link;
            closeMessageBox();
        }
    };

    // Sync active conversation from context
    useEffect(() => {
        if (activeConversationId) {
            const conv = conversations.find(c => c.id === activeConversationId || c.orderId === activeConversationId);
            if (conv) {
                setSelectedConvId(conv.id);
                if (conv.unreadCount > 0) {
                    markAsRead(conv.id);
                }
                setActiveTab("chats");
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
    const showChat = selectedConvId && selectedConversation;

    // Sort conversations: most recent first
    const sortedConversations = [...conversations].sort(
        (a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
    );

    // Filter conversations by search
    const filteredConversations = searchQuery.trim()
        ? sortedConversations.filter(c =>
            c.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.messages.some(m => m.text.toLowerCase().includes(searchQuery.toLowerCase()))
        )
        : sortedConversations;

    // Sort notifications: most recent first
    const sortedNotifications = [...notifications].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    const unreadNotifCount = sortedNotifications.filter(n => !n.read).length;
    const totalChatUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

    const handleSend = () => {
        if (!input.trim() || !selectedConvId) return;

        // Security Filter: Detect and prevent sharing of account numbers and bank details
        const cleanedText = input.replace(/[\s\-\.\,]/g, '');
        const has10Digits = /\d{10}/.test(cleanedText);
        const containsBankKeywords = /\b(opay|palmpay|kuda|bank|moniepoint|account|send money|transfer)\b/i.test(input);

        if (has10Digits || (containsBankKeywords && /\d{8,}/.test(cleanedText))) {
            alert("Security Alert: Sending account numbers or requesting direct transfers is strictly prohibited on FairPrice for your safety. Please use the secure Escrow checkout.");
            return;
        }

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

    const formatRelative = (ts: string) => {
        const diff = Date.now() - new Date(ts).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return "Just now";
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        const days = Math.floor(hrs / 24);
        if (days === 1) return "Yesterday";
        if (days < 7) return `${days}d ago`;
        return formatDate(ts);
    };

    const getNotifIcon = (type: string) => {
        switch (type) {
            case "order": return <Truck className="h-4 w-4 text-blue-500" />;
            case "promo": return <Megaphone className="h-4 w-4 text-orange-500" />;
            case "system": return <Sparkles className="h-4 w-4 text-emerald-500" />;
            case "negotiation": return <Coins className="h-4 w-4 text-purple-500" />;
            default: return <Bell className="h-4 w-4 text-gray-500" />;
        }
    };

    // Group messages by date for chat view
    const groupMessagesByDate = (messages: ChatMessage[]) => {
        const groups: { date: string; messages: ChatMessage[] }[] = [];
        messages.forEach(msg => {
            const dateStr = formatDate(msg.timestamp);
            const lastGroup = groups[groups.length - 1];
            if (lastGroup && lastGroup.date === dateStr) {
                lastGroup.messages.push(msg);
            } else {
                groups.push({ date: dateStr, messages: [msg] });
            }
        });
        return groups;
    };

    return (
        <AnimatePresence>
            {isMessageBoxOpen && (
                <div className="fixed inset-0 z-[9998] flex items-end md:items-center justify-center">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/40 backdrop-blur-[3px]"
                        onClick={closeMessageBox}
                    />

                    {/* Message Box Container */}
                    <motion.div
                        initial={{ opacity: 0, y: 60, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 60, scale: 0.95 }}
                        transition={{ type: "spring", damping: 30, stiffness: 350 }}
                        className="relative w-full md:w-[440px] h-[85vh] md:h-[600px] md:max-h-[85vh] flex flex-col overflow-hidden rounded-t-2xl md:rounded-2xl shadow-2xl border border-white/10 bg-white"
                    >
                        {showChat ? (
                            /* ─── CHAT VIEW ────────────────────────── */
                            <>
                                {/* Chat Header */}
                                <div className="px-4 py-3 flex items-center gap-3 shrink-0 bg-brand-green-900 text-white">
                                    <button onClick={handleBack} className="p-1.5 -ml-1 rounded-full hover:bg-white/10 transition-colors">
                                        <ChevronLeft className="h-5 w-5" />
                                    </button>
                                    <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center shrink-0 overflow-hidden border border-white/30">
                                        {selectedConversation.productImage ? (
                                            <img src={selectedConversation.productImage} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <Package className="h-4 w-4 text-white/80" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-sm leading-tight truncate">
                                            {selectedConversation.productName}
                                        </h3>
                                        <p className="text-[10px] text-white/70 font-medium">
                                            {selectedConversation.orderId ? `Order ${selectedConversation.orderId.slice(0, 14)}...` : "Active"}
                                        </p>
                                    </div>
                                    <button onClick={closeMessageBox} className="p-2 rounded-full hover:bg-white/10 transition-colors">
                                        <X className="h-4 w-4 text-white/80" />
                                    </button>
                                </div>

                                {/* Chat Messages — FairPrice branded style */}
                                <div
                                    ref={scrollRef}
                                    className="flex-1 overflow-y-auto px-3 py-3 space-y-1"
                                    style={{
                                        background: "linear-gradient(135deg, #f0fdf4 0%, #f8fafc 50%, #ecfdf5 100%)",
                                    }}
                                >
                                    {groupMessagesByDate(selectedConversation.messages).map((group) => (
                                        <div key={group.date}>
                                            {/* Date separator */}
                                            <div className="flex justify-center my-3">
                                                <span className="bg-brand-green-50 text-brand-green-700 text-[10px] font-bold px-4 py-1 rounded-full shadow-sm border border-brand-green-100">
                                                    {group.date}
                                                </span>
                                            </div>
                                            {group.messages.map((msg) => (
                                                <div
                                                    key={msg.id}
                                                    className={`flex mb-2 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                                                >
                                                    {/* Sender avatar for non-user messages */}
                                                    {msg.sender !== "user" && (
                                                        <div className="w-7 h-7 rounded-full bg-brand-green-100 border border-brand-green-200 flex items-center justify-center shrink-0 mr-1.5 mt-auto mb-1">
                                                            {msg.sender === "ziva" && <Bot className="h-3.5 w-3.5 text-brand-green-600" />}
                                                            {msg.sender === "admin" && <Headphones className="h-3.5 w-3.5 text-brand-green-600" />}
                                                            {msg.sender === "seller" && <Store className="h-3.5 w-3.5 text-brand-green-600" />}
                                                            {!["ziva", "admin", "seller"].includes(msg.sender) && <Bell className="h-3.5 w-3.5 text-gray-400" />}
                                                        </div>
                                                    )}
                                                    <div className={`max-w-[78%] relative`}>
                                                        {msg.sender !== "user" && (
                                                            <p className="text-[9px] font-bold text-brand-green-600 mb-0.5 px-1">
                                                                {msg.sender === "ziva" ? "Ziva AI" : msg.sender === "admin" ? "FairPrice Support" : "Seller"}
                                                            </p>
                                                        )}
                                                        <div
                                                            className={`px-3.5 py-2.5 text-[13px] leading-[1.5] ${msg.sender === "user"
                                                                ? "bg-brand-green-600 text-white rounded-2xl rounded-br-sm shadow-md"
                                                                : "bg-white text-gray-800 rounded-2xl rounded-bl-sm shadow-sm border border-gray-100"
                                                                }`}
                                                        >
                                                            <div className="whitespace-pre-wrap">{msg.text}</div>
                                                            <div className="flex items-center gap-1 justify-end mt-1">
                                                                <span className={`text-[9px] ${msg.sender === "user" ? "text-white/60" : "text-gray-400"}`}>
                                                                    {formatTime(msg.timestamp)}
                                                                </span>
                                                                {msg.sender === "user" && (
                                                                    <CheckCheck className={`h-3.5 w-3.5 ${(msg as any).readByRecipient
                                                                        ? "text-blue-300"
                                                                        : "text-white/50"
                                                                        }`} />
                                                                )}
                                                            </div>
                                                        </div>

                                                        {msg.imageUrl && (
                                                            <div className="rounded-xl overflow-hidden mt-1.5 shadow-sm border border-gray-100">
                                                                <img src={msg.imageUrl} alt="Attachment" className="w-full max-h-48 object-contain bg-white" />
                                                            </div>
                                                        )}
                                                        {msg.negotiation && (
                                                            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-3 mt-1.5 text-xs shadow-sm">
                                                                <p className="font-bold text-amber-800 mb-1 flex items-center gap-1.5">
                                                                    <Coins className="h-3.5 w-3.5" /> Counter Offer
                                                                </p>
                                                                <p className="text-amber-700">{msg.negotiation.productName}: <strong className="text-amber-900">₦{msg.negotiation.counterPrice.toLocaleString()}</strong></p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                </div>

                                {/* Input bar — WhatsApp style */}
                                <div className="px-2 py-2 flex gap-2 items-center bg-[#f0f2f5] shrink-0 border-t border-gray-200/50">
                                    <Input
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSend();
                                            }
                                        }}
                                        placeholder="Type a message"
                                        className="flex-1 rounded-full h-10 text-sm bg-white border-0 shadow-sm focus-visible:ring-1 focus-visible:ring-emerald-300 px-4"
                                    />
                                    <Button
                                        size="icon"
                                        onClick={handleSend}
                                        disabled={!input.trim()}
                                        className="rounded-full h-10 w-10 bg-brand-green-600 hover:bg-brand-green-700 text-white shadow-sm shrink-0"
                                    >
                                        <Send className="h-4 w-4" />
                                    </Button>
                                </div>
                            </>
                        ) : (
                            /* ─── LIST VIEW (Chats + Notifications tabs) ─── */
                            <>
                                {/* Header */}
                                <div className="shrink-0 bg-brand-green-900 text-white">
                                    <div className="px-5 pt-4 pb-2 flex items-center justify-between">
                                        <h2 className="text-lg font-bold">Messages</h2>
                                        <button onClick={closeMessageBox} className="p-2 rounded-full hover:bg-white/10 transition-colors">
                                            <X className="h-4 w-4 text-white/80" />
                                        </button>
                                    </div>

                                    {/* Search */}
                                    <div className="px-4 pb-2">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                                            <input
                                                type="text"
                                                placeholder="Search conversations..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="w-full bg-white/10 text-white placeholder:text-white/40 text-sm rounded-lg pl-9 pr-3 py-2 border-0 outline-none focus:bg-white/15 transition-colors"
                                            />
                                        </div>
                                    </div>

                                    {/* Tabs */}
                                    <div className="flex">
                                        <button
                                            onClick={() => handleTabSwitch("chats")}
                                            className={`flex-1 py-3 text-sm font-bold text-center relative transition-colors ${activeTab === "chats" ? "text-white" : "text-white/60 hover:text-white/80"}`}
                                        >
                                            Chats
                                            {totalChatUnread > 0 && (
                                                <span className="ml-1.5 bg-white text-brand-green-700 text-[9px] font-black w-5 h-5 rounded-full inline-flex items-center justify-center">
                                                    {totalChatUnread}
                                                </span>
                                            )}
                                            {activeTab === "chats" && (
                                                <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-[3px] bg-white rounded-t" />
                                            )}
                                        </button>
                                        <button
                                            onClick={() => handleTabSwitch("notifications")}
                                            className={`flex-1 py-3 text-sm font-bold text-center relative transition-colors ${activeTab === "notifications" ? "text-white" : "text-white/60 hover:text-white/80"}`}
                                        >
                                            Notifications
                                            {unreadNotifCount > 0 && (
                                                <span className="ml-1.5 bg-white text-brand-green-700 text-[9px] font-black w-5 h-5 rounded-full inline-flex items-center justify-center">
                                                    {unreadNotifCount}
                                                </span>
                                            )}
                                            {activeTab === "notifications" && (
                                                <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-[3px] bg-white rounded-t" />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="flex-1 overflow-y-auto bg-white">
                                    <AnimatePresence mode="wait">
                                        {activeTab === "chats" ? (
                                            <motion.div
                                                key="chats"
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: -20 }}
                                                transition={{ duration: 0.15 }}
                                            >
                                                {filteredConversations.length === 0 ? (
                                                    <div className="flex flex-col items-center justify-center h-[300px] text-center px-8">
                                                        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                                                            <MessageCircle className="h-7 w-7 text-gray-300" />
                                                        </div>
                                                        <p className="text-sm font-bold text-gray-400">
                                                            {searchQuery ? "No matches found" : "No conversations yet"}
                                                        </p>
                                                        <p className="text-xs text-gray-400 mt-1">
                                                            {searchQuery ? "Try a different search" : "Start chatting with sellers about your orders"}
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <div className="divide-y divide-gray-100/80">
                                                        {filteredConversations.map(conv => {
                                                            const lastMsg = conv.messages[conv.messages.length - 1];
                                                            return (
                                                                <button
                                                                    key={conv.id}
                                                                    onClick={() => handleSelectConversation(conv)}
                                                                    className={`w-full flex items-center gap-3 px-4 py-3.5 transition-colors text-left ${conv.unreadCount > 0 ? "bg-emerald-50/30" : "hover:bg-gray-50"}`}
                                                                >
                                                                    {/* Avatar */}
                                                                    <div className="w-12 h-12 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0 overflow-hidden relative">
                                                                        {conv.productImage ? (
                                                                            <img src={conv.productImage} alt="" className="w-full h-full object-cover" />
                                                                        ) : (
                                                                            <Package className="h-5 w-5 text-gray-400" />
                                                                        )}
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex items-center justify-between mb-0.5">
                                                                            <p className={`text-[14px] truncate pr-2 ${conv.unreadCount > 0 ? "font-bold text-gray-900" : "font-semibold text-gray-800"}`}>
                                                                                {conv.productName}
                                                                            </p>
                                                                            <span className={`text-[11px] shrink-0 ${conv.unreadCount > 0 ? "text-emerald-600 font-bold" : "text-gray-400"}`}>
                                                                                {formatRelative(conv.lastUpdated)}
                                                                            </span>
                                                                        </div>
                                                                        <div className="flex items-center justify-between">
                                                                            <p className={`text-[12px] truncate pr-2 ${conv.unreadCount > 0 ? "text-gray-700 font-medium" : "text-gray-500"}`}>
                                                                                {lastMsg?.sender === "user" && (
                                                                                    <CheckCheck className="h-3.5 w-3.5 text-blue-500 inline mr-1 -mt-0.5" />
                                                                                )}
                                                                                {lastMsg?.text || "No messages"}
                                                                            </p>
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
                                            </motion.div>
                                        ) : (
                                            <motion.div
                                                key="notifications"
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: 20 }}
                                                transition={{ duration: 0.15 }}
                                            >
                                                {sortedNotifications.length === 0 ? (
                                                    <div className="flex flex-col items-center justify-center h-[300px] text-center px-8">
                                                        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                                                            <Bell className="h-7 w-7 text-gray-300" />
                                                        </div>
                                                        <p className="text-sm font-bold text-gray-400">No notifications</p>
                                                        <p className="text-xs text-gray-400 mt-1">We&apos;ll notify you about orders, deals, and more</p>
                                                    </div>
                                                ) : (
                                                    <div className="divide-y divide-gray-100/80">
                                                        {sortedNotifications.map(notif => (
                                                            <div
                                                                key={notif.id}
                                                                className={`flex items-start gap-3 px-4 py-3.5 transition-colors cursor-pointer ${!notif.read ? "bg-emerald-50/30" : "hover:bg-gray-50"}`}
                                                                onClick={() => handleNotifClick(notif)}
                                                            >
                                                                {/* Icon */}
                                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${!notif.read ? "bg-emerald-100" : "bg-gray-100"}`}>
                                                                    {getNotifIcon(notif.type)}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className={`text-[13px] leading-[1.4] ${!notif.read ? "font-bold text-gray-900" : "text-gray-700"}`}>
                                                                        {notif.message}
                                                                    </p>
                                                                    <p className="text-[11px] text-gray-400 mt-1 font-medium">
                                                                        {formatRelative(notif.timestamp)}
                                                                    </p>
                                                                </div>
                                                                {!notif.read && (
                                                                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
