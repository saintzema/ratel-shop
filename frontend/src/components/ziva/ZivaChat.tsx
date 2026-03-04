"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    MessageSquare, X, Send, Sparkles, ShoppingBag, ShieldCheck,
    Star, TrendingDown, Search, Package, ArrowRight, Heart, Tag,
    Zap, Clock, AlertTriangle, CheckCircle, Loader2, Paperclip, Image as ImageIcon
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { DemoStore } from "@/lib/demo-store";
import { Product, PriceComparison } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import { getDemoPriceComparison } from "@/lib/data";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { usePathname } from "next/navigation";

// ─── Intent Detection ────────────────────────────────────
type Intent =
    | "search_product"
    | "price_check"
    | "compare_prices"
    | "recommend"
    | "deals"
    | "track_order"
    | "negotiate"
    | "category_browse"
    | "talk_to_human"
    | "complaint"
    | "greeting"
    | "help"
    | "unknown";

interface DetectedIntent {
    intent: Intent;
    query: string;
    category?: string;
    budget?: number;
    productName?: string;
}

function detectIntent(input: string): DetectedIntent {
    const lower = input.toLowerCase().trim();

    // Greetings
    if (/^(hi|hello|hey|good\s*(morning|afternoon|evening)|what'?s?\s*up|yo)\b/i.test(lower)) {
        return { intent: "greeting", query: input };
    }

    // Help
    if (/^(help|how\s*(do|can|to)|what\s*(can|do)\s*you)/i.test(lower)) {
        return { intent: "help", query: input };
    }

    // Talk to a human / complaint
    if (/\b(talk\s*to\s*(a\s*)?(human|person|agent|manager|support|representative)|escalate|real\s*person|human\s*support|live\s*chat|speak\s*to)\b/i.test(lower)) {
        return { intent: "talk_to_human", query: input };
    }
    if (/\b(complain|complaint|issue|problem|broken|damaged|wrong|missing|refund|return|scam|fraud)\b/i.test(lower)) {
        return { intent: "complaint", query: input };
    }

    // Order tracking
    if (/FP-[A-Z0-9]+/i.test(lower) || /\b(track|order|delivery|shipped|where.*(order|package)|status)\b/i.test(lower)) {
        return { intent: "track_order", query: input };
    }

    // Deals
    if (/\b(deal|flash|discount|sale|promo|cheap|best\s*price|lowest)\b/i.test(lower)) {
        return { intent: "deals", query: input };
    }

    // Negotiate
    if (/\b(negotiate|bargain|haggle|lower\s*price|reduce|too\s*expensive|overpriced)\b/i.test(lower)) {
        const productMatch = lower.replace(/\b(negotiate|bargain|haggle|for|on|the|price|of)\b/g, "").trim();
        return { intent: "negotiate", query: input, productName: productMatch || undefined };
    }

    // Price check
    if (/\b(price|cost|how\s*much|worth|fair\s*price|market\s*price|is\s*(this|it)\s*(a\s*)?(good|fair|overpriced))\b/i.test(lower)) {
        const productMatch = lower.replace(/\b(what|is|the|price|of|for|how|much|does|cost|a|good|fair|this|it)\b/g, "").trim();
        return { intent: "price_check", query: input, productName: productMatch || undefined };
    }

    // Compare
    if (/\b(compare|vs|versus|better|which\s*(one|is)|difference|between)\b/i.test(lower)) {
        return { intent: "compare_prices", query: input };
    }

    // Category browse
    const categories = ["phone", "laptop", "computer", "fashion", "beauty", "home", "gaming", "fitness", "car", "solar", "watch", "electronics", "furniture", "grocery", "baby", "sport"];
    const matchedCat = categories.find(c => lower.includes(c));
    if (matchedCat && /\b(show|browse|see|all|list|look|shop)\b/i.test(lower)) {
        return { intent: "category_browse", query: input, category: matchedCat };
    }

    // Budget-based search
    const budgetMatch = lower.match(/under\s*[₦#n]?\s*([\d,]+)/i) || lower.match(/budget\s*(of|is)?\s*[₦#n]?\s*([\d,]+)/i) || lower.match(/less\s*than\s*[₦#n]?\s*([\d,]+)/i);
    if (budgetMatch) {
        const budget = parseInt(budgetMatch[1]?.replace(/,/g, "") || budgetMatch[2]?.replace(/,/g, "") || "0");
        return { intent: "search_product", query: input, budget };
    }

    // Recommendation
    if (/\b(recommend|suggest|what\s*should|best|top|popular|trending|good)\b/i.test(lower)) {
        return { intent: "recommend", query: input };
    }

    // Search (default for product-like queries)
    if (/\b(find|search|looking\s*for|want|need|buy|get|show\s*me|i\s*need|where)\b/i.test(lower) || lower.length > 3) {
        return { intent: "search_product", query: input };
    }

    return { intent: "unknown", query: input };
}

// ─── Product Scoring ─────────────────────────────────────
function scoreProductMatch(product: Product, query: string): number {
    const lower = query.toLowerCase();
    const name = product.name.toLowerCase();
    const desc = product.description?.toLowerCase() || "";
    const cat = product.category?.toLowerCase() || "";
    let score = 0;

    // Exact name match
    if (name.includes(lower)) score += 50;

    // Word-level matching
    const queryWords = lower.split(/\s+/).filter(w => w.length > 2);
    for (const word of queryWords) {
        if (name.includes(word)) score += 15;
        if (desc.includes(word)) score += 5;
        if (cat.includes(word)) score += 10;
    }

    // Boost for fair price
    if (product.price_flag === "fair") score += 5;

    // Boost for high ratings
    score += product.avg_rating * 2;

    // Boost for popular
    score += Math.min(product.sold_count / 10, 10);

    return score;
}

// ─── Message Types ───────────────────────────────────────
interface ChatMessage {
    id: string;
    role: "user" | "assistant" | "admin";
    content: string;
    products?: Product[];
    priceComparison?: PriceComparison;
    isTyping?: boolean;
    quickActions?: { label: string; query: string; icon: string }[];
    image?: string;
    senderName?: string;
}

// ─── Component ──────────────────────────────────────────
export function ZivaChat() {
    const [mounted, setMounted] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    // Detect current product page for context-aware suggestions
    const pathname = usePathname();
    const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const match = pathname.match(/\/product\/(.+)/);
        if (match) {
            const productId = decodeURIComponent(match[1]);
            const allProducts = DemoStore.getProducts();
            const found = allProducts.find(p => p.id === productId);
            setCurrentProduct(found || null);
        } else {
            setCurrentProduct(null);
        }
    }, [pathname, isOpen]);

    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: "welcome",
            role: "assistant",
            content: "Hey! 👋 I'm **Ziva**, your personal shopping AI. I search the market, compare prices, and help you get the best deals on FairPrice.\n\nTry asking me anything!",
            quickActions: [
                { label: "Find phones around ₦500k", query: "Find me a phone above ₦500,000", icon: "📱" },
                { label: "Today's best deals", query: "Show me today's best deals", icon: "🔥" },
                { label: "Is this price fair?", query: "__PRICE_CHECK__", icon: "🛡️" },
                { label: "Track my order", query: "Track my order", icon: "📦" },
                { label: "Negotiate a price", query: "I want to negotiate a price", icon: "💰" },
                { label: "Talk to a Human", query: "I want to talk to a human agent", icon: "🧑‍💼" },
            ]
        }
    ]);
    const [input, setInput] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [adminActive, setAdminActive] = useState(false);
    const messagesAreaRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { cart, addToCart } = useCart();
    const { user } = useAuth();

    useEffect(() => { setMounted(true); }, []);

    const scrollToBottom = useCallback(() => {
        if (messagesAreaRef.current) {
            messagesAreaRef.current.scrollTo({
                top: messagesAreaRef.current.scrollHeight,
                behavior: "smooth"
            });
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(scrollToBottom, 100);
            return () => clearTimeout(timer);
        }
    }, [messages, isOpen, scrollToBottom]);

    const toggleChat = () => {
        setIsOpen(!isOpen);
        if (!isOpen) setTimeout(() => inputRef.current?.focus(), 300);
    };

    // ─── AI Response Generator ────────────────────────
    const generateResponse = useCallback(async (userInput: string) => {
        try {
            // Include recent history for context (last 5 messages)
            const recentHistory = messages.slice(-5).map(m => ({
                sender: m.role, // local state uses 'role', API expects 'role' (user/model) or 'sender' mapping
                text: m.content
            }));

            const res = await fetch("/api/ziva-chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: userInput,
                    history: recentHistory,
                    userName: user?.name || "Guest",
                    catalogue: DemoStore.getProducts().map(p => ({
                        id: p.id,
                        name: p.name,
                        price: p.price,
                        original_price: p.original_price,
                        category: p.category,
                        description: p.description?.substring(0, 80),
                        avg_rating: p.avg_rating,
                        review_count: p.review_count,
                        seller_name: p.seller_name,
                        price_flag: p.price_flag,
                        specs: p.specs
                    })),
                    searchCache: DemoStore.getAllCachedProducts().slice(0, 20).map(p => ({
                        id: p.id,
                        name: p.name,
                        price: p.price,
                        category: p.category,
                        specs: p.specs
                    })),
                    browsingHistory: (DemoStore.getSearchHistoryProducts?.() || []).slice(0, 5).map((p: any) => ({
                        name: p.name,
                        price: p.price,
                        category: p.category
                    }))
                })
            });

            if (!res.ok) {
                // Try to use the API's fallback message instead of crashing
                try {
                    const errData = await res.json();
                    return {
                        content: errData.message || "I'm having a little trouble right now. Please try again in a moment. 🧠✨",
                        intent: "error",
                        products: [],
                        quickActions: [{ label: "🔄 Try Again", query: "__RETRY__", icon: "" }]
                    };
                } catch {
                    return {
                        content: "I'm having a little trouble connecting right now. Please try again in a moment. 🧠✨",
                        intent: "error",
                        products: [],
                        quickActions: [{ label: "🔄 Try Again", query: "__RETRY__", icon: "" }]
                    };
                }
            }

            let data = await res.json();

            // Fix: sometimes Gemini wraps response in markdown code fences or returns nested JSON
            if (typeof data.message === 'string') {
                let cleaned = data.message.trim();
                // Strip ALL markdown code fences (```json ... ```, ```...```, etc.)
                cleaned = cleaned.replace(/```[a-z]*\s*\n?/gi, '').replace(/```/g, '').trim();
                // If the cleaned string looks like JSON, parse it and use the inner message
                if (cleaned.startsWith('{') && cleaned.endsWith('}')) {
                    try {
                        const parsed = JSON.parse(cleaned);
                        if (parsed.message) {
                            data = parsed;
                        }
                    } catch { /* keep original data */ }
                }
                // Even after parsing, ensure the final message doesn't contain JSON
                if (typeof data.message === 'string') {
                    let finalMsg = data.message.trim();
                    finalMsg = finalMsg.replace(/```[a-z]*\s*\n?/gi, '').replace(/```/g, '').trim();
                    if (finalMsg.startsWith('{') && finalMsg.endsWith('}')) {
                        try {
                            const innerParsed = JSON.parse(finalMsg);
                            if (innerParsed.message) data.message = innerParsed.message;
                        } catch { /* keep as-is */ }
                    } else {
                        data.message = finalMsg;
                    }
                }
            }

            // Handle Escalation
            if (data.shouldEscalate) {
                // Trigger background escalation (email)
                fetch("/api/ziva-escalate", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        userEmail: user?.email || "guest@globalstores.shop",
                        userName: user?.name || "Guest",
                        reason: data.escalationReason || "Customer Requested Support",
                        transcript: messages.map(m => `${m.role}: ${m.content}`).join("\n")
                    })
                }).catch(console.error);

                // Also persist to admin inbox (DemoStore)
                DemoStore.addSupportMessage({
                    user_name: user?.name || "Guest",
                    user_email: user?.email || "guest@globalstores.shop",
                    subject: data.escalationReason || "Ziva AI Escalation",
                    message: messages.slice(-3).map(m => `${m.role}: ${m.content}`).join("\n"),
                    source: "ziva_escalation",
                    transcript: messages.map(m => `${m.role}: ${m.content}`).join("\n"),
                });

                return {
                    content: data.message + "\n\n🛡️ **Your message has been forwarded to our support team.** A human agent will review your case and respond shortly.",
                    intent: "escalation",
                    products: [],
                    quickActions: []
                };
            }

            // Handle Product Suggestions (search catalog + cache)
            let suggestedProducts: any[] = [];
            if (data.intent === "product_search" || data.intent === "comparison" || data.intent === "price_check" || (data.suggestedProducts && data.suggestedProducts.length > 0)) {
                const catalogProducts = DemoStore.getProducts();
                const cacheProducts = DemoStore.getAllCachedProducts();
                const allProducts = [...catalogProducts, ...cacheProducts.filter((cp: any) => !catalogProducts.some(p => p.id === cp.id))];

                if (data.suggestedProducts && data.suggestedProducts.length > 0) {
                    suggestedProducts = data.suggestedProducts.flatMap((sp: string) => {
                        const spLower = sp.toLowerCase();
                        const tokens = spLower.split(/\s+/).filter((t: string) => t.length > 2);
                        // Exact substring match first
                        let matches = allProducts.filter(p => p.name.toLowerCase().includes(spLower));
                        // Fallback: token-based match (every significant word appears in name)
                        if (matches.length === 0 && tokens.length >= 2) {
                            matches = allProducts.filter(p => tokens.every((t: string) => p.name.toLowerCase().includes(t)));
                        }
                        return matches;
                    });
                    // Deduplicate
                    const seen = new Set<string>();
                    suggestedProducts = suggestedProducts.filter(p => {
                        if (seen.has(p.id)) return false;
                        seen.add(p.id);
                        return true;
                    });
                }

                // Fallback: keyword match
                if (suggestedProducts.length === 0) {
                    const terms = userInput.split(" ").filter(w => w.length > 3);
                    suggestedProducts = allProducts.filter(p =>
                        terms.some(t => p.name.toLowerCase().includes(t.toLowerCase())) ||
                        terms.some(t => p.category.toLowerCase().includes(t.toLowerCase()))
                    ).slice(0, 4);
                }
            }

            return {
                content: data.message,
                intent: data.intent,
                products: suggestedProducts.slice(0, 4),
                quickActions: []
            };

        } catch (error) {
            console.error("Ziva Chat Error:", error);
            return {
                content: "I'm having a bit of trouble connecting to my brain right now. 🧠✨ Please try again in a moment.",
                intent: "error",
                products: [],
                quickActions: []
            };
        }
    }, [messages, user]);

    // ─── Send Message Handler ────────────────────────
    const handleSend = useCallback(async (text?: string) => {
        const msgText = text || input.trim();
        if (!msgText || isProcessing) return;

        // Handle special __PRICE_CHECK__ action — use current product context
        let resolvedText = msgText;
        if (msgText === '__PRICE_CHECK__') {
            if (currentProduct) {
                resolvedText = `Is ${currentProduct.name} at ${formatPrice(currentProduct.price)} a good price?`;
            } else {
                resolvedText = 'Is this a good price?';
            }
        }

        // If on a product page, always inject product context into the message so Ziva knows what we're looking at
        let contextualText = resolvedText;
        if (currentProduct) {
            const comparison = getDemoPriceComparison(currentProduct.id);
            const marketAvg = comparison.market_avg > 0 ? comparison.market_avg : Math.round(currentProduct.price * 1.08);
            const verdict = currentProduct.price <= marketAvg ? 'Good Deal' : 'Above Market';
            // Add invisible context that Ziva API can use
            contextualText = `${resolvedText} [CONTEXT: The user is currently viewing the product "${currentProduct.name}" priced at ${formatPrice(currentProduct.price)}. Market average is ${formatPrice(marketAvg)}. Price flag: ${currentProduct.price_flag || 'fair'}. Verdict: ${verdict}. Category: ${currentProduct.category}. Please use this context if the user asks "this", "it", or questions about the product.]`;
        }

        const userMsg: ChatMessage = { id: Date.now().toString(), role: "user", content: resolvedText };
        setMessages(prev => [...prev, userMsg]);
        setInput("");
        setIsProcessing(true);

        // Show typing indicator
        const typingId = `typing_${Date.now()}`;

        let typingText = "Ziva is thinking...";
        if (msgText.toLowerCase().includes("price") || msgText.toLowerCase().includes("cost")) {
            typingText = "Analyzing market prices...";
        } else if (msgText.toLowerCase().includes("track") || msgText.toLowerCase().includes("order")) {
            typingText = "Checking logistics database...";
        } else if (msgText.toLowerCase().includes("negotiate") || msgText.toLowerCase().includes("offer") || msgText.toLowerCase().includes("bargain")) {
            typingText = "Preparing negotiation...";
        } else if (msgText.toLowerCase().includes("find") || msgText.toLowerCase().includes("search")) {
            typingText = "Searching catalogue...";
        }

        setMessages(prev => [...prev, { id: typingId, role: adminActive ? "admin" : "assistant", content: typingText, isTyping: true, senderName: adminActive ? "Support Team" : undefined }]);

        try {
            if (adminActive) {
                // Mock Admin Response
                setTimeout(() => {
                    setMessages(prev => [
                        ...prev.filter(m => m.id !== typingId),
                        {
                            id: `admin_resp_${Date.now()}`,
                            role: "admin",
                            senderName: "Support Team (Sarah)",
                            content: `Thanks for your patience. I'm Sarah from the support team. I'm reviewing your request regarding: "${msgText}". How else can I assist you today?`,
                        }
                    ]);
                    setIsProcessing(false);
                }, 2000);
                return;
            }

            // ─── LOCAL: Human Support / Escalation ─────────────────────
            const isHumanRequest = /\b(talk\s*to\s*(a\s*)?(human|person|agent|manager|support|representative)|escalate|real\s*person|human\s*support|live\s*chat|speak\s*to|customer\s*(support|care|service)|speak\s*with|connect\s*me|i\s*need\s*help|complain|complaint)/i.test(resolvedText);
            if (isHumanRequest) {
                // Save escalation to admin inbox
                DemoStore.addSupportMessage({
                    user_name: user?.name || "Guest",
                    user_email: user?.email || "guest@globalstores.shop",
                    subject: "Customer Requested Human Support",
                    message: `Customer said: "${resolvedText}"\n\nRecent history:\n${messages.slice(-3).map(m => `${m.role}: ${m.content}`).join("\n")}`,
                    source: "ziva_escalation",
                });

                setTimeout(() => {
                    setMessages(prev => [
                        ...prev.filter(m => m.id !== typingId),
                        {
                            id: `escalate_${Date.now()}`,
                            role: "assistant",
                            content: `🛡️ **Connecting you to a human agent...**\n\nI understand you'd like to speak with our support team. I've forwarded your request and a human agent will join this chat shortly.\n\nWhile you wait, feel free to describe your issue in more detail so the agent can assist you faster.`,
                            quickActions: [
                                { label: "📦 Track My Order", query: "Track my order", icon: "" },
                                { label: "🔄 Return an Item", query: "I want to return an item", icon: "" },
                            ]
                        }
                    ]);
                    setIsProcessing(false);
                }, 1000);

                // Simulate a human agent joining after 3.5 seconds
                setTimeout(() => {
                    setAdminActive(true);
                    setMessages(prev => [...prev, {
                        id: `admin_join_${Date.now()}`,
                        role: "admin" as const,
                        senderName: "System",
                        content: "⚡ **Sarah (Support Team) has joined the chat.**"
                    }]);
                }, 3500);
                return;
            }

            // ─── LOCAL: Product Image Request → Seller Inbox ─────────
            const isImageRequest = /\b(product\s*image|show\s*me.*photo|show\s*me.*image|show\s*me.*picture|send\s*me.*image|can\s*i\s*(see|get)\s*(the\s*)?(image|photo|picture)|real\s*photo|actual\s*photo|real\s*image)\b/i.test(resolvedText);
            if (isImageRequest && currentProduct) {
                // Send request to seller's inbox
                DemoStore.addSupportMessage({
                    user_name: user?.name || "Customer",
                    user_email: user?.email || "customer@fairprice.ng",
                    subject: `📷 Image Request: ${currentProduct.name}`,
                    message: `A customer has requested real product images for "${currentProduct.name}" (₦${currentProduct.price.toLocaleString()}).\n\nCustomer: ${user?.name || 'Guest'} (${user?.email || 'not logged in'})\nMessage: "${resolvedText}"\n\nPlease upload clear product photos to respond to this request.`,
                    source: "order_issue",
                    target_user_id: user?.id,
                    target_user_email: user?.email,
                });

                // Also notify the seller
                if (currentProduct.seller_id) {
                    DemoStore.addNotification({
                        userId: currentProduct.seller_id,
                        type: "system",
                        message: `📷 A customer requested real photos of "${currentProduct.name}". Check your messages to respond.`,
                        link: "/seller/dashboard/messages",
                    });
                }

                setTimeout(() => {
                    setMessages(prev => [
                        ...prev.filter(m => m.id !== typingId),
                        {
                            id: `img_req_${Date.now()}`,
                            role: "assistant",
                            content: `📷 **Image Request Sent!**\n\nI've forwarded your request for real product photos of **${currentProduct.name}** to the seller (**${currentProduct.seller_name || 'the merchant'}**).\n\nThey'll be notified to upload actual photos of the item. You'll receive a notification when the images are available.\n\nIn the meantime, you can view the existing listing photos on the product page.`,
                            quickActions: [
                                { label: "📦 View Product", query: `__NAV__/product/${currentProduct.id}`, icon: "" },
                                { label: "💬 Ask Something Else", query: "", icon: "" },
                            ]
                        }
                    ]);
                    setIsProcessing(false);
                }, 1200);
                return;
            }

            // ─── LOCAL: Order Tracking ─────────────────────
            const trackMatch = resolvedText.match(/\b(track|tracking|order\s*status|where.s?\s*my\s*order|order\s*#?)\s*:?\s*([A-Za-z0-9_-]{6,})?/i);
            const isTrackQuery = /\b(track|tracking|order status|where.s?\s*my\s*order|about my order|my order)\b/i.test(resolvedText);
            if (isTrackQuery || trackMatch) {
                const allOrders = DemoStore.getOrders();
                // Filter by current user — never show other users' orders
                const userOrders = user
                    ? allOrders.filter(o => o.customer_id === user.email || o.customer_id === user.id)
                    : [];
                const trackId = trackMatch?.[2];
                let foundOrders = trackId
                    ? userOrders.filter(o => o.id.includes(trackId) || o.tracking_id?.includes(trackId))
                    : userOrders.slice(0, 3); // Show latest 3 if no ID given

                setTimeout(() => {
                    setMessages(prev => [
                        ...prev.filter(m => m.id !== typingId),
                        {
                            id: `track_${Date.now()}`,
                            role: "assistant",
                            content: foundOrders.length > 0
                                ? `📦 **Order${foundOrders.length > 1 ? 's' : ''} Found!**\n\n${foundOrders.map(o =>
                                    `• **${o.id.slice(0, 16)}...** — Status: **${o.status.toUpperCase()}** | Amount: **₦${o.amount.toLocaleString()}** | Date: ${new Date(o.created_at).toLocaleDateString()}\n  Escrow: ${o.escrow_status} | Shipping: ${o.shipping_address?.slice(0, 50) || 'N/A'}`
                                ).join('\n\n')}\n\n👇 Click below to view full order details.`
                                : trackId
                                    ? `😕 I couldn't find any orders matching **${trackId}**. Please double-check your tracking or order ID and try again.`
                                    : "📋 You don't have any orders yet. Start shopping and your orders will appear here!",
                            quickActions: foundOrders.length > 0
                                ? [{ label: "📦 View All Orders", query: "__NAV__/account/orders", icon: "" }, { label: "💬 Need Help?", query: "I need help with my order", icon: "" }]
                                : [{ label: "🛒 Start Shopping", query: "__NAV__/", icon: "" }]
                        }
                    ]);
                    setIsProcessing(false);
                }, 1000);
                return;
            }

            // ─── LOCAL: Bare number/price after negotiation context ─────────
            // If the last assistant message was a negotiation prompt with products,
            // and the user just types a number (e.g. "49300", "#49,000", "₦50000"),
            // treat it as an offer for the first product shown
            const bareNumberMatch = resolvedText.match(/^[₦#N]?\s*([\d,]+)\s*$/i);
            if (bareNumberMatch) {
                const amount = parseInt(bareNumberMatch[1].replace(/,/g, ''));
                if (amount > 0) {
                    // Find the last negotiate message with products
                    const lastNegotiateMsg = [...messages].reverse().find(m =>
                        m.role === "assistant" && m.products && m.products.length > 0 &&
                        (m.content?.includes("Negotiate") || m.content?.includes("offer"))
                    );
                    if (lastNegotiateMsg && lastNegotiateMsg.products && lastNegotiateMsg.products.length > 0) {
                        const matchProduct = lastNegotiateMsg.products[0];
                        // Save as proper negotiation entry (shows on /account/negotiations)
                        DemoStore.addNegotiation({
                            id: `neg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                            product_id: matchProduct.id,
                            customer_id: user?.id || user?.email || "guest",
                            customer_name: user?.name || "Guest Customer",
                            proposed_price: amount,
                            message: `Offer submitted via Ziva AI`,
                            status: "pending",
                            created_at: new Date().toISOString(),
                        });
                        // Also save to admin support inbox
                        DemoStore.addSupportMessage({
                            user_name: user?.name || "Guest Customer",
                            user_email: user?.email || "guest@fairprice.ng",
                            subject: `💰 Price Negotiation: ${matchProduct.name}`,
                            message: `Customer offered ₦${amount.toLocaleString()} for "${matchProduct.name}" (listed at ₦${matchProduct.price.toLocaleString()}).\n\nDiscount: ${Math.round((1 - amount / matchProduct.price) * 100)}% off.\n\nAction required: Accept, counter-offer, or decline.`,
                            source: "ziva_negotiation",
                        });

                        setTimeout(() => {
                            setMessages(prev => [
                                ...prev.filter(m => m.id !== typingId),
                                {
                                    id: `offer_${Date.now()}`,
                                    role: "assistant",
                                    content: `✅ **Offer Submitted!**\n\n🛍️ **${matchProduct.name}**\n💰 Listed price: **₦${matchProduct.price.toLocaleString()}**\n🏷️ Your offer: **₦${amount.toLocaleString()}** (${Math.round((1 - amount / matchProduct.price) * 100)}% off)\n\nYour offer has been sent to ${matchProduct.seller_name || 'the seller'}. They'll review and respond within 24 hours.\n\nYou'll receive a notification when they respond with their decision or counter-offer. 📩`,
                                    quickActions: [
                                        { label: "📦 View Product", query: `__NAV__/product/${matchProduct.id}`, icon: "" },
                                        { label: "🛒 Buy at Listed Price", query: `__NAV__/product/${matchProduct.id}`, icon: "" },
                                        { label: "💬 Negotiate Another", query: "I want to negotiate a price", icon: "" }
                                    ]
                                }
                            ]);
                            setIsProcessing(false);
                        }, 1500);
                        return;
                    }
                }
            }

            // ─── LOCAL: Price Negotiation (prompt) ─────────────────────
            // Skip if the message contains a concrete price (that should go to offer handler below)
            const hasConcretePrice = /[₦#N]?\s*\d[\d,]+/.test(resolvedText) && /\b(offer|pay|give|bargain)\b/i.test(resolvedText);
            const isNegotiate = !hasConcretePrice && /\b(negotiate|make.*offer|bargain|lower.*price|offer.*price|can.*you.*reduce|price.*too.*high|counter.*offer)\b/i.test(resolvedText);
            if (isNegotiate) {
                const allProducts = DemoStore.getProducts();
                // Try to extract product name from the message
                const words = resolvedText.replace(/\b(negotiate|make|offer|bargain|lower|price|reduce|for|the|a|an|on|can|you|i|want|to|of|current|is|at)\b/gi, '').replace(/₦[\d,]+/g, '').trim();
                const searchTerms = words.toLowerCase().split(/\s+/).filter((w: string) => w.length > 2);

                let matchedProducts: Product[] = [];

                // If user mentioned a specific product name, find it precisely
                if (searchTerms.length > 0) {
                    // Score products by how many search terms match
                    const scored = allProducts.map(p => {
                        const pName = p.name.toLowerCase();
                        const matchCount = searchTerms.filter((t: string) => pName.includes(t)).length;
                        return { product: p, matchCount, ratio: matchCount / searchTerms.length };
                    }).filter(s => s.matchCount > 0)
                        .sort((a, b) => b.ratio - a.ratio || b.matchCount - a.matchCount);

                    // If we have a strong match (>50% of terms match), use those
                    if (scored.length > 0 && scored[0].ratio >= 0.5) {
                        matchedProducts = scored.slice(0, 4).map(s => s.product);
                    }
                }

                // Fallback: use current product or cart
                if (matchedProducts.length === 0) {
                    matchedProducts = currentProduct ? [currentProduct] : cart.map(c => c.product).slice(0, 4);
                }

                // Last resort: show some popular items
                if (matchedProducts.length === 0) {
                    matchedProducts = allProducts.filter(p => p.price > 50000).slice(0, 4);
                }

                // If user specified a product, ask for their price
                const hasSpecificProduct = searchTerms.length > 0 && matchedProducts.length > 0;
                const exampleProduct = matchedProducts[0];

                setTimeout(() => {
                    setMessages(prev => [
                        ...prev.filter(m => m.id !== typingId),
                        {
                            id: `negotiate_${Date.now()}`,
                            role: "assistant",
                            content: hasSpecificProduct
                                ? `💰 **Let's Negotiate!**\n\nGreat choice! How much would you like to offer for the **${exampleProduct.name}**?\n\nThe listed price is **${formatPrice(exampleProduct.price)}**. Please state your offer — I recommend staying within the fair market range for the best chance of acceptance.\n\nFor example: *"I want to offer ${formatPrice(Math.round(exampleProduct.price * 0.96))} for the ${exampleProduct.name.split(' ').slice(0, 4).join(' ')}"*`
                                : matchedProducts.length > 0
                                    ? `💰 **Let's Negotiate!**\n\nI found these products you might want to negotiate on. Tell me which one and your desired price, and I'll send the offer to the seller.\n\nFor example: *"I want to offer ₦150,000 for the iPhone"*`
                                    : "🤔 I couldn't find a specific product to negotiate. Could you tell me which product you'd like to make an offer on?",
                            products: matchedProducts,
                            quickActions: hasSpecificProduct
                                ? [{ label: `💰 Offer ${formatPrice(Math.round(exampleProduct.price * 0.96))}`, query: `I want to offer ${formatPrice(Math.round(exampleProduct.price * 0.96))} for the ${exampleProduct.name}`, icon: "" }]
                                : currentProduct
                                    ? [{ label: `💰 Negotiate ${currentProduct.name.slice(0, 30)}`, query: `I want to negotiate the price of ${currentProduct.name}. Current price is ${formatPrice(currentProduct.price)}`, icon: "" }]
                                    : [{ label: "🔍 Search Products", query: "__NAV__/search", icon: "" }]
                        }
                    ]);
                    setIsProcessing(false);
                }, 1000);
                return;
            }

            // ─── LOCAL: Submit negotiation offer (e.g. "I offer ₦150,000 for iPhone") ─────
            // Accepts: "offer ₦80,000 for", "offer #50000 for", "offer 80000 for", "I WANT TO OFFER #50000 FOR THE X"
            // Also add "bargain" to the offer regex
            const offerMatch = resolvedText.match(/\b(?:offer|pay|give|bargain)\s+(?:[₦#N]|NGN|naira\s*)?\s*([\d,]+)\s+(?:for|on)\s+(.+)/i)
                || resolvedText.match(/(?:[₦#N]|NGN|naira\s*)\s*([\d,]+)\s+(?:for|on)\s+(.+)/i)
                || resolvedText.match(/\b(?:want\s+to\s+)?(?:offer|pay|give|bargain)\s+(?:for|on)\s+(.+?)\s+(?:[₦#N]|NGN|naira\s*)?\s*([\d,]+)/i);
            if (offerMatch) {
                // Handle both "amount for product" and "for product amount" formats
                let offerAmount: number;
                let productQuery: string;

                // Check if the match came from the third regex (product before amount)
                if (!resolvedText.match(/\b(?:offer|pay|give|bargain)\s+(?:[₦#N]|NGN|naira\s*)?\s*([\d,]+)\s+(?:for|on)/i)
                    && !resolvedText.match(/(?:[₦#N]|NGN|naira\s*)\s*([\d,]+)\s+(?:for|on)/i)) {
                    productQuery = offerMatch[1].trim();
                    offerAmount = parseInt(offerMatch[2].replace(/,/g, ''));
                } else {
                    offerAmount = parseInt(offerMatch[1].replace(/,/g, ''));
                    productQuery = offerMatch[2].trim();
                }

                // Remove trailing articles/determiners from product query
                productQuery = productQuery.replace(/^the\s+/i, '').trim();

                const allProducts = DemoStore.getProducts();
                // Multi-token fuzzy match: score products by how many terms match
                const queryTokens = productQuery.toLowerCase().split(/\s+/).filter((t: string) => t.length > 2);
                const matchProduct = allProducts
                    .map(p => ({
                        product: p,
                        score: queryTokens.filter((t: string) => p.name.toLowerCase().includes(t)).length
                    }))
                    .filter(m => m.score > 0)
                    .sort((a, b) => b.score - a.score)[0]?.product
                    || currentProduct;

                if (matchProduct && offerAmount > 0) {
                    // Save as proper negotiation entry (shows on /account/negotiations)
                    DemoStore.addNegotiation({
                        id: `neg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                        product_id: matchProduct.id,
                        customer_id: user?.id || user?.email || "guest",
                        customer_name: user?.name || "Guest Customer",
                        proposed_price: offerAmount,
                        message: `Offer submitted via Ziva AI`,
                        status: "pending",
                        created_at: new Date().toISOString(),
                    });
                    // Also save to admin support inbox
                    DemoStore.addSupportMessage({
                        user_name: user?.name || "Guest Customer",
                        user_email: user?.email || "guest@fairprice.ng",
                        subject: `💰 Price Negotiation: ${matchProduct.name}`,
                        message: `Customer offered ₦${offerAmount.toLocaleString()} for "${matchProduct.name}" (listed at ₦${matchProduct.price.toLocaleString()}).\n\nDiscount: ${Math.round((1 - offerAmount / matchProduct.price) * 100)}% off.\n\nAction required: Accept, counter-offer, or decline.`,
                        source: "ziva_negotiation",
                    });

                    setTimeout(() => {
                        setMessages(prev => [
                            ...prev.filter(m => m.id !== typingId),
                            {
                                id: `offer_${Date.now()}`,
                                role: "assistant",
                                content: `✅ **Offer Submitted!**\n\n🛍️ **${matchProduct.name}**\n💰 Listed price: **₦${matchProduct.price.toLocaleString()}**\n🏷️ Your offer: **₦${offerAmount.toLocaleString()}** (${Math.round((1 - offerAmount / matchProduct.price) * 100)}% off)\n\nYour offer has been sent to ${matchProduct.seller_name || 'the seller'}. They'll review and respond within 24 hours.\n\nYou'll receive a notification when they respond with their decision or counter-offer. 📩`,
                                quickActions: [
                                    { label: "📦 View Product", query: `__NAV__/product/${matchProduct.id}`, icon: "" },
                                    { label: "🛒 Buy at Listed Price", query: `__NAV__/product/${matchProduct.id}`, icon: "" },
                                    { label: "💬 Negotiate Another", query: "I want to negotiate a price", icon: "" }
                                ]
                            }
                        ]);
                        setIsProcessing(false);
                    }, 1500);
                    return;
                }
            }
            const response = await generateResponse(contextualText);

            // Remove typing, add real response
            setMessages(prev => [
                ...prev.filter(m => m.id !== typingId),
                {
                    id: `resp_${Date.now()}`,
                    role: "assistant",
                    content: response.content,
                    products: response.products,
                    quickActions: response.quickActions,
                }
            ]);

            if (response.intent === "escalation") {
                setTimeout(() => {
                    setAdminActive(true);
                    setMessages(prev => [...prev, { id: `admin_join_${Date.now()}`, role: "admin", senderName: "System", content: "⚡ **Sarah (Support Team) has joined the chat.**" }]);
                }, 3500);
            }
        } catch {
            setMessages(prev => [
                ...prev.filter(m => m.id !== typingId),
                { id: `err_${Date.now()}`, role: "assistant", content: "Sorry, something went wrong. Please try again!" }
            ]);
        }

        setIsProcessing(false);
    }, [input, isProcessing, generateResponse, adminActive]);

    // ─── Image Upload Handler ──────────────────────────
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            const imageDataUrl = reader.result as string;
            const userMsg: ChatMessage = { id: Date.now().toString(), role: "user", content: "Sent an image", image: imageDataUrl };
            setMessages(prev => [...prev, userMsg]);
            setIsProcessing(true);
            const typingId = `typing_${Date.now()}`;
            setMessages(prev => [...prev, { id: typingId, role: adminActive ? "admin" : "assistant", content: "", isTyping: true, senderName: adminActive ? "Support Team" : undefined }]);

            // Send image to admin inbox so support can see it
            DemoStore.addSupportMessage({
                user_name: user?.name || "Guest",
                user_email: user?.email || "guest@fairprice.ng",
                subject: `📷 Image uploaded in Ziva Chat${currentProduct ? ` — Re: ${currentProduct.name}` : ''}`,
                message: `Customer uploaded an image in Ziva chat.${currentProduct ? `\n\nProduct context: ${currentProduct.name} (₦${currentProduct.price.toLocaleString()})\nSeller: ${currentProduct.seller_name}` : ''}\n\n[Image attached in chat session]`,
                source: "ziva_escalation",
                target_user_id: user?.id,
                target_user_email: user?.email,
            });

            setTimeout(() => {
                setMessages(prev => [
                    ...prev.filter(m => m.id !== typingId),
                    {
                        id: `img_resp_${Date.now()}`,
                        role: adminActive ? "admin" : "assistant",
                        senderName: adminActive ? "Support Team (Sarah)" : undefined,
                        content: adminActive
                            ? "I've received your image. Let me review that for you right away."
                            : currentProduct
                                ? `I've received your image! I've forwarded it to our support team${currentProduct.seller_name ? ` and **${currentProduct.seller_name}**` : ''} for review. They'll respond shortly. Is there anything else I can help with?`
                                : "I see you uploaded an image! I've forwarded it to our support team for review. I can also help you find products similar to this visual."
                    }
                ]);
                setIsProcessing(false);
            }, 2000);
        };
        reader.readAsDataURL(file);
    };

    // ─── 3D Mouse Tracking ──────────────────────────
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    useEffect(() => {
        if (!mounted) return;
        let ticking = false;
        const handleMouseMove = (e: MouseEvent) => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    const x = (e.clientX / window.innerWidth) * 2 - 1;
                    const y = (e.clientY / window.innerHeight) * 2 - 1;
                    setMousePos({ x, y });
                    ticking = false;
                });
                ticking = true;
            }
        };
        window.addEventListener("mousemove", handleMouseMove);
        return () => window.removeEventListener("mousemove", handleMouseMove);
    }, [mounted]);

    // Unread pulse
    const [hasUnread, setHasUnread] = useState(false);
    useEffect(() => {
        if (!isOpen) {
            const timer = setTimeout(() => setHasUnread(true), 5000);
            return () => clearTimeout(timer);
        } else {
            setHasUnread(false);
        }
    }, [isOpen]);

    if (!mounted) return null;

    // ─── Render Markdown-lite ───────────────────────
    const renderText = (text: string) => {
        return text.split("\n").map((line, i) => {
            // Bold
            let processed = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            // Links
            processed = processed.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-emerald-400 underline hover:text-emerald-300">$1</a>');

            if (line.startsWith("| ") && line.includes("|")) {
                return null; // Tables handled separately
            }

            return (
                <span key={i} className="block" dangerouslySetInnerHTML={{ __html: processed || "&nbsp;" }} />
            );
        });
    };

    // Render table from markdown
    const renderTable = (text: string) => {
        const lines = text.split("\n").filter(l => l.trim().startsWith("|"));
        if (lines.length < 2) return null;

        const headers = lines[0].split("|").filter(c => c.trim()).map(c => c.trim());
        const rows = lines.slice(2).map(row => row.split("|").filter(c => c.trim()).map(c => c.trim()));

        return (
            <div className="overflow-x-auto my-2">
                <table className="w-full text-[11px] border-collapse">
                    <thead>
                        <tr>
                            {headers.map((h, i) => (
                                <th key={i} className="text-left px-2 py-1 border-b border-white/10 font-bold text-gray-400 uppercase tracking-wider">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, i) => (
                            <tr key={i}>
                                {row.map((cell, j) => (
                                    <td key={j} className="px-2 py-1.5 border-b border-white/5 text-gray-200" dangerouslySetInnerHTML={{ __html: cell.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    const hasTable = (text: string) => {
        const lines = text.split("\n").filter(l => l.trim().startsWith("|"));
        return lines.length >= 3;
    };

    return (
        <div className={cn(
            "fixed left-4 lg:left-8 z-[50] pointer-events-none transition-all duration-300",
            pathname === "/checkout" ? "bottom-[280px] lg:bottom-12" : "bottom-[18vh] lg:bottom-12"
        )}>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="absolute bottom-20 left-0 w-[calc(100vw-2rem)] max-w-[380px] md:w-[420px] md:max-w-none h-[75vh] max-h-[600px] md:h-[70vh] md:max-h-[600px] flex flex-col overflow-hidden shadow-2xl pointer-events-auto rounded-3xl border border-white/10 origin-bottom-left"
                        style={{ background: "rgba(15, 15, 20, 0.95)", backdropFilter: "blur(40px) saturate(180%)" }}
                    >
                        {/* Header */}
                        <div className="relative h-28 bg-gradient-to-br from-emerald-900 via-emerald-800 to-black overflow-hidden flex items-center px-5 shrink-0">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(16,185,129,0.2),transparent_70%)]" />
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />

                            <motion.div
                                className="relative w-16 h-16 shrink-0"
                                animate={{ y: [0, -2, 0] }}
                                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                            >
                                <motion.img
                                    src="/assets/images/image_v2.png"
                                    alt="Ziva AI"
                                    className="w-full h-full object-contain drop-shadow-[0_0_20px_rgba(16,185,129,0.4)]"
                                    style={{ rotateX: mousePos.y * 5, rotateY: mousePos.x * 5 }}
                                />
                            </motion.div>

                            <div className="ml-4 flex-1 relative z-10">
                                <h2 className="text-white font-black text-lg tracking-tight">Ziva AI</h2>
                                <p className="text-emerald-300/80 text-xs font-medium">Smart Shopping Assistant</p>
                                <div className="flex items-center gap-1.5 mt-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                                    <span className="text-[10px] text-green-400/80 font-bold uppercase tracking-widest">Online</span>
                                </div>
                            </div>

                            <button onClick={toggleChat} className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/40 rounded-full text-white transition-all backdrop-blur-md shadow-sm z-[999] pointer-events-auto active:scale-95">
                                <X className="h-4 w-4 drop-shadow-sm" strokeWidth={3} />
                            </button>
                        </div>

                        {/* Messages */}
                        <div
                            ref={messagesAreaRef}
                            className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scroll-smooth"
                            style={{ background: "linear-gradient(180deg, rgba(15,15,20,1) 0%, rgba(10,10,15,1) 100%)" }}
                        >
                            {messages.map(msg => (
                                <div key={msg.id} className={cn("flex w-full", msg.role === "user" ? "justify-end" : "justify-start")}>
                                    <div className="max-w-[90%] space-y-2">
                                        {/* Typing indicator */}
                                        {msg.isTyping ? (
                                            <div className="flex items-center gap-2 bg-white/5 rounded-2xl rounded-bl-none px-4 py-3 border border-white/5">
                                                <div className="flex gap-1">
                                                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                                                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                                                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                                                </div>
                                                <span className="text-xs text-gray-500">{msg.content || "Ziva is thinking..."}</span>
                                            </div>
                                        ) : (
                                            <>
                                                {/* Text */}
                                                {msg.role === "admin" && msg.senderName && (
                                                    <p className="text-[10px] text-amber-500 font-bold mb-1 uppercase tracking-widest px-1">{msg.senderName}</p>
                                                )}
                                                <div
                                                    className={cn(
                                                        "rounded-2xl px-4 py-3 text-[13px] leading-relaxed select-text cursor-text",
                                                        msg.role === "user"
                                                            ? "bg-emerald-600 text-white rounded-br-none shadow-lg shadow-emerald-600/20"
                                                            : msg.role === "admin"
                                                                ? "bg-amber-500/10 text-amber-50 rounded-bl-none border border-amber-500/20"
                                                                : "bg-white/5 text-gray-200 rounded-bl-none border border-white/5"
                                                    )}
                                                >
                                                    {msg.image && msg.image.length > 0 && (
                                                        <img src={msg.image} alt="Uploaded" className="mb-2 rounded-xl max-w-full h-auto max-h-48 object-cover border border-white/10" />
                                                    )}
                                                    {hasTable(msg.content) ? (
                                                        <>
                                                            {renderText(msg.content.split("\n").filter(l => !l.trim().startsWith("|")).join("\n"))}
                                                            {renderTable(msg.content)}
                                                        </>
                                                    ) : (
                                                        renderText(msg.content)
                                                    )}
                                                </div>

                                                {/* Inline Product Cards */}
                                                {msg.products && msg.products.length > 0 && (
                                                    <div className="space-y-2 mt-2">
                                                        {msg.products.map(product => (
                                                            <Link
                                                                key={product.id}
                                                                href={`/product/${product.id}`}
                                                                onClick={() => setIsOpen(false)}
                                                            >
                                                                <div className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-3 flex gap-3 transition-all group cursor-pointer relative">
                                                                    <div className="w-14 h-14 bg-white/10 rounded-lg overflow-hidden shrink-0 flex items-center justify-center">
                                                                        {product.image_url ? (
                                                                            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" onError={e => { e.currentTarget.style.display = 'none'; }} />
                                                                        ) : (
                                                                            <div className="w-full h-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center">
                                                                                <span className="text-white font-black text-lg">{product.name.charAt(0)}</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex-1 min-w-0 pr-8">
                                                                        <p className="text-xs font-bold text-white line-clamp-1 group-hover:text-emerald-400 transition-colors">{product.name}</p>
                                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                                            <div className="flex text-amber-400">
                                                                                {[...Array(5)].map((_, i) => (
                                                                                    <Star key={i} className={`h-2.5 w-2.5 ${i < Math.round(product.avg_rating) ? "fill-current" : "text-gray-600"}`} />
                                                                                ))}
                                                                            </div>
                                                                            <span className="text-[10px] text-gray-500">({product.review_count})</span>
                                                                        </div>
                                                                        <div className="flex items-center gap-2 mt-1">
                                                                            <span className="text-sm font-black text-white">{formatPrice(product.price)}</span>
                                                                            {product.original_price && (
                                                                                <span className="text-[10px] text-gray-500 line-through">{formatPrice(product.original_price)}</span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.preventDefault();
                                                                                e.stopPropagation();
                                                                                handleSend(`I want to negotiate the price of ${product.name}`);
                                                                            }}
                                                                            className="px-3 py-1.5 rounded-full bg-amber-500 text-white text-[10px] font-bold transition-all shadow-lg flex items-center gap-1 hover:bg-amber-400"
                                                                            title="Negotiate Price"
                                                                        >
                                                                            <Tag className="h-3 w-3" />
                                                                            Negotiate
                                                                        </button>
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.preventDefault();
                                                                                e.stopPropagation();
                                                                                addToCart(product);
                                                                                // Visual feedback
                                                                                const btn = e.currentTarget;
                                                                                btn.textContent = '✓ Added!';
                                                                                btn.classList.add('bg-green-500');
                                                                                btn.classList.remove('bg-emerald-600', 'hover:bg-emerald-500');
                                                                                setTimeout(() => {
                                                                                    btn.innerHTML = '<svg class="inline h-3 w-3 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>Add to Cart';
                                                                                    btn.classList.remove('bg-green-500');
                                                                                    btn.classList.add('bg-emerald-600', 'hover:bg-emerald-500');
                                                                                }, 1500);
                                                                            }}
                                                                            className="px-3 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold transition-all shadow-lg flex items-center gap-1"
                                                                            title="Add to Cart"
                                                                        >
                                                                            <ShoppingBag className="h-3 w-3" />
                                                                            Add to Cart
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </Link>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Quick Action Buttons */}
                                                {msg.quickActions && msg.quickActions.length > 0 && (
                                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                                        {msg.quickActions.map((action, i) => {
                                                            const actionText = action.query || '';
                                                            const isNav = actionText.startsWith('__NAV__');
                                                            const isRetry = actionText === '__RETRY__';
                                                            return (
                                                                <button
                                                                    key={i}
                                                                    onClick={() => {
                                                                        if (isNav) {
                                                                            window.location.href = actionText.replace('__NAV__', '');
                                                                        } else if (isRetry) {
                                                                            const lastUserMsg = messages.filter(m => m.role === 'user').pop();
                                                                            if (lastUserMsg) handleSend(lastUserMsg.content);
                                                                        } else {
                                                                            handleSend(actionText);
                                                                        }
                                                                    }}
                                                                    className="text-[11px] font-semibold bg-white/5 hover:bg-emerald-600/20 border border-white/10 hover:border-emerald-500/30 text-gray-300 hover:text-emerald-400 rounded-full px-3 py-1.5 transition-all flex items-center gap-1.5"
                                                                >
                                                                    {action.icon && <span>{action.icon}</span>}
                                                                    {action.label}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Input */}
                        <div className="p-3 border-t border-white/5 flex gap-2 shrink-0 items-center" style={{ background: "rgba(15,15,20,0.98)" }}>
                            <Button
                                size="icon"
                                variant="ghost"
                                className="rounded-full h-10 w-10 text-gray-400 hover:text-white hover:bg-white/10 shrink-0"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isProcessing}
                            >
                                <Paperclip className="h-5 w-5" />
                            </Button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleImageUpload}
                            />
                            <Input
                                ref={inputRef}
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && handleSend()}
                                placeholder="Ask Ziva anything..."
                                className="flex-1 text-sm rounded-full bg-white/5 border-white/10 focus:bg-white/10 focus:border-emerald-500/30 transition-all h-10 px-4 text-white placeholder:text-gray-500"
                                disabled={isProcessing}
                            />
                            <Button
                                size="icon"
                                className="rounded-full bg-emerald-600 hover:bg-emerald-500 h-10 w-10 shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50"
                                onClick={() => handleSend()}
                                disabled={isProcessing || !input.trim()}
                            >
                                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            </Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* FAB Button */}
            <motion.div
                initial={false}
                animate={{ scale: isOpen ? 0 : 1, opacity: isOpen ? 0 : 1 }}
                whileHover={{ scale: 1.08 }}
                className="pointer-events-auto"
            >
                <motion.button
                    whileTap={{ scale: 0.92 }}
                    onClick={toggleChat}
                    className="relative h-14 w-14 md:h-16 md:w-16 rounded-full border-2 border-emerald-500/30 flex items-center justify-center group shadow-2xl shadow-emerald-900/40 overflow-visible"
                    style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(20px)" }}
                >
                    <div className="absolute inset-0 bg-gradient-to-tr from-emerald-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-full" />
                    <img src="/assets/images/image_v2.png" className="w-full h-full object-cover z-10 scale-110 rounded-full" alt="Ziva AI" />

                    {/* Unread pulse - top right exterior */}
                    {hasUnread && (
                        <>
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full z-[30] flex items-center justify-center border border-white">
                                <span className="text-[8px] font-bold text-white leading-none">1</span>
                            </span>
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full z-20 animate-ping" />
                        </>
                    )}
                </motion.button>
            </motion.div>
        </div >
    );
}
