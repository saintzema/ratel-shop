"use client";

import { useState, useEffect, useRef } from "react";
import {
    MessageSquare,
    Send,
    Search,
    User,
    Plus,
    ArrowLeft,
    CheckCheck,
    X
} from "lucide-react";
import { DemoStore } from "@/lib/demo-store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSearchParams } from "next/navigation";

const ADMIN_ID = "admin";
const ADMIN_NAME = "FairPrice Admin";

export default function AdminInbox() {
    const searchParams = useSearchParams();
    const [conversations, setConversations] = useState<any[]>([]);
    const [activeConv, setActiveConv] = useState<any>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [inputText, setInputText] = useState("");
    const [showCompose, setShowCompose] = useState(false);
    const [composeTo, setComposeTo] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [mobileShowChat, setMobileShowChat] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Load conversations
    const loadConversations = () => {
        const convs = DemoStore.getConversations(ADMIN_ID);
        // Sort by last_message_at descending
        convs.sort((a: any, b: any) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());
        setConversations(convs);
    };

    // Load messages for active conversation
    const loadMessages = (convId: string) => {
        const msgs = DemoStore.getChatMessages(convId);
        setMessages(msgs);
        DemoStore.markConversationRead(convId, ADMIN_ID);
        loadConversations(); // Refresh unread counts
    };

    useEffect(() => {
        loadConversations();

        // If user_id is in URL, auto-open or create conversation
        const userId = searchParams?.get("user_id");
        if (userId) {
            // Resolve user name
            const sellers = DemoStore.getSellers();
            const seller = sellers.find((s: any) => s.id === userId || s.user_id === userId || s.owner_email === userId);
            const allUsers = DemoStore.getAllUsers();
            const dsUser = allUsers.find((u: any) => u.id === userId || u.email === userId);
            const targetId = seller?.id || dsUser?.id || userId;
            const targetName = seller?.business_name || seller?.owner_name || dsUser?.name || userId;

            const conv = DemoStore.getOrCreateConversation(
                ADMIN_ID, targetId,
                { [ADMIN_ID]: ADMIN_NAME, [targetId]: targetName },
                { type: "admin_dm" }
            );
            setActiveConv(conv);
            loadMessages(conv.id);
            setMobileShowChat(true);
        }

        const handleUpdate = () => loadConversations();
        window.addEventListener("storage", handleUpdate);
        window.addEventListener("demo-store-update", handleUpdate);
        return () => {
            window.removeEventListener("storage", handleUpdate);
            window.removeEventListener("demo-store-update", handleUpdate);
        };
    }, [searchParams]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const openConversation = (conv: any) => {
        setActiveConv(conv);
        loadMessages(conv.id);
        setMobileShowChat(true);
    };

    const handleSend = () => {
        if (!inputText.trim() || !activeConv) return;
        DemoStore.sendChatMessage(activeConv.id, ADMIN_ID, ADMIN_NAME, inputText.trim());
        setInputText("");
        loadMessages(activeConv.id);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleNewConversation = () => {
        if (!composeTo.trim()) return;
        const sellers = DemoStore.getSellers();
        const seller = sellers.find((s: any) => s.id === composeTo || s.user_id === composeTo || s.owner_email === composeTo);
        const allUsers = DemoStore.getAllUsers();
        const dsUser = allUsers.find((u: any) => u.id === composeTo || u.email === composeTo);
        const targetId = seller?.id || dsUser?.id || composeTo;
        const targetName = seller?.business_name || seller?.owner_name || dsUser?.name || composeTo;

        const conv = DemoStore.getOrCreateConversation(
            ADMIN_ID, targetId,
            { [ADMIN_ID]: ADMIN_NAME, [targetId]: targetName },
            { type: "admin_dm" }
        );
        setActiveConv(conv);
        loadMessages(conv.id);
        setShowCompose(false);
        setComposeTo("");
        setMobileShowChat(true);
    };

    const getOtherParticipant = (conv: any) => {
        const otherId = conv.participants.find((p: string) => p !== ADMIN_ID) || "";
        let resolvedName = conv.participant_names?.[otherId] || otherId;
        let resolvedEmail = otherId.includes("@") ? otherId : "user@globalstores.shop";

        // Attempt to enrich from DemoStore
        if (typeof window !== "undefined") {
            const allUsers = DemoStore.getAllUsers();
            const sellers = DemoStore.getSellers();
            const userMatch = allUsers.find((u: any) => u.id === otherId || u.email === otherId);
            const sellerMatch = sellers.find((s: any) => s.id === otherId || s.owner_email === otherId);

            if (userMatch) {
                resolvedName = userMatch.name || resolvedName;
                resolvedEmail = userMatch.email || resolvedEmail;
            } else if (sellerMatch) {
                resolvedName = sellerMatch.owner_name || sellerMatch.business_name || resolvedName;
                resolvedEmail = sellerMatch.owner_email || resolvedEmail;
            }
        }
        return { id: otherId, name: resolvedName, email: resolvedEmail };
    };

    const totalUnread = conversations.reduce((sum, c) => sum + (c.unread_count?.[ADMIN_ID] || 0), 0);

    const filteredConvs = searchQuery
        ? conversations.filter(c => {
            const other = getOtherParticipant(c);
            return other.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                c.last_message?.toLowerCase().includes(searchQuery.toLowerCase());
        })
        : conversations;

    const formatTime = (ts: string) => {
        const d = new Date(ts);
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        if (diffMs < 60000) return "now";
        if (diffMs < 3600000) return `${Math.floor(diffMs / 60000)}m`;
        if (diffMs < 86400000) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        return d.toLocaleDateString([], { month: "short", day: "numeric" });
    };

    return (
        <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">Messages</h2>
                    <p className="text-sm text-gray-500 font-medium mt-0.5">
                        {totalUnread > 0 ? `${totalUnread} unread conversation${totalUnread !== 1 ? "s" : ""}` : "All caught up"}
                    </p>
                </div>
                <Button
                    onClick={() => setShowCompose(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl h-10 px-5 text-xs tracking-wide shadow-lg shadow-indigo-600/20 gap-2"
                >
                    <Plus className="h-4 w-4" /> New Message
                </Button>
            </div>

            {/* Main Chat Layout */}
            <div className="bg-white rounded-[28px] border border-gray-100 shadow-xl overflow-hidden flex" style={{ height: "calc(100vh - 220px)", minHeight: "500px" }}>
                <div className={cn(
                    "w-full md:w-[340px] md:min-w-[340px] md:max-w-[340px] border-r border-gray-100 flex flex-col shrink-0",
                    mobileShowChat ? "hidden md:flex" : "flex"
                )}>
                    {/* Search Bar */}
                    <div className="p-3 border-b border-gray-100">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Search conversations..."
                                className="w-full pl-10 pr-3 py-2.5 bg-gray-50 rounded-xl text-sm border-0 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                            />
                        </div>
                    </div>

                    {/* Conversation List */}
                    <div className="flex-1 overflow-y-auto">
                        {filteredConvs.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                                <MessageSquare className="h-10 w-10 text-gray-200 mb-3" />
                                <p className="text-sm font-bold text-gray-400">No conversations yet</p>
                                <p className="text-xs text-gray-300 mt-1">Start a new message to begin</p>
                            </div>
                        ) : (
                            filteredConvs.map(conv => {
                                const other = getOtherParticipant(conv);
                                const unread = conv.unread_count?.[ADMIN_ID] || 0;
                                const isActive = activeConv?.id === conv.id;

                                return (
                                    <button
                                        key={conv.id}
                                        onClick={() => openConversation(conv)}
                                        className={cn(
                                            "w-full text-left px-4 py-3.5 flex items-center gap-3 transition-all border-l-2",
                                            isActive ? "bg-indigo-50/70 border-l-indigo-600" : "border-l-transparent hover:bg-gray-50"
                                        )}
                                    >
                                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-sm shrink-0">
                                            {other.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className={cn("text-sm truncate", unread > 0 ? "font-black text-gray-900" : "font-semibold text-gray-700")}>
                                                    {other.name}
                                                </span>
                                                <span className="text-[10px] text-gray-400 shrink-0 font-medium">
                                                    {conv.last_message_at ? formatTime(conv.last_message_at) : ""}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between gap-2 mt-0.5">
                                                <p className={cn(
                                                    "text-xs truncate",
                                                    unread > 0 ? "text-gray-700 font-semibold" : "text-gray-400"
                                                )}>
                                                    {conv.last_message?.replace(/\*\*/g, "") || "No messages yet"}
                                                </p>
                                                {unread > 0 && (
                                                    <span className="h-5 min-w-[20px] px-1.5 bg-indigo-600 text-white text-[10px] font-black rounded-full flex items-center justify-center shrink-0">
                                                        {unread}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })
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
                            <div className="px-5 py-3.5 border-b border-gray-100 bg-white flex items-center gap-3">
                                <button
                                    onClick={() => setMobileShowChat(false)}
                                    className="md:hidden h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center"
                                >
                                    <ArrowLeft className="h-4 w-4 text-gray-600" />
                                </button>
                                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-xs">
                                    {getOtherParticipant(activeConv).name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-sm font-bold text-gray-900">{getOtherParticipant(activeConv).name}</h3>
                                    <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">
                                        {getOtherParticipant(activeConv).email} • {activeConv.context?.type === "admin_dm" ? "Admin DM" :
                                            activeConv.context?.type === "ziva_escalation" ? "Ziva Escalation" : "Chat"}
                                    </p>
                                </div>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-gray-50/30">
                                {messages.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-center">
                                        <MessageSquare className="h-8 w-8 text-gray-200 mb-2" />
                                        <p className="text-xs text-gray-400">Send a message to start the conversation</p>
                                    </div>
                                ) : (
                                    messages.map(msg => {
                                        const isAdmin = msg.sender_id === ADMIN_ID;
                                        return (
                                            <div key={msg.id} className={cn("flex", isAdmin ? "justify-end" : "justify-start")}>
                                                <div className={cn(
                                                    "max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm",
                                                    isAdmin
                                                        ? "bg-indigo-600 text-white rounded-br-md"
                                                        : "bg-white text-gray-800 border border-gray-100 rounded-bl-md"
                                                )}>
                                                    {!isAdmin && (
                                                        <p className="text-[10px] font-bold text-indigo-500 mb-0.5">{msg.sender_name}</p>
                                                    )}
                                                    <p className="text-sm whitespace-pre-wrap leading-relaxed">
                                                        {msg.text.replace(/\*\*/g, "")}
                                                    </p>
                                                    <div className={cn(
                                                        "flex items-center gap-1 mt-1",
                                                        isAdmin ? "justify-end" : "justify-start"
                                                    )}>
                                                        <span className={cn("text-[10px]", isAdmin ? "text-indigo-200" : "text-gray-400")}>
                                                            {formatTime(msg.timestamp)}
                                                        </span>
                                                        {isAdmin && <CheckCheck className="h-3 w-3 text-indigo-200" />}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input */}
                            <div className="px-4 py-3 border-t border-gray-100 bg-white">
                                <div className="flex items-end gap-2">
                                    <textarea
                                        value={inputText}
                                        onChange={e => setInputText(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        placeholder="Type a message..."
                                        rows={1}
                                        className="flex-1 resize-none bg-gray-50 rounded-xl px-4 py-2.5 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 max-h-32"
                                        style={{ minHeight: "42px" }}
                                    />
                                    <Button
                                        onClick={handleSend}
                                        disabled={!inputText.trim()}
                                        className="h-[42px] w-[42px] p-0 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20 shrink-0"
                                    >
                                        <Send className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                            <div className="h-20 w-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                                <MessageSquare className="h-8 w-8 text-gray-300" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-400">Select a conversation</h3>
                            <p className="text-sm text-gray-300 mt-1">Choose from existing chats or start a new one</p>
                        </div>
                    )}
                </div>
            </div>

            {/* New Conversation Modal */}
            {showCompose && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                            <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                <MessageSquare className="h-4 w-4 text-indigo-500" />
                                New Conversation
                            </h3>
                            <button onClick={() => setShowCompose(false)} className="text-gray-400 hover:text-gray-700 transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">User Email or ID</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input
                                        type="text"
                                        value={composeTo}
                                        onChange={e => setComposeTo(e.target.value)}
                                        onKeyDown={e => e.key === "Enter" && handleNewConversation()}
                                        placeholder="e.g. user_4a2oib40x or user@example.com"
                                        className="w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        autoFocus
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                            <Button variant="outline" onClick={() => setShowCompose(false)} className="rounded-xl h-10 px-5 font-bold">Cancel</Button>
                            <Button
                                onClick={handleNewConversation}
                                disabled={!composeTo.trim()}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-10 px-6 font-bold"
                            >
                                <Send className="h-4 w-4 mr-2" /> Start Chat
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
