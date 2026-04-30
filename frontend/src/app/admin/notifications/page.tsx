"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
    Bell, 
    Send, 
    CheckCircle2, 
    Clock, 
    Smartphone, 
    Edit3, 
    Save, 
    Search, 
    Zap, 
    TrendingUp, 
    Tag, 
    X, 
    ChevronRight, 
    MessageSquare,
    Image as ImageIcon,
    Sparkles,
    MousePointer2,
    Target,
    MessageCircle,
    Layout
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { DataSyncService } from "@/lib/sync-store";
import { cn, getProxiedImageUrl } from "@/lib/utils";
import { Product } from "@/lib/types";

interface NotificationTemplate {
    id: string;
    title: string;
    body: string;
    time: string;
    type: "morning" | "afternoon" | "evening" | "weekend";
}

const DEFAULT_TEMPLATES: NotificationTemplate[] = [
    { id: "morning_alert", title: "Morning Deals 🌅", body: "Wake up to fresh discounts! Tap to see what's on sale today.", time: "07:45 AM", type: "morning" },
    { id: "midday_alert", title: "Lunchtime Check-in 🍽️", body: "Taking a break? Browse our trending items right now.", time: "12:30 PM", type: "afternoon" },
    { id: "evening_alert", title: "Evening Wind Down 🌙", body: "Relax and shop. Grab your favorites before they sell out!", time: "06:00 PM", type: "evening" },
    { id: "weekend_alert", title: "Weekend Special 🎉", body: "Happy Weekend! Extra 10% off selected categories.", time: "Saturday 10:00 AM", type: "weekend" }
];

