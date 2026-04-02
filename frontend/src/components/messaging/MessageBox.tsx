"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
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
import { DemoStore } from "@/lib/demo-store";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";

// ─── Notification types ─────────────────────────────────
interface AppNotification {
    id: string;
    type: string;
    message: string;
    read: boolean;
    timestamp: string;
    link?: string;
}

// ─── Utilities ──────────────────────────────────────────
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

// ─── Memoized Sub-components ─────────────────────────────

const ChatMessageItem = React.memo(({ 
    msg, 
    onReply, 
    onAcceptCounter, 
    onRejectCounter,
    onRenegotiate
}: { 
    msg: ChatMessage, 
    onReply: (sender: string, text: string) => void,
    onAcceptCounter: (productId: string, price: number) => void,
    onRejectCounter: (productId: string) => void,
    onRenegotiate: (productId: string, price: number) => void
}) => {
    const isUser = msg.sender === "user";
    
    return (
        <div className={`flex mb-2 ${isUser ? "justify-end" : "justify-start"}`}>
            {!isUser && (
                <div className="h-8 w-8 rounded-full flex items-center justify-center font-bold shrink-0 text-xs shadow-inner mt-auto mb-1 mr-2 bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-700">
                    {msg.sender === "admin" ? "A" : msg.sender === "ziva" ? "Z" : msg.sender === "seller" ? "S" : <Bell className="h-3.5 w-3.5" />}
                </div>
            )}
            <div className={`max-w-[85%] relative flex flex-col items-${isUser ? "end" : "start"}`}>
                {!isUser && (
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5 px-1 ml-1">
                        {msg.sender === "ziva" ? "Ziva AI" : msg.sender === "admin" ? "FairPrice Support" : "Seller"}
                    </p>
                )}
                <div
                    className={`px-3.5 py-2.5 text-[13px] leading-[1.5] ${isUser
                        ? "bg-indigo-600 backdrop-blur-md text-white rounded-2xl rounded-br-sm shadow-md border-0"
                        : "bg-white text-gray-800 backdrop-blur-md rounded-2xl rounded-bl-sm shadow-sm border border-gray-100"
                        }`}
                    onDoubleClick={() => onReply(msg.sender === 'user' ? 'You' : msg.sender === 'ziva' ? 'Ziva AI' : msg.sender === 'seller' ? 'Seller' : 'Admin', msg.text)}
                >
                    {msg.replyTo && (
                        <div className={`mb-2 p-2 rounded-lg text-[10px] border-l-2 opacity-80 ${isUser ? "bg-white/10 border-white text-white" : "bg-gray-50 border-gray-300 text-gray-600"}`}>
                            <p className="font-bold mb-0.5">{msg.replyTo.sender}</p>
                            <p className="truncate block max-w-[200px] sm:max-w-xs">{msg.replyTo.text}</p>
                        </div>
                    )}
                    <div className="whitespace-pre-wrap">{msg.text}</div>
                    <div className="flex items-center gap-1 justify-end mt-1">
                        <span className={`text-[9px] ${isUser ? "text-white/60" : "text-gray-400"}`}>
                            {formatTime(msg.timestamp)}
                        </span>
                        {isUser && (
                            <CheckCheck className={`h-3.5 w-3.5 ${msg.readByRecipient ? "text-blue-300" : "text-white/50"}`} />
                        )}
                    </div>
                </div>

                {msg.imageUrl && (
                    <div className="rounded-xl overflow-hidden mt-1.5 shadow-sm border border-gray-100">
                        <img src={msg.imageUrl} alt="Attachment" className="w-full max-h-48 object-contain bg-white" />
                    </div>
                )}
                {msg.negotiation && (
                    <div className={`border rounded-xl p-3.5 mt-2 shadow-lg backdrop-blur-md ${msg.negotiation.type === 'accepted' ? 'bg-gradient-to-br from-emerald-500 to-brand-green-600 text-white border-brand-green-400/50' : 'bg-white/90 text-gray-900 border-white/60'}`}>
                        <p className={`font-bold mb-1 flex items-center gap-1.5 ${msg.negotiation.type === 'accepted' ? 'text-white' : 'text-gray-900'}`}>
                            <Coins className="h-4 w-4" /> {msg.negotiation.type === 'accepted' ? "Offer Accepted!" : msg.negotiation.type === 'rejected' ? "Offer Rejected" : "Counter Offer"}
                        </p>
                        <p className={`text-xs mb-3 ${msg.negotiation.type === 'accepted' ? 'text-emerald-50' : 'text-gray-600'}`}>{msg.negotiation.productName}: <strong className={`text-base font-black ${msg.negotiation.type === 'accepted' ? 'text-white' : 'text-emerald-600'}`}>₦{msg.negotiation.counterPrice.toLocaleString()}</strong></p>
                        
                        {msg.negotiation.type === 'countered' && (
                            <div className="flex flex-col gap-2 mt-2">
                                <div className="flex gap-2">
                                    <Button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onAcceptCounter(msg.negotiation!.productId, msg.negotiation!.counterPrice);
                                        }}
                                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 rounded-lg font-bold shadow-md transition-all"
                                    >
                                        Accept ₦{(msg.negotiation.counterPrice || 0).toLocaleString()}
                                    </Button>
                                    <Button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onRejectCounter(msg.negotiation!.productId);
                                        }}
                                        variant="outline"
                                        className="flex-1 border-red-200 text-red-600 hover:bg-red-50 text-xs h-9 rounded-lg font-bold transition-all"
                                    >
                                        Reject
                                    </Button>
                                </div>
                                
                                <div className="relative flex items-center pt-2 pb-1">
                                    <div className="flex-grow border-t border-gray-200"></div>
                                    <span className="shrink-0 text-[10px] font-bold text-gray-400 px-2 uppercase tracking-widest">Or Negotiate</span>
                                    <div className="flex-grow border-t border-gray-200"></div>
                                </div>
                                
                                <form 
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        const form = e.target as HTMLFormElement;
                                        const input = form.elements.namedItem("renegotiatePrice") as HTMLInputElement;
                                        if (!input.value) return;
                                        onRenegotiate(msg.negotiation!.productId, Number(input.value));
                                        input.value = "";
                                    }} 
                                    className="flex gap-2"
                                >
                                    <div className="relative flex-1">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">₦</span>
                                        <input 
                                            name="renegotiatePrice"
                                            type="number" 
                                            placeholder="Amount" 
                                            className="w-full h-9 pl-7 pr-3 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" 
                                        />
                                    </div>
                                    <Button type="submit" size="sm" className="h-9 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold px-3">
                                        Send
                                    </Button>
                                </form>
                            </div>
                        )}
                        
                        {msg.negotiation.type === 'accepted' && (
                            <Button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onAcceptCounter(msg.negotiation!.productId, msg.negotiation!.counterPrice);
                                }}
                                className="w-full bg-white text-brand-green-700 hover:bg-emerald-50 text-xs h-8 rounded-lg font-bold shadow-md transition-all"
                            >
                                Proceed to Checkout
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
});

