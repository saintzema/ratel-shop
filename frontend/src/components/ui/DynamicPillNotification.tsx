"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, ShoppingCart, MessageSquare, Tag, Image as ImageIcon, ChevronRight, X } from "lucide-react";
import { useMessages } from "@/context/MessageContext";
import { useCart } from "@/context/CartContext";
import { DemoStore, NegotiationRequest } from "@/lib/demo-store";
import { useRouter } from "next/navigation";
import { playDingSound } from "@/lib/audio";

// Premium Apple-like glass chime notification sound — calming, rich, ~2.5s
// Migrated to src/lib/audio.ts for global use

export function DynamicPillNotification() {
    const { pendingNotification, pendingConversationId, dismissNotification, openMessageBox } = useMessages();
    const { addToCart } = useCart();
    const router = useRouter();
    const [visible, setVisible] = useState(false);
    const [expanded, setExpanded] = useState(false);
    
    const [customNotification, setCustomNotification] = useState<{
        text: string;
        isNegotiation: boolean;
        hasImage: boolean;
        imageUrl?: string;
        negotiation?: { productId: string; counterPrice: number; productName: string };
        route: string;
    } | null>(null);

    // Monitor for global Seller and Buyer notifications
    useEffect(() => {
        const checkGlobalNotifications = () => {
            const sellerId = DemoStore.getCurrentSellerId();
            const currentUser = DemoStore.getCurrentUser();
            
            if (sellerId) {
                const negs = DemoStore.getNegotiations(sellerId);
                const recentNeg = negs.find((n: NegotiationRequest) => {
                    const ageMs = Date.now() - new Date((n as any).updated_at || n.created_at).getTime();
                    return ageMs < 3000 && n.status !== "accepted" && n.status !== "rejected" && n.seller_id === sellerId;
                });

                if (recentNeg) {
                    const product = DemoStore.getProducts({ includeInactiveSellers: true }).find(p => p.id === recentNeg.product_id);
                    setCustomNotification({
                        text: `New negotiation offer for ${product?.name || 'Product'} at ₦${recentNeg.proposed_price.toLocaleString()}`,
                        isNegotiation: false,
                        hasImage: !!product?.image_url,
                        imageUrl: product?.image_url,
                        route: "/seller/dashboard/messages?customer=" + (recentNeg.customer_id || "") + "&order=" + recentNeg.id
                    });
                    return;
                }
            }

            if (currentUser) {
                const buyerNegs = DemoStore.getNegotiations(undefined, currentUser.id);
                const recentBuyerNeg = buyerNegs.find((n: NegotiationRequest) => {
                    const ageMs = Date.now() - new Date((n as any).updated_at || n.created_at).getTime();
                    if (ageMs > 5000) return false;
                    return (n.status === "accepted" || n.status === "rejected" || (n as any).counter_status === "pending") && n.customer_id === currentUser.id;
                });

                if (recentBuyerNeg) {
                    const product = DemoStore.getProducts({ includeInactiveSellers: true }).find(p => p.id === recentBuyerNeg.product_id);
                    triggerBuyerNotification(recentBuyerNeg, product);
                }
            }
        };

        const handleRemoteNegotiationUpdate = (e: Event) => {
            const customEvent = e as CustomEvent;
            const neg = customEvent.detail?.negotiation;
            if (!neg) return;

            const currentUser = DemoStore.getCurrentUser();
            const currentSellerId = DemoStore.getCurrentSellerId();

            if (currentUser && neg.customer_id === currentUser.id) {
                const product = DemoStore.getProducts({ includeInactiveSellers: true }).find(p => p.id === neg.product_id);
                triggerBuyerNotification(neg, product);
            }
            else if (currentSellerId && neg.seller_id === currentSellerId && neg.status === 'pending' && !neg.counter_status) {
                const product = DemoStore.getProducts({ includeInactiveSellers: true }).find(p => p.id === neg.product_id);
                setCustomNotification({
                    text: `New negotiation offer for ${product?.name || 'Product'} at ₦${neg.proposed_price.toLocaleString()}`,
                    isNegotiation: false,
                    hasImage: !!product?.image_url,
                    imageUrl: product?.image_url,
                    route: "/seller/dashboard/messages?customer=" + (neg.customer_id || "") + "&order=" + neg.id
                });
            }
        };

        const triggerBuyerNotification = (neg: any, product: any) => {
            const hasCounter = neg.counter_status === "pending" && neg.counter_price;
            
            if (hasCounter) {
                setCustomNotification({
                    text: `Counter offer of ₦${neg.counter_price.toLocaleString()} for ${product?.name || 'Product'}`,
                    isNegotiation: true,
                    hasImage: !!product?.image_url,
                    imageUrl: product?.image_url,
                    negotiation: {
                        productId: neg.product_id,
                        counterPrice: neg.counter_price,
                        productName: product?.name || "Product"
                    },
                    route: "/account/negotiations"
                });
            } else {
                setCustomNotification({
                    text: neg.status === "accepted"
                        ? `🎉 Your offer for "${product?.name || 'Product'}" was ACCEPTED!`
                        : `Your offer for "${product?.name || 'Product'}" was declined.`,
                    isNegotiation: false,
                    hasImage: !!product?.image_url,
                    imageUrl: product?.image_url,
                    route: "/account/negotiations"
                });
            }
        };

        window.addEventListener("demo-store-update", checkGlobalNotifications);
        window.addEventListener("storage", checkGlobalNotifications);
        window.addEventListener("negotiation-updated-remote", handleRemoteNegotiationUpdate);
        
        return () => {
            window.removeEventListener("demo-store-update", checkGlobalNotifications);
            window.removeEventListener("storage", checkGlobalNotifications);
            window.removeEventListener("negotiation-updated-remote", handleRemoteNegotiationUpdate);
        };
    }, []);

    useEffect(() => {
        const activeNotif = pendingNotification || customNotification;
        if (activeNotif) {
            setVisible(true);
            playDingSound();
            (window as any).nativeBridge?.hapticFeedback("heavy");

            const isNego = pendingNotification ? !!pendingNotification.negotiation : customNotification ? customNotification.isNegotiation : false;
            if (isNego || (customNotification?.hasImage)) {
                setTimeout(() => setExpanded(true), 400);
            }

            const timer = setTimeout(() => {
                setVisible(false);
                setTimeout(() => {
                    setExpanded(false);
                    dismissNotification();
                    setCustomNotification(null);
                }, 500);
            }, 8000);
            return () => clearTimeout(timer);
        } else {
            setVisible(false);
            setExpanded(false);
        }
    }, [pendingNotification, customNotification, dismissNotification]);

    if (!pendingNotification && !customNotification) return null;

    const isNegotiation = pendingNotification ? !!pendingNotification.negotiation : customNotification?.isNegotiation || false;
    const imageUrl = pendingNotification?.imageUrl || customNotification?.imageUrl;
    const currentNegotiation = pendingNotification?.negotiation || customNotification?.negotiation;

    const handleAcceptOffer = (e: React.MouseEvent) => {
        e.stopPropagation();
        const neg = currentNegotiation;
        if (neg) {
            const product = DemoStore.getProducts().find(p => p.id === neg.productId);
            if (product) {
                addToCart({ ...product, price: neg.counterPrice || 0 });
            }
            setVisible(false);
            dismissNotification();
            router.push('/checkout');
        }
    };

    const handleRenegotiate = (e: React.MouseEvent) => {
        e.stopPropagation();
        const neg = currentNegotiation;
        if (pendingConversationId) {
            openMessageBox(pendingConversationId);
        } else if (neg?.productId) {
            openMessageBox(`neg_${neg.productId}`);
        }
        setVisible(false);
        dismissNotification();
    };

    const handlePillClick = () => {
        if (!expanded) {
            setExpanded(true);
            return;
        }

        if (customNotification?.route) {
            router.push(customNotification.route);
        } else if (pendingConversationId) {
            openMessageBox(pendingConversationId);
        }
        
        setVisible(false);
        dismissNotification();
        setCustomNotification(null);
    };

    const displayText = pendingNotification ? pendingNotification.text : customNotification?.text || "New Notification";
    const displayTitle = isNegotiation ? "Price Update" : "FairPrice.ng";

    return (
        <AnimatePresence>
            {visible && (
                <div className="fixed top-12 md:top-4 left-0 right-0 z-[10000] flex justify-center pointer-events-none px-4 pt-[env(safe-area-inset-top,0px)]">
                    <motion.div
                        layout
                        initial={{ opacity: 0, y: -50, scale: 0.8, filter: "blur(10px)" }}
                        animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                        exit={{ opacity: 0, y: -50, scale: 0.8, filter: "blur(10px)" }}
                        transition={{ type: "spring", damping: 25, stiffness: 400, mass: 0.8 }}
                        drag="y"
                        dragConstraints={{ top: -100, bottom: 0 }}
                        dragElastic={0.2}
                        onDragEnd={(e, info) => {
                            if (info.offset.y < -30) {
                                setVisible(false);
                                dismissNotification();
                                setCustomNotification(null);
                            }
                        }}
                        onClick={handlePillClick}
                        className={`pointer-events-auto relative overflow-hidden transition-all duration-[450px] ease-[cubic-bezier(0.23,1,0.32,1)] ${
                            expanded 
                                ? "bg-[#0c0c0c]/98 backdrop-blur-3xl rounded-[32px] w-full max-w-[400px] p-5 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.8)] border border-white/10 text-white" 
                                : "bg-black/95 backdrop-blur-2xl rounded-full p-2 w-auto pr-6 shadow-2xl text-white"
                        }`}
                    >
                        {/* Compact/Collapsed View */}
                        <motion.div layout="position" className="flex items-center gap-3">
                            {/* Product Image on Left (Alibaba style) */}
                            {imageUrl ? (
                                <motion.div 
                                    layout="position" 
                                    className={`relative shrink-0 overflow-hidden bg-gray-100 ${
                                        expanded ? "w-16 h-16 rounded-xl" : "w-8 h-8 rounded-full"
                                    }`}
                                >
                                    <img src={imageUrl} alt="Notification" className="w-full h-full object-cover" />
                                </motion.div>
                            ) : (
                                <motion.div 
                                    layout="position" 
                                    className={`shrink-0 flex items-center justify-center bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)] ${
                                        expanded ? "w-16 h-16 rounded-xl" : "w-8 h-8 rounded-full"
                                    }`}
                                >
                                    <Tag className={`text-white ${expanded ? "h-6 w-6" : "h-4 w-4"}`} />
                                </motion.div>
                            )}

                            {/* Text Content */}
                            <motion.div layout="position" className="flex flex-col min-w-0 flex-1">
                                <div className="flex items-center justify-between">
                                    <span className={`font-bold ${expanded ? "text-base text-white" : "text-xs text-emerald-400 uppercase tracking-wide"}`}>
                                        {expanded ? displayTitle : displayTitle}
                                    </span>
                                    {expanded && (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setVisible(false); }}
                                            className="p-1 -mr-1 text-gray-500 hover:text-white transition-colors"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                                <span className={`font-medium leading-tight ${expanded ? "text-gray-400 text-sm mt-1" : "text-white text-sm line-clamp-1"}`}>
                                    {displayText}
                                </span>
                            </motion.div>
                            
                            {!expanded && <ChevronRight className="h-4 w-4 text-white/30" />}
                        </motion.div>

                        {/* Expanded View Buttons (Alibaba-style) */}
                        {expanded && (
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="mt-5 flex flex-col gap-2"
                            >
                                <button
                                    onClick={isNegotiation ? handleAcceptOffer : handlePillClick}
                                    className="w-full py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white text-sm font-bold transition-all active:scale-[0.98] border border-white/5 flex items-center justify-center gap-2"
                                >
                                    {isNegotiation ? <ShoppingCart className="h-4 w-4" /> : null}
                                    {isNegotiation ? "Seal the Deal" : "View Now"}
                                </button>
                                
                                {isNegotiation && (
                                    <button
                                        onClick={handleRenegotiate}
                                        className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-black transition-all active:scale-[0.98] shadow-[0_8px_20px_-4px_rgba(16,185,129,0.4)] flex items-center justify-center gap-2"
                                    >
                                        <MessageSquare className="h-4 w-4" />
                                        Negotiate Further
                                    </button>
                                )}
                            </motion.div>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
