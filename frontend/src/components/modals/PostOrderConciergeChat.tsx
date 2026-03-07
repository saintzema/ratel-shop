"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Image as ImageIcon, Box, HelpCircle, Truck, PackageCheck, AlertCircle, Paperclip, RotateCcw, Camera, Search, Clock, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Product, Order } from "@/lib/types";
import { DemoStore } from "@/lib/demo-store";

interface Message {
    id: string;
    sender: "user" | "ziva" | "admin";
    text: string;
    timestamp: Date;
    imageUrl?: string;
}

interface PostOrderChatProps {
    isOpen: boolean;
    onClose: () => void;
    product: Product | null;
    orderId?: string;
    order?: Order | null;
    mode?: "post_order" | "return" | "cancel" | "review";
}

const POST_ORDER_ACTIONS = [
    { id: "images", label: "Request Product Images", icon: <ImageIcon className="h-3.5 w-3.5" /> },
    { id: "shipping", label: "Shipping Timeline", icon: <Truck className="h-3.5 w-3.5" /> },
    { id: "warranty", label: "Warranty Info", icon: <HelpCircle className="h-3.5 w-3.5" /> },
    { id: "condition", label: "Confirm Condition", icon: <Box className="h-3.5 w-3.5" /> },
];

const RETURN_ACTIONS = [
    { id: "wrong_item", label: "Wrong Item Received", icon: <AlertCircle className="h-3.5 w-3.5" /> },
    { id: "damaged", label: "Item Damaged", icon: <AlertCircle className="h-3.5 w-3.5" /> },
    { id: "not_as_described", label: "Not as Described", icon: <AlertCircle className="h-3.5 w-3.5" /> },
    { id: "upload_photo", label: "Upload Photo Evidence", icon: <Camera className="h-3.5 w-3.5" /> },
];

const CANCEL_ACTIONS = [
    { id: "changed_mind", label: "Changed my mind", icon: <RotateCcw className="h-3.5 w-3.5" /> },
    { id: "found_better", label: "Found a better price", icon: <Search className="h-3.5 w-3.5" /> },
    { id: "mistake", label: "Ordered by mistake", icon: <AlertCircle className="h-3.5 w-3.5" /> },
    { id: "too_long", label: "Shipping takes too long", icon: <Clock className="h-3.5 w-3.5" /> },
];