ChatMessageItem.displayName = "ChatMessageItem";

const ChatMessageList = React.memo(({ 
    messages, 
    onReply,
    onAcceptCounter,
    onRejectCounter,
    onRenegotiate
}: { 
    messages: ChatMessage[], 
    onReply: (sender: string, text: string) => void,
    onAcceptCounter: (productId: string, price: number) => void,
    onRejectCounter: (productId: string) => void,
    onRenegotiate: (productId: string, price: number) => void
}) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const groups = React.useMemo(() => groupMessagesByDate(messages), [messages]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    return (
        <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto min-h-0 overscroll-contain px-4 py-4 space-y-2 bg-gray-50/30"
            style={{ WebkitOverflowScrolling: 'touch' }}
        >
            {groups.map((group) => (
                <div key={group.date}>
                    <div className="flex justify-center my-4">
                        <span className="bg-white border border-gray-200 text-gray-400 text-[10px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-full shadow-sm">
                            {group.date}
                        </span>
                    </div>
                    {group.messages.map((msg) => (
                        <ChatMessageItem 
                            key={msg.id} 
                            msg={msg} 
                            onReply={onReply}
                            onAcceptCounter={onAcceptCounter}
                            onRejectCounter={onRejectCounter}
                            onRenegotiate={onRenegotiate}
                        />
                    ))}
                </div>
            ))}
        </div>
    );
});

