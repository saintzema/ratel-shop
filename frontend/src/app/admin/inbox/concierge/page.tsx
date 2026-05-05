"use client";

import { useState, useEffect } from "react";
import { 
    ChevronLeft, 
    MessageSquare, 
    Trash2, 
    Search, 
    Calendar, 
    AlertCircle,
    CheckCircle2,
    Clock,
    User,
    Package,
    ArrowRight
} from "lucide-react";
import Link from "next/link";
import { DataSyncService } from "@/lib/sync-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, formatDateExact } from "@/lib/utils";

export default function AdminConciergeChatsPage() {
    const [ordersWithChats, setOrdersWithChats] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [showCleanupModal, setShowCleanupModal] = useState(false);
    const [cleanupDays, setCleanupDays] = useState(30);
    const [isCleaning, setIsCleaning] = useState(false);
    const [cleanupResult, setCleanupResult] = useState<any>(null);

    const loadData = () => {
        const chats = DataSyncService.getConciergeChats();
        // Sort by last message timestamp (most recent first)
        chats.sort((a, b) => {
            const lastA = (a.chat_messages?.[a.chat_messages?.length - 1])?.timestamp || a.created_at;
            const lastB = (b.chat_messages?.[b.chat_messages?.length - 1])?.timestamp || b.created_at;
            return new Date(lastB).getTime() - new Date(lastA).getTime();
        });
        setOrdersWithChats(chats);
    };

    useEffect(() => {
        loadData();
        window.addEventListener("sync-store-update", loadData);
        return () => window.removeEventListener("sync-store-update", loadData);
    }, []);

    const handleClearChat = (orderId: string) => {
        if (confirm("Are you sure you want to delete all chat history for this order? This cannot be undone.")) {
            DataSyncService.clearOrderChat(orderId);
            loadData();
        }
    };

    const handleBulkCleanup = () => {
        setIsCleaning(true);
        setTimeout(() => {
            const result = DataSyncService.bulkCleanupChats({ daysOld: cleanupDays });
            setCleanupResult(result);
            setIsCleaning(false);
            loadData();
        }, 1500);
    };

    const filteredOrders = ordersWithChats.filter(o => 
        o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.product?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="max-w-6xl mx-auto pb-24">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div>
                    <Link href="/admin/inbox" className="inline-flex items-center text-xs font-bold text-gray-400 hover:text-indigo-600 uppercase tracking-widest transition-colors mb-2">
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Back to Inbox
                    </Link>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                        Concierge Chat Manager
                        <Badge className="bg-indigo-100 text-indigo-700 border-none font-black px-3">ZIVA</Badge>
                    </h1>
                    <p className="text-sm text-gray-500 font-medium mt-1">
                        Monitor and manage Ziva concierge interactions across all orders.
                    </p>
                </div>
                <Button 
                    onClick={() => setShowCleanupModal(true)}
                    className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-black rounded-2xl h-12 px-6 shadow-sm gap-2 transition-all active:scale-95"
                >
                    <Trash2 className="w-4 h-4" />
                    Bulk Cleanup
                </Button>
            </div>

            {/* Stats & Search */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white p-6 rounded-[28px] border border-gray-100 shadow-sm">
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Active Chats</div>
                    <div className="text-3xl font-black text-gray-900">{ordersWithChats.length}</div>
                </div>
                <div className="md:col-span-3 bg-white p-3 rounded-[28px] border border-gray-100 shadow-sm flex items-center">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input 
                            type="text"
                            placeholder="Search by Order ID, Customer, or Product..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-transparent border-none focus:ring-0 text-sm font-medium placeholder:text-gray-400"
                        />
                    </div>
                </div>
            </div>

            {/* Chat List */}
            <div className="space-y-4">
                {filteredOrders.length === 0 ? (
                    <div className="bg-white rounded-[32px] border border-dashed border-gray-200 p-20 text-center">
                        <div className="h-20 w-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <MessageSquare className="h-10 w-10 text-gray-300" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900">No chats found</h3>
                        <p className="text-gray-500 mt-2">Try adjusting your search or check back later.</p>
                    </div>
                ) : (
                    filteredOrders.map((order) => (
                        <div key={order.id} className="bg-white rounded-[32px] border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden group">
                            <div className="p-6 md:p-8 flex flex-col md:flex-row gap-6">
                                {/* Order Info */}
                                <div className="md:w-1/3 space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center shrink-0">
                                            <Package className="h-6 w-6 text-indigo-600" />
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Order ID</div>
                                            <div className="text-sm font-black text-gray-900">#{order.id.split('_')[1]?.substring(0, 8) || order.id.substring(0, 8)}</div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-3">
                                        <div className="h-12 w-12 rounded-2xl bg-emerald-50 flex items-center justify-center shrink-0">
                                            <User className="h-6 w-6 text-emerald-600" />
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Customer</div>
                                            <div className="text-sm font-black text-gray-900">{order.customer_name}</div>
                                        </div>
                                    </div>

                                    <div className="pt-2">
                                        <Badge className={cn(
                                            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                                            order.status === 'delivered' ? "bg-emerald-100 text-emerald-700" :
                                            order.status === 'pending' ? "bg-amber-100 text-amber-700" :
                                            "bg-indigo-100 text-indigo-700"
                                        )}>
                                            {order.status}
                                        </Badge>
                                    </div>
                                </div>

                                {/* Chat Preview */}
                                <div className="md:w-2/3 flex flex-col justify-between">
                                    <div className="bg-gray-50/50 rounded-2xl p-5 border border-gray-100">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Recent Activity</div>
                                            <div className="text-[10px] font-bold text-gray-400">{(order.chat_messages || []).length} messages total</div>
                                        </div>
                                        
                                        <div className="space-y-3">
                                            {(order.chat_messages || []).slice(-2).map((msg: any, i: number) => (
                                                <div key={i} className="flex gap-3">
                                                    <div className={cn(
                                                        "h-6 w-6 rounded-full flex items-center justify-center text-[8px] font-black shrink-0",
                                                        msg.sender === 'ziva' ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-600"
                                                    )}>
                                                        {msg.sender === 'ziva' ? 'Z' : 'U'}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs text-gray-700 line-clamp-1 italic font-medium leading-relaxed">
                                                            "{msg.text.replace(/\*\*/g, "")}"
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="mt-6 flex items-center justify-between gap-4">
                                        <Link href={`/admin/orders/${order.id}`}>
                                            <Button variant="ghost" className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 font-bold gap-2 rounded-xl">
                                                View Order Details <ArrowRight className="w-4 h-4" />
                                            </Button>
                                        </Link>
                                        <Button 
                                            onClick={() => handleClearChat(order.id)}
                                            variant="ghost" 
                                            className="text-red-500 hover:text-red-600 hover:bg-red-50 font-bold gap-2 rounded-xl"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            Clear Chat History
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Cleanup Modal */}
            {showCleanupModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 animate-in fade-in zoom-in duration-300">
                        <div className="p-8 pb-0 flex items-center justify-between">
                            <div className="h-14 w-14 rounded-2xl bg-red-50 flex items-center justify-center">
                                <Trash2 className="h-7 w-7 text-red-500" />
                            </div>
                            <Button variant="ghost" onClick={() => { setShowCleanupModal(false); setCleanupResult(null); }} className="h-10 w-10 p-0 rounded-full">
                                <AlertCircle className="h-6 w-6 text-gray-300" />
                            </Button>
                        </div>
                        
                        <div className="p-8 pt-6">
                            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Bulk Cleanup</h2>
                            <p className="text-gray-500 font-medium mt-2">
                                Remove older chat histories to save space and maintain performance.
                            </p>

                            {!cleanupResult ? (
                                <div className="mt-8 space-y-6">
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Delete chats older than</label>
                                            <span className="text-sm font-black text-indigo-600">{cleanupDays} Days</span>
                                        </div>
                                        <input 
                                            type="range" 
                                            min="1" 
                                            max="90" 
                                            value={cleanupDays}
                                            onChange={(e) => setCleanupDays(parseInt(e.target.value))}
                                            className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                        />
                                        <div className="flex justify-between text-[10px] font-bold text-gray-300 uppercase tracking-widest px-1">
                                            <span>1 Day</span>
                                            <span>3 Months</span>
                                        </div>
                                    </div>

                                    <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100 flex gap-3">
                                        <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                                        <p className="text-xs text-amber-700 font-bold leading-relaxed">
                                            This will permanently delete message history for both Order Concierge chats and Direct Messages older than {cleanupDays} days.
                                        </p>
                                    </div>

                                    <Button 
                                        onClick={handleBulkCleanup}
                                        disabled={isCleaning}
                                        className="w-full bg-red-600 hover:bg-red-700 text-white font-black rounded-2xl h-14 shadow-lg shadow-red-600/20 gap-2 transition-all active:scale-[0.98]"
                                    >
                                        {isCleaning ? (
                                            <>
                                                <Clock className="w-5 h-5 animate-spin" />
                                                Processing Cleanup...
                                            </>
                                        ) : (
                                            <>
                                                <Trash2 className="w-5 h-5" />
                                                Execute Bulk Cleanup
                                            </>
                                        )}
                                    </Button>
                                </div>
                            ) : (
                                <div className="mt-8 text-center animate-in fade-in slide-in-from-bottom-4">
                                    <div className="h-20 w-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900">Cleanup Successful!</h3>
                                    <p className="text-gray-500 mt-2 mb-8">
                                        Cleared {cleanupResult.ordersCleared} order chats and {cleanupResult.convsCleared} conversations.
                                    </p>
                                    <Button 
                                        onClick={() => { setShowCleanupModal(false); setCleanupResult(null); }}
                                        className="w-full bg-gray-900 hover:bg-black text-white font-black rounded-2xl h-14"
                                    >
                                        Done
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
