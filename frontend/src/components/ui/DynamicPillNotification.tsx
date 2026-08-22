"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useBottomChromeOffset } from "@/lib/use-bottom-chrome";
import { 
    MessageCircle, 
    ShoppingCart, 
    MessageSquare, 
    Tag, 
    Image as ImageIcon, 
    ChevronRight, 
    X,
    CheckCircle,
    ArrowUpRight
} from "lucide-react";
import { useMessages } from "@/context/MessageContext";
import { useCart } from "@/context/CartContext";
import { useNotification } from "@/components/ui/NotificationProvider";
import { DataSyncService, NegotiationRequest } from "@/lib/sync-store";
import { useRouter } from "next/navigation";
import { playDingSound } from "@/lib/audio";

// Premium Apple-like glass chime notification sound — calming, rich, ~2.5s
// Migrated to src/lib/audio.ts for global use

// Dedup key for a negotiation pill.
//
// These keys used to lead with the negotiation's `id`. Local negotiations are
// re-created by sync with fresh ids, so the key changed on every pass, the
// acknowledged-set never matched, and the same "Your offer was ACCEPTED!" pill
// reappeared forever. Keying on the deal's CONTENT — product, parties, state and
// price — makes the identity stable across re-syncs, which is the same rule the
// notification engine already follows: reconcile by content signature, never by
// id alone.
function negKey(prefix: string, neg: any): string {
    if (!neg) return `${prefix}_unknown`;
    const parts = [
        prefix,
        neg.product_id ?? "noprod",
        neg.customer_id ?? "nocust",
        neg.seller_id ?? "noseller",
        neg.status ?? "nostatus",
        neg.counter_status ?? "none",
        neg.counter_price ?? neg.proposed_price ?? "noprice",
    ];
    return parts.map(String).join("_");
}

// Persistent "already shown" set so a deal pill (e.g. an accepted negotiation)
// doesn't re-pop on every page reload. Keyed by negotiation id + status, so a
// genuinely NEW status change still surfaces. In-memory dedup alone resets on
// reload — this survives it.
const DEAL_ACK_KEY = "fp_ack_deal_pills";
const getDealAckSet = (): Set<string> => {
    try { return new Set(JSON.parse(localStorage.getItem(DEAL_ACK_KEY) || "[]")); } catch { return new Set(); }
};
const ackDeal = (key: string) => {
    try {
        const s = getDealAckSet();
        s.add(key);
        localStorage.setItem(DEAL_ACK_KEY, JSON.stringify([...s].slice(-200)));
    } catch { }
};