ChatMessageList.displayName = "ChatMessageList";

const ChatInputBar = React.memo(({ 
    input, 
    setInput, 
    onSend, 
    replyingTo, 
    setReplyingTo 
}: { 
    input: string, 
    setInput: (val: string) => void, 
    onSend: () => void,
    replyingTo: { sender: string; text: string } | null,
    setReplyingTo: (val: { sender: string; text: string } | null) => void
}) => {
    return (
        <div className="px-4 py-3 flex flex-col gap-2 bg-white shrink-0 border-t border-gray-100">
            {replyingTo && (
                <div className="mx-0 mb-1 mt-1 px-3 py-2 bg-indigo-50 border border-indigo-100 rounded-lg flex items-center justify-between shadow-sm">
                    <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 font-bold text-[10px] text-indigo-700 uppercase tracking-wider mb-0.5">
                            Replying to {replyingTo.sender}
                        </div>
                        <p className="text-[11px] text-gray-600 truncate pr-4">{replyingTo.text}</p>
                    </div>
                    <button onClick={() => setReplyingTo(null)} className="h-5 w-5 shrink-0 bg-white border border-gray-200 text-gray-500 rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors">
                        <X className="h-3 w-3" />
                    </button>
                </div>
            )}
            <div className="flex gap-2 items-center w-full">
                <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            onSend();
                        }
                    }}
                    placeholder="Type a message"
                    className="flex-1 rounded-full h-10 text-sm bg-white border-0 shadow-sm focus-visible:ring-1 focus-visible:ring-emerald-300 px-4"
                />
                <Button
                    size="icon"
                    onClick={onSend}
                    disabled={!input.trim()}
                    className="rounded-full h-10 w-10 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shrink-0"
                >
                    <Send className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
});


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
    const router = useRouter();
    const { addToCart } = useCart();
    const [input, setInput] = useState("");
    const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<"chats" | "notifications">("chats");
    const [searchQuery, setSearchQuery] = useState("");
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [replyingTo, setReplyingTo] = useState<{ sender: string; text: string } | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    // kb-height handled globally by KeyboardAware.tsx via CSS variable --kb-height
    const [activeNegotiation, setActiveNegotiation] = useState<any>(null);
    const [counterPrice, setCounterPrice] = useState("");
    const [counterMessage, setCounterMessage] = useState("");

    // Load notifications from database API, with DemoStore fallback
    const loadNotifications = useCallback(async () => {
        const email = user?.email;
        const userId = user?.id || user?.email || "";
        if (!email && !userId) { setNotifications([]); return; }
        
        let apiNotifs: any[] = [];
        try {
            const res = await fetch(`/api/notifications?user_email=${encodeURIComponent(email || "")}`);
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) {
                    apiNotifs = data;
                }
            }
        } catch (err) {
            // Backend unavailable
        }

        // Always fallback and merge with DemoStore
        const demoNotifs = DemoStore.getNotifications(userId);
        
        // Map DemoStore notifs first layout, updating read status from API if present
        const mergedNotifs = demoNotifs.map((n: any) => {
            const apiMatch = apiNotifs.find((a: any) => String(a.id) === String(n.id));
            return {
                id: String(n.id),
                type: n.type || "system",
                message: n.message,
                read: apiMatch ? apiMatch.read : n.read,
                timestamp: n.timestamp,
                link: n.link || undefined,
            };
        });

        // Add any additional notifications from the API not present in DemoStore locally
        apiNotifs.forEach((a: any) => {
            if (!mergedNotifs.find((m: any) => String(m.id) === String(a.id))) {
                mergedNotifs.push({
                    id: String(a.id),
                    type: a.type || "system",
                    message: a.message,
                    read: a.read,
                    timestamp: a.timestamp,
                    link: a.link || undefined,
                });
            }
        });

        setNotifications(mergedNotifs);
    }, [user?.email, user?.id]);

    useEffect(() => {
        if (isMessageBoxOpen) {
            loadNotifications();
        }
    }, [isMessageBoxOpen, loadNotifications]);

    // Poll notifications while open
    useEffect(() => {
        if (!isMessageBoxOpen) return;
        const poll = setInterval(loadNotifications, 5000);
        return () => clearInterval(poll);
    }, [isMessageBoxOpen, loadNotifications]);

    // Mark all notifications as read when switching to notifications tab
    const handleTabSwitch = async (tab: "chats" | "notifications") => {
        setActiveTab(tab);
        if (tab === "notifications") {
            const userId = user?.id || user?.email || "";
            // Try backend first
            if (user?.email) {
                try {
                    await fetch(`/api/notifications?mark_all=true&user_email=${encodeURIComponent(user.email)}`, {
                        method: "PATCH",
                    });
                } catch { /* ignore */ }
            }
            // Also mark in DemoStore
            if (userId) {
                DemoStore.markAllNotificationsRead(userId);
            }
            await loadNotifications();
        }
    };

    // Mark a single notification as read when clicked
    const handleNotifClick = async (notif: AppNotification) => {
        if (!notif.read) {
            // Try backend
            try {
                await fetch(`/api/notifications?id=${notif.id}`, { method: "PATCH" });
            } catch { /* ignore */ }
            // Also mark in DemoStore
            DemoStore.markNotificationRead(notif.id);
            await loadNotifications();
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

    // Find active negotiation for counter-offers
    useEffect(() => {
        const updateActiveNegotiation = () => {
            if (!selectedConvId || !user) {
                setActiveNegotiation(null);
                return;
            }

            const selectedConv = conversations.find(c => c.id === selectedConvId);
            if (selectedConv) {
                let productId = "";
                if (selectedConv.orderId?.startsWith("neg_")) {
                    productId = selectedConv.orderId.replace("neg_", "");
                }

                if (productId) {
                    const negs = DemoStore.getNegotiations(undefined, user.id);
                    // Match IF (status=countered OR counter_price exists) AND counter_status is pending
                    const active = negs.find(n => 
                        n.product_id === productId && 
                        n.counter_status === "pending" &&
                        (n.status === "countered" || (n.counter_price && n.counter_price > 0))
                    );
                    setActiveNegotiation(active || null);
                } else {
                    setActiveNegotiation(null);
                }
            }
        };

        updateActiveNegotiation();
        
        // Listen for real-time updates to negotiations
        window.addEventListener("demo-store-update", updateActiveNegotiation);
        window.addEventListener("storage", updateActiveNegotiation);
        window.addEventListener("negotiation-updated-remote", updateActiveNegotiation);

        return () => {
            window.removeEventListener("demo-store-update", updateActiveNegotiation);
            window.removeEventListener("storage", updateActiveNegotiation);
            window.removeEventListener("negotiation-updated-remote", updateActiveNegotiation);
        };
    }, [selectedConvId, conversations, user]);


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

    const handleSend = useCallback(() => {
        if (!input.trim() || !selectedConvId) return;

        // Security Filter: Detect and prevent sharing of account numbers and bank details
        const cleanedText = input.replace(/[\s\-\.\,]/g, '');
        const has10Digits = /\d{10}/.test(cleanedText);
        const containsBankKeywords = /\b(opay|palmpay|kuda|bank|moniepoint|account|send money|transfer)\b/i.test(input);

        if (has10Digits || (containsBankKeywords && /\d{8,}/.test(cleanedText))) {
            alert("Security Alert: Sending account numbers or requesting direct transfers is strictly prohibited on FairPrice for your safety. Please use the secure Escrow checkout.");
            return;
        }

        // If this is a negotiation thread, sync the message to the negotiation history
        if (activeNegotiation) {
            DemoStore.addNegotiationMessage(
                activeNegotiation.id, 
                "buyer", 
                input.trim(), 
                undefined, 
                replyingTo ? { sender: replyingTo.sender, text: replyingTo.text } : undefined
            );
        }

        sendMessage(selectedConvId, { sender: "user", text: input.trim(), replyTo: replyingTo || undefined });
        setInput("");
        setReplyingTo(null);
    }, [input, selectedConvId, activeNegotiation, replyingTo, sendMessage]);

    const handleReply = useCallback((sender: string, text: string) => {
        setReplyingTo({ sender, text });
    }, []);

    const handleAcceptCounter = useCallback((productId: string, price: number) => {
        const negs = JSON.parse(localStorage.getItem("fp_negotiations") || "[]");
        const targetNeg = negs.find((n: any) => n.product_id === productId && n.counter_price);
        if (targetNeg) {
            DemoStore.updateCounterStatus(targetNeg.id, "accepted");
        }
        const product = DemoStore.getProducts().find(p => p.id === productId);
        if (product) {
            addToCart({ ...product, price });
            router.push("/cart");
            closeMessageBox();
        }
    }, [addToCart, router, closeMessageBox]);

    const handleRejectCounter = useCallback((productId: string) => {
        const negs = JSON.parse(localStorage.getItem("fp_negotiations") || "[]");
        const targetNeg = negs.find((n: any) => n.product_id === productId && n.counter_price);
        if (targetNeg) {
            DemoStore.updateCounterStatus(targetNeg.id, "rejected");
        }
    }, []);

    const handleRenegotiate = useCallback((productId: string, price: number) => {
        const negs = JSON.parse(localStorage.getItem("fp_negotiations") || "[]");
        const targetNeg = negs.find((n: any) => n.product_id === productId);
        if (targetNeg) {
            DemoStore.sendBuyerCounterOffer(targetNeg.id, price);
            sendMessage(selectedConvId!, {
                sender: "user",
                text: `I'd like to propose ₦${price.toLocaleString()} instead.`
            });
        }
    }, [selectedConvId, sendMessage]);

    const handleSelectConversation = (conv: Conversation) => {
        setSelectedConvId(conv.id);
        markAsRead(conv.id);
    };

    const handleBack = () => {
        setSelectedConvId(null);
    };

    // ─── Hybrid Keyboard Handling ──────────────────────────────
    // Global KeyboardAware.tsx tracks the visual viewport and Capacitor plugin
    // to keep the --kb-height CSS variable updated on <html>.
    // ────────────────────────────────────────────────────────────

    return (
        <AnimatePresence>
            {isMessageBoxOpen && (
                <div 
                    className="fixed inset-0 z-[9998] flex items-end md:items-center justify-center transition-[bottom] duration-200 cubic-bezier(0.1, 0.7, 0.1, 1)"
                    style={{ 
                        bottom: 'var(--kb-height, 0px)',
                        willChange: 'bottom'
                    }}
                >
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
                        ref={containerRef}
                        initial={{ opacity: 0, y: 30, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 30, scale: 0.98 }}
                        transition={{ type: "spring", damping: 35, stiffness: 550, mass: 0.8 }}
                        className="relative w-full md:w-[440px] md:h-[600px] md:max-h-[85vh] flex flex-col overflow-hidden rounded-t-2xl md:rounded-2xl shadow-2xl border border-white/10 bg-white"
                        style={{
                            height: '75%',
                            maxHeight: 'calc(100% - 20px)',
                            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
                            transition: 'bottom 0.2s cubic-bezier(0.1, 0.7, 0.1, 1)'
                        }}
                    >
                        {showChat ? (
                            /* ─── CHAT VIEW ────────────────────────── */
                            <>
                                {/* Chat Header */}
                                <div className="px-4 flex items-center gap-3 shrink-0 bg-indigo-900 text-white h-16">
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
                                        <p className="text-[10px] text-white/70 font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                                            {selectedConversation.storeName ? selectedConversation.storeName : selectedConversation.orderId ? `Order ${selectedConversation.orderId.slice(0, 14)}...` : "Active"}
                                        </p>
                                    </div>
                                    <button onClick={closeMessageBox} className="p-2 rounded-full hover:bg-white/10 transition-colors">
                                        <X className="h-4 w-4 text-white/80" />
                                    </button>
                                </div>

                                {/* Chat Messages — Memoized List */}
                                <ChatMessageList 
                                    messages={selectedConversation.messages}
                                    onReply={handleReply}
                                    onAcceptCounter={handleAcceptCounter}
                                    onRejectCounter={handleRejectCounter}
                                    onRenegotiate={handleRenegotiate}
                                />
                                
                                {activeNegotiation && (
                                    <div className="mx-4 mb-3 bg-gray-50/80 p-4 rounded-2xl border border-gray-100 shadow-inner backdrop-blur-sm animate-in fade-in slide-in-from-bottom-2">
                                        <div className="flex gap-2 justify-center mb-4">
                                            <Button 
                                                onClick={() => {
                                                    DemoStore.updateCounterStatus(activeNegotiation.id, "accepted");
                                                    const product = DemoStore.getProducts({ includeInactiveSellers: true }).find(p => p.id === activeNegotiation.product_id);
                                                    if (product) {
                                                        addToCart(product, 1, activeNegotiation.counter_price);
                                                        router.push("/cart");
                                                        closeMessageBox();
                                                    }
                                                }} 
                                                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black px-6 shadow-sm flex-1"
                                            >
                                                Accept ₦{(activeNegotiation.counter_price || 0).toLocaleString()}
                                            </Button>
                                            <Button 
                                                onClick={() => {
                                                    DemoStore.updateCounterStatus(activeNegotiation.id, "rejected");
                                                    setActiveNegotiation(null);
                                                }} 
                                                variant="outline" 
                                                className="text-red-600 hover:bg-red-50 border-red-100 rounded-xl font-black px-6 bg-white transition-colors flex-1"
                                            >
                                                Reject
                                            </Button>
                                        </div>
                                        <div className="relative flex items-center mb-4 opacity-70">
                                            <div className="absolute inset-x-0 h-px bg-gray-200"></div>
                                            <span className="relative bg-gray-50 px-3 text-[10px] font-black text-gray-500 tracking-widest uppercase mx-auto">OR NEGOTIATE</span>
                                        </div>
                                        <form 
                                            onSubmit={(e) => {
                                                e.preventDefault();
                                                const price = Number(counterPrice);
                                                if (!price) return;
                                                DemoStore.sendBuyerCounterOffer(activeNegotiation.id, price, counterMessage);
                                                sendMessage(selectedConvId!, { 
                                                    sender: "user", 
                                                    text: `🤝 Counter-Offer: ₦${price.toLocaleString()}${counterMessage ? `\n\n"${counterMessage}"` : ""}` 
                                                });
                                                setCounterPrice("");
                                                setCounterMessage("");
                                                setActiveNegotiation(null);
                                            }} 
                                            className="p-1"
                                        >
                                            <div className="flex flex-col gap-2">
                                                <div className="relative">
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
                                                <div className="flex gap-2">
                                                    <Input
                                                        value={counterMessage}
                                                        onChange={(e) => setCounterMessage(e.target.value)}
                                                        className="flex-1 bg-white border-gray-200 rounded-xl h-11 text-[13px] shadow-sm font-medium"
                                                        placeholder="Add a message..."
                                                    />
                                                    <Button type="submit" className="h-11 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-black text-white shadow-md shadow-indigo-500/20 shrink-0">
                                                        Send Offer
                                                    </Button>
                                                </div>
                                            </div>
                                        </form>
                                    </div>
                                )}

                                {/* Memoized Input Bar */}
                                <ChatInputBar 
                                    input={input}
                                    setInput={setInput}
                                    onSend={handleSend}
                                    replyingTo={replyingTo}
                                    setReplyingTo={setReplyingTo}
                                />
                            </>
                        ) : (
                            /* ─── LIST VIEW (Chats + Notifications tabs) ─── */
                            <>
                                {/* Header */}
                                <div className="shrink-0 bg-indigo-900 text-white">
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
                                <div className="flex-1 overflow-y-auto min-h-0 overscroll-contain bg-white pb-6">
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
                                                                                    <CheckCheck className={`h-3.5 w-3.5 inline mr-1 -mt-0.5 ${lastMsg.readByRecipient ? "text-blue-500" : "text-gray-300"}`} />
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
