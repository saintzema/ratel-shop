"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

// ─── Types ───────────────────────────────────────────────
export interface ChatMessage {
    id: string;
    sender: "user" | "seller" | "admin" | "ziva";
    text: string;
    timestamp: string;
    imageUrl?: string;
    /** For negotiation counter-offers */
    negotiation?: {
        productId: string;
        productName: string;
        counterPrice: number;
        originalPrice: number;
    };
}

export interface Conversation {
    id: string;
    orderId: string;
    productName: string;
    productImage?: string;
    messages: ChatMessage[];
    unreadCount: number;
    lastUpdated: string;
}

interface MessageContextType {
    conversations: Conversation[];
    totalUnread: number;
    activeConversationId: string | null;
    isMessageBoxOpen: boolean;
    pendingNotification: ChatMessage | null;
    pendingConversationId: string | null;
    sendMessage: (conversationId: string, message: Omit<ChatMessage, "id" | "timestamp">) => void;
    addSellerMessage: (orderId: string, message: Omit<ChatMessage, "id" | "timestamp">, productName?: string, productImage?: string) => void;
    markAsRead: (conversationId: string) => void;
    openMessageBox: (conversationId?: string) => void;
    closeMessageBox: () => void;
    dismissNotification: () => void;
    getConversation: (orderId: string) => Conversation | undefined;
    startConversation: (orderId: string, productName: string, productImage?: string, initialMessage?: string) => string;
}

const MessageContext = createContext<MessageContextType | undefined>(undefined);

const STORAGE_KEY = "fp_messages";

function loadConversations(): Conversation[] {
    if (typeof window === "undefined") return [];
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch { return []; }
}

function saveConversations(conversations: Conversation[]) {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
}

// ─── Provider ────────────────────────────────────────────
export function MessageProvider({ children }: { children: ReactNode }) {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
    const [isMessageBoxOpen, setIsMessageBoxOpen] = useState(false);
    const [pendingNotification, setPendingNotification] = useState<ChatMessage | null>(null);
    const [pendingConversationId, setPendingConversationId] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);

    // Load on mount
    useEffect(() => {
        setConversations(loadConversations());
        setMounted(true);
    }, []);

    // Listen for storage events (cross-tab: admin dashboard → customer)
    useEffect(() => {
        if (!mounted) return;
        const handleStorage = (e: StorageEvent) => {
            if (e.key === STORAGE_KEY && e.newValue) {
                const newConversations: Conversation[] = JSON.parse(e.newValue);
                // Find new messages to trigger notifications
                const oldConvMap = new Map(conversations.map(c => [c.id, c]));
                for (const conv of newConversations) {
                    const old = oldConvMap.get(conv.id);
                    if (old && conv.messages.length > old.messages.length) {
                        const newMsg = conv.messages[conv.messages.length - 1];
                        if (newMsg.sender !== "user") {
                            setPendingNotification(newMsg);
                            setPendingConversationId(conv.id);
                        }
                    }
                }
                setConversations(newConversations);
            }
        };
        window.addEventListener("storage", handleStorage);
        return () => window.removeEventListener("storage", handleStorage);
    }, [mounted, conversations]);

    // Persist
    useEffect(() => {
        if (mounted) saveConversations(conversations);
    }, [conversations, mounted]);

    const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

    const sendMessage = useCallback((conversationId: string, message: Omit<ChatMessage, "id" | "timestamp">) => {
        setConversations(prev => {
            const updated = prev.map(c => {
                if (c.id !== conversationId) return c;
                const newMsg: ChatMessage = {
                    ...message,
                    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                    timestamp: new Date().toISOString()
                };
                return { ...c, messages: [...c.messages, newMsg], lastUpdated: new Date().toISOString() };
            });
            return updated;
        });
    }, []);

    const addSellerMessage = useCallback((orderId: string, message: Omit<ChatMessage, "id" | "timestamp">, productName?: string, productImage?: string) => {
        const newMsg: ChatMessage = {
            ...message,
            id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            timestamp: new Date().toISOString()
        };

        setConversations(prev => {
            const existing = prev.find(c => c.orderId === orderId);
            if (existing) {
                return prev.map(c => {
                    if (c.orderId !== orderId) return c;
                    return {
                        ...c,
                        messages: [...c.messages, newMsg],
                        unreadCount: c.unreadCount + 1,
                        lastUpdated: new Date().toISOString()
                    };
                });
            }
            // Create a new conversation
            const newConv: Conversation = {
                id: `conv_${Date.now()}`,
                orderId,
                productName: productName || "Order Update",
                productImage,
                messages: [newMsg],
                unreadCount: 1,
                lastUpdated: new Date().toISOString()
            };
            return [newConv, ...prev];
        });

        setPendingNotification(newMsg);
        setPendingConversationId(orderId);
    }, []);

    const startConversation = useCallback((orderId: string, productName: string, productImage?: string, initialMessage?: string) => {
        const existing = conversations.find(c => c.orderId === orderId);
        if (existing) {
            if (initialMessage) {
                sendMessage(existing.id, { sender: "user", text: initialMessage });
            }
            return existing.id;
        }

        const newConvId = `conv_${Date.now()}`;
        const newMsg: ChatMessage | null = initialMessage ? {
            id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            sender: "user",
            text: initialMessage,
            timestamp: new Date().toISOString()
        } : null;

        const newConv: Conversation = {
            id: newConvId,
            orderId,
            productName,
            productImage,
            messages: newMsg ? [newMsg] : [],
            unreadCount: 0,
            lastUpdated: new Date().toISOString()
        };

        setConversations(prev => [newConv, ...prev]);
        return newConvId;
    }, [conversations, sendMessage]);

    const markAsRead = useCallback((conversationId: string) => {
        setConversations(prev =>
            prev.map(c => c.id === conversationId ? { ...c, unreadCount: 0 } : c)
        );
    }, []);

    const openMessageBox = useCallback((conversationId?: string) => {
        if (conversationId) setActiveConversationId(conversationId);
        setIsMessageBoxOpen(true);
        setPendingNotification(null);
    }, []);

    const closeMessageBox = useCallback(() => {
        setIsMessageBoxOpen(false);
        setActiveConversationId(null);
    }, []);

    const dismissNotification = useCallback(() => {
        setPendingNotification(null);
        setPendingConversationId(null);
    }, []);

    const getConversation = useCallback((orderId: string) => {
        return conversations.find(c => c.orderId === orderId);
    }, [conversations]);

    return (
        <MessageContext.Provider value={{
            conversations,
            totalUnread,
            activeConversationId,
            isMessageBoxOpen,
            pendingNotification,
            pendingConversationId,
            sendMessage,
            addSellerMessage,
            markAsRead,
            openMessageBox,
            closeMessageBox,
            dismissNotification,
            getConversation,
            startConversation,
        }}>
            {children}
        </MessageContext.Provider>
    );
}

export function useMessages() {
    const context = useContext(MessageContext);
    if (!context) throw new Error("useMessages must be used within <MessageProvider>");
    return context;
}