export default function AdminPushNotifications() {
    const { user, isMounted } = useAuth() as any;
    const router = useRouter();

    // Broadcast State
    const [broadcastTitle, setBroadcastTitle] = useState("");
    const [broadcastBody, setBroadcastBody] = useState("");
    const [broadcastLink, setBroadcastLink] = useState("/");
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [isBroadcasting, setIsBroadcasting] = useState(false);
    const [broadcastSuccess, setBroadcastSuccess] = useState(false);
    const [showProductSearch, setShowProductSearch] = useState(false);
    const [productSearchQuery, setProductSearchQuery] = useState("");

    // Tabs
    const [activeTab, setActiveTab] = useState<"push" | "whatsapp">("push");
    const [isWhatsAppBroadcasting, setIsWhatsAppBroadcasting] = useState(false);
    const [whatsappSuccess, setWhatsappSuccess] = useState(false);

    // Automation Templates State
    const [templates, setTemplates] = useState<NotificationTemplate[]>(DEFAULT_TEMPLATES);
    const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<NotificationTemplate>>({});

    const allProducts = useMemo(() => DataSyncService.getProducts({ includeInactiveSellers: true }), []);
    
    const filteredProducts = useMemo(() => {
        if (!productSearchQuery.trim()) return allProducts.slice(0, 5);
        return allProducts.filter(p => 
            p.name.toLowerCase().includes(productSearchQuery.toLowerCase())
        ).slice(0, 10);
    }, [allProducts, productSearchQuery]);

    useEffect(() => {
        if (!isMounted) return;
        if (!user || user.role !== "admin") {
            router.push("/");
            return;
        }

        const saved = localStorage.getItem("fp_admin_notification_templates");
        if (saved) {
            try {
                setTemplates(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to parse templates", e);
            }
        }
    }, [user, isMounted, router]);

    const handleMassBroadcast = () => {
        if (!broadcastTitle.trim() || !broadcastBody.trim()) return;
        
        setIsBroadcasting(true);
        
        setTimeout(() => {
            // 1. Get all unique users & sellers to populate their history
            const allUsers = DataSyncService.getAllUsers();
            const allSellers = DataSyncService.getSellers();
            
            const targetIds = new Set<string>();
            allUsers.forEach(u => targetIds.add(u.id));
            allSellers.forEach(s => targetIds.add(s.id));
            
            // 2. Add to notification history for everyone
            targetIds.forEach(userId => {
                DataSyncService.addNotification({
                    userId,
                    type: "system",
                    message: broadcastBody,
                    link: broadcastLink,
                    imageUrl: selectedProduct?.image_url
                });
            });

            // 3. Dispatch a global event for immediate feedback to online users
            const event = new CustomEvent("fp-admin-broadcast", {
                detail: { 
                    title: broadcastTitle, 
                    body: broadcastBody, 
                    link: broadcastLink,
                    imageUrl: selectedProduct?.image_url,
                    productId: selectedProduct?.id
                }
            });
            window.dispatchEvent(event);

            setIsBroadcasting(false);
            setBroadcastSuccess(true);
            setBroadcastTitle("");
            setBroadcastBody("");
            setSelectedProduct(null);
            
            setTimeout(() => setBroadcastSuccess(false), 3000);
        }, 1200);
    };

    const handleSaveTemplate = (id: string) => {
        const updated = templates.map(t => t.id === id ? { ...t, ...editForm } : t);
        setTemplates(updated);
        localStorage.setItem("fp_admin_notification_templates", JSON.stringify(updated));
        setEditingTemplateId(null);
        window.dispatchEvent(new Event("fp-templates-updated"));
    };

    const handleWhatsAppBroadcast = async () => {
        if (!broadcastBody.trim() && !selectedProduct) return;
        
        setIsWhatsAppBroadcasting(true);
        try {
            const res = await fetch("/api/admin/whatsapp-broadcast", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    product: selectedProduct,
                    message: broadcastBody,
                    targetUsers: "all"
                })
            });
            const data = await res.json();
            if (data.success) {
                setWhatsappSuccess(true);
                setBroadcastTitle("");
                setBroadcastBody("");
                setSelectedProduct(null);
                setTimeout(() => setWhatsappSuccess(false), 3000);
            }
        } catch (e) {
            console.error("WhatsApp Broadcast Error:", e);
        } finally {
            setIsWhatsAppBroadcasting(false);
        }
    };

    const applyTemplate = (title: string, body: string, link: string = "/") => {
        setBroadcastTitle(title);
        setBroadcastBody(body);
        setBroadcastLink(link);
    };

    if (!isMounted || !user || user.role !== "admin") return null;

    return (
        <div className="space-y-8 pb-20 max-w-6xl mx-auto px-4 md:px-0">
            {/* Header Section */}
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-[40px] p-10 bg-black text-white shadow-2xl"
            >
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-600/20 blur-[100px] -mr-40 -mt-40 rounded-full" />
                <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-purple-600/10 blur-[80px] -ml-20 -mb-20 rounded-full" />
                
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">Live Control Center</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-none">Global Broadcast</h1>
                        <p className="text-gray-400 mt-4 max-w-xl text-lg font-medium leading-relaxed">
                            Send massive push notifications to all users simultaneously. Remind them of price drops, flash sales, or hot trending items.
                        </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        <div className="text-right">
                            <p className="text-3xl font-black text-white">{DataSyncService.getAllUsers().length + DataSyncService.getSellers().length}</p>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Active Reach</p>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Tab Navigation */}
            <div className="flex items-center gap-2 bg-gray-100 p-1.5 rounded-2xl w-fit">
                <button 
                    onClick={() => setActiveTab("push")}
                    className={cn(
                        "flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-sm transition-all",
                        activeTab === "push" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-400 hover:text-gray-600"
                    )}
                >
                    <Bell className="w-4 h-4" />
                    Push Alerts
                </button>
                <button 
                    onClick={() => setActiveTab("whatsapp")}
                    className={cn(
                        "flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-sm transition-all",
                        activeTab === "whatsapp" ? "bg-emerald-500 text-white shadow-lg shadow-emerald-200" : "text-gray-400 hover:text-gray-600"
                    )}
                >
                    <MessageCircle className="w-4 h-4" />
                    WhatsApp Broadcast
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Main Configuration Panel */}
                <div className="lg:col-span-7 space-y-8">
                    <section className="backdrop-blur-3xl bg-white/70 border border-white/20 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] rounded-[32px] p-8">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                                <Zap className="w-6 h-6 fill-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-gray-900 tracking-tight">Notification Builder</h2>
                                <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Design your mass alert</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            {/* Title & Body */}
                            <div className="grid gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-[0.1em] text-gray-400 pl-1">Alert Title</label>
                                    <Input 
                                        placeholder="e.g. Flash Sale Alert! ⚡" 
                                        value={broadcastTitle}
                                        onChange={(e) => setBroadcastTitle(e.target.value)}
                                        className="h-14 rounded-2xl border-gray-100 bg-gray-50/50 focus:bg-white transition-all text-lg font-bold px-6"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-[0.1em] text-gray-400 pl-1">Message Content</label>
                                    <textarea 
                                        placeholder="Enter your message..." 
                                        value={broadcastBody}
                                        onChange={(e) => setBroadcastBody(e.target.value)}
                                        rows={3}
                                        className="w-full rounded-2xl border border-gray-100 bg-gray-50/50 focus:bg-white px-6 py-4 text-base font-medium focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all resize-none"
                                    />
                                </div>
                            </div>

                            {/* Product & Link Selection */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2 relative">
                                    <label className="text-xs font-black uppercase tracking-[0.1em] text-gray-400 pl-1">Attach Product</label>
                                    <div 
                                        onClick={() => setShowProductSearch(!showProductSearch)}
                                        className="h-14 rounded-2xl border border-gray-100 bg-gray-50/50 flex items-center px-4 cursor-pointer hover:border-indigo-300 transition-all group"
                                    >
                                        {selectedProduct ? (
                                            <div className="flex items-center gap-3 w-full">
                                                <img src={getProxiedImageUrl(selectedProduct.image_url)} alt="" className="w-8 h-8 rounded-lg object-contain bg-white" />
                                                <span className="text-sm font-bold text-gray-900 truncate flex-1">{selectedProduct.name}</span>
                                                <X className="h-4 w-4 text-gray-400 hover:text-rose-500" onClick={(e) => { e.stopPropagation(); setSelectedProduct(null); }} />
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-3 text-gray-400">
                                                <Search className="w-5 h-5" />
                                                <span className="text-sm font-bold">Pick a target product...</span>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <AnimatePresence>
                                        {showProductSearch && (
                                            <motion.div 
                                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                className="absolute top-full left-0 right-0 mt-2 z-50 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
                                            >
                                                <div className="p-3 border-b border-gray-50">
                                                    <Input 
                                                        autoFocus
                                                        placeholder="Search products..." 
                                                        value={productSearchQuery}
                                                        onChange={(e) => setProductSearchQuery(e.target.value)}
                                                        className="h-10 rounded-xl border-none bg-gray-50"
                                                    />
                                                </div>
                                                <div className="max-h-60 overflow-y-auto">
                                                    {filteredProducts.map(p => (
                                                        <div 
                                                            key={p.id}
                                                            onClick={() => {
                                                                setSelectedProduct(p);
                                                                setBroadcastLink(`/product/${p.id}`);
                                                                setShowProductSearch(false);
                                                            }}
                                                            className="flex items-center gap-3 p-3 hover:bg-indigo-50 cursor-pointer transition-colors"
                                                        >
                                                            <img src={getProxiedImageUrl(p.image_url)} alt="" className="w-10 h-10 rounded object-contain bg-gray-50" />
                                                            <div>
                                                                <p className="text-xs font-black text-gray-900 line-clamp-1">{p.name}</p>
                                                                <p className="text-[10px] font-bold text-gray-400">₦{p.price.toLocaleString()}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-[0.1em] text-gray-400 pl-1">Destination Link</label>
                                    <Input 
                                        placeholder="/product/iphone-15" 
                                        value={broadcastLink}
                                        onChange={(e) => setBroadcastLink(e.target.value)}
                                        className="h-14 rounded-2xl border-gray-100 bg-gray-50/50 focus:bg-white transition-all text-sm font-bold px-6"
                                    />
                                </div>
                            </div>

                            {/* Broadcast Button */}
                            <div className="pt-6">
                                {activeTab === "push" ? (
                                    <button
                                        onClick={handleMassBroadcast}
                                        disabled={isBroadcasting || !broadcastTitle.trim() || !broadcastBody.trim()}
                                        className="w-full relative group overflow-hidden rounded-[24px] h-16 px-8 font-black text-white transition-all active:scale-[0.98] disabled:opacity-50 disabled:scale-100"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 group-hover:scale-110 transition-transform duration-700" />
                                        <div className="relative flex items-center justify-center gap-3 text-lg tracking-tight">
                                            {isBroadcasting ? (
                                                <div className="h-6 w-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                                            ) : broadcastSuccess ? (
                                                <>
                                                    <CheckCircle2 className="w-6 h-6 text-emerald-300" />
                                                    Sent to All Devices!
                                                </>
                                            ) : (
                                                <>
                                                    <Sparkles className="w-6 h-6 text-yellow-300 fill-yellow-300" />
                                                    Dispatch Mass Broadcast
                                                </>
                                            )}
                                        </div>
                                    </button>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <button
                                            onClick={handleWhatsAppBroadcast}
                                            disabled={isWhatsAppBroadcasting || (!broadcastBody.trim() && !selectedProduct)}
                                            className="w-full relative group overflow-hidden rounded-[24px] h-16 px-8 font-black text-white transition-all active:scale-[0.98] disabled:opacity-50 disabled:scale-100"
                                        >
                                            <div className="absolute inset-0 bg-emerald-600 group-hover:scale-110 transition-transform duration-700" />
                                            <div className="relative flex items-center justify-center gap-3 text-lg tracking-tight">
                                                {isWhatsAppBroadcasting ? (
                                                    <div className="h-6 w-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                                                ) : whatsappSuccess ? (
                                                    <>
                                                        <CheckCircle2 className="w-6 h-6 text-emerald-300" />
                                                        WhatsApp Messages Sent!
                                                    </>
                                                ) : (
                                                    <>
                                                        <MessageCircle className="w-6 h-6 text-white" />
                                                        Send WhatsApp Broadcast
                                                    </>
                                                )}
                                            </div>
                                        </button>

                                        <button
                                            onClick={async () => {
                                                setIsWhatsAppBroadcasting(true);
                                                try {
                                                    const res = await fetch("/api/admin/whatsapp-broadcast", {
                                                        method: "POST",
                                                        headers: { "Content-Type": "application/json" },
                                                        body: JSON.stringify({ isTest: true })
                                                    });
                                                    const data = await res.json();
                                                    if (data.success) {
                                                        setWhatsappSuccess(true);
                                                        setTimeout(() => setWhatsappSuccess(false), 3000);
                                                    }
                                                } catch (e) {
                                                    console.error(e);
                                                } finally {
                                                    setIsWhatsAppBroadcasting(false);
                                                }
                                            }}
                                            className="w-full h-16 rounded-[24px] border-2 border-emerald-500 text-emerald-600 font-black hover:bg-emerald-50 transition-all active:scale-95 flex items-center justify-center gap-2"
                                        >
                                            <Sparkles className="w-5 h-5" />
                                            Send Connection Test
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>

                    {/* Quick Trigger Templates */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[
                            { 
                                icon: Target, 
                                label: "Price Drop", 
                                color: "bg-emerald-100 text-emerald-600",
                                onClick: () => applyTemplate("Price Drop Alert! 📉", `The item you were looking at just dropped in price. Grab it now before it's gone!`, selectedProduct ? `/product/${selectedProduct.id}` : "/")
                            },
                            { 
                                icon: TrendingUp, 
                                label: "Selling Out", 
                                color: "bg-orange-100 text-orange-600",
                                onClick: () => applyTemplate("Selling Out Fast! 🔥", `Hurry! Demand for this item is extremely high right now. Only a few left in stock.`, selectedProduct ? `/product/${selectedProduct.id}` : "/")
                            },
                            { 
                                icon: Tag, 
                                label: "Daily Deal", 
                                color: "bg-blue-100 text-blue-600",
                                onClick: () => applyTemplate("Flash Deal: 40% OFF! ⚡", `Today's biggest savings are here. Tap to unlock your exclusive discount.`, "/")
                            }
                        ].map((t, i) => (
                            <button 
                                key={i}
                                onClick={t.onClick}
                                className="flex flex-col items-center justify-center p-6 bg-white border border-gray-100 rounded-[28px] hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/5 transition-all group"
                            >
                                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform", t.color)}>
                                    <t.icon className="w-6 h-6" />
                                </div>
                                <span className="text-sm font-black text-gray-900">{t.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Live Preview Panel (iPhone Style) */}
                <div className="lg:col-span-5">
                    <div className="sticky top-24">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center text-white">
                                <Smartphone className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-gray-900 tracking-tight">Live Preview</h3>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Apple Liquid Glass 2026</p>
                            </div>
                        </div>

                        {/* Phone Mockup */}
                        <div className="relative w-full max-w-[340px] mx-auto aspect-[9/18.5] bg-[#0c0c0c] rounded-[55px] p-4 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] border-[8px] border-[#1a1a1a]">
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120px] h-7 bg-black rounded-b-[20px] z-20" /> {/* Dynamic Island */}
                            
                            <div className="relative w-full h-full rounded-[42px] overflow-hidden bg-gradient-to-b from-[#1a1a1a] to-[#050505] flex flex-col items-center pt-24 px-4">
                                {/* Simulated Wallpaper */}
                                <div className="absolute inset-0 bg-gradient-to-tr from-indigo-900/40 via-transparent to-pink-900/20 opacity-40 blur-3xl" />
                                
                                <div className="relative z-10 w-full">
                                    <p className="text-white/60 text-sm font-medium mb-1 pl-4">Notification Center</p>
                                    
                                    {/* Preview Notification Pill */}
                                    <motion.div 
                                        initial={{ y: -20, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        key={activeTab}
                                        className={cn(
                                            "w-full backdrop-blur-2xl p-5 shadow-2xl border",
                                            activeTab === "push" 
                                                ? "bg-white/95 rounded-[32px] border-white/20" 
                                                : "bg-[#e5ddd5] rounded-3xl border-emerald-900/10"
                                        )}
                                    >
                                        {activeTab === "push" ? (
                                            <div className="flex items-center gap-4">
                                                {selectedProduct ? (
                                                    <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center p-2 border border-gray-100">
                                                        <img src={getProxiedImageUrl(selectedProduct.image_url)} alt="" className="w-full h-full object-contain" />
                                                    </div>
                                                ) : (
                                                    <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                                        <Bell className="w-7 h-7 text-white fill-white/20" />
                                                    </div>
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <span className="text-[11px] font-black uppercase tracking-[0.1em] text-emerald-600">FairPrice.ng</span>
                                                        <span className="text-[10px] text-gray-400 font-bold">now</span>
                                                    </div>
                                                    <p className="text-gray-900 text-[15px] font-black truncate leading-tight">
                                                        {broadcastTitle || "Your Alert Title Here"}
                                                    </p>
                                                    <p className="text-gray-600 text-[13px] font-medium line-clamp-2 mt-0.5 leading-snug">
                                                        {broadcastBody || "Type your message in the builder to see it previewed here in real-time."}
                                                    </p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white">
                                                        <MessageCircle className="w-4 h-4" />
                                                    </div>
                                                    <span className="text-xs font-black text-gray-700">FairPrice Official</span>
                                                </div>
                                                
                                                <div className="bg-white rounded-2xl rounded-tl-none p-3 shadow-sm border border-emerald-100 relative max-w-[90%]">
                                                    {selectedProduct && (
                                                        <div className="mb-2 rounded-lg overflow-hidden bg-gray-50 border border-gray-100 aspect-video">
                                                            <img src={getProxiedImageUrl(selectedProduct.image_url)} alt="" className="w-full h-full object-contain" />
                                                        </div>
                                                    )}
                                                    <p className="text-[13px] font-medium text-gray-800 whitespace-pre-wrap leading-relaxed">
                                                        {broadcastBody || "Hello! Check out this special offer from FairPrice.ng..."}
                                                    </p>
                                                    <div className="flex justify-end mt-1">
                                                        <span className="text-[10px] text-gray-400">09:41 AM</span>
                                                    </div>
                                                </div>

                                                {selectedProduct && (
                                                    <div className="w-full bg-white rounded-xl border border-gray-100 py-2.5 text-center text-blue-600 font-black text-xs uppercase tracking-widest shadow-sm">
                                                        Buy Now
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        
                                        {activeTab === "push" && (
                                            <div className="mt-4 pt-4 border-t border-gray-100 flex gap-2">
                                                <div className="h-10 flex-1 bg-indigo-600 rounded-2xl flex items-center justify-center text-white text-[11px] font-black uppercase tracking-widest">
                                                    View Product
                                                </div>
                                                <div className="h-10 w-10 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-400">
                                                    <X className="w-4 h-4" />
                                                </div>
                                            </div>
                                        )}
                                    </motion.div>
                                </div>
                                
                                <div className="mt-auto mb-4 w-32 h-1 bg-white/20 rounded-full" />
                            </div>
                        </div>

                        <div className="mt-8 bg-indigo-50 border border-indigo-100 rounded-[28px] p-6">
                            <div className="flex items-center gap-3 mb-3">
                                <Sparkles className="w-5 h-5 text-indigo-500" />
                                <h4 className="font-black text-indigo-900">Broadcast Protocol</h4>
                            </div>
                            <p className="text-sm font-medium text-indigo-700/80 leading-relaxed">
                                This will send a system-wide push event to all active sessions. Ensure your copy is compliant and engaging to maximize click-through rates.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Template Management (Glass) */}
            <section className="backdrop-blur-3xl bg-white/70 border border-white/20 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] rounded-[32px] p-10 mt-12">
                <div className="flex items-center justify-between mb-10">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-lg shadow-emerald-50">
                            <Clock className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Automated Schedules</h2>
                            <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Recurring System Alerts</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {templates.map(template => {
                        const isEditing = editingTemplateId === template.id;
                        return (
                            <motion.div 
                                key={template.id} 
                                layout
                                className="group relative overflow-hidden bg-gray-50/50 rounded-[28px] p-6 border border-transparent hover:border-emerald-200 hover:bg-white transition-all"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black bg-white shadow-sm text-emerald-600 px-3 py-1.5 rounded-full uppercase tracking-widest border border-emerald-50">
                                            {template.time}
                                        </span>
                                    </div>
                                    <button 
                                        onClick={() => {
                                            if (isEditing) handleSaveTemplate(template.id);
                                            else {
                                                setEditingTemplateId(template.id);
                                                setEditForm({ title: template.title, body: template.body });
                                            }
                                        }}
                                        className={cn(
                                            "h-10 px-4 rounded-xl font-bold text-xs flex items-center gap-2 transition-all",
                                            isEditing ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200" : "bg-white text-gray-400 hover:text-emerald-600 border border-gray-100"
                                        )}
                                    >
                                        {isEditing ? <><Save className="w-3.5 h-3.5" /> Save Changes</> : <><Edit3 className="w-3.5 h-3.5" /> Edit Template</>}
                                    </button>
                                </div>
                                
                                <div className="space-y-4">
                                    {isEditing ? (
                                        <div className="space-y-3">
                                            <Input 
                                                value={editForm.title} 
                                                onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                                                className="h-12 text-base font-black border-emerald-100 focus:bg-white rounded-xl"
                                            />
                                            <textarea 
                                                value={editForm.body}
                                                onChange={(e) => setEditForm(prev => ({ ...prev, body: e.target.value }))}
                                                rows={3}
                                                className="w-full rounded-xl border border-emerald-100 bg-white px-4 py-3 text-sm font-medium focus:ring-4 focus:ring-emerald-500/5 outline-none resize-none"
                                            />
                                        </div>
                                    ) : (
                                        <div className="relative z-10">
                                            <h4 className="font-black text-gray-900 text-lg mb-2">{template.title}</h4>
                                            <p className="text-gray-500 font-medium leading-relaxed">{template.body}</p>
                                        </div>
                                    )}
                                </div>
                                
                                {/* Background Decorative Elements */}
                                <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-emerald-500/5 rounded-full group-hover:scale-150 transition-transform duration-700" />
                            </motion.div>
                        );
                    })}
                </div>
            </section>
        </div>
    );
}
