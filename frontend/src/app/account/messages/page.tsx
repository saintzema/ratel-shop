"use client";

import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { MessageSquare, Send, ArrowLeft, CheckCheck, Package, AlertCircle, CheckCircle } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { DemoStore } from "@/lib/demo-store";
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

    // Also load legacy system messages
    const [systemMessages, setSystemMessages] = useState<any[]>([]);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const userId = user?.id || user?.email || "";
    const userName = user?.name || user?.email?.split("@")[0] || "You";

    const loadConversations = () => {
        if (!userId) return;
        const convs = DemoStore.getConversations(userId);
        convs.sort((a: any, b: any) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());
        setConversations(convs);

        // Load legacy system messages that aren't part of conversations
        const saved = localStorage.getItem("fp_user_messages");
        if (saved) {
            try { setSystemMessages(JSON.parse(saved)); } catch { }
        }
    };

    const loadMessages = (convId: string) => {
        const msgs = DemoStore.getChatMessages(convId);
        setMessages(msgs);
        if (userId) DemoStore.markConversationRead(convId, userId);
        loadConversations();
    };

    useEffect(() => {
        loadConversations();
        const handleUpdate = () => loadConversations();
        window.addEventListener("storage", handleUpdate);
        window.addEventListener("demo-store-update", handleUpdate);
        return () => {
            window.removeEventListener("storage", handleUpdate);
            window.removeEventListener("demo-store-update", handleUpdate);
        };
    }, [userId]);

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
        DemoStore.sendChatMessage(activeConv.id, userId, userName, inputText.trim());
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

    const formatTime = (ts: string) => {
        const d = new Date(ts);
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        if (diffMs < 60000) return "now";
        if (diffMs < 3600000) return `${Math.floor(diffMs / 60000)}m`;
        if (diffMs < 86400000) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        return d.toLocaleDateString([], { month: "short", day: "numeric" });
    };

    const getIcon = (type: string) => {
        switch (type) {
            case "order_update": return <Package className="h-4 w-4 text-blue-500" />;
            case "promo": return <AlertCircle className="h-4 w-4 text-orange-500" />;
            default: return <CheckCircle className="h-4 w-4 text-emerald-500" />;
        }
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
                            {totalUnread > 0 ? `${totalUnread} unread` : "All caught up!"}
                        </p>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex" style={{ height: "calc(100vh - 260px)", minHeight: "420px" }}>
                    {/* Left: Conversation List + System Messages */}
                    <div className={cn(
                        "w-full md:w-[300px] md:min-w-[300px] border-r border-gray-100 flex flex-col",
                        mobileShowChat ? "hidden md:flex" : "flex"
                    )}>
                        <div className="flex-1 overflow-y-auto">
                            {/* DM Conversations */}
                            {conversations.length > 0 && (
                                <div>
                                    <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Direct Messages</span>
                                    </div>
                                    {conversations.map(conv => {
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
                                    })}
                                </div>
                            )}

                            {/* System Messages (legacy) */}
                            {systemMessages.length > 0 && (
                                <div>
                                    <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 border-t">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Notifications</span>
                                    </div>
                                    {systemMessages.map(msg => (
                                        <button
                                            key={msg.id}
                                            onClick={() => {
                                                setActiveConv(null);
                                                setMessages([]);
                                                // Just select this system message for display
                                                setActiveConv({ _system: true, _msg: msg });
                                                setMobileShowChat(true);
                                            }}
                                            className={cn(
                                                "w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-all border-l-2 border-l-transparent",
                                                activeConv?._msg?.id === msg.id && "bg-indigo-50/50 border-l-indigo-600"
                                            )}
                                        >
                                            <div className="shrink-0">{getIcon(msg.type)}</div>
                                            <div className="flex-1 min-w-0">
                                                <p className={cn("text-sm truncate", msg.read ? "text-gray-600" : "font-bold text-gray-900")}>{msg.subject}</p>
                                                <p className="text-[10px] text-gray-400 mt-0.5">{msg.from} · {new Date(msg.date).toLocaleDateString()}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {conversations.length === 0 && systemMessages.length === 0 && (
                                <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                                    <MessageSquare className="h-8 w-8 text-gray-200 mb-2" />
                                    <p className="text-sm text-gray-400">No messages yet</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Chat Thread */}
                    <div className={cn(
                        "flex-1 flex flex-col",
                        !mobileShowChat ? "hidden md:flex" : "flex"
                    )}>
                        {activeConv && !activeConv._system ? (
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
                        ) : activeConv?._system ? (
                            /* System Message Detail */
                            <div className="flex-1 flex flex-col">
                                <div className="px-5 py-3 border-b border-gray-100 bg-white flex items-center gap-3">
                                    <button
                                        onClick={() => { setMobileShowChat(false); setActiveConv(null); }}
                                        className="md:hidden h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center"
                                    >
                                        <ArrowLeft className="h-4 w-4 text-gray-600" />
                                    </button>
                                    {getIcon(activeConv._msg.type)}
                                    <h3 className="text-sm font-bold text-gray-900">{activeConv._msg.subject}</h3>
                                </div>
                                <div className="flex-1 p-6 overflow-y-auto">
                                    <p className="text-xs text-gray-400 mb-3">From {activeConv._msg.from} · {new Date(activeConv._msg.date).toLocaleString()}</p>
                                    <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{activeConv._msg.body}</p>
                                </div>
                            </div>
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
