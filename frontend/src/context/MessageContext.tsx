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
        type?: 'countered' | 'accepted' | 'rejected' | string;
        productId: string;
        productName: string;
        counterPrice: number;
        originalPrice?: number;
    };
    replyTo?: {
        sender: string;
        text: string;
    };
}

export interface Conversation {
    id: string;
    orderId: string;
    productName: string;
    productImage?: string;
    storeName?: string;
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
    startConversation: (orderId: string, productName: string, productImage?: string, initialMessage?: string, storeName?: string) => string;
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

        const handleRemoteNegotiationSync = (e: Event) => {
            const customEvent = e as CustomEvent;
            if (!customEvent.detail || !customEvent.detail.negotiation) return;
            
            const { type, negotiation: neg } = customEvent.detail;
            const orderId = `neg_${neg.product_id}`;

            setConversations(prev => {
                const existing = prev.find(c => c.orderId === orderId);
                if (!existing) return prev; // Avoid creating ghost chats if buyer never started it here

                let text = "";
                if (type === "accepted") {
                    text = `Your offer of ₦${neg.proposed_price.toLocaleString()} has been ACCEPTED! 🎉\n\nYou can now proceed to checkout.`;
                } else if (type === "rejected") {
                    text = `Unfortunately, your offer of ₦${neg.proposed_price.toLocaleString()} was REJECTED.`;
                } else if (type === "countered") {
                    text = neg.counter_message || `The seller sent a counter offer of ₦${neg.counter_price.toLocaleString()}.\n\nDo you accept?`;
                }

                // Deduplicate system messages by text to prevent duplication loops
                if (existing.messages.some(m => m.text === text)) return prev;

                const newMsg: ChatMessage = {
                    sender: "seller",
                    text,
                    timestamp: new Date().toISOString(),
                    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
                };

                if (type === "countered") {
                    newMsg.negotiation = {
                        productId: neg.product_id,
                        counterPrice: neg.counter_price,
                        productName: "Product",
                        originalPrice: neg.proposed_price || neg.counter_price
                    };
                }

                const updated = prev.map(c => 
                    c.id === existing.id 
                    ? { ...c, messages: [...c.messages, newMsg], lastUpdated: new Date().toISOString(), unreadCount: c.unreadCount + 1 } 
                    : c
                );
                
                // Immediately save back to storage to sync any other tabs
                if (typeof window !== "undefined") {
                    localStorage.setItem("fp_messages", JSON.stringify(updated));
                }
                return updated;
            });
        };

        window.addEventListener("storage", handleStorage);
        window.addEventListener("negotiation-updated-remote", handleRemoteNegotiationSync);
        return () => {
            window.removeEventListener("storage", handleStorage);
            window.removeEventListener("negotiation-updated-remote", handleRemoteNegotiationSync);
        };
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

            // Dispatch event to DemoStore to sync local floating chats to backend Postgres schema
            if (typeof window !== "undefined" && conversationId.startsWith("neg_")) {
                const productId = conversationId.replace("neg_", "");
                window.dispatchEvent(new CustomEvent("buyer-negotiation-message-sent", {
                    detail: { productId, text: message.text }
                }));
            }

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
                        unreadCount: activeConversationId === c.id && isMessageBoxOpen ? 0 : c.unreadCount + 1,
                        lastUpdated: new Date().toISOString()
                    };
                });
            }
            // Create a new conversation
            const newConvId = `conv_${Date.now()}`;
            const newConv: Conversation = {
                id: newConvId,
                orderId,
                productName: productName || "Order Update",
                productImage,
                messages: [newMsg],
                unreadCount: activeConversationId === newConvId && isMessageBoxOpen ? 0 : 1,
                lastUpdated: new Date().toISOString()
            };
            return [newConv, ...prev];
        });

        setPendingNotification(newMsg);
        setPendingConversationId(orderId);
    }, []);

    const startConversation = useCallback((orderId: string, productName: string, productImage?: string, initialMessage?: string, storeName?: string) => {
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
            storeName,
            messages: newMsg ? [newMsg] : [],
            unreadCount: 0,
            lastUpdated: new Date().toISOString()
        };

        setConversations(prev => [newConv, ...prev]);
        return newConvId;
    }, [conversations, sendMessage]);

    const markAsRead = useCallback((conversationId: string) => {
        setConversations(prev => {
            const conv = prev.find(c => c.id === conversationId);
            if (conv && conv.unreadCount === 0) return prev; // Do not update state if already read
            return prev.map(c => c.id === conversationId ? { ...c, unreadCount: 0 } : c);
        });
    }, []);

    const openMessageBox = useCallback((conversationId?: string) => {
        if (conversationId) setActiveConversationId(conversationId);
        setIsMessageBoxOpen(true);
        setPendingNotification(null);
        
        // Also mark as read manually if we know the ID
        if (conversationId) {
            setConversations(prev => prev.map(c => c.id === conversationId ? { ...c, unreadCount: 0 } : c));
        } else {
            // Also mark as read for current active if applicable
            setConversations(prev => prev.map(c => {
                if (activeConversationId && c.id === activeConversationId) return { ...c, unreadCount: 0 };
                // If we opened with no args, just clear all unread stats since user saw the box
                return { ...c, unreadCount: 0 };
            }));
        }
    }, [activeConversationId]);

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