export function PostOrderConciergeChat({ isOpen, onClose, product, orderId, order, mode = "post_order" }: PostOrderChatProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [reviewRating, setReviewRating] = useState<number>(0);
    const [hoverRating, setHoverRating] = useState<number>(0);
    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const trackingId = order?.tracking_id || orderId || "PENDING";
    const orderStatus = order?.status || "processing";
    const carrier = order?.carrier || "FairPrice Logistics";

    // Initialize chat when opened
    useEffect(() => {
        if (!isOpen || !product || !orderId) return;

        const orderMsgs = DemoStore.getOrderMessages(orderId);
        if (orderMsgs && orderMsgs.length > 0) {
            if (messages.length === 0) {
                setMessages(orderMsgs.map(m => ({
                    id: m.id,
                    sender: m.sender as any,
                    text: m.text,
                    timestamp: new Date(), // using current date for UI compatibility
                    imageUrl: m.imageUrl
                })));
            }
        } else {
            // Initialize if empty
            if (messages.length === 0) {
                if (mode === "cancel") {
                    setMessages([
                        {
                            id: Date.now().toString(),
                            sender: "ziva",
                            text: `I noticed you want to cancel the **${product.name}** (Order **${trackingId}**). Could you tell me why you're cancelling? This helps us improve our service.\n\nPlease select a reason below or type a message.`,
                            timestamp: new Date(),
                        }
                    ]);
                } else if (mode === "review") {
                    setMessages([
                        {
                            id: Date.now().toString(),
                            sender: "ziva",
                            text: `Your delivery for **${product.name}** has been confirmed! 🎉\n\nPlease select a star rating below to leave a quick review. This really helps other shoppers!`,
                            timestamp: new Date(),
                        }
                    ]);
                } else if (mode === "return") {
                    setMessages([
                        {
                            id: Date.now().toString(),
                            sender: "ziva",
                            text: `I understand you'd like to initiate a return for the **${product.name}** (Order **${trackingId}**). I'm sorry for the inconvenience.\n\nTo process your return quickly, please:\n1. **Tell me the reason** for this return\n2. **Upload photos** of the item showing the issue\n\nThis helps our team resolve your case within 24 hours.`,
                            timestamp: new Date(),
                        }
                    ]);
                } else {
                    const statusText = orderStatus === "shipped" || orderStatus === "delivered"
                        ? `Your order is currently **${orderStatus}**${order?.tracking_id ? ` with tracking ID **${order.tracking_id}**` : ""}.`
                        : `Your order is currently being **processed**.`;
                    setMessages([
                        {
                            id: Date.now().toString(),
                            sender: "ziva",
                            text: `Order received! I'm Ziva, your dedicated FairPrice Concierge for the **${product.name}**.\n\n📦 Order ID: **${trackingId}**\n📍 Status: ${statusText}\n🚚 Carrier: **${carrier}**\n\nHow can I assist you with this order?`,
                            timestamp: new Date(),
                        }
                    ]);
                }
            }
        }
    }, [isOpen, product, orderId, messages.length, mode]);

    // Listen for DemoStore updates (e.g. admin replies)
    useEffect(() => {
        if (!isOpen || !orderId) return;
        const handleUpdate = () => {
            const orderMsgs = DemoStore.getOrderMessages(orderId);
            if (orderMsgs && orderMsgs.length > 0) {
                setMessages(orderMsgs.map(m => ({
                    id: m.id,
                    sender: m.sender as any,
                    text: m.text,
                    timestamp: new Date(),
                    imageUrl: m.imageUrl
                })));
            }
        };
        window.addEventListener("storage", handleUpdate);
        window.addEventListener("demo-store-update", handleUpdate);
        return () => {
            window.removeEventListener("storage", handleUpdate);
            window.removeEventListener("demo-store-update", handleUpdate);
        };
    }, [isOpen, orderId]);

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    if (!isOpen) return null;

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const imageUrl = URL.createObjectURL(file);

        const userMsg: Message = {
            id: Date.now().toString(),
            sender: "user",
            text: `📷 ${file.name}`,
            timestamp: new Date(),
            imageUrl,
        };

        DemoStore.addOrderMessage(orderId!, "user", userMsg.text, imageUrl);
        setMessages(prev => [...prev, userMsg]);
        setIsTyping(true);

        // Ziva acknowledges the image
        setTimeout(() => {
            const zivaText = mode === "return"
                ? "Thank you for uploading the photo evidence. I've attached it to your return case. Our dispute resolution team will review this along with the merchant. Is there anything else you'd like to add about the issue?"
                : "I've received the image. I'll pass this along to the merchant and our support team for review.";

            const zivaMsg = {
                id: (Date.now() + 1).toString(),
                sender: "ziva" as const,
                text: zivaText,
                timestamp: new Date()
            };
            DemoStore.addOrderMessage(orderId!, "ziva", zivaText);
            setMessages(prev => [...prev, zivaMsg]);
            setIsTyping(false);
        }, 1500);

        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleSend = (text: string = input) => {
        if (!text.trim()) return;

        // If quick action triggers file upload
        if (text === "Upload Photo Evidence") {
            fileInputRef.current?.click();
            return;
        }

        const userMsg: Message = {
            id: Date.now().toString(),
            sender: "user",
            text,
            timestamp: new Date()
        };

        DemoStore.addOrderMessage(orderId!, "user", text);
        setMessages(prev => [...prev, userMsg]);
        setInput("");
        setIsTyping(true);

        // Smart Ziva Response
        setTimeout(() => {
            let zivaText = "I've noted your concern and notified the merchant. Our support team is also monitoring this request and will step in shortly if needed.";

            const lowerText = text.toLowerCase();

            if (mode === "cancel") {
                DemoStore.updateOrderStatus(orderId!, "cancelled");
                DemoStore.addNotification({
                    userId: DemoStore.getCurrentUserId() || "guest",
                    type: "order",
                    message: `Order Cancelled — Your order #${trackingId.substring(0, 8)} has been cancelled. Reason: ${text}`,
                    link: "/account/orders"
                });
                zivaText = `I have successfully cancelled your order **${trackingId}**. The reason recorded is: "${text}". Your full payment will be refunded immediately. If there's anything else, feel free to ask.`;
                // Fire demo store update to refresh UI
                window.dispatchEvent(new Event("demo-store-update"));
            } else if (mode === "return") {
                // Return mode responses
                if (lowerText.includes("wrong item")) {
                    zivaText = `I'm sorry you received the wrong item. I've flagged this on Order **${trackingId}**. Please upload a photo of what you received so we can compare it with the original listing. Our team will arrange a replacement or full refund within 24–48 hours.`;
                } else if (lowerText.includes("damaged") || lowerText.includes("broken")) {
                    zivaText = `I'm sorry to hear your item arrived damaged. Please upload clear photos showing the damage. Your funds are still in escrow and will NOT be released to the seller until this is resolved. We take damage claims very seriously.`;
                } else if (lowerText.includes("not as described") || lowerText.includes("different")) {
                    zivaText = `Thank you for reporting this. Please describe how the item differs from the listing and upload comparison photos. Your escrow funds are protected — the seller will not be paid until the dispute is resolved in your favor.`;
                } else if (lowerText.includes("refund") || lowerText.includes("money back")) {
                    zivaText = `Your refund request has been logged for Order **${trackingId}**. Since payment is held in escrow, your funds are fully protected. Once our team verifies the return, the refund will be processed within 1–3 business days.`;
                } else if (lowerText.includes("how long") || lowerText.includes("when")) {
                    zivaText = `Return processing typically takes 24–48 hours after we receive your photos and reason. Refunds are issued within 1–3 business days after approval. Your funds are secured in escrow throughout this process.`;
                }
            } else {
                // Post-order mode responses
                if (lowerText.includes("order id") || lowerText.includes("my order") || lowerText.includes("tracking id") || lowerText.includes("tracking code") || lowerText.includes("tracking")) {
                    zivaText = `📦 **Order Details:**\n• Order ID: **${trackingId}**\n• Status: **${orderStatus}**\n• Carrier: **${carrier}**${order?.tracking_id ? `\n• Tracking #: **${order.tracking_id}**` : ""}\n\nYou can use this information to track your shipment. Is there anything else you need help with?`;
                } else if (lowerText.includes("image") || lowerText.includes("picture") || lowerText.includes("photo")) {
                    zivaText = "I am requesting real-time photos of the actual unit from the merchant's warehouse. As soon as they upload them, they will appear here. You'll also receive a notification when the images are ready.";

                    // --- Send bell notification + email to seller ---
                    if (product) {
                        const sellerId = product.seller_id;
                        const seller = DemoStore.getSellers().find(s => s.id === sellerId);
                        const currentUser = DemoStore.getCurrentUser();
                        const buyerName = currentUser?.name || "A Buyer";

                        // In-app bell notification for seller
                        DemoStore.addNotification({
                            userId: sellerId,
                            type: "order",
                            message: `📸 ${buyerName} has requested product images for "${product.name}" (Order #${trackingId.substring(0, 8)}). Please upload photos from your dashboard.`,
                            link: "/seller/dashboard/messages"
                        });

                        // Initiate or continue DM conversation with seller
                        const sellerDisplayName = seller?.business_name || product.seller_name || "Seller";
                        const conv = DemoStore.getOrCreateConversation(
                            currentUser?.id || "guest",
                            sellerId,
                            { [currentUser?.id || "guest"]: buyerName, [sellerId]: sellerDisplayName },
                            { type: "buyer_seller", product_id: product.id }
                        );
                        if (conv) {
                            DemoStore.sendChatMessage(
                                conv.id,
                                currentUser?.id || "guest",
                                buyerName,
                                `📸 Hi, I'd like to request real-time photos of the "${product.name}" before it ships. Can you upload images of the actual unit from your warehouse? (Order: ${trackingId})`
                            );
                        }

                        // Email notification to seller
                        if (seller?.owner_email) {
                            fetch('/api/email', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    to: seller.owner_email,
                                    type: 'SELLER_IMAGE_REQUEST',
                                    payload: {
                                        name: seller.business_name || "Seller",
                                        productName: product.name,
                                        orderId: trackingId,
                                        buyerName,
                                        dashboardUrl: `${window.location.origin}/seller/dashboard/messages`,
                                    }
                                })
                            }).catch(() => { /* Email send is best-effort */ });
                        }
                    }
                } else if (lowerText.includes("ship") || lowerText.includes("delivery") || lowerText.includes("where") || lowerText.includes("when") || lowerText.includes("got the delivery") || lowerText.includes("received")) {
                    if (orderStatus === "delivered") {
                        zivaText = `Your order **${trackingId}** has been marked as **delivered**. If you've received your item and it's in good condition, you can confirm delivery from your orders page to release the payment from escrow. If there's any issue, let me know immediately!`;
                    } else if (orderStatus === "shipped") {
                        zivaText = `Your order **${trackingId}** is currently **in transit** via **${carrier}**${order?.tracking_id ? ` (tracking: ${order.tracking_id})` : ""}. Estimated delivery is within 3–7 business days. I'll notify you when it arrives!`;
                    } else {
                        zivaText = `Your order **${trackingId}** is currently being **prepared** by the merchant. Once shipped, you'll receive tracking details. Estimated delivery: **3–5 business days**.`;
                    }
                } else if (lowerText.includes("warranty") || lowerText.includes("guarantee")) {
                    zivaText = "This product is covered by FairPrice's strict **Escrow Protection**. Your funds will not be released to the seller until you confirm the item matches the description. You also have a 7-day return window after delivery.";
                } else if (lowerText.includes("cancel")) {
                    if (orderStatus === "pending" || orderStatus === "processing") {
                        zivaText = `Your order **${trackingId}** can still be cancelled since it hasn't shipped yet. Would you like me to proceed with the cancellation? Your full payment will be refunded immediately.`;
                    } else {
                        zivaText = `Your order **${trackingId}** has already been **${orderStatus}** and can no longer be cancelled. However, you can initiate a return if needed.`;
                    }
                } else if (lowerText.includes("condition") || lowerText.includes("confirm")) {
                    zivaText = "I can request a condition check from the merchant. They'll be asked to verify the item's quality and packaging before shipping. This is part of our FairPrice Quality Assurance process.";
                }
            }

            const zivaMsg = {
                id: (Date.now() + 1).toString(),
                sender: "ziva" as const,
                text: zivaText,
                timestamp: new Date()
            };
            DemoStore.addOrderMessage(orderId!, "ziva", zivaText);
            setMessages(prev => [...prev, zivaMsg]);
            setIsTyping(false);
        }, 1500);
    };

    const handleRate = (stars: number) => {
        if (reviewRating > 0 || !product) return;
        setReviewRating(stars);

        // Save the review instantly
        const currentUser = DemoStore.getCurrentUser();
        DemoStore.addReview({
            product_id: product.id,
            user_id: currentUser?.id || "guest",
            user_name: currentUser?.name || "Guest User",
            rating: stars,
            comment: ""
        });

        const userMsg: Message = {
            id: Date.now().toString(),
            sender: "user",
            text: `⭐ Rating: ${stars} Stars`,
            timestamp: new Date()
        };
        DemoStore.addOrderMessage(orderId!, "user", userMsg.text);
        setMessages(prev => [...prev, userMsg]);
        setIsTyping(true);

        setTimeout(() => {
            const zivaText = `Thanks for the ${stars}-star rating! Your review has been saved.\n\nWould you like to tell us more about why you gave this rating? Click the button below to write a detailed review on the product page.`;
            const zivaMsg = {
                id: (Date.now() + 1).toString(),
                sender: "ziva" as const,
                text: zivaText,
                timestamp: new Date()
            };
            DemoStore.addOrderMessage(orderId!, "ziva", zivaText);
            setMessages(prev => [...prev, zivaMsg]);
            setIsTyping(false);
        }, 1000);
    };

    const quickActions = mode === "cancel" ? CANCEL_ACTIONS : (mode === "return" ? RETURN_ACTIONS : (mode === "review" ? [] : POST_ORDER_ACTIONS));

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 sm:p-6 pb-20 sm:pb-6">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[75vh] sm:h-[600px] font-sans"
                    >
                        {/* Header */}
                        <div className={`px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0 relative z-20 ${mode === "return" ? "bg-rose-50/80 backdrop-blur-xl" : "bg-white/80 backdrop-blur-xl"}`}>
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 border-white shadow-sm overflow-hidden ${mode === "return" || mode === "cancel" ? "bg-rose-100" : "bg-brand-green-100"}`}>
                                        <img src="/assets/images/image_v2.png" alt="Ziva AI" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 leading-none">
                                        {mode === "cancel" ? "Cancellation Assistant" : (mode === "return" ? "Return Assistant" : "Order Concierge")}
                                    </h3>
                                    <p className={`text-[11px] font-medium mt-1 ${mode === "return" || mode === "cancel" ? "text-rose-600" : "text-emerald-600"}`}>
                                        Ziva AI & Support Team active
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-500 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Product Context Banner */}
                        {product && (
                            <div className={`px-4 py-3 flex items-center gap-3 border-b border-gray-100 shrink-0 ${mode === "return" ? "bg-rose-50/50" : "bg-gray-50"}`}>
                                <img src={product.image_url || "/assets/images/placeholder.png"} alt={product.name} className="w-10 h-10 rounded-lg object-cover bg-white border border-gray-200" onError={e => { e.currentTarget.src = "/assets/images/placeholder.png"; }} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-gray-900 truncate">{product.name}</p>
                                    <p className="text-[10px] text-gray-500 font-medium">
                                        Order {trackingId} • {orderStatus.charAt(0).toUpperCase() + orderStatus.slice(1)}
                                        {mode === "cancel" && <span className="text-rose-600 font-bold ml-1">• Cancellation</span>}
                                        {mode === "return" && <span className="text-rose-600 font-bold ml-1">• Return Request</span>}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Chat Area */}
                        <div
                            ref={scrollRef}
                            className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-gray-50/50"
                        >
                            <div className="text-center pb-4">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Today, {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                            </div>

                            {messages.map((msg) => (
                                <motion.div
                                    key={msg.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                                >
                                    <div className={`flex gap-2 max-w-[85%] ${msg.sender === "user" ? "flex-row-reverse" : "flex-row"}`}>

                                        {/* Avatar */}
                                        <div className="shrink-0 mt-auto">
                                            {msg.sender === "ziva" ? (
                                                <div className={`w-6 h-6 rounded-full flex items-center justify-center border overflow-hidden ${mode === "return" ? "bg-rose-100 border-rose-200" : "bg-brand-green-100 border-brand-green-200"}`}>
                                                    <img src="/assets/images/image_v2.png" alt="Ziva AI" className="w-full h-full object-cover" />
                                                </div>
                                            ) : msg.sender === "admin" ? (
                                                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center border border-blue-200">
                                                    <span className="text-[10px] font-bold text-blue-700">A</span>
                                                </div>
                                            ) : null}
                                        </div>

                                        {/* Message Bubble */}
                                        <div className="flex flex-col gap-1">
                                            <div
                                                className={`px-4 py-2.5 rounded-2xl text-[13px] leading-relaxed relative whitespace-pre-line ${msg.sender === "user"
                                                    ? "bg-black text-white rounded-br-sm"
                                                    : "bg-white text-gray-800 border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)] rounded-bl-sm"
                                                    }`}
                                            >
                                                {msg.text.split(/(\*\*.*?\*\*)/g).map((part, i) => {
                                                    if (part.startsWith("**") && part.endsWith("**")) {
                                                        return <strong key={i}>{part.slice(2, -2)}</strong>;
                                                    }
                                                    return part;
                                                })}
                                                {msg.sender === "ziva" && msg.text.includes("Thanks for the") && msg.text.includes("star rating!") && (
                                                    <div className="mt-3">
                                                        <a href={`/product/${product?.id}#reviews-section`} onClick={onClose} className="block w-full">
                                                            <Button className="w-full h-8 rounded-lg bg-brand-green-600 hover:bg-brand-green-700 text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5">
                                                                Write a Detailed Review
                                                                <RotateCcw className="w-3 h-3 rotate-180" />
                                                            </Button>
                                                        </a>
                                                    </div>
                                                )}
                                            </div>

                                            {msg.imageUrl && (
                                                <div className="mt-1 rounded-xl overflow-hidden border border-gray-200 bg-white">
                                                    <img src={msg.imageUrl} alt="Uploaded" className="w-full max-h-48 object-contain bg-gray-50 p-2" />
                                                </div>
                                            )}
                                            {/* Timestamp */}
                                            <span className={`text-[9px] font-medium mt-0.5 px-1 ${msg.sender === "user" ? "text-gray-400 text-right" : "text-gray-400"}`}>
                                                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>

                                    </div>
                                </motion.div>
                            ))}

                            {isTyping && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                                    <div className="flex gap-2 max-w-[80%] flex-row">
                                        <div className="shrink-0 mt-auto">
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center border overflow-hidden ${mode === "return" ? "bg-rose-100 border-rose-200" : "bg-brand-green-100 border-brand-green-200"}`}>
                                                <img src="/assets/images/image_v2.png" alt="Ziva AI" className="w-full h-full object-cover" />
                                            </div>
                                        </div>
                                        <div className="px-4 py-3 rounded-2xl bg-white border border-gray-100 shadow-sm rounded-bl-sm flex gap-1.5 items-center">
                                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </div>

                        {/* Quick Actions */}
                        <div className="px-4 py-3 bg-white border-t border-gray-100 shrink-0">
                            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                                {quickActions.map(action => (
                                    <button
                                        key={action.id}
                                        onClick={() => handleSend(action.label)}
                                        className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-colors ${mode === "return"
                                            ? "bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200"
                                            : "bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200"
                                            }`}
                                    >
                                        {action.icon}
                                        {action.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Hidden file input */}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleImageUpload}
                        />

                        {/* Input Area or Review UI */}
                        {mode === "review" ? (
                            <div className="p-5 bg-white border-t border-gray-100 shrink-0 flex flex-col items-center justify-center space-y-4">
                                {reviewRating === 0 ? (
                                    <>
                                        <p className="text-sm font-bold text-gray-700">Tap to Rate</p>
                                        <div className="flex gap-2" onMouseLeave={() => setHoverRating(0)}>
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <button
                                                    key={star}
                                                    onClick={() => handleRate(star)}
                                                    onMouseEnter={() => setHoverRating(star)}
                                                    className="p-1 hover:scale-110 transition-transform focus:outline-none group"
                                                >
                                                    <Star className={`w-10 h-10 transition-colors ${hoverRating >= star ? "text-amber-400 fill-amber-400" : "text-gray-300 group-hover:text-amber-400 group-hover:fill-amber-400"}`} />
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="flex gap-1 mb-2">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <Star key={star} className={`w-8 h-8 ${star <= reviewRating ? "text-amber-400 fill-amber-400" : "text-gray-200"}`} />
                                            ))}
                                        </div>
                                        <a href={`/product/${product?.id}#reviews-section`} onClick={onClose} className="w-full">
                                            <Button className="w-full h-12 rounded-xl bg-brand-green-600 hover:bg-brand-green-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2">
                                                Write a Detailed Review
                                                <RotateCcw className="w-4 h-4 rotate-180" />
                                            </Button>
                                        </a>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className="p-4 bg-white border-t border-gray-100 shrink-0">
                                <div className="relative flex items-center gap-2">
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors ${mode === "return"
                                            ? "bg-rose-50 text-rose-600 hover:bg-rose-100"
                                            : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                                            }`}
                                        title="Upload image"
                                    >
                                        <Paperclip className="w-4 h-4" />
                                    </button>
                                    <div className="relative flex-1">
                                        <Input
                                            className="pr-12 bg-gray-50 border-gray-200 h-11 rounded-full text-sm focus:bg-white transition-colors"
                                            placeholder="Type a message..."
                                            value={input}
                                            onChange={(e) => setInput(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleSend();
                                                }
                                            }}
                                        />
                                        <Button
                                            size="icon"
                                            className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black hover:bg-gray-800 text-white shadow-sm"
                                            onClick={() => handleSend()}
                                            disabled={!input.trim()}
                                        >
                                            <Send className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                                <div className="text-center mt-3">
                                    <p className="text-[9px] text-gray-400 font-medium">End-to-end encrypted • Escrow Protected</p>
                                </div>
                            </div>
                        )}

                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
