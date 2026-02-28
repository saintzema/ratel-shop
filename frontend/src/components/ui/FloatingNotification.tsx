"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MessageCircle, ShoppingCart, MessageSquare } from "lucide-react";
import { useMessages } from "@/context/MessageContext";
import { useCart } from "@/context/CartContext";
import { DemoStore } from "@/lib/demo-store";

export function FloatingNotification() {
    const { pendingNotification, pendingConversationId, dismissNotification, openMessageBox } = useMessages();
    const { addToCart } = useCart();
    const [visible, setVisible] = useState(false);
    const [actionTaken, setActionTaken] = useState<string | null>(null);

    useEffect(() => {
        if (pendingNotification) {
            setVisible(true);
            setActionTaken(null);
            const timer = setTimeout(() => {
                setVisible(false);
                setTimeout(dismissNotification, 500);
            }, 8000);
            return () => clearTimeout(timer);
        } else {
            setVisible(false);
        }
    }, [pendingNotification, dismissNotification]);

    if (!pendingNotification) return null;

    const isNegotiation = !!pendingNotification.negotiation;
    const hasImage = !!pendingNotification.imageUrl;

    const handleAcceptOffer = () => {
        if (pendingNotification.negotiation) {
            const product = DemoStore.getProducts().find(p => p.id === pendingNotification.negotiation!.productId);
            if (product) {
                addToCart({ ...product, price: pendingNotification.negotiation!.counterPrice });
            }
            setActionTaken("accepted");
            setTimeout(() => {
                setVisible(false);
                setTimeout(dismissNotification, 500);
            }, 1500);
        }
    };

    const handleRenegotiate = () => {
        if (pendingConversationId) {
            openMessageBox(pendingConversationId);
        }
        setVisible(false);
        dismissNotification();
    };

    const handleViewMessage = () => {
        if (pendingConversationId) {
            openMessageBox(pendingConversationId);
        }
        setVisible(false);
        dismissNotification();
    };

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ opacity: 0, y: -80, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -40, scale: 0.95 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="fixed top-4 right-4 left-4 md:left-auto md:w-[400px] z-[10000]"
                >
                    <div
                        className="relative overflow-hidden rounded-2xl border border-white/20 shadow-2xl"
                        style={{
                            background: "rgba(255, 255, 255, 0.75)",
                            backdropFilter: "blur(40px) saturate(180%)",
                            WebkitBackdropFilter: "blur(40px) saturate(180%)",
                        }}
                    >
                        {/* Glow accent */}
                        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-400" />

                        <div className="p-4">
                            <div className="flex items-start gap-3">
                                {/* Avatar */}
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
                                    <MessageCircle className="h-5 w-5 text-white" />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                                            {isNegotiation ? "Counter Offer" : hasImage ? "Seller Update" : "New Message"}
                                        </p>
                                        <button
                                            onClick={() => { setVisible(false); dismissNotification(); }}
                                            className="p-1 rounded-full hover:bg-black/5 transition-colors"
                                        >
                                            <X className="h-3.5 w-3.5 text-gray-400" />
                                        </button>
                                    </div>

                                    <p className="text-sm text-gray-800 font-medium line-clamp-2 leading-snug">
                                        {pendingNotification.text}
                                    </p>

                                    {/* Image preview if present */}
                                    {hasImage && (
                                        <div className="mt-2 rounded-lg overflow-hidden border border-gray-200/50 max-h-20">
                                            <img src={pendingNotification.imageUrl} alt="Attachment" className="w-full h-20 object-cover" />
                                        </div>
                                    )}

                                    {/* Negotiation counter-offer: show price + Accept/Renegotiate */}
                                    {isNegotiation && pendingNotification.negotiation && (
                                        <div className="mt-2.5 p-3 rounded-xl bg-white/60 border border-gray-200/50">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs text-gray-500 font-medium">{pendingNotification.negotiation.productName}</span>
                                                <span className="text-sm font-black text-gray-900">₦{pendingNotification.negotiation.counterPrice.toLocaleString()}</span>
                                            </div>
                                            {actionTaken === "accepted" ? (
                                                <div className="text-center py-1">
                                                    <p className="text-xs font-bold text-emerald-600">✓ Added to Cart!</p>
                                                </div>
                                            ) : (
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={handleAcceptOffer}
                                                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-sm"
                                                    >
                                                        <ShoppingCart className="h-3.5 w-3.5" />
                                                        Accept Offer
                                                    </button>
                                                    <button
                                                        onClick={handleRenegotiate}
                                                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition-colors"
                                                    >
                                                        <MessageSquare className="h-3.5 w-3.5" />
                                                        Renegotiate
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Standard message: View Message CTA */}
                                    {!isNegotiation && (
                                        <button
                                            onClick={handleViewMessage}
                                            className="mt-2.5 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-black/5 hover:bg-black/10 text-gray-700 text-xs font-bold transition-colors"
                                        >
                                            <MessageCircle className="h-3.5 w-3.5" />
                                            View Message
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Progress bar for auto-dismiss */}
                        <motion.div
                            initial={{ scaleX: 1 }}
                            animate={{ scaleX: 0 }}
                            transition={{ duration: 8, ease: "linear" }}
                            className="h-[2px] bg-emerald-400/40 origin-left"
                        />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
