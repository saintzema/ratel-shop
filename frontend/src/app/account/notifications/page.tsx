"use client";

import { useNotification, Notification as NotifType } from "@/components/ui/NotificationProvider";
import { formatDistanceToNow } from "date-fns";
import { 
    Bell, 
    Trash2, 
    ChevronRight, 
    Tag, 
    ShieldCheck, 
    Info, 
    AlertCircle, 
    CheckCircle2,
    ArrowLeft,
    Clock,
    Zap,
    MessageSquare
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export default function NotificationCenter() {
    const { notifications, clearAll } = useNotification();
    const router = useRouter();

    const getIcon = (type: string) => {
        switch (type) {
            case "ziva": return <Zap className="h-4 w-4 text-emerald-600" />;
            case "success": return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
            case "error": return <AlertCircle className="h-4 w-4 text-red-600" />;
            case "info": return <Info className="h-4 w-4 text-blue-600" />;
            case "admin": return <ShieldCheck className="h-4 w-4 text-purple-600" />;
            default: return <Bell className="h-4 w-4 text-zinc-400" />;
        }
    };

    const getBadgeStyle = (type: string) => {
        switch (type) {
            case "ziva": return "bg-emerald-50 text-emerald-700 border-emerald-100";
            case "admin": return "bg-purple-50 text-purple-700 border-purple-100";
            default: return "bg-zinc-50 text-zinc-600 border-zinc-100";
        }
    };

    return (
        <div className="min-h-screen bg-zinc-50/50 pb-20">
            {/* Header */}
            <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-zinc-100">
                <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => router.back()}
                            className="p-2 -ml-2 hover:bg-zinc-100 rounded-full transition-colors"
                        >
                            <ArrowLeft className="h-5 w-5 text-zinc-900" />
                        </button>
                        <h1 className="text-lg font-black text-zinc-900 tracking-tight">Notification Center</h1>
                    </div>
                    {notifications.length > 0 && (
                        <button 
                            onClick={clearAll}
                            className="text-xs font-bold text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-full transition-colors flex items-center gap-1.5"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                            Clear All
                        </button>
                    )}
                </div>
            </div>

            <div className="max-w-2xl mx-auto px-4 py-8">
                {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-20 h-20 bg-white rounded-3xl shadow-sm flex items-center justify-center mb-6 relative">
                            <Bell className="h-10 w-10 text-zinc-200" />
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-zinc-100 rounded-full border-4 border-zinc-50/50" />
                        </div>
                        <h2 className="text-xl font-black text-zinc-900 mb-2">All quiet for now</h2>
                        <p className="text-sm text-zinc-400 max-w-[240px]">We'll notify you when your offers are accepted or price updates occur.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <AnimatePresence mode="popLayout">
                            {notifications.map((notif, idx) => (
                                <motion.div
                                    key={notif.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="group bg-white rounded-2xl p-4 shadow-sm border border-zinc-100 hover:border-emerald-200 transition-all cursor-pointer relative overflow-hidden"
                                    onClick={() => notif.onClick?.()}
                                >
                                    {/* Glass Accent Border */}
                                    <div className="absolute top-0 left-0 w-1 h-full bg-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    
                                    <div className="flex gap-4">
                                        <div className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center border ${getBadgeStyle(notif.type)}`}>
                                            {getIcon(notif.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-1">
                                                <h3 className="text-[15px] font-black text-zinc-900 leading-tight truncate">{notif.title}</h3>
                                                <span className="text-[10px] font-bold text-zinc-400 flex items-center gap-1 shrink-0 ml-2">
                                                    <Clock className="h-3 w-3" />
                                                    {formatDistanceToNow(notif.timestamp)} ago
                                                </span>
                                            </div>
                                            <p className="text-sm text-zinc-500 font-medium leading-relaxed mb-3 line-clamp-2">
                                                {notif.message}
                                            </p>
                                            
                                            {/* Actionable Tags */}
                                            <div className="flex items-center gap-2">
                                                <div className="px-2 py-0.5 rounded-md bg-zinc-50 border border-zinc-100 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                                                    {notif.type === "ziva" ? "Marketplace" : "System"}
                                                </div>
                                                {notif.read === false && (
                                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex flex-col justify-center">
                                            <ChevronRight className="h-5 w-5 text-zinc-300 group-hover:text-emerald-500 transition-colors" />
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                        
                        <div className="pt-10 flex flex-col items-center gap-2">
                             <div className="w-1 h-1 rounded-full bg-zinc-200" />
                             <div className="w-1 h-1 rounded-full bg-zinc-200" />
                             <div className="w-1 h-1 rounded-full bg-zinc-200" />
                             <span className="text-[10px] font-black text-zinc-300 uppercase tracking-widest mt-2">End of updates</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
