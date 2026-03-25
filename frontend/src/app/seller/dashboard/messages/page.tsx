"use client";

import { useEffect, useState, useRef } from "react";
import { NegotiationRequest, Product, Order, SupportMessage } from "@/lib/types";
import { DemoStore } from "@/lib/demo-store";
import { formatPrice, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    CheckCircle,
    XCircle,
    MessageSquare,
    Clock,
    Search,
    Send,
    ChevronLeft,
    Tag,
    Image as ImageIcon,
    MoreVertical,
    AlertTriangle,
    Undo2,
    Headphones,
    X,
    Bot,
    ShieldAlert,
    Trash2
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Unified Conversation Type
type ConversationType = "all" | "negotiation" | "order" | "dispute" | "return" | "support" | "concierge";

interface Conversation {
    id: string; // The ID of the neg or order or support msg
    type: "negotiation" | "order" | "dispute" | "return" | "support" | "concierge";
    customer_name: string;
    customer_id?: string;
    product_id?: string;
    product_name?: string;
    preview: string;
    updated_at: Date;
    unread: boolean;
    // Context linking
    negotiation?: NegotiationRequest;
    negotiations?: NegotiationRequest[]; // Multiple negotiations grouped by customer
    order?: Order;
    // mock support chat
    chat_messages: { sender: "seller" | "buyer" | "system" | "admin" | "ziva"; text: string; timestamp: Date; imageUrl?: string; replyTo?: { sender: string; text: string } }[];
    // Concierge-specific
    orderId?: string;
    zivaActive?: boolean;
}

export default function UniversalMessagesPage() {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [filter, setFilter] = useState<ConversationType>("all");
    const [search, setSearch] = useState("");

    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [chatMessage, setChatMessage] = useState("");
    const [counterPrice, setCounterPrice] = useState("");
    const [counterMessage, setCounterMessage] = useState("");
    const [selectedImagePreview, setSelectedImagePreview] = useState<string | null>(null);
    const [replyingTo, setReplyingTo] = useState<{ sender: string; text: string } | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const sellerId = DemoStore.getCurrentSellerId();
        if (!sellerId) return;

        const loadData = () => {
            const allProds = DemoStore.getProducts({ includeInactiveSellers: true });
            setProducts(allProds);

            const negs = DemoStore.getNegotiations(sellerId);
            const orders = DemoStore.getOrders().filter(o => o.seller_id === sellerId);

            const convos: Conversation[] = [];

            // Group Negotiations by Customer + Product
            const negotiationsByGroup = new Map<string, NegotiationRequest[]>();
            negs.forEach(neg => {
                const groupId = `${neg.customer_id}_${neg.product_id}`;
                if (!negotiationsByGroup.has(groupId)) {
                    negotiationsByGroup.set(groupId, []);
                }
                negotiationsByGroup.get(groupId)!.push(neg);
            });

            negotiationsByGroup.forEach((customerNegs, groupId) => {
                // Sort by newest first
                customerNegs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                const latestNeg = customerNegs[0];
                const custId = latestNeg.customer_id;
                const prod = allProds.find(p => p.id === latestNeg.product_id);
                
                // Combine all chat messages from all negotiations for this customer/product group
                let allChatMessages: any[] = [];
                customerNegs.forEach(n => {
                    if (n.chat_messages) {
                        allChatMessages.push(...n.chat_messages.map(m => ({
                            ...m,
                            contextProductId: n.product_id,
                            contextProductName: allProds.find(p => p.id === n.product_id)?.name || "Product"
                        })));
                    }
                });
                allChatMessages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

                const mappedChatHistory = allChatMessages.map(m => ({
                    sender: m.sender as "seller" | "buyer",
                    text: m.text,
                    timestamp: new Date(m.timestamp),
                    replyTo: m.replyTo
                }));

                const hasUnread = customerNegs.some(n => {
                    // Unread if it's pending and no counter has been sent yet
                    if (n.status === "pending" && !n.counter_status) return true;
                    // Or if there are messages the seller hasn't read (readByRecipient is false)
                    return n.chat_messages?.some((m: any) => m.sender === "buyer" && m.readByRecipient === false);
                });

                // Senior tech lead: Use the absolute latest activity for the timestamp
                const latestActivityTime = Math.max(
                    new Date(latestNeg.created_at).getTime(),
                    new Date(latestNeg.updated_at || 0).getTime(),
                    ...allChatMessages.map(m => new Date(m.timestamp).getTime())
                );

                convos.push({
                    id: `neg-group-${groupId}`,
                    type: "negotiation",
                    customer_name: latestNeg.customer_name || "Customer",
                    customer_id: custId,
                    product_id: latestNeg.product_id, 
                    product_name: prod?.name,
                    preview: allChatMessages.length > 0 
                        ? allChatMessages[allChatMessages.length - 1].text 
                        : "Sent an offer",
                    updated_at: new Date(latestActivityTime),
                    unread: hasUnread,
                    negotiation: latestNeg,
                    negotiations: customerNegs,
                    chat_messages: mappedChatHistory
                });
            });

            // Add Orders (Disputes & Returns)
            orders.forEach(order => {
                if (order.escrow_status === "disputed" || order.status === "returned") {
                    const prod = allProds.find(p => p.id === order.product_id);
                    const type = order.escrow_status === "disputed" ? "dispute" : "return";

                    convos.push({
                        id: `ord-${order.id}`,
                        type: type,
                        customer_name: order.customer_name || "Unknown Buyer",
                        customer_id: order.customer_id,
                        product_id: order.product_id,
                        product_name: prod?.name,
                        preview: type === "dispute" ? "Buyer opened a dispute regarding this order." : "Buyer requested a return for this order.",
                        updated_at: new Date(order.updated_at),
                        unread: true, // Mock unread for demo
                        order: order,
                        chat_messages: [
                            { sender: "system" as const, text: type === "dispute" ? "Buyer opened a dispute regarding this order." : "Buyer requested a return for this order.", timestamp: new Date(order.updated_at) },
                            ...(order.chat_messages || []).map(m => ({
                                sender: m.sender as "seller" | "buyer" | "system" | "admin" | "ziva",
                                text: m.text,
                                timestamp: new Date(),
                                imageUrl: m.imageUrl
                            }))
                        ]
                    });
                }
            });

            // Add Concierge chats from orders with chat_messages
            orders.forEach(order => {
                if (order.chat_messages && order.chat_messages.length > 0 && !order.escrow_status?.includes('disputed')) {
                    const prod = allProds.find(p => p.id === order.product_id);
                    const lastMsg = order.chat_messages[order.chat_messages.length - 1];
                    convos.push({
                        id: `conc-${order.id}`,
                        type: "concierge",
                        customer_name: order.customer_name || "Customer",
                        customer_id: order.customer_id,
                        product_id: order.product_id,
                        product_name: prod?.name || "Product",
                        preview: lastMsg.text?.substring(0, 60) || "Concierge chat",
                        updated_at: new Date(order.updated_at || order.created_at),
                        unread: !!order.chat_messages.find((m: any) => m.sender === 'user' && !m.read_by?.includes(sellerId)),
                        chat_messages: order.chat_messages.map((m: any) => ({
                            sender: m.sender === 'user' ? 'buyer' as const : m.sender as any,
                            text: m.text,
                            timestamp: new Date(),
                            imageUrl: m.imageUrl
                        })),
                        orderId: order.id,
                        zivaActive: order.zivaActive !== false,
                        order: order,
                    });
                }
            });

            // Load real DM conversations
            const seller = DemoStore.getCurrentSeller();
            const sellerMatchIds = new Set<string>([sellerId]);
            if (seller) {
                if (seller.id) sellerMatchIds.add(seller.id);
                if (seller.user_id) sellerMatchIds.add(seller.user_id);
                if (seller.owner_email) sellerMatchIds.add(seller.owner_email);
            }
            
            const dmConvs = DemoStore.getConversations(sellerId);
            dmConvs.forEach((conv: any) => {
                const isImageRequest = conv.context?.type === "buyer_seller" && conv.context?.product_id;
                const otherParticipantId = conv.participants.find((p: string) => !sellerMatchIds.has(p)) || "";
                const customerName = conv.participant_names?.[otherParticipantId] || "Customer";

                let productName = isImageRequest ? "Image Request" : "Chat";
                if (isImageRequest) {
                    const prod = allProds.find(p => p.id === conv.context.product_id);
                    if (prod) productName = prod.name;
                }

                // Map to unified conversation type
                const mappedMsgs: { sender: "seller" | "buyer" | "system"; text: string; timestamp: Date; imageUrl?: string }[] = DemoStore.getChatMessages(conv.id).map((m: any) => ({
                    sender: sellerMatchIds.has(m.sender_id) ? "seller" as const : "buyer" as const,
                    text: m.text,
                    timestamp: new Date(m.timestamp),
                    imageUrl: undefined,
                }));

                convos.push({
                    id: conv.id,
                    type: isImageRequest ? "support" : "order",
                    customer_name: customerName,
                    customer_id: otherParticipantId,
                    product_id: conv.context?.product_id,
                    product_name: productName,
                    preview: conv.last_message || "Active chat",
                    updated_at: new Date(conv.last_message_at),
                    unread: (conv.unread_count?.[sellerId] || 0) > 0,
                    chat_messages: mappedMsgs.length > 0 ? mappedMsgs : []
                });
            });

            // Handle ?order= URL param for auto-selecting concierge chat
            const params = new URLSearchParams(window.location.search);
            const orderFromUrl = params.get('order');
            const directCustomer = params.get('customer');
            
            if (orderFromUrl) {
                // Try to find existing concierge conversation
                const concThread = convos.find(c => c.orderId === orderFromUrl || c.id === `conc-${orderFromUrl}`);
                if (concThread) {
                    // Will be auto-selected below
                } else {
                    // Create a concierge entry for this order if it has no chat yet
                    const targetOrder = orders.find(o => o.id === orderFromUrl);
                    if (targetOrder) {
                        DemoStore.addOrderMessage(orderFromUrl, 'system', 'Seller joined the concierge chat.');
                        // Re-fetch
                        window.dispatchEvent(new Event('storage'));
                    }
                }
            }
            
            if (directCustomer) {
                // Mock a direct chat thread for this customer if it doesn't exist
                if (!convos.find(c => c.customer_id === directCustomer && c.type === "order")) {
                    convos.push({
                        id: `chat-${directCustomer}`,
                        type: "order", // general chat
                        customer_name: "Customer # " + directCustomer.substring(0, 4), // Fallback naming
                        customer_id: directCustomer,
                        preview: "Start a conversation",
                        updated_at: new Date(),
                        unread: false,
                        chat_messages: []
                    });
                }
            }

            const deletedStubs = DemoStore.getDeletedStubs();
            const filteredConvos = convos.filter(c => !deletedStubs.includes(c.id));
            setConversations(filteredConvos.sort((a, b) => b.updated_at.getTime() - a.updated_at.getTime()));
        };

        loadData();
        window.addEventListener("storage", loadData);
        window.addEventListener("demo-store-update", loadData);
        // Polling for cross-browser/device realtime sync
        const pollInterval = setInterval(() => {
            loadData();
            // Background sync from DB as safety fallback for hot-receive
            DemoStore.syncWithDB();
        }, 3000);
        return () => {
            window.removeEventListener("storage", loadData);
            window.removeEventListener("demo-store-update", loadData);
            clearInterval(pollInterval);
        };
    }, []);

    const filteredConvos = conversations
        .filter(c => filter === "all" || c.type === filter)
        .filter(c => !search || c.customer_name.toLowerCase().includes(search.toLowerCase()) || (c.product_name && c.product_name.toLowerCase().includes(search.toLowerCase())));

    const activeConvo = conversations.find(c => c.id === selectedId);
    const activeProduct = activeConvo?.product_id ? products.find(p => p.id === activeConvo.product_id) : null;
    const activeNeg = activeConvo?.negotiation;

    useEffect(() => {
        // Pre-fill counter price
        if (activeProduct && activeNeg && !counterPrice && activeNeg.status === "pending" && !activeNeg.counter_status) {
            setCounterPrice(Math.round(activeProduct.price * 0.9).toString());
        }
    }, [activeProduct, activeNeg, selectedId]);

    // Handle initial auto-select if direct message
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const directCustomer = params.get('customer');
        if (directCustomer && !selectedId && conversations.length > 0) {
            const directThread = conversations.find(c => c.customer_id === directCustomer);
            if (directThread) setSelectedId(directThread.id);
        }
    }, [conversations, selectedId]);

    // Auto-select concierge from ?order= URL
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const orderFromUrl = params.get('order');
        if (orderFromUrl && !selectedId && conversations.length > 0) {
            const concThread = conversations.find(c => c.orderId === orderFromUrl || c.id === `conc-${orderFromUrl}`);
            if (concThread) {
                setSelectedId(concThread.id);
                setFilter('concierge');
            }
        }
    }, [conversations, selectedId]);

    // Clear reply context when changing conversations
    useEffect(() => {
        setReplyingTo(null);
    }, [selectedId]);

    // Mark as read when active conversation changes
    useEffect(() => {
        if (selectedId) {
            const sellerId = DemoStore.getCurrentSellerId();
            if (!sellerId) return;

            if (selectedId.startsWith("neg-group-")) {
                const groupId = selectedId.replace("neg-group-", "");
                const [custId, prodId] = groupId.split("_");
                const negs = DemoStore.getNegotiations(sellerId).filter(n => n.customer_id === custId && n.product_id === prodId);
                negs.forEach(n => DemoStore.markNegotiationRead(n.id));
            } else if (!selectedId.startsWith("ord-") && !selectedId.startsWith("sup-") && !selectedId.startsWith("chat-") && !selectedId.startsWith("conc-")) {
                DemoStore.markConversationRead(selectedId, sellerId);
            }
        }
    }, [selectedId]);

    const handleAction = (negId: string, status: "accepted" | "rejected") => {
        DemoStore.updateNegotiationStatus(negId, status);
        // Force reload by triggering a storage event manually or just state update
        window.dispatchEvent(new Event("storage"));
    };

    const handleCounterOffer = (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeNeg || !counterPrice) return;
        DemoStore.sendCounterOffer(activeNeg.id, Number(counterPrice), counterMessage);
        setCounterPrice("");
        setCounterMessage("");
        window.dispatchEvent(new Event("storage"));
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            if (event.target?.result) {
                // Show a preview string (data URI)
                setSelectedImagePreview(event.target.result as string);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeConvo || (!chatMessage.trim() && !selectedImagePreview)) return;

        const sellerId = DemoStore.getCurrentSellerId();
        if (!sellerId) return;
        const sellerObj = DemoStore.getSellers().find(s => s.id === sellerId);
        const sellerName = sellerObj?.business_name || "Seller";

        // In a real app, logic branches based on conversation type (DemoStore handles negotiations)
        if (activeConvo.type === "negotiation" && activeConvo.negotiation) {
            DemoStore.addNegotiationMessage(activeConvo.negotiation.id, "seller", chatMessage, selectedImagePreview || undefined, replyingTo || undefined);
        } else if (activeConvo.id.startsWith("ord-")) {
            const orderId = activeConvo.id.replace("ord-", "");
            DemoStore.addOrderMessage(orderId, "seller", chatMessage || (selectedImagePreview ? "[Image Attached]" : ""), selectedImagePreview || undefined, replyingTo || undefined);
        } else if (activeConvo.id.startsWith("conc-")) {
            // Concierge chat — seller sends via order message system
            const orderId = activeConvo.orderId || activeConvo.id.replace("conc-", "");
            DemoStore.addOrderMessage(orderId, "seller", chatMessage || (selectedImagePreview ? "[Image Attached]" : ""), selectedImagePreview || undefined, replyingTo || undefined);
            // If Ziva was active, take over
            if (activeConvo.zivaActive) {
                DemoStore.updateOrder(orderId, { zivaActive: false });
                DemoStore.addOrderMessage(orderId, "system", `${sellerName} has taken over the chat from Ziva AI.`);
            }
        } else if (activeConvo.id.startsWith("chat-")) {
            // New direct chat created from stub
            const newConv = DemoStore.getOrCreateConversation(sellerId, activeConvo.customer_id || "", { [sellerId]: sellerName, [activeConvo.customer_id || ""]: activeConvo.customer_name }, { type: "buyer_seller" });
            DemoStore.sendChatMessage(newConv.id, sellerId, sellerName, chatMessage || (selectedImagePreview ? "[Image Uploaded]" : ""), replyingTo || undefined);
            setSelectedId(newConv.id);
        } else if (!activeConvo.id.startsWith("neg-") && !activeConvo.id.startsWith("ord-") && !activeConvo.id.startsWith("sup-")) {
            // It's a real DM conversation
            DemoStore.sendChatMessage(
                activeConvo.id,
                sellerId,
                sellerName,
                chatMessage || (selectedImagePreview ? "[Image Uploaded]" : ""),
                replyingTo || undefined
            );
        } else {
            // Mock adding to local state for legacy orders/disputes
            setConversations(prev => prev.map(c => {
                if (c.id === activeConvo.id) {
                    return {
                        ...c,
                        chat_messages: [...c.chat_messages, { sender: "seller", text: chatMessage, timestamp: new Date(), imageUrl: selectedImagePreview || undefined, replyTo: replyingTo || undefined }]
                    };
                }
                return c;
            }));
        }

        // Send email notification to the customer
        if (activeConvo.customer_id) {
            const customerEmail = activeConvo.customer_id; // customer_id is often the email
            const sellerObj2 = DemoStore.getSellers().find(s => s.id === sellerId);
            const sellerBusinessName = sellerObj2?.business_name || "Seller";
            fetch('/api/email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: customerEmail,
                    type: 'ORDER_UPDATE',
                    payload: {
                        name: activeConvo.customer_name || 'Customer',
                        orderId: activeConvo.orderId || activeConvo.order?.id || '',
                        status: 'message',
                        message: `${sellerBusinessName} sent you a message: "${(chatMessage || '[Image Attached]').substring(0, 100)}"`,
                    }
                })
            }).catch(err => console.error('Email notification failed:', err));
        }

        setChatMessage("");
        setSelectedImagePreview(null);
        setReplyingTo(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        window.dispatchEvent(new Event("storage")); // mostly for negotiations
    };

    const handleSwipeToReply = (sender: string, text: string) => {
        setReplyingTo({ sender, text });
        // Focus input (would need a ref for the input, but user will tap anyway in mobile)
    };

    const getConvoIcon = (type: string) => {
        switch (type) {
            case "negotiation": return <Tag className="h-4 w-4" />;
            case "order": return <MessageSquare className="h-4 w-4" />;
            case "dispute": return <AlertTriangle className="h-4 w-4" />;
            case "return": return <Undo2 className="h-4 w-4" />;
            case "support": return <Headphones className="h-4 w-4" />;
            case "concierge": return <Bot className="h-4 w-4" />;
            default: return <MessageSquare className="h-4 w-4" />;
        }
    };

    const getConvoColor = (type: string) => {
        switch (type) {
            case "negotiation": return "bg-blue-100 text-blue-600";
            case "order": return "bg-indigo-100 text-indigo-600";
            case "dispute": return "bg-red-100 text-red-600";
            case "return": return "bg-amber-100 text-amber-600";
            case "support": return "bg-emerald-100 text-emerald-600";
            case "concierge": return "bg-brand-green-100 text-brand-green-600";
            default: return "bg-gray-100 text-gray-600";
        }
    };

    const handleZivaTakeover = () => {
        if (!activeConvo?.orderId) return;
        const orderId = activeConvo.orderId;
        const sellerId = DemoStore.getCurrentSellerId();
        const sellerObj = sellerId ? DemoStore.getSellers().find(s => s.id === sellerId) : null;
        const sellerName = sellerObj?.business_name || "Seller";
        DemoStore.updateOrder(orderId, { zivaActive: false });
        DemoStore.addOrderMessage(orderId, "system", `${sellerName} has taken over the chat from Ziva AI.`);
        window.dispatchEvent(new Event("storage"));
    };

    const handleZivaHandback = () => {
        if (!activeConvo?.orderId) return;
        const orderId = activeConvo.orderId;
        DemoStore.updateOrder(orderId, { zivaActive: true });
        DemoStore.addOrderMessage(orderId, "system", "Chat has been handed back to Ziva AI.");
        window.dispatchEvent(new Event("storage"));
    };

    const handleDeleteChat = () => {
        if (!selectedId) return;
        DemoStore.deleteConversation(selectedId);
        setConversations(prev => prev.filter(c => c.id !== selectedId));
        setSelectedId(null);
        window.dispatchEvent(new Event("storage"));
    };

    return (
        <div className="h-[calc(100vh-6rem)] -mt-2 -mx-2 md:-mx-4 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col md:flex-row">

            {/* Sidebar List */}
            <div className={cn(
                "w-full md:w-[320px] lg:w-[380px] bg-gray-50/50 border-r border-gray-200 flex flex-col",
                selectedId ? "hidden md:flex" : "flex"
            )}>
                <div className="p-4 border-b border-gray-200 bg-white">
                    <h2 className="text-xl font-black text-gray-900 mb-3 tracking-tight">Inbox</h2>
                    <div className="relative mb-3">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Search messages..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 bg-gray-50 border-gray-200 h-10 rounded-xl text-sm"
                        />
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        {(["all", "concierge", "negotiation", "dispute", "return", "support"] as ConversationType[]).map(t => (
                            <button
                                key={t}
                                onClick={() => setFilter(t)}
                                className={cn(
                                    "px-3 py-1.5 rounded-full text-[11px] font-bold capitalize whitespace-nowrap transition-colors border",
                                    filter === t ? "bg-gray-900 border-gray-900 text-white" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                                )}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
                    {filteredConvos.length === 0 ? (
                        <div className="p-12 text-center text-gray-400 text-sm font-medium flex flex-col items-center">
                            <MessageSquare className="h-8 w-8 text-gray-300 mb-3" />
                            No conversations match your filter.
                        </div>
                    ) : (
                        filteredConvos.map((convo) => {
                            const isSelected = selectedId === convo.id;
                            return (
                                <div
                                    key={convo.id}
                                    onClick={() => setSelectedId(convo.id)}
                                    className={cn(
                                        "p-4 cursor-pointer transition-colors relative hover:bg-white",
                                        isSelected ? "bg-indigo-50/50 hover:bg-indigo-50" : ""
                                    )}
                                >
                                    {isSelected && <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-600 rounded-r-full" />}
                                    <div className="flex gap-3">
                                        <div className="relative">
                                            <div className="h-12 w-12 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center text-indigo-700 font-bold shrink-0 shadow-inner">
                                                {convo.customer_name.charAt(0)}
                                            </div>
                                            <div className={cn("absolute -bottom-1 -right-1 p-1 rounded-full border-2 border-white", getConvoColor(convo.type))}>
                                                {getConvoIcon(convo.type)}
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                                            <div className="flex justify-between items-center mb-0.5">
                                                <h4 className={cn("text-sm truncate pr-2", convo.unread ? "font-black text-gray-900" : "font-semibold text-gray-700")}>
                                                    {convo.customer_name}
                                                </h4>
                                                <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap">
                                                    {convo.updated_at.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                </span>
                                            </div>
                                            {convo.product_name && (
                                                <p className="text-[11px] font-bold text-gray-400 truncate uppercase tracking-widest mb-0.5">{convo.product_name}</p>
                                            )}
                                            <p className={cn("text-xs truncate", convo.unread ? "font-semibold text-gray-900" : "text-gray-500 font-medium")}>
                                                {convo.preview}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className={cn(
                "flex-1 bg-white flex flex-col relative",
                !selectedId ? "hidden md:flex items-center justify-center bg-gray-50/50" : "flex"
            )}>
                {!activeConvo ? (
                    <div className="text-center">
                        <MessageSquare className="h-16 w-16 text-gray-200 mx-auto mb-4" />
                        <h3 className="text-xl font-black text-gray-900 mb-1">Universal Inbox</h3>
                        <p className="text-sm text-gray-500 font-medium">Select a conversation to view negotiations, disputes, and messages.</p>
                    </div>
                ) : (
                    <>
                        {/* Chat Header */}
                        <div className="h-[72px] px-4 md:px-6 border-b border-gray-200 flex justify-between items-center shrink-0 bg-white z-10">
                            <div className="flex items-center gap-3">
                                <Button size="icon" variant="ghost" className="md:hidden -ml-2 text-gray-500" onClick={() => setSelectedId(null)}>
                                    <ChevronLeft className="h-5 w-5" />
                                </Button>
                                <div className="flex flex-col justify-center">
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-[15px] font-black text-gray-900">{activeConvo.customer_name}</h2>
                                        <Badge variant="outline" className={cn("capitalize text-[10px] px-2 py-0 border-0 shadow-none font-bold", getConvoColor(activeConvo.type))}>
                                            {activeConvo.type}
                                        </Badge>
                                    </div>
                                    <p className="text-[11px] text-gray-400 font-bold uppercase">
                                        {activeConvo.type === "negotiation" ? `Negotiation ID: ${activeConvo.id}` : `Customer: ${activeConvo.customer_id}`}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                {activeConvo.type === "concierge" && (
                                    activeConvo.zivaActive ? (
                                        <Button size="sm" onClick={handleZivaTakeover} className="bg-black hover:bg-gray-800 text-white font-bold text-xs h-8 rounded-lg">
                                            <ShieldAlert className="w-3 h-3 mr-1.5" /> Take Over from Ziva
                                        </Button>
                                    ) : (
                                        <Button size="sm" variant="outline" onClick={handleZivaHandback} className="text-brand-green-700 border-brand-green-200 hover:bg-brand-green-50 font-bold text-xs h-8 rounded-lg">
                                            <Bot className="w-3 h-3 mr-1.5" /> Hand Back to Ziva
                                        </Button>
                                    )
                                )}
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button size="icon" variant="ghost" className="text-gray-400 hover:text-gray-900">
                                            <MoreVertical className="h-5 w-5" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-48">
                                        <DropdownMenuItem onClick={handleDeleteChat} className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer">
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Delete Chat
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>

                        {/* Product/Context Reference Card */}
                        {activeProduct && (
                            <div className="p-3 bg-gray-50/80 border-b border-gray-100 flex gap-4 items-center shrink-0">
                                <div className="h-12 w-12 bg-white rounded-lg border border-gray-200 flex items-center justify-center p-1 shrink-0 shadow-sm">
                                    <img src={activeProduct.image_url || (activeProduct as any).imageUrl || activeProduct.images?.[0] || undefined} alt="" className="max-w-full max-h-full mix-blend-multiply" onError={e => { e.currentTarget.style.display = 'none'; }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-[13px] font-bold text-gray-900 truncate">{activeProduct.name}</h4>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[11px] font-black text-gray-500">{formatPrice(activeProduct.price)} listed</span>
                                        {activeConvo.order && <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md">Order #{activeConvo.order.id}</span>}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Message History */}
                        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-gray-50/30">

                            {/* System Intro Label */}
                            <div className="flex justify-center my-4">
                                <span className="bg-white border border-gray-200 text-gray-400 text-[10px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-full shadow-sm">
                                    Conversation Started {activeConvo.updated_at.toLocaleDateString()}
                                </span>
                            </div>

                            {/* Render Chat History */}
                            {activeConvo.chat_messages.map((msg, idx) => {
                                if (msg.sender === "system") {
                                    return (
                                        <div key={idx} className="flex justify-center my-2">
                                            <span className="bg-amber-50 border border-amber-100 text-amber-700 text-[11px] font-bold px-4 py-2 rounded-xl flex items-center gap-1.5">
                                                <AlertTriangle className="h-3.5 w-3.5" />
                                                {msg.text}
                                            </span>
                                        </div>
                                    );
                                }
                                const isSeller = msg.sender === "seller";
                                return (
                                    <div key={idx} className={cn("flex w-full", isSeller ? "justify-end" : "justify-start")}>
                                        <div className="flex items-end gap-2 max-w-[85%]">
                                            {!isSeller && (
                                                <div className={cn("h-8 w-8 rounded-full flex items-center justify-center font-bold shrink-0 text-xs shadow-inner mb-5",
                                                    msg.sender === "admin" ? "bg-blue-100 text-blue-700" :
                                                    msg.sender === "ziva" ? "bg-brand-green-100 text-brand-green-700 text-[9px]" :
                                                    "bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-700"
                                                )}>
                                                    {msg.sender === "admin" ? "A" : msg.sender === "ziva" ? "Z" : activeConvo.customer_name.charAt(0)}
                                                </div>
                                            )}
                                            <div className="flex flex-col gap-1 items-end group/msg">
                                                <div className="flex items-center gap-2">
                                                    {!isSeller && (
                                                        <button 
                                                            onClick={() => handleSwipeToReply(msg.sender === "admin" ? "Admin" : msg.sender === "ziva" ? "Ziva AI" : activeConvo.customer_name, msg.text)}
                                                            className="opacity-0 group-hover/msg:opacity-100 p-1.5 text-gray-400 hover:text-indigo-600 transition-all rounded-full hover:bg-indigo-50 shrink-0 hidden md:block"
                                                            title="Reply to message"
                                                        >
                                                            <Undo2 className="h-3.5 w-3.5" />
                                                        </button>
                                                    )}
                                                    <div className={cn(
                                                        "rounded-2xl p-3.5 text-[13px] shadow-sm relative",
                                                        isSeller ? "bg-indigo-600 text-white rounded-br-sm" : 
                                                        msg.sender === "admin" ? "bg-blue-600 text-white rounded-bl-sm" :
                                                        msg.sender === "ziva" ? "bg-brand-green-50 border border-brand-green-100 text-brand-green-900 rounded-bl-sm" :
                                                        "bg-white border border-gray-100 text-gray-800 rounded-bl-sm"
                                                    )}>
                                                        {msg.replyTo && (
                                                            <div className={cn(
                                                                "mb-2 p-2 rounded-lg text-[11px] border-l-2 opacity-80",
                                                                isSeller ? "bg-white/10 border-white text-white" : "bg-gray-50 border-gray-300 text-gray-600"
                                                            )}>
                                                                <p className="font-bold mb-0.5">{msg.replyTo.sender}</p>
                                                                <p className="truncate block max-w-[200px]">{msg.replyTo.text}</p>
                                                            </div>
                                                        )}
                                                        {msg.imageUrl && (
                                                            <div className="mb-2 rounded-lg overflow-hidden border border-black/10">
                                                                <img src={msg.imageUrl} alt="attachment" className="max-w-[200px] sm:max-w-xs h-auto" />
                                                            </div>
                                                        )}
                                                        <p className="whitespace-pre-wrap">{msg.text}</p>
                                                    </div>
                                                    {isSeller && (
                                                        <button 
                                                            onClick={() => handleSwipeToReply("You", msg.text)}
                                                            className="opacity-0 group-hover/msg:opacity-100 p-1.5 text-gray-400 hover:text-indigo-600 transition-all rounded-full hover:bg-indigo-50 shrink-0 hidden md:block"
                                                            title="Reply to message"
                                                        >
                                                            <Undo2 className="h-3.5 w-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                                {/* Mobile swipe hint could be implemented via framer-motion, but clicking is a good fallback for now */}
                                                <div 
                                                    className="md:hidden opacity-0 w-full h-full absolute inset-0 cursor-pointer" 
                                                    onDoubleClick={() => handleSwipeToReply(isSeller ? "You" : msg.sender === "admin" ? "Admin" : activeConvo.customer_name, msg.text)}
                                                    title="Double tap to reply"
                                                />
                                                <span className={cn(
                                                    "text-[10px] font-semibold flex items-center gap-1",
                                                    isSeller ? "text-gray-400 justify-end" : "text-gray-400 justify-start"
                                                )}>
                                                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    {isSeller && <CheckCircle className="h-3 w-3 text-emerald-500" />}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Injection of specific Negotiation UI within chat stream */}
                            {activeConvo.type === "negotiation" && activeNeg && (
                                <>
                                    {/* Offer Request Bubble Injection if we don't naturally have it at index 0 */}
                                    {activeConvo.chat_messages.length === 0 && (
                                        <div className="flex items-end gap-2 max-w-[85%]">
                                            <div className="h-8 w-8 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center text-indigo-700 font-bold shrink-0 text-xs shadow-inner mb-5">
                                                {activeConvo.customer_name.charAt(0)}
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm p-4 relative shadow-sm">
                                                    <div className="bg-indigo-50/50 rounded-xl p-3 border border-indigo-50 mb-3 flex items-center gap-3">
                                                        <div className="h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
                                                            <Tag className="h-5 w-5" />
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-0.5">Proposed Price</p>
                                                            <p className="text-xl font-black text-indigo-700 leading-none">{formatPrice(activeNeg.proposed_price)}</p>
                                                        </div>
                                                    </div>
                                                    {activeNeg.message ? (
                                                        <p className="text-[13px] text-gray-700">{activeNeg.message}</p>
                                                    ) : (
                                                        <p className="text-[13px] text-gray-400 italic">No additional message provided.</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Accept/Reject Badges */}
                                    {activeNeg.status === "rejected" && !activeNeg.counter_status && (
                                        <div className="flex justify-center">
                                            <span className="bg-red-50 text-red-600 border border-red-100 text-[11px] font-bold px-4 py-1.5 rounded-full flex items-center gap-1.5">
                                                <XCircle className="h-3.5 w-3.5" /> You rejected this offer.
                                            </span>
                                        </div>
                                    )}

                                    {activeNeg.status === "accepted" && (
                                        <div className="flex justify-center">
                                            <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 text-[11px] font-bold px-4 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm">
                                                <CheckCircle className="h-3.5 w-3.5" /> You accepted this offer!
                                            </span>
                                        </div>
                                    )}

                                    {/* Counter Offer Bubble Inline */}
                                    {activeNeg.counter_price && (
                                        <div className="flex items-end gap-2 max-w-[85%] ml-auto justify-end">
                                            <div className="flex flex-col gap-1 text-right">
                                                <div className="bg-indigo-600 border-indigo-700 text-white rounded-2xl rounded-br-sm p-4 relative shadow-md">
                                                    <div className="bg-white/10 rounded-xl p-3 mb-2 flex items-center gap-3">
                                                        <div className="h-10 w-10 bg-white/20 rounded-full flex items-center justify-center text-white backdrop-blur-sm">
                                                            <Tag className="h-5 w-5" />
                                                        </div>
                                                        <div className="text-left">
                                                            <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest mb-0.5">Your Counter Offer</p>
                                                            <p className="text-xl font-black text-white leading-none">{formatPrice(activeNeg.counter_price)}</p>
                                                        </div>
                                                    </div>
                                                    {activeNeg.counter_message && (
                                                        <p className="text-[13px] text-indigo-50 text-left">{activeNeg.counter_message}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {/* Buyer responses to counter */}
                                    {activeNeg.counter_status === "accepted" && (
                                        <div className="flex justify-center">
                                            <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 text-[11px] font-bold px-4 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm">
                                                <CheckCircle className="h-3.5 w-3.5" /> Buyer accepted your counter offer! Checkout pending.
                                            </span>
                                        </div>
                                    )}

                                    {activeNeg.counter_status === "rejected" && (
                                        <div className="flex justify-center">
                                            <span className="bg-red-50 text-red-600 border border-red-100 text-[11px] font-bold px-4 py-1.5 rounded-full flex items-center gap-1.5">
                                                <XCircle className="h-3.5 w-3.5" /> Buyer rejected your counter offer.
                                            </span>
                                        </div>
                                    )}
                                </>
                            )}

                            {/* Scroll spacer */}
                            <div className="h-4" />
                        </div>

                        {/* Input Area */}
                        <div className="p-4 bg-white border-t border-gray-200 shadow-[0_-8px_30px_-15px_rgba(0,0,0,0.05)] z-20">

                            {replyingTo && (
                                <div className="mb-3 px-3 py-2 bg-indigo-50/50 border border-indigo-100 rounded-lg flex items-center justify-between">
                                    <div className="flex flex-col min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5 font-bold text-[11px] text-indigo-600 uppercase tracking-wider mb-0.5">
                                            <Undo2 className="h-3 w-3" /> Replying to {replyingTo.sender}
                                        </div>
                                        <p className="text-xs text-gray-600 truncate pr-4">{replyingTo.text}</p>
                                    </div>
                                    <button onClick={() => setReplyingTo(null)} className="h-6 w-6 shrink-0 bg-white border border-gray-200 text-gray-500 rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors">
                                        <X className="h-3 w-3" />
                                    </button>
                                </div>
                            )}

                            {selectedImagePreview && (
                                <div className="mb-3 relative inline-block">
                                    <div className="relative group">
                                        <img src={selectedImagePreview} alt="upload preview" className="h-20 w-20 object-cover rounded-xl border-2 border-indigo-100 shadow-sm" />
                                        <button onClick={() => setSelectedImagePreview(null)} className="absolute -top-2 -right-2 h-6 w-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md scale-95 hover:scale-105 transition-transform border-2 border-white">
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {activeConvo.type === "negotiation" && activeNeg && activeNeg.status === "pending" && !activeNeg.counter_status && (
                                <div className="mb-4 bg-gray-50/50 p-4 rounded-2xl border border-gray-100 shadow-inner">
                                    <div className="flex gap-2 justify-center sm:justify-start mb-4">
                                        <Button onClick={() => handleAction(activeNeg.id, "accepted")} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black px-6 shadow-sm flex-1 sm:flex-none">
                                            <CheckCircle className="h-4 w-4 mr-1.5 text-emerald-200" /> Accept {formatPrice(activeNeg.proposed_price)}
                                        </Button>
                                        <Button onClick={() => handleAction(activeNeg.id, "rejected")} variant="outline" className="text-red-600 hover:bg-red-50 border-red-100 rounded-xl font-black px-6 bg-white transition-colors flex-1 sm:flex-none">
                                            Reject
                                        </Button>
                                    </div>
                                    <div className="relative flex items-center mb-4 opacity-70">
                                        <div className="absolute inset-x-0 h-px bg-gray-200"></div>
                                        <span className="relative bg-gray-50 px-3 text-[10px] font-black text-gray-500 tracking-widest uppercase mx-auto">OR NEGOTIATE</span>
                                    </div>
                                    <form onSubmit={handleCounterOffer} className="p-1">
                                        <div className="flex flex-col sm:flex-row gap-2">
                                            <div className="w-full sm:w-[150px] relative">
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
                                            <div className="flex-1 flex gap-2">
                                                <Input
                                                    value={counterMessage}
                                                    onChange={(e) => setCounterMessage(e.target.value)}
                                                    className="flex-1 bg-white border-gray-200 rounded-xl h-11 text-[13px] shadow-sm font-medium focus-visible:ring-indigo-500"
                                                    placeholder="Add a message to your counter offer..."
                                                />
                                                <Button type="submit" className="h-11 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-black text-white shadow-md shadow-indigo-500/20 shrink-0">
                                                    Send Offer
                                                </Button>
                                            </div>
                                        </div>
                                    </form>
                                </div>
                            )}

                            <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="h-12 w-12 rounded-full border-gray-200 shrink-0 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <ImageIcon className="h-5 w-5" />
                                </Button>
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    ref={fileInputRef}
                                    onChange={handleImageUpload}
                                />
                                <Input
                                    value={chatMessage}
                                    onChange={(e) => setChatMessage(e.target.value)}
                                    className="flex-1 bg-gray-50 border-gray-100 rounded-full h-12 px-6 text-[13.px] font-medium shadow-inner focus-visible:ring-indigo-500 focus-visible:border-indigo-500 transition-all placeholder:text-gray-400"
                                    placeholder="Type your message..."
                                />
                                <Button
                                    type="submit"
                                    size="icon"
                                    className="h-12 w-12 rounded-full bg-indigo-600 hover:bg-indigo-700 shrink-0 shadow-md shadow-indigo-600/30 transition-transform active:scale-95 disabled:opacity-50"
                                    disabled={!chatMessage.trim() && !selectedImagePreview}
                                >
                                    <Send className="h-5 w-5 text-white ml-0.5" />
                                </Button>
                            </form>
                        </div>
                    </>
                )}
            </div>

        </div>
    );
}
