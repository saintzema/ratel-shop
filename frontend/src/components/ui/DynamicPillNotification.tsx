"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, ShoppingCart, MessageSquare, Tag, Image as ImageIcon } from "lucide-react";
import { useMessages } from "@/context/MessageContext";
import { useCart } from "@/context/CartContext";
import { DemoStore, NegotiationRequest } from "@/lib/demo-store";
import { useRouter } from "next/navigation";

// Base64 short pop/ding sound for immediate feedback without an external asset file
const NOTIFICATION_SOUND = "data:audio/mp3;base64,//NExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq";

// Premium Apple-like glass chime notification sound — calming, rich, ~2.5s
const playDingSound = () => {
    if (typeof window === 'undefined') return;
    try {
        const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return;
        
        const audioCtx = new AudioContextClass();
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        
        const now = audioCtx.currentTime;
        
        // Premium glass chime: C6 base with warm harmonics, higher gain, longer sustain
        // Each layer has progressively lower volume and longer decay for a reverb-like tail
        const layers = [
            { freq: 1047,    gain: 0.22, decay: 2.2 },  // C6 — warm fundamental
            { freq: 1319,    gain: 0.16, decay: 1.8 },  // E6 — major third brightness
            { freq: 1568,    gain: 0.12, decay: 1.5 },  // G6 — perfect fifth fullness
            { freq: 2093,    gain: 0.07, decay: 1.2 },  // C7 — octave shimmer
            { freq: 2637,    gain: 0.04, decay: 0.9 },  // E7 — sparkle top
        ];
        
        layers.forEach(({ freq, gain: peakGain, decay }) => {
            const osc = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            
            osc.type = "sine";
            osc.frequency.setValueAtTime(freq, now);
            // Gentle pitch drift for organic feel
            osc.frequency.exponentialRampToValueAtTime(freq * 0.995, now + decay);

            gainNode.gain.setValueAtTime(0, now);
            // Quick but smooth attack (20ms)
            gainNode.gain.linearRampToValueAtTime(peakGain, now + 0.02);
            // Brief sustain plateau
            gainNode.gain.setValueAtTime(peakGain * 0.85, now + 0.15);
            // Long calming exponential decay
            gainNode.gain.exponentialRampToValueAtTime(0.0001, now + decay);

            osc.connect(gainNode);
            gainNode.connect(audioCtx.destination);

            osc.start(now);
            osc.stop(now + decay + 0.1);
        });

        // Second strike echo — subtle repeat at 180ms for depth
        setTimeout(() => {
            try {
                const echoNow = audioCtx.currentTime;
                [1047, 1568].forEach(freq => {
                    const osc = audioCtx.createOscillator();
                    const g = audioCtx.createGain();
                    osc.type = "sine";
                    osc.frequency.setValueAtTime(freq, echoNow);
                    g.gain.setValueAtTime(0, echoNow);
                    g.gain.linearRampToValueAtTime(0.06, echoNow + 0.01);
                    g.gain.exponentialRampToValueAtTime(0.0001, echoNow + 1.2);
                    osc.connect(g);
                    g.connect(audioCtx.destination);
                    osc.start(echoNow);
                    osc.stop(echoNow + 1.3);
                });
            } catch { /* ignore */ }
        }, 180);
    } catch (e) {
        console.log("Audio play blocked:", e);
    }
};

