"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    MessageSquare, X, Send, Sparkles, ShoppingBag, ShieldCheck,
    Star, TrendingDown, Search, Package, ArrowRight, Heart, Tag,
    Zap, Clock, AlertTriangle, CheckCircle, Loader2
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

    // Order tracking
    if (/RATEL-[A-Z0-9]+/i.test(lower) || /\b(track|order|delivery|shipped|where.*(order|package)|status)\b/i.test(lower)) {
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
    role: "user" | "assistant";
    content: string;
    products?: Product[];
    priceComparison?: PriceComparison;
    isTyping?: boolean;
    quickActions?: { label: string; query: string; icon: string }[];
}

// ─── Component ──────────────────────────────────────────
export function ZivaChat() {
    const [mounted, setMounted] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: "welcome",
            role: "assistant",
            content: "Hey! 👋 I'm **Ziva**, your personal shopping AI. I search the market, compare prices, and help you get the best deals on RatelShop.\n\nTry asking me anything!",
            quickActions: [
                { label: "Find phones under ₦200k", query: "Find me a phone under ₦200,000", icon: "📱" },
                { label: "Today's best deals", query: "Show me today's best deals", icon: "🔥" },
                { label: "Is this price fair?", query: "Is iPhone 15 Pro Max a good price?", icon: "🛡️" },
                { label: "Track my order", query: "Track my order", icon: "📦" },
            ]
        }
    ]);
    const [input, setInput] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const messagesAreaRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const { addToCart } = useCart();
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
        const products = DemoStore.getProducts().filter(p => p.is_active);
        const { intent, query, budget, category, productName } = detectIntent(userInput);

        // Simulate AI thinking
        await new Promise(r => setTimeout(r, 600 + Math.random() * 800));

        switch (intent) {
            case "greeting": {
                const name = user?.name?.split(" ")[0] || "there";
                return {
                    content: `Hey ${name}! 😊 Great to see you. I'm ready to help you shop smarter. What are you looking for today?`,
                    quickActions: [
                        { label: "Browse phones", query: "Show me phones", icon: "📱" },
                        { label: "Find deals", query: "What are the best deals today?", icon: "🔥" },
                        { label: "Check a price", query: "Is the Samsung S24 Ultra fairly priced?", icon: "💰" },
                    ]
                };
            }

            case "help": {
                return {
                    content: "I can help you with:\n\n🔍 **Search products** — \"Find me a laptop under ₦500k\"\n💰 **Check prices** — \"Is iPhone 15 Pro fairly priced?\"\n📊 **Compare** — \"Compare Samsung vs iPhone\"\n🔥 **Find deals** — \"Show me today's best deals\"\n📦 **Track orders** — \"Where's my order?\"\n🤝 **Negotiate** — \"Help me negotiate on this phone\"\n⭐ **Recommendations** — \"Recommend a good gaming laptop\"\n\nJust type naturally — I understand conversational language!",
                    quickActions: [
                        { label: "Search products", query: "Find me a good phone", icon: "🔍" },
                        { label: "Check prices", query: "Is iPhone 15 Pro Max fairly priced?", icon: "💰" },
                        { label: "Best deals", query: "Show deals", icon: "🔥" },
                    ]
                };
            }

            case "search_product": {
                let results = products.map(p => ({ product: p, score: scoreProductMatch(p, query) }))
                    .filter(r => r.score > 5)
                    .sort((a, b) => b.score - a.score);

                if (budget) {
                    results = results.filter(r => r.product.price <= budget);
                    if (results.length === 0) {
                        // Expand slightly
                        results = products
                            .filter(p => p.price <= budget * 1.15)
                            .map(p => ({ product: p, score: scoreProductMatch(p, query) }))
                            .sort((a, b) => a.product.price - b.product.price);
                    }
                }

                const topResults = results.slice(0, 4).map(r => r.product);

                if (topResults.length === 0) {
                    // Fallback — show popular items
                    const popular = [...products].sort((a, b) => b.sold_count - a.sold_count).slice(0, 4);
                    return {
                        content: `I couldn't find an exact match for "${query}", but here are our most popular products you might like:`,
                        products: popular,
                        quickActions: [
                            { label: "Try different search", query: "Show me electronics", icon: "🔍" },
                            { label: "Browse all deals", query: "Show me deals", icon: "🔥" },
                        ]
                    };
                }

                const budgetText = budget ? ` under ${formatPrice(budget)}` : "";
                const fairCount = topResults.filter(p => p.price_flag === "fair").length;
                const fairNote = fairCount > 0 ? `\n\n🛡️ ${fairCount} of these are **VDM Verified Fair Price** — meaning they're within market range.` : "";

                return {
                    content: `Found **${topResults.length} products**${budgetText} matching your search:${fairNote}`,
                    products: topResults,
                    quickActions: topResults.length > 0 ? [
                        { label: `Price check ${topResults[0].name.substring(0, 20)}...`, query: `Is ${topResults[0].name} fairly priced?`, icon: "💰" },
                    ] : undefined
                };
            }

            case "price_check": {
                const searchTerm = productName || query.replace(/\b(price|check|fair|good|is|the|of|for|what|how|much)\b/gi, "").trim();
                const matches = products
                    .map(p => ({ product: p, score: scoreProductMatch(p, searchTerm) }))
                    .filter(r => r.score > 10)
                    .sort((a, b) => b.score - a.score);

                if (matches.length === 0) {
                    return {
                        content: `I couldn't find a product matching "${searchTerm}". Could you be more specific? Try searching by the exact product name.`,
                        quickActions: [
                            { label: "Browse phones", query: "Show me phones", icon: "📱" },
                            { label: "Browse laptops", query: "Show me laptops", icon: "💻" },
                        ]
                    };
                }

                const product = matches[0].product;
                const comparison = getDemoPriceComparison(product.id);
                const flagEmoji = product.price_flag === "fair" ? "✅" : product.price_flag === "overpriced" ? "🔴" : "⚠️";
                const flagText = product.price_flag === "fair"
                    ? "This product is **fairly priced** — it's within the normal market range."
                    : product.price_flag === "overpriced"
                        ? "This product is **overpriced** compared to market averages. I'd recommend negotiating!"
                        : "This product has an unusual price — proceed with caution.";

                const priceBreakdown = `
${flagEmoji} **Price Analysis: ${product.name}**

| Metric | Price |
|--------|-------|
| Current Price | ${formatPrice(product.price)} |
| Market Average | ${formatPrice(comparison.market_avg)} |
| Market Low | ${formatPrice(comparison.market_low)} |
| Market High | ${formatPrice(comparison.market_high)} |
| Best on Ratel | ${formatPrice(comparison.ratel_best)} |

${flagText}`;

                return {
                    content: priceBreakdown,
                    products: [product],
                    priceComparison: comparison,
                    quickActions: product.price_flag === "overpriced" ? [
                        { label: "Negotiate this price", query: `Help me negotiate for ${product.name}`, icon: "🤝" },
                        { label: "Find alternatives", query: `Find alternatives to ${product.name}`, icon: "🔍" },
                    ] : [
                        { label: "Add to cart", query: `Add ${product.name} to cart`, icon: "🛒" },
                        { label: "Find similar", query: `Show me more ${product.category}`, icon: "🔍" },
                    ]
                };
            }

            case "deals": {
                const deals = [...products]
                    .filter(p => p.original_price && p.original_price > p.price)
                    .sort((a, b) => {
                        const discA = ((a.original_price! - a.price) / a.original_price!) * 100;
                        const discB = ((b.original_price! - b.price) / b.original_price!) * 100;
                        return discB - discA;
                    })
                    .slice(0, 4);

                if (deals.length === 0) {
                    return {
                        content: "No active deals right now, but here are our best-rated products:",
                        products: [...products].sort((a, b) => b.avg_rating - a.avg_rating).slice(0, 4)
                    };
                }

                const maxDiscount = deals[0].original_price ? Math.round(((deals[0].original_price - deals[0].price) / deals[0].original_price) * 100) : 0;

                return {
                    content: `🔥 **Today's Best Deals** — Up to **${maxDiscount}% off**!\n\nThese are verified fair-price deals with real discounts:`,
                    products: deals,
                    quickActions: [
                        { label: "See all deals", query: "Show me more deals", icon: "🔥" },
                        { label: "Deals under ₦100k", query: "Deals under ₦100,000", icon: "💰" },
                    ]
                };
            }

            case "recommend": {
                const searchTerms = query.replace(/\b(recommend|suggest|best|good|top|popular|what|should|i|buy|get|the|a|me)\b/gi, "").trim();

                let recommended: Product[];
                if (searchTerms.length > 2) {
                    recommended = products
                        .map(p => ({ product: p, score: scoreProductMatch(p, searchTerms) }))
                        .filter(r => r.score > 5)
                        .sort((a, b) => b.score - a.score)
                        .slice(0, 4)
                        .map(r => r.product);
                } else {
                    // General recommendations — high rating + fair price
                    recommended = [...products]
                        .filter(p => p.price_flag === "fair" || p.avg_rating >= 4)
                        .sort((a, b) => (b.avg_rating * b.review_count) - (a.avg_rating * a.review_count))
                        .slice(0, 4);
                }

                return {
                    content: `⭐ **My Top Picks for You**\n\nThese are highly-rated, fairly-priced products verified by our AI price engine:`,
                    products: recommended,
                    quickActions: [
                        { label: "More recommendations", query: "Show me more recommendations", icon: "⭐" },
                        { label: "Check a price", query: "Is this a fair price?", icon: "💰" },
                    ]
                };
            }

            case "category_browse": {
                const cat = category || "";
                const catProducts = products
                    .filter(p => p.category?.toLowerCase().includes(cat) || p.name.toLowerCase().includes(cat))
                    .sort((a, b) => b.sold_count - a.sold_count)
                    .slice(0, 4);

                if (catProducts.length === 0) {
                    return {
                        content: `No products found in the "${cat}" category. Here are our top products instead:`,
                        products: [...products].sort((a, b) => b.avg_rating - a.avg_rating).slice(0, 4)
                    };
                }

                return {
                    content: `📂 **${cat.charAt(0).toUpperCase() + cat.slice(1)}** — ${catProducts.length} products found:`,
                    products: catProducts,
                    quickActions: [
                        { label: `Cheapest ${cat}`, query: `Cheapest ${cat}`, icon: "💰" },
                        { label: `Best rated ${cat}`, query: `Best rated ${cat}`, icon: "⭐" },
                    ]
                };
            }

            case "track_order": {
                const idMatch = query.match(/RATEL-[A-Z0-9]+/i);
                if (idMatch) {
                    const trackingId = idMatch[0].toUpperCase();
                    // We need to access the singleton instance, but since this is a mock outside component
                    // we assume DemoStore service is available. But actually DemoStore is a class instance.
                    // The original code used DemoStore.getOrders() which implies static or export.
                    // Check import: import { DemoStore } from "@/lib/demo-store"; 
                    // Wait, line 13: import { DemoStore } from "@/lib/demo-store";
                    // But DemoStore in lib/demo-store.ts is a CLASS. 
                    // Wait, usually it exports an instance?
                    // Let's check demo-store.ts export.
                    // line 25: public static getInstance(): DemoStoreService
                    // line 440 (end of file): export const DemoStore = DemoStoreService.getInstance();
                    // So DemoStore is the instance.

                    const order = DemoStore.getOrderByTrackingId(trackingId);

                    if (order) {
                        const statusEmoji = order.tracking_status === "delivered" ? "✅" : order.tracking_status === "shipped" ? "🚚" : order.tracking_status === "processing" ? "⏳" : "📋";
                        return {
                            content: `${statusEmoji} **Order Found: ${order.product.name}**\n\n**Status:** ${order.tracking_status.toUpperCase()}\n**Location:** ${order.tracking_steps[order.tracking_steps.length - 1].location}\n**Last Update:** ${new Date(order.updated_at).toLocaleDateString()}\n\n[View full tracking details →](/tracking)`,
                            quickActions: [
                                { label: "Track another", query: "Track another order", icon: "📦" },
                                { label: "Shop similar", query: `Show me similar to ${order.product.name}`, icon: "🛍️" },
                            ]
                        };
                    } else {
                        return {
                            content: `❌ I couldn't find any order with ID **${trackingId}**. Please check the number and try again.`,
                            quickActions: [
                                { label: "My orders", query: "Show my recent orders", icon: "📦" },
                            ]
                        };
                    }
                }

                const orders = DemoStore.getOrders();
                const userId = user?.id || "u1";
                const myOrders = orders.filter(o => o.customer_id === userId || o.customer_id === "u1").slice(0, 3);

                if (myOrders.length === 0) {
                    return {
                        content: "📦 You don't have any orders yet. Start shopping and I'll help you track them! If you have a tracking number, just type it (e.g., RATEL-XXXXXXXX).",
                        quickActions: [
                            { label: "Browse products", query: "Show me popular products", icon: "🛒" },
                        ]
                    };
                }

                const orderLines = myOrders.map(o => {
                    const statusEmoji = o.status === "delivered" ? "✅" : o.status === "shipped" ? "🚚" : o.status === "processing" ? "⏳" : "📋";
                    const productName = o.product?.name || "Product";
                    return `${statusEmoji} **${o.id}** — ${productName.substring(0, 20)}... — ${o.status}`;
                }).join("\n");

                return {
                    content: `📦 **Your Recent Orders:**\n\n${orderLines}\n\nTo track a specific order, type its ID.\n\n[View all orders →](/account/orders)`,
                    quickActions: [
                        { label: "View all orders", query: "Show all my orders", icon: "📦" },
                    ]
                };
            }

            case "negotiate": {
                const searchTerm = productName || query.replace(/\b(negotiate|help|me|for|on|the|price|of|with)\b/gi, "").trim();
                const matches = products
                    .filter(p => p.price_flag === "overpriced")
                    .map(p => ({ product: p, score: scoreProductMatch(p, searchTerm) }))
                    .sort((a, b) => b.score - a.score);

                if (matches.length > 0) {
                    const product = matches[0].product;
                    const comparison = getDemoPriceComparison(product.id);
                    const fairPrice = Math.round(comparison.market_avg * 0.95);

                    return {
                        content: `🤝 **Negotiation Assist for ${product.name}**\n\nCurrent price: ${formatPrice(product.price)}\nMarket average: ${formatPrice(comparison.market_avg)}\n\n💡 **My suggestion:** Offer around **${formatPrice(fairPrice)}** — that's competitive and the seller is likely to accept.\n\n👉 Click "Negotiate" on the product below to send your offer:`,
                        products: [product],
                        quickActions: [
                            { label: "View product page", query: `Show me ${product.name}`, icon: "👁️" },
                        ]
                    };
                }

                // No overpriced products found
                const allOverpriced = products.filter(p => p.price_flag === "overpriced").slice(0, 3);
                if (allOverpriced.length > 0) {
                    return {
                        content: "I couldn't match that specific product, but here are items you can negotiate on (they're marked as overpriced):",
                        products: allOverpriced,
                    };
                }

                return {
                    content: "🛡️ Great news — all products on RatelShop are currently fairly priced! Our VDM system ensures no overpricing.",
                };
            }

            case "compare_prices": {
                const words = query.split(/\s+vs\.?\s+|\s+or\s+|\s+and\s+|\s+versus\s+/i);
                if (words.length >= 2) {
                    const product1 = products.find(p => scoreProductMatch(p, words[0]) > 10);
                    const product2 = products.find(p => scoreProductMatch(p, words[1]) > 10);
                    if (product1 && product2) {
                        return {
                            content: `📊 **Comparison:**\n\n| | ${product1.name.substring(0, 25)} | ${product2.name.substring(0, 25)} |\n|---|---|---|\n| Price | ${formatPrice(product1.price)} | ${formatPrice(product2.price)} |\n| Rating | ${product1.avg_rating}⭐ | ${product2.avg_rating}⭐ |\n| Reviews | ${product1.review_count} | ${product2.review_count} |\n| Price Flag | ${product1.price_flag} | ${product2.price_flag} |\n\n💡 ${product1.avg_rating >= product2.avg_rating ? product1.name : product2.name} has better reviews, while ${product1.price <= product2.price ? product1.name : product2.name} is more affordable.`,
                            products: [product1, product2],
                        };
                    }
                }

                return {
                    content: "To compare products, try: \"Compare Samsung S24 vs iPhone 15\" — I'll show you a side-by-side breakdown!",
                    quickActions: [
                        { label: "Compare phones", query: "Compare Samsung Galaxy S24 vs iPhone 15 Pro", icon: "📊" },
                    ]
                };
            }

            default: {
                // Catch-all: try product search
                const fallbackResults = products
                    .map(p => ({ product: p, score: scoreProductMatch(p, query) }))
                    .filter(r => r.score > 5)
                    .sort((a, b) => b.score - a.score)
                    .slice(0, 4)
                    .map(r => r.product);

                if (fallbackResults.length > 0) {
                    return {
                        content: `Here's what I found for "${query}":`,
                        products: fallbackResults,
                    };
                }

                return {
                    content: "I'm not sure what you're looking for. Try asking me to:\n\n🔍 **Search** — \"Find wireless earbuds\"\n💰 **Check price** — \"Is this phone fairly priced?\"\n🔥 **Find deals** — \"Show me deals\"\n📦 **Track order** — \"Where's my package?\"\n\nI understand natural language, so just type like you're chatting with a friend!",
                    quickActions: [
                        { label: "Search products", query: "Show me popular products", icon: "🔍" },
                        { label: "Find deals", query: "Best deals today", icon: "🔥" },
                    ]
                };
            }
        }
    }, [user]);

    // ─── Send Message Handler ────────────────────────
    const handleSend = useCallback(async (text?: string) => {
        const msgText = text || input.trim();
        if (!msgText || isProcessing) return;

        const userMsg: ChatMessage = { id: Date.now().toString(), role: "user", content: msgText };
        setMessages(prev => [...prev, userMsg]);
        setInput("");
        setIsProcessing(true);

        // Show typing indicator
        const typingId = `typing_${Date.now()}`;
        setMessages(prev => [...prev, { id: typingId, role: "assistant", content: "", isTyping: true }]);

        try {
            const response = await generateResponse(msgText);

            // Remove typing, add real response
            setMessages(prev => [
                ...prev.filter(m => m.id !== typingId),
                {
                    id: `resp_${Date.now()}`,
                    role: "assistant",
                    content: response.content,
                    products: response.products,
                    priceComparison: response.priceComparison,
                    quickActions: response.quickActions,
                }
            ]);
        } catch {
            setMessages(prev => [
                ...prev.filter(m => m.id !== typingId),
                { id: `err_${Date.now()}`, role: "assistant", content: "Sorry, something went wrong. Please try again!" }
            ]);
        }

        setIsProcessing(false);
    }, [input, isProcessing, generateResponse]);

    // ─── 3D Mouse Tracking ──────────────────────────
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    useEffect(() => {
        if (!mounted) return;
        const handleMouseMove = (e: MouseEvent) => {
            const x = (e.clientX / window.innerWidth) * 2 - 1;
            const y = (e.clientY / window.innerHeight) * 2 - 1;
            setMousePos({ x, y });
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
        <div className="fixed bottom-4 right-4 z-[9999] pointer-events-none">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="absolute bottom-20 right-0 w-[calc(100vw-2rem)] md:w-[420px] h-[85vh] max-h-[680px] flex flex-col overflow-hidden shadow-2xl pointer-events-auto rounded-3xl border border-white/10"
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

                            <button onClick={toggleChat} className="absolute top-3 right-3 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white/70 hover:text-white transition-all backdrop-blur-sm">
                                <X className="h-4 w-4" />
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
                                                <span className="text-xs text-gray-500">Ziva is thinking...</span>
                                            </div>
                                        ) : (
                                            <>
                                                {/* Text */}
                                                <div
                                                    className={cn(
                                                        "rounded-2xl px-4 py-3 text-[13px] leading-relaxed",
                                                        msg.role === "user"
                                                            ? "bg-emerald-600 text-white rounded-br-none shadow-lg shadow-emerald-600/20"
                                                            : "bg-white/5 text-gray-200 rounded-bl-none border border-white/5"
                                                    )}
                                                >
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
                                                                    <div className="w-14 h-14 bg-white/10 rounded-lg overflow-hidden shrink-0">
                                                                        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
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
                                                                    <div className="flex flex-col items-end gap-2 shrink-0">
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.preventDefault();
                                                                                e.stopPropagation();
                                                                                addToCart(product);
                                                                            }}
                                                                            className="h-7 w-7 rounded-full bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center text-white transition-colors shadow-lg"
                                                                            title="Add to Cart"
                                                                        >
                                                                            <ShoppingBag className="h-3.5 w-3.5" />
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
                                                        {msg.quickActions.map((action, i) => (
                                                            <button
                                                                key={i}
                                                                onClick={() => handleSend(action.query)}
                                                                className="text-[11px] font-semibold bg-white/5 hover:bg-emerald-600/20 border border-white/10 hover:border-emerald-500/30 text-gray-300 hover:text-emerald-400 rounded-full px-3 py-1.5 transition-all flex items-center gap-1.5"
                                                            >
                                                                <span>{action.icon}</span>
                                                                {action.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Input */}
                        <div className="p-3 border-t border-white/5 flex gap-2 shrink-0" style={{ background: "rgba(15,15,20,0.98)" }}>
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
                    className="relative h-14 w-14 md:h-16 md:w-16 rounded-full border-2 border-emerald-500/30 flex items-center justify-center group shadow-2xl shadow-emerald-900/40 overflow-hidden"
                    style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(20px)" }}
                >
                    <div className="absolute inset-0 bg-gradient-to-tr from-emerald-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <img src="/assets/images/image_v2.png" className="w-full h-full object-cover z-10 scale-110" alt="Ziva AI" />

                    {/* Unread pulse */}
                    {hasUnread && (
                        <>
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full z-20 flex items-center justify-center">
                                <span className="text-[8px] font-bold text-white">1</span>
                            </span>
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full z-10 animate-ping" />
                        </>
                    )}
                </motion.button>
            </motion.div>
        </div>
    );
}