export function DynamicPillNotification() {
    /** Keeps the pill clear of the bottom nav and any message composer. */
    const bottomOffset = useBottomChromeOffset(96);

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
        let debounceTimer: ReturnType<typeof setTimeout> | null = null;
        const debouncedCheck = () => {
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(checkGlobalNotifications, 500);
        };

        const checkGlobalNotifications = () => {
            const sellerId = DataSyncService.getCurrentSellerId();
            const currentUser = DataSyncService.getCurrentUser();
            const userId = sellerId || currentUser?.id;

            if (!userId) return;

            // 1. Check for Generic System Notifications (New Orders, etc.)
            const allNotifications = DataSyncService.getNotifications(userId);
            const recentNotif = allNotifications.find((n: any) => {
                const ts = new Date(n.timestamp).getTime();
                const ageMs = Date.now() - ts;
                const isRecent = ageMs < 10000; // 10s window
                const notifyKey = `notif_${n.id}`;
                const lastTime = notifiedHistory.current.get(notifyKey) || 0;
                const isNewToUs = Date.now() - lastTime > 15000;

                // The transient pill is for real-time events (offers, order updates),
                // NOT passive nudges. The seeded "complete your profile" welcome keeps
                // re-popping (re-seeded with a fresh timestamp, never marked read), so
                // skip it here — it still lives in the notification bell.
                const isPassiveNudge =
                    n.id === "notif_1" ||
                    n.link === "/account/profile" ||
                    /complete your profile/i.test(n.message || "");

                return isRecent && isNewToUs && !n.read && !isPassiveNudge;
            });

            if (recentNotif) {
                const notifyKey = `notif_${recentNotif.id}`;
                notifiedHistory.current.set(notifyKey, Date.now());
                
                setCustomNotification({
                    id: recentNotif.id,
                    text: recentNotif.message,
                    isNegotiation: recentNotif.type === "negotiation",
                    isSellerAction: !!sellerId,
                    hasImage: false,
                    route: recentNotif.link || (sellerId ? "/seller/dashboard" : "/account/notifications")
                });
                return;
            }
            
            // 2. Check for Specific Negotiation Actions (legacy logic)
            if (sellerId) {
                const negs = DataSyncService.getNegotiations(sellerId);
                const recentNeg = negs.find((n: NegotiationRequest) => {
                    const updatedAt = new Date((n as any).updated_at || n.created_at).getTime();
                    const ageMs = Date.now() - updatedAt;
                    
                    const isNewOffer = n.status === "pending" && !n.counter_status && !n.counter_price;
                    const notifyKey = negKey("seller", n);
                    const lastTime = notifiedHistory.current.get(notifyKey) || 0;

                    const isRecent = ageMs < 12000;
                    const isNewToUs = Date.now() - lastTime > 15000; // 15s window
                    
                    return isRecent && isNewOffer && n.seller_id === sellerId && isNewToUs;
                });

                if (recentNeg) {
                    const product = DataSyncService.getProducts({ includeInactiveSellers: true }).find(p => p.id === recentNeg.product_id);
                    const notifyKey = negKey("seller", recentNeg);
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
                const buyerNegs = DataSyncService.getNegotiations(undefined, currentUser.id);
                const recentBuyerNeg = buyerNegs.find((n: NegotiationRequest) => {
                    const updatedAt = new Date((n as any).updated_at || n.created_at).getTime();
                    const ageMs = Date.now() - updatedAt;
                    if (ageMs > 12000) return false;
                    
                    const isSignificantChange = (n.status === "accepted" || n.status === "rejected" || (n as any).counter_status === "pending");
                    const notifyKey = negKey("buyer", n);
                    const lastTime = notifiedHistory.current.get(notifyKey) || 0;

                    // Skip if this exact deal-state was already acknowledged on a prior
                    // visit — stops the same accepted deal nagging on every reload.
                    return isSignificantChange && n.customer_id === currentUser.id
                        && (Date.now() - lastTime > 15000) && !getDealAckSet().has(notifyKey);
                });

                if (recentBuyerNeg) {
                    const product = DataSyncService.getProducts({ includeInactiveSellers: true }).find(p => p.id === recentBuyerNeg.product_id);
                    const notifyKey = negKey("buyer", recentBuyerNeg);
                    notifiedHistory.current.set(notifyKey, Date.now());
                    ackDeal(notifyKey); // remember across reloads
                    triggerBuyerNotification(recentBuyerNeg, product);
                }
            }
        };

        const handleRemoteNegotiationUpdate = (e: Event) => {
            const customEvent = e as CustomEvent;
            const neg = customEvent.detail?.negotiation;
            if (!neg) return;

            const currentUser = DataSyncService.getCurrentUser();
            const currentSellerId = DataSyncService.getCurrentSellerId();

            if (currentUser && neg.customer_id === currentUser.id) {
                // This real-time broadcast path had NO dedup guard at all — unlike the
                // polling path above (checkGlobalNotifications), which checks getDealAckSet()
                // before showing a pill. SSE/broadcast events routinely redeliver the same
                // negotiation update on reconnect or page navigation, so without this check
                // an already-acknowledged "offer accepted" pill would keep reappearing
                // indefinitely — exactly the stuck-notification bug reported.
                const notifyKey = negKey("buyer", neg);
                if (getDealAckSet().has(notifyKey)) return;
                ackDeal(notifyKey);
                const product = DataSyncService.getProducts({ includeInactiveSellers: true }).find(p => p.id === neg.product_id);
                triggerBuyerNotification(neg, product);
            }
            else if (currentSellerId && neg.seller_id === currentSellerId && neg.status === 'pending' && !neg.counter_status) {
                // This branch had the exact same gap the buyer branch above was fixed for —
                // no dedup at all, so a redelivered SSE event (reconnect, navigation) kept
                // re-showing an already-seen pill indefinitely. An admin account that also
                // owns a seller identity (e.g. Global Stores) hits this path routinely.
                const notifyKey = negKey("seller", neg);
                if (getDealAckSet().has(notifyKey)) return;
                ackDeal(notifyKey);
                const product = DataSyncService.getProducts({ includeInactiveSellers: true }).find(p => p.id === neg.product_id);
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

        const handleAdminBroadcast = (e: Event) => {
            const customEvent = e as CustomEvent;
            const detail = customEvent.detail;
            if (!detail) return;

            // Check if this is a targeted broadcast
            if (detail.targetUserIds && Array.isArray(detail.targetUserIds)) {
                const currentUser = DataSyncService.getCurrentUser();
                const sellerId = DataSyncService.getCurrentSellerId();
                const currentId = sellerId || currentUser?.id;
                
                if (!currentId || !detail.targetUserIds.includes(currentId)) {
                    return; // Not for this user
                }
            }

            setCustomNotification({
                id: `broadcast_${Date.now()}`,
                text: detail.body,
                isNegotiation: false,
                isSellerAction: false,
                hasImage: !!detail.imageUrl,
                imageUrl: detail.imageUrl,
                route: detail.link || "/"
            });
            
            // Immediately play sound and show (the useEffect will handle the rest)
            setVisible(true);
            playDingSound();
        };

        window.addEventListener("sync-store-update", debouncedCheck);
        window.addEventListener("storage", debouncedCheck);
        window.addEventListener("negotiation-updated-remote", handleRemoteNegotiationUpdate);
        window.addEventListener("fp-admin-broadcast", handleAdminBroadcast);

        return () => {
            if (debounceTimer) clearTimeout(debounceTimer);
            window.removeEventListener("sync-store-update", debouncedCheck);
            window.removeEventListener("storage", debouncedCheck);
            window.removeEventListener("negotiation-updated-remote", handleRemoteNegotiationUpdate);
            window.removeEventListener("fp-admin-broadcast", handleAdminBroadcast);
        };
    }, []);

    useEffect(() => {
        const activeNotif = pendingNotification || customNotification;
        if (activeNotif) {
            setVisible(true);
            playDingSound();
            try { (window as any).nativeBridge?.hapticFeedback?.("heavy"); } catch {}

            const isNego = pendingNotification ? !!pendingNotification.negotiation : (customNotification ? customNotification.isNegotiation : false);

            // NOTE: We intentionally do NOT also call showNotification() here. That fired a
            // duplicate top toast (which truncated the text) on top of this bottom pill.
            // The bottom pill below is the single notification surface for these events.

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
                DataSyncService.updateNegotiationStatus(negId, "accepted", "seller");
                window.dispatchEvent(new Event("storage"));
                setVisible(false);
                dismissNotification();
                setCustomNotification(null);
                router.push('/seller/dashboard/messages?negotiation=' + negId);
            } else {
                const product = DataSyncService.getProducts().find(p => p.id === neg.productId);
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
        // A plain informational alert with a known destination should navigate on
        // the first tap — forcing an expand-then-tap-again step made it look like
        // the first click did nothing. Negotiation pills still expand first since
        // they offer a real choice (Accept vs Renegotiate) worth surfacing before acting.
        if (!expanded && (isNegotiation || !customNotification?.route)) {
            setExpanded(true);
            try { (window as any).nativeBridge?.hapticFeedback?.("medium"); } catch {}
            return;
        }

        if (customNotification?.route) {
            router.push(customNotification.route);
        } else if (pendingConversationId) {
            openMessageBox(pendingConversationId);
        } else {
            openMessageBox();
        }
        
        setVisible(false);
        dismissNotification();
        setCustomNotification(null);
    };

    const displayText = pendingNotification ? pendingNotification.text : customNotification?.text || "New Notification";
    const displayTitle = isNegotiation
        ? (isSellerAction ? "New Offer Received" : "Counter Offer From Seller")
        : "FairPrice.ng";

    return (
        <AnimatePresence>
            {visible && (
                <div
                    // Sits above whatever bottom chrome this page actually has
                    // (nav, message composer) instead of a hardcoded bottom-32,
                    // which covered the reply box on message threads.
                    style={{ bottom: bottomOffset }}
                    className="fixed left-0 right-0 z-[10000] flex justify-center pointer-events-none px-4 pb-[env(safe-area-inset-bottom,0px)]"
                >
                    <motion.div
                        layout
                        initial={{ opacity: 0, y: 100, scale: 0.6, filter: "blur(20px)" }}
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
                        exit={{ opacity: 0, y: 100, scale: 0.6, filter: "blur(20px)" }}
                        drag="y"
                        dragConstraints={{ top: -50, bottom: 100 }}
                        dragElastic={0.4}
                        onDragEnd={(e, info) => {
                            if (info.offset.y > 40) {
                                setVisible(false);
                                dismissNotification();
                                setCustomNotification(null);
                                try { (window as any).nativeBridge?.hapticFeedback?.("light"); } catch {}
                            } else if (info.offset.y < -60 && !expanded) {
                                setExpanded(true);
                                try { (window as any).nativeBridge?.hapticFeedback?.("medium"); } catch {}
                            }
                        }}
                        onClick={handlePillClick}
                        onPointerDown={() => setLongPressActive(true)}
                        onPointerUp={() => setLongPressActive(false)}
                        className={`pointer-events-auto relative overflow-hidden transition-all duration-[700ms] cubic-bezier(0.19, 1, 0.22, 1) ${
                            expanded 
                                ? "bg-white/95 backdrop-blur-3xl rounded-[32px] w-[calc(100vw-32px)] md:w-[380px] p-6 shadow-[0_48px_100px_-24px_rgba(0,0,0,0.3)] text-zinc-900 ring-1 ring-black/10" 
                                : `bg-white/98 backdrop-blur-2xl rounded-full p-2.5 w-auto pr-8 shadow-[0_12px_30px_-8px_rgba(0,0,0,0.15)] text-zinc-800 ring-1 ring-black/5 ${longPressActive ? 'scale-95' : 'hover:scale-[1.03]'}`
                        }`}
                        style={{ 
                            perspective: "1200px",
                            border: "1.5px solid transparent",
                            backgroundImage: "linear-gradient(rgba(255, 255, 255, 0.98), rgba(255, 255, 255, 0.98)), linear-gradient(to right, #DAA520, #FFD700, #FFFACD, #DAA520)",
                            backgroundOrigin: "border-box",
                            backgroundClip: "padding-box, border-box",
                        }}
                    >
                        {/* Interactive Sparkle Layer */}
                        {expanded && (
                            <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/5 via-transparent to-indigo-500/5 pointer-events-none" />
                        )}

                        {/* Top Indicator Line (iPhone style) */}
                        <div className="flex justify-center mb-1 -mt-1 opacity-20">
                            <div className="w-8 h-1 rounded-full bg-zinc-400" />
                        </div>

                        {/* Text and Icon Content */}
                        <motion.div layout="position" className="flex items-center gap-4">
                            {/* Product Asset */}
                            {imageUrl ? (
                                <motion.div 
                                    layout="position" 
                                    className={`relative shrink-0 flex items-center justify-center ${
                                        expanded ? "w-16 h-16 rounded-2xl" : "w-10 h-10 rounded-full"
                                    }`}
                                    style={{
                                        border: "1.5px solid transparent",
                                        backgroundImage: "linear-gradient(rgba(255,255,255,0.1), rgba(255,255,255,0.05)), linear-gradient(to bottom right, #DAA520, #FFD700, #FFFACD)",
                                        backgroundOrigin: "border-box",
                                        backgroundClip: "padding-box, border-box",
                                        boxShadow: "0 4px 12px rgba(0,0,0,0.08)"
                                    }}
                                >
                                    <img src={imageUrl} alt="Asset" className="w-[85%] h-[85%] object-contain scale-[1.1]" />
                                    {expanded && (
                                        <div className="absolute inset-0 bg-black/[0.02] pointer-events-none" />
                                    )}
                                </motion.div>
                            ) : (
                                <motion.div 
                                    layout="position" 
                                    className={`shrink-0 flex items-center justify-center bg-indigo-600 shadow-lg shadow-indigo-500/20 ${
                                        expanded ? "w-16 h-16 rounded-2xl" : "w-10 h-10 rounded-full"
                                    }`}
                                >
                                    {isNegotiation ? (
                                        <Tag className={`text-white ${expanded ? "h-8 w-8" : "h-5 w-5"}`} strokeWidth={3} />
                                    ) : (
                                        <MessageCircle className={`text-white ${expanded ? "h-8 w-8" : "h-5 w-5"}`} strokeWidth={3} />
                                    )}
                                </motion.div>
                            )}

                            {/* Info */}
                            <motion.div layout="position" className="flex flex-col min-w-0 flex-1">
                                <div className="flex items-center justify-between">
                                    <span className={`font-black tracking-tight ${expanded ? "text-lg text-zinc-900" : "text-[10px] text-emerald-600 uppercase tracking-[0.16em] font-black"}`}>
                                        {displayTitle}
                                    </span>
                                    {expanded && (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setVisible(false); dismissNotification(); setCustomNotification(null); try { (window as any).nativeBridge?.hapticFeedback?.("light"); } catch {} }}
                                            className="p-1 px-3 -mr-1 bg-zinc-100 hover:bg-zinc-200 rounded-full text-zinc-500 hover:text-zinc-900 transition-all text-[10px] font-black uppercase tracking-wider"
                                        >
                                            Dismiss
                                        </button>
                                    )}
                                </div>
                                <span className={`font-medium tracking-tight ${expanded ? "text-zinc-600 text-[15px] mt-1.5 leading-snug pr-2" : "text-zinc-900 text-[13px] font-bold line-clamp-1"}`}>
                                    {displayText}
                                </span>
                            </motion.div>
                            
                            {!expanded && (
                                <div className="ml-1 opacity-30">
                                    <ChevronRight className="h-4 w-4 text-zinc-400" strokeWidth={3} />
                                </div>
                            )}
                        </motion.div>

                        {/* Interactive Buttons for Expanded State */}
                        <AnimatePresence>
                            {expanded && (
                                <motion.div 
                                    initial={{ opacity: 0, scale: 0.9, y: 15 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    transition={{ delay: 0.1, type: "spring", stiffness: 450, damping: 28 }}
                                    className="mt-6 flex flex-col gap-3"
                                >
                                    <button
                                        onClick={isNegotiation ? handleAcceptOffer : handlePillClick}
                                        className="w-full h-14 rounded-[22px] bg-indigo-600 text-white text-[15px] font-black transition-all active:scale-[0.97] hover:bg-indigo-700 flex items-center justify-center gap-2.5 shadow-xl shadow-indigo-100 border border-indigo-500/10"
                                    >
                                        {isNegotiation ? (isSellerAction ? <CheckCircle className="h-5 w-5" /> : <ShoppingCart className="h-5 w-5" />) : <ArrowUpRight className="h-5 w-5" />}
                                        {isNegotiation 
                                            ? (isSellerAction ? `Accept ₦${(currentNegotiation as any)?.proposedPrice?.toLocaleString() || 'Offer'}` : "Accept & Checkout") 
                                            : "View Details"}
                                    </button>
                                    
                                    <button
                                        onClick={isNegotiation ? handleRenegotiate : handlePillClick}
                                        className="w-full h-14 rounded-[22px] bg-zinc-100 hover:bg-zinc-200 text-zinc-900 text-[15px] font-bold transition-all active:scale-[0.97] flex items-center justify-center gap-2.5 border border-zinc-200"
                                    >
                                        {isNegotiation ? <MessageSquare className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
                                        {isNegotiation 
                                            ? (isSellerAction ? "Reply / Counter" : "Reply with Counter") 
                                            : "Open Chat"}
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        );
}
