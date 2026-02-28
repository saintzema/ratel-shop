"use client";

import { useState, useEffect } from "react";
import {
    Mail,
    MailOpen,
    CheckCircle2,
    Clock,
    MessageSquare,
    AlertTriangle,
    ExternalLink,
    ChevronRight,
    ShieldCheck,
    ShieldAlert,
    Zap,
    User,
    Search,
    Send,
    Link as LinkIcon,
    X
} from "lucide-react";
import { DemoStore } from "@/lib/demo-store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SupportMessage } from "@/lib/types";
import Link from "next/link";

export default function AdminInbox() {
    const [messages, setMessages] = useState<SupportMessage[]>([]);
    const [selectedMsg, setSelectedMsg] = useState<SupportMessage | null>(null);
    const [filter, setFilter] = useState<"all" | "new" | "read" | "resolved">("all");
    const [replyText, setReplyText] = useState("");
    const [replySuccess, setReplySuccess] = useState(false);

    const [showCompose, setShowCompose] = useState(false);
    const [composeTo, setComposeTo] = useState("");
    const [composeSubject, setComposeSubject] = useState("");
    const [composeMessage, setComposeMessage] = useState("");
    const [composeSuccess, setComposeSuccess] = useState(false);

    useEffect(() => {
        const load = () => setMessages(DemoStore.getSupportMessages());
        load();
        window.addEventListener("storage", load);
        return () => window.removeEventListener("storage", load);
    }, []);

    const filteredMessages = filter === "all" ? messages : messages.filter(m => m.status === filter);
    const newCount = messages.filter(m => m.status === "new").length;

    const handleMarkRead = (id: string) => {
        DemoStore.updateSupportMessageStatus(id, "read");
        setMessages(DemoStore.getSupportMessages());
        if (selectedMsg?.id === id) {
            setSelectedMsg({ ...selectedMsg, status: "read" });
        }
    };

    const handleResolve = (id: string) => {
        DemoStore.updateSupportMessageStatus(id, "resolved");
        setMessages(DemoStore.getSupportMessages());
        if (selectedMsg?.id === id) {
            setSelectedMsg({ ...selectedMsg, status: "resolved" });
        }
    };

    const handleReply = () => {
        if (!selectedMsg || !replyText.trim()) return;
        DemoStore.addSupportMessage({
            user_name: "Admin",
            user_email: "admin@globalstores.shop",
            subject: `Re: ${selectedMsg.subject}`,
            message: replyText,
            source: "dispute_admin",
            target_user_email: selectedMsg.user_email,
            target_user_id: selectedMsg.user_email,
            order_id: selectedMsg.order_id,
        });
        DemoStore.updateSupportMessageStatus(selectedMsg.id, "resolved");
        setReplyText("");
        setReplySuccess(true);
        setTimeout(() => setReplySuccess(false), 3000);
        setMessages(DemoStore.getSupportMessages());
        setSelectedMsg({ ...selectedMsg, status: "resolved" });
    };

    const handleSendCompose = () => {
        if (!composeTo.trim() || !composeSubject.trim() || !composeMessage.trim()) return;

        DemoStore.sendAdminMessageToUser(composeTo, composeSubject, composeMessage);

        setComposeSuccess(true);
        setTimeout(() => {
            setComposeSuccess(false);
            setShowCompose(false);
            setComposeTo("");
            setComposeSubject("");
            setComposeMessage("");
        }, 2000);
    };

    const getSourceIcon = (source: SupportMessage["source"]) => {
        switch (source) {
            case "ziva_escalation": return <Zap className="h-3.5 w-3.5 text-emerald-500" />;
            case "contact_form": return <Mail className="h-3.5 w-3.5 text-blue-500" />;
            case "order_issue": return <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />;
            case "dispute_admin": return <ShieldAlert className="h-3.5 w-3.5 text-rose-500" />;
            default: return <Mail className="h-3.5 w-3.5 text-gray-400" />;
        }
    };

    const getSourceLabel = (source: SupportMessage["source"]) => {
        switch (source) {
            case "ziva_escalation": return "Ziva AI Escalation";
            case "contact_form": return "Contact Form";
            case "order_issue": return "Order Issue";
            case "dispute_admin": return "Dispute Escalation";
            default: return "Message";
        }
    };

    const getStatusBadge = (status: SupportMessage["status"]) => {
        const styles: Record<string, string> = {
            new: "bg-rose-100 text-rose-700",
            read: "bg-blue-100 text-blue-700",
            replied: "bg-amber-100 text-amber-700",
            resolved: "bg-emerald-100 text-emerald-700",
        };
        return (
            <span className={cn("text-[9px] font-black uppercase px-2 py-0.5 rounded-full", styles[status])}>
                {status}
            </span>
        );
    };

    return (
        <div className="space-y-6 max-w-6xl">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">Support Inbox</h2>
                    <p className="text-sm text-gray-500 font-bold uppercase tracking-wider mt-1">
                        User messages, Ziva escalations &amp; support tickets
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {newCount > 0 && (
                        <div className="flex items-center gap-2 bg-rose-50 text-rose-700 px-4 py-2 rounded-xl border border-rose-100">
                            <Mail className="h-4 w-4" />
                            <span className="text-xs font-black uppercase tracking-wider">{newCount} New Message{newCount !== 1 ? "s" : ""}</span>
                        </div>
                    )}
                    <Button onClick={() => setShowCompose(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl h-10 px-5 text-xs tracking-wide shadow-lg shadow-indigo-600/20 gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Send Message to User
                    </Button>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="bg-white p-1.5 rounded-2xl border border-gray-100 inline-flex gap-1 shadow-sm">
                {(["all", "new", "read", "resolved"] as const).map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={cn(
                            "px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                            filter === f
                                ? "bg-indigo-600 text-white shadow-lg"
                                : "text-gray-400 hover:text-gray-600"
                        )}
                    >
                        {f}
                        {f === "new" && newCount > 0 && (
                            <span className={cn(
                                "ml-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-black",
                                filter === "new" ? "bg-white/20" : "bg-rose-100 text-rose-600"
                            )}>
                                {newCount}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Messages Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Message List */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    {filteredMessages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-12 text-center">
                            <MailOpen className="h-12 w-12 text-gray-300 mb-4" />
                            <p className="text-sm font-bold text-gray-400">
                                {filter === "all" ? "No support messages yet" : `No ${filter} messages`}
                            </p>
                            <p className="text-[11px] text-gray-300 mt-1">
                                Messages from Ziva AI escalations and user contacts will appear here.
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
                            {filteredMessages.map(msg => (
                                <button
                                    key={msg.id}
                                    onClick={() => { setSelectedMsg(msg); if (msg.status === "new") handleMarkRead(msg.id); }}
                                    className={cn(
                                        "w-full text-left p-4 hover:bg-gray-50 transition-colors",
                                        selectedMsg?.id === msg.id && "bg-indigo-50/50 border-l-2 border-l-indigo-600",
                                        msg.status === "new" && "bg-rose-50/30"
                                    )}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="mt-0.5">
                                            {msg.status === "new" ? (
                                                <div className="h-8 w-8 rounded-xl bg-rose-100 flex items-center justify-center">
                                                    <Mail className="h-4 w-4 text-rose-600" />
                                                </div>
                                            ) : (
                                                <div className="h-8 w-8 rounded-xl bg-gray-100 flex items-center justify-center">
                                                    <MailOpen className="h-4 w-4 text-gray-400" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <span className="text-xs font-bold text-gray-900 truncate">{msg.user_name}</span>
                                                {getStatusBadge(msg.status)}
                                            </div>
                                            <p className="text-[11px] font-bold text-gray-700 truncate">{msg.subject}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                {getSourceIcon(msg.source)}
                                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                                    {getSourceLabel(msg.source)}
                                                </span>
                                                <span className="text-[10px] text-gray-300">•</span>
                                                <span className="text-[10px] text-gray-400">
                                                    {new Date(msg.created_at).toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Message Detail */}
                <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    {selectedMsg ? (
                        <div className="flex flex-col h-full">
                            {/* Detail Header */}
                            <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <h3 className="text-lg font-black text-gray-900">{selectedMsg.subject}</h3>
                                        <div className="flex items-center gap-3 mt-2">
                                            <div className="flex items-center gap-1.5">
                                                <User className="h-3.5 w-3.5 text-gray-400" />
                                                <span className="text-xs font-bold text-gray-700">{selectedMsg.user_name}</span>
                                            </div>
                                            <span className="text-gray-300">•</span>
                                            <span className="text-xs text-gray-500">{selectedMsg.user_email}</span>
                                            <span className="text-gray-300">•</span>
                                            {getStatusBadge(selectedMsg.status)}
                                        </div>
                                        <div className="flex items-center gap-2 mt-2">
                                            {getSourceIcon(selectedMsg.source)}
                                            <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">
                                                {getSourceLabel(selectedMsg.source)} • {new Date(selectedMsg.created_at).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {selectedMsg.status !== "resolved" && (
                                            <Button
                                                onClick={() => handleResolve(selectedMsg.id)}
                                                size="sm"
                                                className="h-8 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] uppercase tracking-widest"
                                            >
                                                <CheckCircle2 className="h-3 w-3 mr-1.5" />
                                                Resolve
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Message Body */}
                            <div className="p-6 flex-1 overflow-y-auto">
                                <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{selectedMsg.message}</p>
                                </div>

                                {/* Order Link */}
                                {selectedMsg.order_id && (
                                    <Link href={`/admin/escrow`} className="mt-4 flex items-center gap-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-4 py-2.5 rounded-xl border border-indigo-100 w-fit">
                                        <LinkIcon className="h-3.5 w-3.5" />
                                        View Order #{selectedMsg.order_id} in Escrow
                                    </Link>
                                )}

                                {/* Transcript */}
                                {selectedMsg.transcript && (
                                    <div className="mt-6">
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-1.5">
                                            <MessageSquare className="h-3 w-3" /> Chat Transcript
                                        </h4>
                                        <div className="bg-gray-900 rounded-xl p-4 max-h-64 overflow-y-auto">
                                            {selectedMsg.transcript.split("\n").map((line, i) => (
                                                <div key={i} className={cn(
                                                    "text-xs py-1 font-mono",
                                                    line.startsWith("user:") ? "text-emerald-400" : "text-gray-400"
                                                )}>
                                                    {line}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Reply Section */}
                                {selectedMsg.status !== "resolved" && (
                                    <div className="mt-6 border-t border-gray-100 pt-4">
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-1.5">
                                            <Send className="h-3 w-3" /> Reply to {selectedMsg.user_name}
                                        </h4>
                                        <textarea
                                            value={replyText}
                                            onChange={e => setReplyText(e.target.value)}
                                            placeholder="Type your reply...this will be sent to the user and visible in their order detail page."
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                                        />
                                        <div className="flex justify-end mt-2">
                                            <Button
                                                onClick={handleReply}
                                                disabled={!replyText.trim()}
                                                size="sm"
                                                className="h-8 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] uppercase tracking-widest"
                                            >
                                                <Send className="h-3 w-3 mr-1.5" /> Send & Resolve
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {/* Reply Success */}
                                {replySuccess && (
                                    <div className="mt-4 flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-50 px-4 py-2.5 rounded-xl border border-emerald-100">
                                        <CheckCircle2 className="h-3.5 w-3.5" /> Reply sent successfully
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full p-12 text-center min-h-[400px]">
                            <ShieldCheck className="h-16 w-16 text-gray-200 mb-4" />
                            <h3 className="text-lg font-black text-gray-300">Select a message</h3>
                            <p className="text-xs text-gray-400 mt-1">Click on a message to view details and respond</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Compose Modal */}
            {showCompose && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
                        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50 border-t-4 border-t-indigo-500">
                            <h3 className="font-black text-gray-900 flex items-center gap-2">
                                <MessageSquare className="h-4 w-4 text-indigo-500" />
                                New Message to User
                            </h3>
                            <button onClick={() => setShowCompose(false)} className="text-gray-400 hover:text-gray-700 transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">User Email or ID</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <User className="h-4 w-4 text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        value={composeTo}
                                        onChange={e => setComposeTo(e.target.value)}
                                        placeholder="e.g. user@example.com"
                                        className="w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Subject</label>
                                <input
                                    type="text"
                                    value={composeSubject}
                                    onChange={e => setComposeSubject(e.target.value)}
                                    placeholder="Message subject"
                                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Message</label>
                                <textarea
                                    value={composeMessage}
                                    onChange={e => setComposeMessage(e.target.value)}
                                    placeholder="Type your message here..."
                                    className="w-full px-3 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm min-h-[120px] focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                                />
                            </div>

                            {composeSuccess && (
                                <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 flex items-center gap-2 font-bold text-xs">
                                    <CheckCircle2 className="h-4 w-4" /> Message delivered to user's inbox
                                </div>
                            )}
                        </div>
                        <div className="p-5 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3">
                            <Button variant="outline" onClick={() => setShowCompose(false)} className="rounded-xl h-10 px-5 font-bold">
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSendCompose}
                                disabled={!composeTo.trim() || !composeSubject.trim() || !composeMessage.trim() || composeSuccess}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-10 px-6 font-bold tracking-wide"
                            >
                                <Send className="h-4 w-4 mr-2" />
                                Send Message
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