export function DynamicPillNotification() {
    const { pendingNotification, pendingConversationId, dismissNotification, openMessageBox } = useMessages();
    const { addToCart } = useCart();
    const router = useRouter();
    const [visible, setVisible] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const [customNotification, setCustomNotification] = useState<{
        text: string;
        isNegotiation: boolean;
        hasImage: boolean;
        negotiation?: { productId: string; counterPrice: number; productName: string };
        route: string;
    } | null>(null);

    // Monitor for global Seller and Buyer notifications
    useEffect(() => {
        const checkGlobalNotifications = () => {
            const sellerId = DemoStore.getCurrentSellerId();
            const currentUser = DemoStore.getCurrentUser();
            
            // ─── Seller-side: new incoming negotiation offers ───
            if (sellerId) {
                const negs = DemoStore.getNegotiations(sellerId);
                const recentNeg = negs.find((n: NegotiationRequest) => {
                    const ageMs = Date.now() - new Date((n as any).updated_at || n.created_at).getTime();
                    // FILTER: Only show if I am the seller for this specific product
                    return ageMs < 3000 && n.status !== "accepted" && n.status !== "rejected" && n.seller_id === sellerId;
                });

                if (recentNeg) {
                    const product = DemoStore.getProducts({ includeInactiveSellers: true }).find(p => p.id === recentNeg.product_id);
                    setCustomNotification({
                        text: `New negotiation offer for ${product?.name || 'Product'} at ₦${recentNeg.proposed_price.toLocaleString()}`,
                        isNegotiation: false,
                        hasImage: false,
                        route: "/seller/dashboard/messages?customer=" + (recentNeg.customer_id || "") + "&order=" + recentNeg.id
                    });
                    return;
                }
            }

            // ─── Buyer-side: seller accepted, rejected, or countered ───
            if (currentUser) {
                const buyerNegs = DemoStore.getNegotiations(undefined, currentUser.id);
                const recentBuyerNeg = buyerNegs.find((n: NegotiationRequest) => {
                    const ageMs = Date.now() - new Date((n as any).updated_at || n.created_at).getTime();
                    if (ageMs > 5000) return false;
                    // FILTER: Only show if I am the customer/buyer for this specific negotiation
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

            // FILTER: If I'm the buyer and this is my negotiation
            if (currentUser && neg.customer_id === currentUser.id) {
                const product = DemoStore.getProducts({ includeInactiveSellers: true }).find(p => p.id === neg.product_id);
                triggerBuyerNotification(neg, product);
            }
            // FILTER: If I'm the seller and this is a new offer from a customer
            else if (currentSellerId && neg.seller_id === currentSellerId && neg.status === 'pending' && !neg.counter_status) {
                const product = DemoStore.getProducts({ includeInactiveSellers: true }).find(p => p.id === neg.product_id);
                setCustomNotification({
                    text: `New negotiation offer for ${product?.name || 'Product'} at ₦${neg.proposed_price.toLocaleString()}`,
                    isNegotiation: false,
                    hasImage: false,
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
                    hasImage: false,
                    negotiation: {
                        productId: neg.product_id,
                        counterPrice: neg.counter_price,
                        productName: product?.name || "Product"
                    },
                    route: "/account/negotiations"
                });
            } else if (neg.counter_status === "rejected") {
                setCustomNotification({
                    text: `You declined the counter-offer for "${product?.name || 'Product'}".`,
                    isNegotiation: false,
                    hasImage: false,
                    route: "/account/negotiations"
                });
            } else {
                setCustomNotification({
                    text: neg.status === "accepted"
                        ? `🎉 Your offer for "${product?.name || 'Product'}" was ACCEPTED!`
                        : `Your offer for "${product?.name || 'Product'}" was declined.`,
                    isNegotiation: false,
                    hasImage: false,
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
        if (typeof window !== "undefined" && !audioRef.current) {
            audioRef.current = new Audio(NOTIFICATION_SOUND);
        }

        // Trigger on EITHER pendingNotification or customNotification
        const activeNotif = pendingNotification || customNotification;
        if (activeNotif) {
            setVisible(true);
            
            // Try playing sound
            if (audioRef.current) {
                audioRef.current.play().catch(() => {
                    playDingSound();
                });
            } else {
                playDingSound();
            }

            // If it's a negotiation, expand it slightly after a short delay
            const isNego = pendingNotification ? !!pendingNotification.negotiation : customNotification ? customNotification.isNegotiation : false;
            if (isNego) {
                setTimeout(() => setExpanded(true), 400);
            } else {
                setExpanded(false);
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
    const hasImage = pendingNotification ? !!pendingNotification.imageUrl : customNotification?.hasImage || false;
    const currentNegotiation = pendingNotification?.negotiation || customNotification?.negotiation;

    const handleAcceptOffer = (e: React.MouseEvent) => {
        e.stopPropagation();
        const neg = pendingNotification?.negotiation || customNotification?.negotiation;
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
        const neg = pendingNotification?.negotiation || customNotification?.negotiation;
        if (pendingConversationId) {
            openMessageBox(pendingConversationId);
        } else if (neg?.productId) {
            // Force open the chat using the derived orderId
            openMessageBox(`neg_${neg.productId}`);
        }
        setVisible(false);
        dismissNotification();
    };

    const handlePillClick = () => {
        if (isNegotiation && !expanded) {
            setExpanded(true);
            return;
        }

        if (!isNegotiation) {
            if (customNotification?.route) {
                router.push(customNotification.route);
            } else if (pendingConversationId) {
                openMessageBox(pendingConversationId);
            }
        }
        
        setVisible(false);
        dismissNotification();
        setCustomNotification(null);
    };

    const displayText = pendingNotification ? pendingNotification.text : customNotification?.text || "New Notification";

    return (
        <AnimatePresence>
            {visible && (
                <div className="fixed top-2 md:top-4 left-0 right-0 z-[10000] flex justify-center pointer-events-none px-4">
                    <motion.div
                        layout
                        initial={{ opacity: 0, y: -50, scale: 0.8, filter: "blur(10px)" }}
                        animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                        exit={{ opacity: 0, y: -50, scale: 0.8, filter: "blur(10px)" }}
                        transition={{ 
                            type: "spring", 
                            damping: 25, 
                            stiffness: 400, 
                            mass: 0.8 
                        }}
                        onClick={handlePillClick}
                        className={`pointer-events-auto relative overflow-hidden bg-black/90 text-white shadow-2xl backdrop-blur-3xl cursor-pointer will-change-transform ${
                            expanded && isNegotiation 
                                ? "rounded-[32px] w-full max-w-[360px] p-4" 
                                : "rounded-full p-2.5 w-auto pr-5"
                        }`}
                        style={{
                            boxShadow: "0 20px 40px -10px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.2)",
                        }}
                    >
                        {/* Compact/Collapsed View */}
                        <motion.div 
                            layout="position"
                            className={`flex items-center gap-3 ${expanded && isNegotiation ? "mb-3" : ""}`}
                        >
                            {/* Icon / Avatar */}
                            <motion.div layout="position" className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(52,211,153,0.4)]">
                                {isNegotiation ? (
                                    <Tag className="h-4 w-4 text-white" />
                                ) : hasImage ? (
                                    <ImageIcon className="h-4 w-4 text-white" />
                                ) : (
                                    <MessageCircle className="h-4 w-4 text-white fill-white/20" />
                                )}
                            </motion.div>

                            {/* Text Content */}
                            <motion.div layout="position" className="flex flex-col min-w-0 pr-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider leading-none">
                                        {isNegotiation ? "Counter Offer" : hasImage ? "Attachment" : "New Message"}
                                    </span>
                                </div>
                                <span className="text-sm font-medium text-white line-clamp-1 leading-tight mt-0.5">
                                    {displayText}
                                </span>
                            </motion.div>
                        </motion.div>

                        {/* Expanded Negotiaton View */}
                        {expanded && isNegotiation && currentNegotiation && (
                            <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.3, ease: "easeOut" }}
                                className="overflow-hidden"
                            >
                                <div className="bg-white/10 rounded-2xl p-3 mb-3 border border-white/5">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-white/70 font-medium truncate pr-3">{currentNegotiation.productName}</span>
                                        <span className="text-sm font-black text-emerald-300">₦{currentNegotiation.counterPrice.toLocaleString()}</span>
                                    </div>
                                </div>

                                <div className="flex gap-2 w-full mt-2">
                                    <button
                                        onClick={handleAcceptOffer}
                                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition-colors shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                                    >
                                        <ShoppingCart className="h-3.5 w-3.5" />
                                        Accept & Buy
                                    </button>
                                    <button
                                        onClick={handleRenegotiate}
                                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors"
                                    >
                                        <MessageSquare className="h-3.5 w-3.5" />
                                        Counter Offer
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
