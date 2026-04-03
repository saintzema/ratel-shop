"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, ShoppingCart, MessageSquare, Tag, Image as ImageIcon, ChevronRight, X } from "lucide-react";
import { useMessages } from "@/context/MessageContext";
import { useCart } from "@/context/CartContext";
import { useNotification } from "@/components/ui/NotificationProvider";
import { DemoStore, NegotiationRequest } from "@/lib/demo-store";
import { useRouter } from "next/navigation";
import { playDingSound } from "@/lib/audio";

// Premium Apple-like glass chime notification sound — calming, rich, ~2.5s
// Migrated to src/lib/audio.ts for global use

export function DynamicPillNotification() {
    const { pendingNotification, pendingConversationId, dismissNotification, openMessageBox } = useMessages();
    const { addToCart } = useCart();
    const { showNotification } = useNotification();
    const router = useRouter();
    const [visible, setVisible] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const [longPressActive, setLongPressActive] = useState(false);
    
    // Using a Ref to store notified IDs with their last-seen timestamp
    const notifiedHistory = useRef<Map<string, number>>(new Map());

    const [customNotification, setCustomNotification] = useState<{
        id: string;
        text: string;
        isNegotiation: boolean;
        isSellerAction: boolean;
        hasImage: boolean;
        imageUrl?: string;
        negotiation?: { id: string; productId: string; proposedPrice: number; productName: string };
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
                    const updatedAt = new Date((n as any).updated_at || n.created_at).getTime();
                    const ageMs = Date.now() - updatedAt;
                    
                    const isNewOffer = n.status === "pending" && !n.counter_status && !n.counter_price;
                    const notifyKey = `seller_${n.id}_${n.proposed_price}`;
                    const lastTime = notifiedHistory.current.get(notifyKey) || 0;

                    const isRecent = ageMs < 12000;
                    const isNewToUs = Date.now() - lastTime > 15000; // 15s window
                    
                    return isRecent && isNewOffer && n.seller_id === sellerId && isNewToUs;
                });

                if (recentNeg) {
                    const product = DemoStore.getProducts({ includeInactiveSellers: true }).find(p => p.id === recentNeg.product_id);
                    const notifyKey = `seller_${recentNeg.id}_${recentNeg.proposed_price}`;
                    notifiedHistory.current.set(notifyKey, Date.now());
                    
                    setCustomNotification({
                        id: recentNeg.id,
                        text: `New offer of ₦${recentNeg.proposed_price.toLocaleString()} for ${product?.name || 'Product'}`,
                        isNegotiation: true,
                        isSellerAction: true,
                        hasImage: !!product?.image_url,
                        imageUrl: product?.image_url,
                        negotiation: {
                            id: recentNeg.id,
                            productId: recentNeg.product_id,
                            proposedPrice: recentNeg.proposed_price,
                            productName: product?.name || "Product"
                        },
                        route: "/seller/dashboard/messages?negotiation=" + recentNeg.id
                    });
                    return;
                }
            }

            if (currentUser) {
                const buyerNegs = DemoStore.getNegotiations(undefined, currentUser.id);
                const recentBuyerNeg = buyerNegs.find((n: NegotiationRequest) => {
                    const updatedAt = new Date((n as any).updated_at || n.created_at).getTime();
                    const ageMs = Date.now() - updatedAt;
                    if (ageMs > 12000) return false;
                    
                    const isSignificantChange = (n.status === "accepted" || n.status === "rejected" || (n as any).counter_status === "pending");
                    const notifyKey = `buyer_${n.id}_${n.status}_${(n as any).counter_status}`;
                    const lastTime = notifiedHistory.current.get(notifyKey) || 0;

                    return isSignificantChange && n.customer_id === currentUser.id && (Date.now() - lastTime > 15000);
                });

                if (recentBuyerNeg) {
                    const product = DemoStore.getProducts({ includeInactiveSellers: true }).find(p => p.id === recentBuyerNeg.product_id);
                    const notifyKey = `buyer_${recentBuyerNeg.id}_${recentBuyerNeg.status}_${(recentBuyerNeg as any).counter_status}`;
                    notifiedHistory.current.set(notifyKey, Date.now());
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
                    id: neg.id + "_" + neg.proposed_price, 
                    text: `Buyer counter-offered ₦${neg.proposed_price.toLocaleString()} for ${product?.name || 'Product'}`,
                    isNegotiation: true,
                    isSellerAction: true,
                    hasImage: !!product?.image_url,
                    imageUrl: product?.image_url,
                    negotiation: {
                        id: neg.id,
                        productId: neg.product_id,
                        proposedPrice: neg.proposed_price,
                        productName: product?.name || "Product"
                    },
                    route: "/seller/dashboard/messages?negotiation=" + neg.id
                });
            }
        };

        const triggerBuyerNotification = (neg: any, product: any) => {
            const hasCounter = neg.counter_status === "pending" && neg.counter_price;
            
            if (hasCounter) {
                setCustomNotification({
                    id: neg.id,
                    text: `Seller counter-offered ₦${neg.counter_price.toLocaleString()} for ${product?.name || 'Product'}`,
                    isNegotiation: true,
                    isSellerAction: false,
                    hasImage: !!product?.image_url,
                    imageUrl: product?.image_url,
                    negotiation: {
                        id: neg.id,
                        productId: neg.product_id,
                        proposedPrice: neg.counter_price,
                        productName: product?.name || "Product"
                    },
                    route: "/account/negotiations"
                });
            } else {
                setCustomNotification({
                    id: neg.id,
                    text: neg.status === "accepted"
                        ? `🎉 Your offer for "${product?.name || 'Product'}" was ACCEPTED!`
                        : `Your offer for "${product?.name || 'Product'}" was declined.`,
                    isNegotiation: false,
                    isSellerAction: false,
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
            try { (window as any).nativeBridge?.hapticFeedback?.("heavy"); } catch {}

            const isNego = pendingNotification ? !!pendingNotification.negotiation : (customNotification ? customNotification.isNegotiation : false);
            
            if (activeNotif.id) {
                showNotification({
                    type: isNego ? "ziva" : "info",
                    title: isNego ? "Price Update" : "FairPrice.ng",
                    message: activeNotif.text,
                    duration: 0 
                });
            }

            if (isNego || (customNotification?.hasImage)) {
                setTimeout(() => setExpanded(true), 600);
            }

            const timer = setTimeout(() => {
                setVisible(false);
                setTimeout(() => {
                    setExpanded(false);
                    dismissNotification();
                    setCustomNotification(null);
                }, 500);
            }, 10000); 
            return () => clearTimeout(timer);
        } else {
            setVisible(false);
            setExpanded(false);
        }
    }, [pendingNotification, customNotification, dismissNotification, showNotification]);

    if (!pendingNotification && !customNotification) return null;

    const isNegotiation = pendingNotification ? !!pendingNotification.negotiation : (customNotification?.isNegotiation || false);
    const isSellerAction = customNotification?.isSellerAction || false;
    const imageUrl = pendingNotification?.imageUrl || customNotification?.imageUrl;
    const currentNegotiation = pendingNotification?.negotiation || customNotification?.negotiation;

    const handleAcceptOffer = (e: React.MouseEvent) => {
        e.stopPropagation();
        const neg = currentNegotiation;
        if (neg) {
            const negId = (neg as any).id;
            if (isSellerAction && negId) {
                DemoStore.updateNegotiationStatus(negId, "accepted");
                window.dispatchEvent(new Event("storage"));
                setVisible(false);
                dismissNotification();
                setCustomNotification(null);
                router.push('/seller/dashboard/messages?negotiation=' + negId);
            } else {
                const product = DemoStore.getProducts().find(p => p.id === neg.productId);
                if (product) {
                    addToCart({ ...product, price: (neg as any).proposedPrice || (neg as any).counterPrice || 0 });
                }
                setVisible(false);
                dismissNotification();
                router.push('/checkout');
            }
        }
    };

    const handleRenegotiate = (e: React.MouseEvent) => {
        e.stopPropagation();
        const neg = currentNegotiation;
        const negId = (neg as any)?.id;
        
        if (isSellerAction && negId) {
            router.push('/seller/dashboard/messages?negotiation=' + negId);
        } else if (pendingConversationId) {
            openMessageBox(pendingConversationId);
        } else if (neg?.productId) {
            openMessageBox(`neg_${neg.productId}`);
        }
        
        setVisible(false);
        dismissNotification();
        setCustomNotification(null);
    };

    const handlePillClick = () => {
        if (!expanded) {
            setExpanded(true);
            try { (window as any).nativeBridge?.hapticFeedback?.("medium"); } catch {}
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
                <div className="fixed top-2 md:top-4 left-0 right-0 z-[10000] flex justify-center pointer-events-none px-4 pt-[env(safe-area-inset-top,0px)]">
                    <motion.div
                        layout
                        initial={{ opacity: 0, y: -100, scale: 0.6, filter: "blur(20px)" }}
                        animate={{ 
                            opacity: 1, 
                            y: 0, 
                            scale: 1, 
                            filter: "blur(0px)",
                            transition: {
                                type: "spring",
                                damping: 18,
                                stiffness: 350,
                                mass: 0.8
                            }
                        }}
                        exit={{ opacity: 0, y: -100, scale: 0.6, filter: "blur(20px)" }}
                        drag="y"
                        dragConstraints={{ top: -100, bottom: 50 }}
                        dragElastic={0.4}
                        onDragEnd={(e, info) => {
                            if (info.offset.y < -40) {
                                setVisible(false);
                                dismissNotification();
                                setCustomNotification(null);
                                try { (window as any).nativeBridge?.hapticFeedback?.("light"); } catch {}
                            } else if (info.offset.y > 60 && !expanded) {
                                setExpanded(true);
                                try { (window as any).nativeBridge?.hapticFeedback?.("medium"); } catch {}
                            }
                        }}
                        onClick={handlePillClick}
                        onPointerDown={() => setLongPressActive(true)}
                        onPointerUp={() => setLongPressActive(false)}
                        className={`pointer-events-auto relative overflow-hidden transition-all duration-[600ms] cubic-bezier(0.19, 1, 0.22, 1) ${
                            expanded 
                                ? "bg-white/90 backdrop-blur-3xl rounded-[38px] w-full max-w-[420px] p-6 shadow-[0_48px_80px_-20px_rgba(0,0,0,0.2)] text-zinc-900" 
                                : `bg-white/95 backdrop-blur-2xl rounded-full p-2.5 w-auto pr-8 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.1)] text-zinc-800 ring-1 ring-black/5 ${longPressActive ? 'scale-95' : 'hover:scale-[1.02]'}`
                        }`}
                        style={{ 
                            perspective: "1000px",
                            border: "1.5px solid transparent",
                            backgroundImage: "linear-gradient(rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.95)), linear-gradient(to right, #DAA520, #FFD700, #FFFACD, #DAA520)",
                            backgroundOrigin: "border-box",
                            backgroundClip: "padding-box, border-box",
                        }}
                    >
                        {/* Apple-style Gradient Overlay */}
                        {expanded && (
                            <div className="absolute inset-0 bg-gradient-to-b from-emerald-50/20 to-transparent pointer-events-none" />
                        )}

                        {/* Text and Icon Content */}
                        <motion.div layout="position" className="flex items-center gap-4">
                            {/* Product Asset */}
                            {imageUrl ? (
                                <motion.div 
                                    layout="position" 
                                    className={`relative shrink-0 overflow-hidden ring-1 ring-black/5 shadow-md ${
                                        expanded ? "w-16 h-16 rounded-2xl" : "w-10 h-10 rounded-full"
                                    }`}
                                    style={{
                                        border: "1.2px solid transparent",
                                        backgroundImage: "linear-gradient(white, white), linear-gradient(to bottom right, #DAA520, #FFD700, #FFFACD)",
                                        backgroundOrigin: "border-box",
                                        backgroundClip: "padding-box, border-box",
                                    }}
                                >
                                    <img src={imageUrl} alt="Asset" className="w-full h-full object-cover" />
                                    {expanded && (
                                        <div className="absolute inset-0 bg-black/5" />
                                    )}
                                </motion.div>
                            ) : (
                                <motion.div 
                                    layout="position" 
                                    className={`shrink-0 flex items-center justify-center bg-emerald-600 shadow-lg shadow-emerald-500/20 ${
                                        expanded ? "w-16 h-16 rounded-2xl" : "w-10 h-10 rounded-full"
                                    }`}
                                >
                                    <Tag className={`text-white ${expanded ? "h-7 w-7" : "h-5 w-5"}`} strokeWidth={3} />
                                </motion.div>
                            )}

                            {/* Info */}
                            <motion.div layout="position" className="flex flex-col min-w-0 flex-1">
                                <div className="flex items-center justify-between">
                                    <span className={`font-black tracking-tight ${expanded ? "text-xl text-zinc-900" : "text-[10px] text-emerald-600 uppercase tracking-[0.15em] font-black"}`}>
                                        {displayTitle}
                                    </span>
                                    {expanded && (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setVisible(false); dismissNotification(); setCustomNotification(null); try { (window as any).nativeBridge?.hapticFeedback?.("light"); } catch {} }}
                                            className="p-1 px-3 -mr-1 bg-zinc-100 hover:bg-zinc-200 rounded-full text-zinc-500 hover:text-zinc-900 transition-all text-[10px] font-bold uppercase tracking-wider"
                                        >
                                            Dismiss
                                        </button>
                                    )}
                                </div>
                                <span className={`font-medium tracking-tight ${expanded ? "text-zinc-500 text-[15px] mt-1.5 leading-snug" : "text-zinc-800 text-sm line-clamp-1"}`}>
                                    {displayText}
                                </span>
                            </motion.div>
                            
                            {!expanded && (
                                <div className="ml-1 opacity-40">
                                    <ChevronRight className="h-4 w-4 text-emerald-600" strokeWidth={3} />
                                </div>
                            )}
                        </motion.div>

                        {/* Interactive Buttons for Expanded State */}
                        <AnimatePresence>
                            {expanded && (
                                <motion.div 
                                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    transition={{ delay: 0.1, type: "spring", stiffness: 400, damping: 25 }}
                                    className="mt-6 flex flex-col gap-3"
                                >
                                    <button
                                        onClick={isNegotiation ? handleAcceptOffer : handlePillClick}
                                        className="w-full h-14 rounded-[22px] bg-emerald-600 text-white text-[15px] font-black transition-all active:scale-[0.97] hover:bg-emerald-700 flex items-center justify-center gap-2.5 shadow-xl shadow-emerald-100 border border-emerald-500/10"
                                    >
                                        {isNegotiation ? <ShoppingCart className="h-5 w-5" /> : null}
                                        {isNegotiation 
                                            ? (isSellerAction ? `Accept ₦${(currentNegotiation as any).proposedPrice?.toLocaleString()}` : "Accept & Checkout") 
                                            : "View Details"}
                                    </button>
                                    
                                    {isNegotiation && (
                                        <button
                                            onClick={handleRenegotiate}
                                            className="w-full h-14 rounded-[22px] bg-zinc-100 hover:bg-zinc-200 text-zinc-900 text-[15px] font-bold transition-all active:scale-[0.97] flex items-center justify-center gap-2.5 border border-zinc-200"
                                        >
                                            <MessageSquare className="h-5 w-5" />
                                            {isSellerAction ? "Reply / Counter" : "Reply with Counter"}
                                        </button>
                                    )}

                                    {!isNegotiation && !customNotification?.route && (
                                         <button
                                            onClick={handlePillClick}
                                            className="w-full h-14 rounded-[22px] bg-zinc-900 text-white text-[15px] font-black transition-all active:scale-[0.97] shadow-xl shadow-zinc-200 flex items-center justify-center gap-2.5"
                                        >
                                            <MessageCircle className="h-5 w-5" />
                                            Reply Now
                                        </button>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
