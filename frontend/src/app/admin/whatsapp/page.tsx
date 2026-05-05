"use client";

import { useState, useEffect } from "react";
import { 
    MessageSquare, 
    RefreshCcw, 
    Search, 
    User, 
    Clock, 
    Send, 
    Inbox,
    ShieldCheck,
    AlertCircle,
    Bot
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, formatPrice } from "@/lib/utils";

interface Interaction {
    id: string;
    phoneNumber: string;
    customerName: string | null;
    messageText: string;
    direction: "inbound" | "outbound";
    type: string; // interaction, command, negotiation, system
    metadata: any;
    createdAt: string;
}

export default function AdminWhatsAppLogs() {
    const [interactions, setInteractions] = useState<Interaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState("");
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

    const fetchInteractions = async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/admin/whatsapp/interactions");
            if (res.ok) {
                const data = await res.json();
                setInteractions(data);
                setLastUpdated(new Date());
            }
        } catch (error) {
            console.error("Failed to fetch interactions:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchInteractions();
        const interval = setInterval(fetchInteractions, 10000); // Polling every 10s for "real-time" feel
        return () => clearInterval(interval);
    }, []);

    const filteredInteractions = interactions.filter(i => 
        i.phoneNumber.includes(filter) || 
        i.messageText.toLowerCase().includes(filter.toLowerCase()) ||
        (i.customerName && i.customerName.toLowerCase().includes(filter.toLowerCase()))
    );

    return (
        <div className="max-w-7xl mx-auto p-6 space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                        <div className="h-10 w-10 bg-green-500 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/20">
                            <MessageSquare className="text-white h-6 w-6" />
                        </div>
                        WhatsApp Live Monitor
                    </h1>
                    <p className="text-gray-500 font-medium mt-1">
                        Real-time feed of all customer-bot interactions and automated negotiations.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-right hidden md:block">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Last Sync</p>
                        <p className="text-xs font-bold text-gray-600">{lastUpdated.toLocaleTimeString()}</p>
                    </div>
                    <Button 
                        onClick={fetchInteractions} 
                        variant="outline" 
                        disabled={isLoading}
                        className="rounded-xl font-bold gap-2 border-gray-200 hover:bg-gray-50"
                    >
                        <RefreshCcw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Dashboard Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm">
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Total Logs</p>
                    <p className="text-3xl font-black text-gray-900">{interactions.length}</p>
                </div>
                <div className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm">
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Inbound</p>
                    <p className="text-3xl font-black text-green-600">{interactions.filter(i => i.direction === "inbound").length}</p>
                </div>
                <div className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm">
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Outbound</p>
                    <p className="text-3xl font-black text-blue-600">{interactions.filter(i => i.direction === "outbound").length}</p>
                </div>
                <div className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm">
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Active Users</p>
                    <p className="text-3xl font-black text-indigo-600">{new Set(interactions.map(i => i.phoneNumber)).size}</p>
                </div>
            </div>

            {/* Search & Filter */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input 
                    type="text" 
                    placeholder="Search phone number, message content, or name..." 
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-green-500/10 shadow-sm transition-all"
                />
            </div>

            {/* Logs Feed */}
            <div className="bg-white rounded-[32px] border border-gray-100 shadow-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Time</th>
                                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Customer</th>
                                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Direction</th>
                                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Message</th>
                                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Context</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredInteractions.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-3 text-gray-400">
                                            <Inbox className="h-12 w-12 opacity-20" />
                                            <p className="font-bold">No interactions found</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredInteractions.map((log) => (
                                    <tr key={log.id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2 text-gray-500 font-medium text-sm">
                                                <Clock className="h-3.5 w-3.5" />
                                                {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-black text-gray-900">{log.customerName || "Unknown Guest"}</span>
                                                <span className="text-[11px] font-bold text-gray-400">{log.phoneNumber}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {log.direction === "inbound" ? (
                                                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-50 font-bold px-3 rounded-lg gap-1.5 py-1">
                                                    <Inbox className="h-3 w-3" /> Inbound
                                                </Badge>
                                            ) : (
                                                <Badge className="bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-50 font-bold px-3 rounded-lg gap-1.5 py-1">
                                                    <Send className="h-3 w-3" /> Bot Response
                                                </Badge>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm text-gray-700 font-medium max-w-md line-clamp-2 leading-relaxed">
                                                {log.messageText}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                {log.type === "command" && (
                                                    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-100 rounded-lg font-black text-[10px] uppercase">
                                                        Command
                                                    </Badge>
                                                )}
                                                {log.type === "negotiation" && (
                                                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-100 rounded-lg font-black text-[10px] uppercase">
                                                        Negotiation
                                                    </Badge>
                                                )}
                                                {log.type === "system" && (
                                                    <Badge variant="outline" className="bg-gray-100 text-gray-600 border-gray-200 rounded-lg font-black text-[10px] uppercase">
                                                        System
                                                    </Badge>
                                                )}
                                                {log.metadata?.productId && (
                                                    <div className="h-6 w-6 rounded-md bg-gray-100 flex items-center justify-center" title={`Product ID: ${log.metadata.productId}`}>
                                                        <ShieldCheck className="h-3 w-3 text-gray-400" />
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            
            {/* Legend/Help */}
            <div className="flex items-center gap-6 p-6 bg-indigo-50/50 rounded-[24px] border border-indigo-100/50">
                <div className="h-10 w-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 shrink-0">
                    <AlertCircle className="h-5 w-5" />
                </div>
                <div>
                    <p className="text-sm font-black text-indigo-900">Admin Guidance</p>
                    <p className="text-xs text-indigo-700 font-medium mt-0.5 leading-relaxed">
                        This dashboard monitors the <span className="font-bold">WhatsApp Business Webhook</span>. Inbound messages are customer inputs. 
                        Bot Responses are automated replies triggered by commands, icebreakers, or negotiation logic. 
                        If a user gets stuck, you can use the Inbox to manually intervene.
                    </p>
                </div>
            </div>
        </div>
    );
}
