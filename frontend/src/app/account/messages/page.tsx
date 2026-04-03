"use client";

import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { MessageSquare, Send, ArrowLeft, CheckCheck, Bell, BellOff, Package, ShieldCheck, Star as StarIcon, AlertTriangle, Info } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { DataSyncService } from "@/lib/sync-store";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default function MessagesPage() {
    const { user } = useAuth();
    const [conversations, setConversations] = useState<any[]>([]);
    const [activeConv, setActiveConv] = useState<any>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [inputText, setInputText] = useState("");
    const [mobileShowChat, setMobileShowChat] = useState(false);
    const [activeTab, setActiveTab] = useState<"conversations" | "notifications">("conversations");
    const [notifications, setNotifications] = useState<any[]>([]);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const userId = user?.id || user?.email || "";
    const userName = user?.name || user?.email?.split("@")[0] || "You";

    const loadConversations = useCallback(() => {
        if (!userId) return;
        const convs = DataSyncService.getConversations(userId);
        convs.sort((a: any, b: any) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());
        setConversations(convs);
    }, [userId]);

    const loadMessages = (convId: string) => {
        const msgs = DataSyncService.getChatMessages(convId);
        setMessages(msgs);
        if (userId) DataSyncService.markConversationRead(convId, userId);
        loadConversations();
    };

    useEffect(() => {
        loadConversations();
        const handleUpdate = () => {
            loadConversations();
            if (userId) setNotifications(DataSyncService.getNotifications(userId));
        };
        window.addEventListener("storage", handleUpdate);
        window.addEventListener("sync-store-update", handleUpdate);
        const poll = setInterval(handleUpdate, 10000);
        return () => {
            window.removeEventListener("storage", handleUpdate);
            window.removeEventListener("sync-store-update", handleUpdate);
            clearInterval(poll);
        };
    }, [loadConversations]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const openConversation = (conv: any) => {
        setActiveConv(conv);
        loadMessages(conv.id);
        setMobileShowChat(true);
    };

    const handleSend = () => {
        if (!inputText.trim() || !activeConv || !userId) return;
        DataSyncService.sendChatMessage(activeConv.id, userId, userName, inputText.trim());
        setInputText("");
        loadMessages(activeConv.id);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const getOtherParticipant = (conv: any) => {
        const otherId = conv.participants.find((p: string) => p !== userId) || "";
        return { id: otherId, name: conv.participant_names?.[otherId] || otherId };
    };

    const totalUnread = conversations.reduce((sum, c) => sum + (c.unread_count?.[userId] || 0), 0);
    const unreadNotifs = notifications.filter(n => !n.read).length;

    const formatTime = (ts: string) => {
        const d = new Date(ts);
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        if (diffMs < 60000) return "Just now";
        if (diffMs < 3600000) return `${Math.floor(diffMs / 60000)}m ago`;
        if (diffMs < 86400000) return `${Math.floor(diffMs / 3600000)}h ago`;
        if (diffMs < 604800000) return `${Math.floor(diffMs / 86400000)}d ago`;
        return d.toLocaleDateString([], { month: "short", day: "numeric" });
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            <Navbar />
            <main className="flex-1 container mx-auto px-4 py-6 max-w-5xl">
                <div className="flex items-center gap-3 mb-5">
                    <div className="p-2 bg-indigo-50 rounded-xl">
                        <MessageSquare className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Messages</h1>
                        <p className="text-xs text-gray-500">
                            {(totalUnread + unreadNotifs) > 0 ? `${totalUnread + unreadNotifs} unread` : "All caught up!"}
                        </p>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex" style={{ height: "calc(100dvh - 260px)", minHeight: "420px" }}>
                    {/* Left: Lists */}
                    <div className={cn(
                        "w-full md:w-[320px] md:min-w-[320px] border-r border-gray-100 flex flex-col",
                        mobileShowChat ? "hidden md:flex" : "flex"
                    )}>
                        <div className="flex border-b border-gray-100 bg-gray-50/50">
                            <button
                                onClick={() => setActiveTab("conversations")}
                                className={cn(
                                    "flex-1 py-3 text-xs font-bold uppercase tracking-widest text-center relative transition-colors",
                                    activeTab === "conversations" ? "text-indigo-600 bg-white" : "text-gray-400 hover:text-gray-600"
                                )}
                            >
                                Chats
                                {totalUnread > 0 && (
                                    <span className="ml-1.5 inline-flex items-center justify-center h-4 min-w-[16px] px-1 bg-indigo-600 text-white text-[9px] font-bold rounded-full">
                                        {totalUnread}
                                    </span>
                                )}
                            </button>
                            <button
                                onClick={() => setActiveTab("notifications")}
                                className={cn(
                                    "flex-1 py-3 text-xs font-bold uppercase tracking-widest text-center relative transition-colors",
                                    activeTab === "notifications" ? "text-indigo-600 bg-white" : "text-gray-400 hover:text-gray-600"
                                )}
                            >
                                Notifications
                                {unreadNotifs > 0 && (
                                    <span className="ml-1.5 inline-flex items-center justify-center h-4 min-w-[16px] px-1 bg-rose-500 text-white text-[9px] font-bold rounded-full">
                                        {unreadNotifs}
                                    </span>
                                )}
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto">
                            {activeTab === "conversations" ? (
                                conversations.length > 0 ? conversations.map(conv => {
                                    const other = getOtherParticipant(conv);
                                    const unread = conv.unread_count?.[userId] || 0;
                                    const isActive = activeConv?.id === conv.id;

                                    return (
                                        <button
                                            key={conv.id}
                                            onClick={() => openConversation(conv)}
                                            className={cn(
                                                "w-full text-left px-4 py-3 flex items-center gap-3 transition-all border-l-2",
                                                isActive ? "bg-indigo-50/70 border-l-indigo-600" : "border-l-transparent hover:bg-gray-50"
                                            )}
                                        >
                                            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
                                                {other.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className={cn("text-sm truncate", unread > 0 ? "font-bold text-gray-900" : "font-medium text-gray-700")}>
                                                        {other.name}
                                                    </span>
                                                    <span className="text-[10px] text-gray-400 shrink-0">
                                                        {conv.last_message_at ? formatTime(conv.last_message_at) : ""}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between gap-2 mt-0.5">
                                                    <p className={cn("text-xs truncate", unread > 0 ? "text-gray-600 font-medium" : "text-gray-400")}>
                                                        {conv.last_message?.replace(/\*\*/g, "").substring(0, 40) || "Start chatting"}
                                                    </p>
                                                    {unread > 0 && (
                                                        <span className="h-4.5 min-w-[18px] px-1 bg-indigo-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center shrink-0">
                                                            {unread}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </button>
                                    );
                                }) : (
                                    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                                        <MessageSquare className="h-8 w-8 text-gray-200 mb-2" />
                                        <p className="text-sm text-gray-400">No messages yet</p>
                                        <p className="text-xs text-gray-300 mt-1">Conversations with sellers and support will appear here.</p>
                                    </div>
                                )
                            ) : (
                                /* Notifications Tab */
                                <>
                                    {unreadNotifs > 0 && (
                                        <div className="px-4 py-2 border-b border-gray-100 bg-gray-50/50 flex justify-end">
                                            <button
                                                onClick={() => {
                                                    if (userId) {
                                                        DataSyncService.markAllNotificationsRead(userId);
                                                        setNotifications(DataSyncService.getNotifications(userId));
                                                    }
                                                }}
                                                className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 uppercase tracking-wider flex items-center gap-1"
                                            >
                                                <BellOff className="h-3 w-3" /> Mark All Read
                                            </button>
                                        </div>
                                    )}
                                    {notifications.length > 0 ? (
                                        <div className="divide-y divide-gray-50">
                                            {notifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map(notif => {
                                                const notifIcon = notif.type === "order" ? Package
                                                    : notif.type === "review" ? StarIcon
                                                    : notif.type === "dispute" ? AlertTriangle
                                                    : notif.type === "system" ? Info
                                                    : Bell;
                                                const NotifIcon = notifIcon;
                                                return (
                                                    <button
                                                        key={notif.id}
                                                        onClick={() => {
                                                            DataSyncService.markNotificationRead(notif.id);
                                                            setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
                                                            if (notif.link) window.location.href = notif.link;
                                                        }}
                                                        className={cn(
                                                            "w-full text-left px-4 py-3.5 flex items-start gap-3 transition-all",
                                                            !notif.read ? "bg-indigo-50/40" : "hover:bg-gray-50"
                                                        )}
                                                    >
                                                        <div className={cn(
                                                            "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                                                            !notif.read ? "bg-indigo-100 text-indigo-600" : "bg-gray-100 text-gray-400"
                                                        )}>
                                                            <NotifIcon className="h-4 w-4" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className={cn("text-sm leading-snug", !notif.read ? "font-semibold text-gray-900" : "text-gray-600")}>
                                                                {notif.message}
                                                            </p>
                                                            <span className="text-[10px] text-gray-400 mt-1 block">
                                                                {formatTime(notif.timestamp)}
                                                            </span>
                                                        </div>
                                                        {!notif.read && (
                                                            <div className="h-2 w-2 rounded-full bg-indigo-500 shrink-0 mt-2" />
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                                            <Bell className="h-8 w-8 text-gray-200 mb-2" />
                                            <p className="text-sm text-gray-400">No notifications</p>
                                            <p className="text-xs text-gray-300 mt-1">You'll be notified about orders, reviews, and updates.</p>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* Right: Chat Thread */}
                    <div className={cn(
                        "flex-1 flex flex-col",
                        !mobileShowChat ? "hidden md:flex" : "flex"
                    )}>
                        {activeConv ? (
                            <>
                                {/* Chat Header */}
                                <div className="px-5 py-3 border-b border-gray-100 bg-white flex items-center gap-3">
                                    <button
                                        onClick={() => { setMobileShowChat(false); setActiveConv(null); }}
                                        className="md:hidden h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center"
                                    >
                                        <ArrowLeft className="h-4 w-4 text-gray-600" />
                                    </button>
                                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs">
                                        {getOtherParticipant(activeConv).name.charAt(0).toUpperCase()}
                                    </div>
                                    <h3 className="text-sm font-bold text-gray-900">{getOtherParticipant(activeConv).name}</h3>
                                </div>

                                {/* Messages */}
                                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-gray-50/30">
                                    {messages.map(msg => {
                                        const isMe = msg.sender_id === userId;
                                        return (
                                            <div key={msg.id} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                                                <div className={cn(
                                                    "max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm",
                                                    isMe
                                                        ? "bg-indigo-600 text-white rounded-br-md"
                                                        : "bg-white text-gray-800 border border-gray-100 rounded-bl-md"
                                                )}>
                                                    {!isMe && (
                                                        <p className="text-[10px] font-bold text-indigo-500 mb-0.5">{msg.sender_name}</p>
                                                    )}
                                                    <p className="text-sm whitespace-pre-wrap leading-relaxed">
                                                        {msg.text.replace(/\*\*/g, "")}
                                                    </p>
                                                    <div className={cn("flex items-center gap-1 mt-1", isMe ? "justify-end" : "justify-start")}>
                                                        <span className={cn("text-[10px]", isMe ? "text-indigo-200" : "text-gray-400")}>
                                                            {formatTime(msg.timestamp)}
                                                        </span>
                                                        {isMe && <CheckCheck className="h-3 w-3 text-indigo-200" />}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div ref={messagesEndRef} />
                                </div>

                                {/* Input */}
                                <div className="px-4 py-3 border-t border-gray-100 bg-white">
                                    <div className="flex items-end gap-2">
                                        <textarea
                                            value={inputText}
                                            onChange={e => setInputText(e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            placeholder="Type a reply..."
                                            rows={1}
                                            className="flex-1 resize-none bg-gray-50 rounded-xl px-4 py-2.5 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 max-h-28"
                                            style={{ minHeight: "42px" }}
                                        />
                                        <Button
                                            onClick={handleSend}
                                            disabled={!inputText.trim()}
                                            className="h-[42px] w-[42px] p-0 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shrink-0"
                                        >
                                            <Send className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                                <MessageSquare className="h-10 w-10 text-gray-200 mb-3" />
                                <h3 className="text-base font-bold text-gray-400">Select a conversation</h3>
                                <p className="text-xs text-gray-300 mt-1">Choose a chat to view messages</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
