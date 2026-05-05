"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { DataSyncService } from "@/lib/sync-store";

// ─── Types ───────────────────────────────────────────────
export interface ChatMessage {
    id: string;
    sender: "user" | "seller" | "admin" | "ziva";
    text: string;
    timestamp: string;
    imageUrl?: string;
    imageUrls?: string[];
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
    readByRecipient?: boolean;
}

export interface Conversation {
    id: string;
    orderId: string;
    productName: string;
    productImage?: string;
    storeName?: string;
    storeLogo?: string;
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
    startConversation: (orderId: string, productName: string, productImage?: string, initialMessage?: string, storeName?: string, storeLogo?: string) => string;
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

    // Keep a ref to avoid stale closures in event handlers
    const conversationsRef = useRef<Conversation[]>([]);
    useEffect(() => { conversationsRef.current = conversations; }, [conversations]);

    // Listen for storage events (cross-tab: admin dashboard → customer)
    useEffect(() => {
        if (!mounted) return;
        const handleStorage = (e: StorageEvent) => {
            if (e.key === STORAGE_KEY && e.newValue) {
                const newConversations: Conversation[] = JSON.parse(e.newValue);
                // Find new messages to trigger notifications
                const oldConvMap = new Map(conversationsRef.current.map(c => [c.id, c]));
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

        // ─── AGGRESSIVE DUAL-LAYER SYNC LOOP ───
        // Extract Layer 2 logic into a reusable function for real-time reactivity
        const syncFromDataSyncService = () => {
             if (typeof window === "undefined") return;
             try {
                 const rawNegs = localStorage.getItem("fp_negotiations");
                 if (!rawNegs) return;
                 const negs: any[] = JSON.parse(rawNegs);
                 
                 setConversations(prev => {
                     let changed = false;
                     let nextConvs = [...prev];
                     
                     // 1. Auto-create missing negotiations (essential for cross-device/guest sync)
                     for (const neg of negs) {
                         const orderId = `neg_${neg.product_id}`;
                         // Ensure we only sync negotiations meant for the current user
                         const currentUserId = typeof window !== "undefined" ? localStorage.getItem("fp_guest_name") || localStorage.getItem("fp_user_id") || "guest_session" : "";
                         if (neg.customer_id !== currentUserId && neg.customer_id !== "guest_session") continue;

                         if (!nextConvs.some(c => c.orderId === orderId)) {
                             // Find product to enrich conversation UI
                             const allProducts = DataSyncService.getProducts({ includeInactiveSellers: true });
                             const product = allProducts.find(p => p.id === neg.product_id);
                             
                             const newConv: Conversation = {
                                 id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                                 orderId,
                                 productName: product?.name || "Negotiated Item",
                                 productImage: product?.image_url,
                                 storeName: product?.seller_name || "Global Store",
                                 messages: Array.isArray(neg.chat_messages) ? neg.chat_messages.map((m: any) => ({
                                     id: `msg_sync_init_${Math.random()}`,
                                     sender: m.sender || (m.sender_id === neg.customer_id ? "user" : "seller"),
                                     text: m.text,
                                     timestamp: m.timestamp || new Date().toISOString(),
                                     negotiation: m.negotiation,
                                     readByRecipient: m.readByRecipient // Added this
                                 })) : [],
                                 unreadCount: 1,
                                 lastUpdated: neg.updated_at || new Date().toISOString()
                             };
                             nextConvs.push(newConv);
                             changed = true;
                         }
                     }

                     // 2. Diff and append new messages
                     const updated = nextConvs.map(conv => {
                         if (!conv.orderId?.startsWith("neg_")) return conv;
                         const productId = conv.orderId.replace("neg_", "");
                         
                         let patchedConv = conv;
                         // Retrospectively patch missing metadata for older conversations
                         if (!patchedConv.storeName || patchedConv.productName === "Negotiated Item" || !patchedConv.productImage) {
                             const allProducts = DataSyncService.getProducts({ includeInactiveSellers: true });
                             const product = allProducts.find(p => p.id === productId);
                             if (product) {
                                 patchedConv = {
                                     ...patchedConv,
                                     productName: patchedConv.productName === "Negotiated Item" ? product.name : patchedConv.productName,
                                     productImage: patchedConv.productImage || product.image_url,
                                     storeName: patchedConv.storeName || product.seller_name || "Global Store"
                                 };
                                 changed = true;
                             }
                         }

                         // Find ALL negotiations for this product
                         const relatedNegs = negs.filter((n: any) => n.product_id === productId);
                         if (relatedNegs.length === 0) return patchedConv;
                         
                         let newMessages = [...patchedConv.messages];
                         let hasNewMsg = false;
                         
                         for (const neg of relatedNegs) {
                             // Check for counter offers not yet in the conversation
                             if (neg.counter_price && !conv.messages.some(m => 
                                 m.negotiation?.type === 'countered' && m.negotiation?.counterPrice === neg.counter_price
                             )) {
                                 const counterText = neg.counter_message 
                                     ? `💬 Counter Offer\n\nThe seller has proposed a new price of ₦${neg.counter_price.toLocaleString()} for ${conv.productName}.\n\nSeller's message: "${neg.counter_message}"\n\nDo you accept this counter offer?`
                                     : `💬 Counter Offer\n\nThe seller has proposed a new price of ₦${neg.counter_price.toLocaleString()} for ${conv.productName}.\n\nDo you accept this counter offer?`;
                                 
                                 if (!conv.messages.some(m => m.text === counterText)) {
                                     newMessages.push({
                                         id: `msg_sync_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                                         sender: "seller",
                                         text: counterText,
                                         timestamp: neg.updated_at || new Date().toISOString(),
                                         negotiation: {
                                             type: "countered",
                                             productId: neg.product_id,
                                             counterPrice: neg.counter_price,
                                             productName: conv.productName,
                                             originalPrice: neg.proposed_price || neg.counter_price
                                         }
                                     });
                                     hasNewMsg = true;
                                 }
                             }
                             
                             // Check for accepted status
                             if (neg.status === "accepted" && !conv.messages.some(m => 
                                 m.negotiation?.type === 'accepted' && m.text?.includes("ACCEPTED")
                             )) {
                                 const acceptText = `✅ Your offer of ₦${neg.proposed_price?.toLocaleString()} for ${conv.productName} has been ACCEPTED! 🎉\n\nYou can now proceed to checkout at the negotiated price.`;
                                 if (!conv.messages.some(m => m.text === acceptText)) {
                                     newMessages.push({
                                         id: `msg_sync_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                                         sender: "seller",
                                         text: acceptText,
                                         timestamp: neg.updated_at || new Date().toISOString(),
                                         negotiation: {
                                             type: "accepted",
                                             productId: neg.product_id,
                                             counterPrice: neg.proposed_price,
                                             productName: conv.productName,
                                             originalPrice: neg.proposed_price
                                         }
                                     });
                                     hasNewMsg = true;
                                 }
                             }
                             
                             // Check for rejected status
                             if (neg.status === "rejected" && !conv.messages.some(m => 
                                 m.text?.includes("REJECTED") && m.negotiation?.type === 'rejected'
                             )) {
                                 const rejectText = `❌ Unfortunately, your offer of ₦${neg.proposed_price?.toLocaleString()} was REJECTED.`;
                                 if (!conv.messages.some(m => m.text === rejectText)) {
                                     newMessages.push({
                                         id: `msg_sync_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                                         sender: "seller",
                                         text: rejectText,
                                         timestamp: neg.updated_at || new Date().toISOString(),
                                         negotiation: {
                                             type: "rejected",
                                             productId: neg.product_id,
                                             counterPrice: neg.proposed_price,
                                             productName: conv.productName,
                                             originalPrice: neg.proposed_price
                                         }
                                     });
                                     hasNewMsg = true;
                                 }
                             }

                             // Also inject seller chat_messages that aren't in fp_messages yet
                             if (neg.chat_messages && Array.isArray(neg.chat_messages)) {
                                 for (const chatMsg of neg.chat_messages) {
                                     if (chatMsg.sender === "seller" && !conv.messages.some(m => m.text === chatMsg.text)) {
                                         // Skip if it's a system counter-offer message we already handled above
                                         if (chatMsg.text?.startsWith("💬 Counter Offer") || chatMsg.text?.includes("ACCEPTED") || chatMsg.text?.includes("REJECTED")) continue;
                                         newMessages.push({
                                             id: `msg_sync_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                                             sender: "seller",
                                             text: chatMsg.text,
                                             timestamp: chatMsg.timestamp || new Date().toISOString(),
                                             negotiation: chatMsg.negotiation,
                                             readByRecipient: chatMsg.readByRecipient // Added this
                                         });
                                         hasNewMsg = true;
                                      } else if (chatMsg.sender === "buyer" && chatMsg.readByRecipient) {
                                          // Update existing buyer message read status if recipient (seller) has read it
                                          const existingMsg = newMessages.find(m => m.sender === "user" && m.text === chatMsg.text && !m.readByRecipient);
                                          if (existingMsg) {
                                              existingMsg.readByRecipient = true;
                                              hasNewMsg = true; 
                                          }
                                      }
                                 }
                             }
                         }
                         
                         if (hasNewMsg) {
                             changed = true;
                             return { ...conv, messages: newMessages, lastUpdated: new Date().toISOString(), unreadCount: conv.unreadCount + 1 };
                         }
                         return conv;
                     });
                     
                     if (changed) {
                         // Persist immediately
                         localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
                         // Trigger notification for the latest new message
                         const latestConv = updated.find(c => c.unreadCount > 0);
                         if (latestConv) {
                             const lastMsg = latestConv.messages[latestConv.messages.length - 1];
                             if (lastMsg?.sender !== "user") {
                                 setPendingNotification(lastMsg);
                                 setPendingConversationId(latestConv.id);
                             }
                         }
                         return updated;
                     }
                     return prev;
                 });
             } catch (e) {}
        };

        // Layer 1: Pull from Postgres (cross-device) & trigger sync
        const pollInterval = setInterval(() => {
            if (typeof window === "undefined") return;
            DataSyncService.syncNegotiations();
            syncFromDataSyncService();
        }, 12000);

        // React to sync-store-update (e.g. triggered by SSE)
        window.addEventListener("sync-store-update", syncFromDataSyncService);

        return () => {
            window.removeEventListener("storage", handleStorage);
            window.removeEventListener("negotiation-updated-remote", handleRemoteNegotiationSync);
            window.removeEventListener("sync-store-update", syncFromDataSyncService);
            clearInterval(pollInterval);
        };
    }, [mounted]);

    // Persist
    useEffect(() => {
        if (mounted) saveConversations(conversations);
    }, [conversations, mounted]);

    const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

    const sendMessage = useCallback((conversationId: string, message: Omit<ChatMessage, "id" | "timestamp">) => {
        setConversations(prev => {
            const conv = prev.find(c => c.id === conversationId);
            if (!conv) return prev;

            const updated = prev.map(c => {
                if (c.id !== conversationId) return c;
                const newMsg: ChatMessage = {
                    ...message,
                    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                    timestamp: new Date().toISOString()
                };
                return { ...c, messages: [...c.messages, newMsg], lastUpdated: new Date().toISOString() };
            });

            // Dispatch event to DataSyncService to sync local floating chats to backend Postgres schema
            if (typeof window !== "undefined" && conv.orderId.startsWith("neg_")) {
                const productId = conv.orderId.replace("neg_", "");
                window.dispatchEvent(new CustomEvent("buyer-negotiation-message-sent", {
                    detail: { productId, text: message.text, replyTo: (message as any).replyTo }
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

    const startConversation = useCallback((orderId: string, productName: string, productImage?: string, initialMessage?: string, storeName?: string, storeLogo?: string) => {
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
            storeLogo,
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
