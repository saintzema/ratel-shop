"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { MessageCircle, Settings, Users, ArrowLeft, RefreshCw, Send, Image as ImageIcon, Zap, Plus, DownloadCloud, CheckCircle2 as Check, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { InstagramCatalogImporter } from "@/components/seller/InstagramCatalogImporter";
import { DataSyncService } from "@/lib/sync-store";

interface IgComment {
    id: string; igCommentId: string; fromUsername: string; text: string; replied: boolean; createdAt: string;
}
interface IgThread {
    id: string; igsid: string; fromUsername: string | null; text: string; direction: string; createdAt: string;
}
type InboxItem =
    | { kind: "comment"; data: IgComment }
    | { kind: "thread"; data: IgThread };

function MetaBusinessSuiteContent() {
    const searchParams = useSearchParams();
    const initialTab = (searchParams.get("tab") as "inbox" | "automation" | "ads" | "import" | "settings" | null) || "import";
    const [activeTab, setActiveTab] = useState<"inbox" | "automation" | "ads" | "import" | "settings">(initialTab);
    const [igConnected, setIgConnected] = useState(false);
    const [waConnected, setWaConnected] = useState(false);

    useEffect(() => {
        const seller = DataSyncService.getCurrentSeller();
        setIgConnected(!!(seller as any)?.instagramAccessToken || !!(seller as any)?.instagram_access_token);
        setWaConnected(!!(seller as any)?.whatsappNumber || !!(seller as any)?.whatsapp_number);
    }, []);

    const authHeaders = () => {
        const tok = typeof window !== "undefined" ? localStorage.getItem("fp_token") : null;
        return { "Content-Type": "application/json", ...(tok ? { Authorization: `Bearer ${tok}` } : {}) };
    };

    const [inboxItems, setInboxItems] = useState<InboxItem[]>([]);
    const [selected, setSelected] = useState<InboxItem | null>(null);
    const [threadHistory, setThreadHistory] = useState<IgThread[]>([]);
    const [replyText, setReplyText] = useState("");
    const [sendingReply, setSendingReply] = useState(false);
    const [loadingInbox, setLoadingInbox] = useState(false);

    const loadInbox = () => {
        setLoadingInbox(true);
        fetch("/api/seller/instagram/inbox", { headers: authHeaders() })
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                if (!data) return;
                const items: InboxItem[] = [
                    ...(data.comments || []).map((c: IgComment) => ({ kind: "comment" as const, data: c })),
                    ...(data.threads || []).map((t: IgThread) => ({ kind: "thread" as const, data: t })),
                ].sort((a, b) => new Date(b.data.createdAt).getTime() - new Date(a.data.createdAt).getTime());
                setInboxItems(items);
            })
            .catch(() => {})
            .finally(() => setLoadingInbox(false));
    };

    useEffect(() => {
        if (activeTab === "inbox") loadInbox();
    }, [activeTab]);

    const selectItem = (item: InboxItem) => {
        setSelected(item);
        setThreadHistory([]);
        if (item.kind === "thread") {
            fetch(`/api/seller/instagram/inbox?igsid=${encodeURIComponent(item.data.igsid)}`, { headers: authHeaders() })
                .then(r => r.ok ? r.json() : null)
                .then(data => setThreadHistory(data?.history || []))
                .catch(() => {});
        }
    };

    const sendReply = async () => {
        if (!selected || !replyText.trim()) return;
        setSendingReply(true);
        try {
            if (selected.kind === "comment") {
                const res = await fetch("/api/seller/instagram/comments/reply", {
                    method: "POST",
                    headers: authHeaders(),
                    body: JSON.stringify({ commentId: selected.data.id, message: replyText }),
                });
                if (res.ok) {
                    setReplyText("");
                    loadInbox();
                    setSelected(null);
                }
            } else {
                const res = await fetch("/api/seller/instagram/messages/reply", {
                    method: "POST",
                    headers: authHeaders(),
                    body: JSON.stringify({ igsid: selected.data.igsid, message: replyText }),
                });
                if (res.ok) {
                    setThreadHistory(prev => [...prev, { id: `local-${Date.now()}`, igsid: selected.data.igsid, fromUsername: null, text: replyText, direction: "outbound", createdAt: new Date().toISOString() }]);
                    setReplyText("");
                }
            }
        } finally {
            setSendingReply(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-20 p-4 sm:p-6 lg:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header & Navigation */}
            <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                    <div className="flex items-center gap-4">
                        <Link href="/seller/integrations">
                            <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0 rounded-full hover:bg-gray-100">
                                <ArrowLeft className="h-5 w-5 text-gray-700" />
                            </Button>
                        </Link>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-black text-gray-900 tracking-tight">Meta Business Suite</h1>
                                {igConnected || waConnected ? (
                                    <span className="bg-[#E7F3FF] text-[#1877F2] font-black text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full">
                                        {igConnected && waConnected ? "IG + WA" : igConnected ? "Instagram" : "WhatsApp"} Connected
                                    </span>
                                ) : (
                                    <span className="bg-gray-100 text-gray-500 font-black text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full">Not Connected</span>
                                )}
                            </div>
                            <p className="text-sm font-medium text-gray-500 mt-1">Manage your Instagram &amp; WhatsApp Presence seamlessly.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button variant="outline" onClick={loadInbox} disabled={loadingInbox} className="h-10 border-gray-200 text-gray-600 rounded-xl font-bold shadow-sm">
                            <RefreshCw className={cn("h-4 w-4 mr-2", loadingInbox && "animate-spin")} /> Sync DMs
                        </Button>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 pb-0">
                    {[
                        { id: "inbox", label: "Unified Inbox", icon: MessageCircle },
                        { id: "automation", label: "Auto Reply", icon: Zap },
                        { id: "ads", label: "Lead Ads", icon: Users },
                        { id: "import", label: "Import Posts", icon: DownloadCloud },
                        { id: "settings", label: "Connection settings", icon: Settings },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={cn(
                                "flex items-center gap-2 px-5 py-3 text-sm font-bold uppercase tracking-wider transition-all border-b-2",
                                activeTab === tab.id
                                    ? "border-[#1877F2] text-[#1877F2]"
                                    : "border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-t-xl"
                            )}
                        >
                            <tab.icon className="h-4 w-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab Contents */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden min-h-[500px]">
                {activeTab === "inbox" && (
                    <div className="flex h-[600px] flex-col md:flex-row">
                        {/* Item List */}
                        <div className="w-full md:w-80 border-r border-gray-100 flex flex-col">
                            <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                                <p className="text-xs font-bold text-gray-500">Unreplied comments + DM threads, real Instagram data.</p>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-[#FAFAFA]">
                                {loadingInbox && inboxItems.length === 0 && (
                                    <p className="text-center text-xs text-gray-400 py-8">Loading…</p>
                                )}
                                {!loadingInbox && inboxItems.length === 0 && (
                                    <p className="text-center text-xs text-gray-400 py-8 px-4">Nothing here yet — purchase-intent comments and DMs on your connected Instagram account will show up here.</p>
                                )}
                                {inboxItems.map(item => {
                                    const key = item.kind === "comment" ? item.data.id : item.data.igsid;
                                    const name = item.kind === "comment" ? `@${item.data.fromUsername}` : (item.data.fromUsername ? `@${item.data.fromUsername}` : "Instagram user");
                                    const active = selected && (selected.kind === "comment" ? selected.data.id === (item as any).data.id : item.kind === "thread" && selected.kind === "thread" && selected.data.igsid === item.data.igsid);
                                    return (
                                        <button key={key} onClick={() => selectItem(item)} className={cn("w-full text-left p-3 rounded-xl transition-colors flex items-start gap-3 relative group", active ? "bg-blue-50" : "hover:bg-gray-100/80")}>
                                            <div className="h-10 w-10 shrink-0 rounded-full flex items-center justify-center text-white font-black shadow-sm bg-gradient-to-tr from-[#FFDC80] via-[#FD1D1D] to-[#405DE6]">
                                                {name.replace("@", "").charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-0.5">
                                                    <span className="text-sm font-bold truncate text-gray-900">{name}</span>
                                                    <span className="text-[10px] font-bold text-gray-400">{new Date(item.data.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}</span>
                                                </div>
                                                <p className="text-xs truncate text-gray-500">
                                                    {item.kind === "comment" ? "💬 " : "📩 "}{item.data.text}
                                                </p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Detail / Reply Area */}
                        <div className="flex-1 flex flex-col bg-white">
                            {!selected ? (
                                <div className="flex-1 flex items-center justify-center text-gray-400 text-sm font-medium">Select a comment or conversation to reply.</div>
                            ) : (
                                <>
                                    <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-[#FFDC80] via-[#FD1D1D] to-[#405DE6] flex items-center justify-center text-white font-black shadow-sm">
                                                {(selected.kind === "comment" ? selected.data.fromUsername : selected.data.fromUsername || "I").charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-bold text-gray-900">
                                                    {selected.kind === "comment" ? `@${selected.data.fromUsername}` : (selected.data.fromUsername ? `@${selected.data.fromUsername}` : "Instagram user")}
                                                </h3>
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                                                    {selected.kind === "comment" ? "Comment reply" : "Instagram Direct"}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex-1 p-6 overflow-y-auto bg-[#F0F2F5] flex flex-col gap-4">
                                        {selected.kind === "comment" ? (
                                            <div className="flex gap-3 max-w-[80%]">
                                                <div className="h-8 w-8 rounded-full bg-gray-200 shrink-0" />
                                                <div className="bg-white p-3.5 rounded-2xl rounded-tl-sm shadow-sm border border-gray-100">
                                                    <p className="text-sm text-gray-800">{selected.data.text}</p>
                                                    <span className="text-[9px] text-gray-400 font-bold mt-2 block">Comment on your post</span>
                                                </div>
                                            </div>
                                        ) : (
                                            threadHistory.map(m => (
                                                <div key={m.id} className={cn("flex gap-3 max-w-[80%]", m.direction === "outbound" && "self-end flex-row-reverse")}>
                                                    {m.direction === "inbound" && <div className="h-8 w-8 rounded-full bg-gray-200 shrink-0" />}
                                                    <div className={cn("p-3.5 rounded-2xl shadow-sm border", m.direction === "outbound" ? "bg-[#1877F2] text-white border-transparent rounded-tr-sm" : "bg-white border-gray-100 rounded-tl-sm")}>
                                                        <p className="text-sm">{m.text}</p>
                                                        <span className={cn("text-[9px] font-bold mt-2 block", m.direction === "outbound" ? "text-blue-100" : "text-gray-400")}>
                                                            {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>

                                    <div className="p-4 bg-white border-t border-gray-100">
                                        <div className="flex items-end gap-2 bg-gray-50 p-2 border border-gray-200 rounded-2xl">
                                            <textarea
                                                value={replyText}
                                                onChange={(e) => setReplyText(e.target.value)}
                                                placeholder={selected.kind === "comment" ? "Reply to this comment…" : "Type a message…"}
                                                className="w-full bg-transparent resize-none max-h-32 min-h-[40px] focus:outline-none text-sm font-medium py-2.5"
                                                rows={1}
                                            />
                                            <Button onClick={sendReply} disabled={!replyText.trim() || sendingReply} className="h-10 px-5 rounded-xl bg-[#1877F2] hover:bg-[#166FE5] text-white font-bold shrink-0 shadow-md">
                                                <Send className="h-4 w-4 mr-2" /> Send
                                            </Button>
                                        </div>
                                        <p className="text-[10px] text-center text-gray-400 font-bold mt-2">Real replies via the Instagram Graph API — {selected.kind === "comment" ? "posts as a genuine comment reply" : "sends a real DM"}.</p>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === "automation" && (
                    <div className="p-8 max-w-3xl">
                        <h2 className="text-xl font-black text-gray-900 mb-6">Automated Responses</h2>

                        <div className="space-y-6">
                            <div className="bg-gray-50 border border-gray-200 p-6 rounded-2xl">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h3 className="font-bold text-gray-900 text-sm">Instant Greeting</h3>
                                        <p className="text-xs text-gray-500 mt-1">Reply instantly when someone messages you for the first time.</p>
                                    </div>
                                    <div className="w-12 h-6 bg-[#1877F2] rounded-full relative cursor-pointer opacity-50">
                                        <div className="w-4 h-4 bg-white rounded-full absolute right-1 top-1 shadow-sm" />
                                    </div>
                                </div>
                                <textarea
                                    defaultValue="Hi there! Thanks for reaching out to our store. We typically reply within a few hours. How can we help you today?"
                                    className="w-full p-4 rounded-xl border border-gray-200 text-sm mt-2 focus:border-[#1877F2] outline-none"
                                    rows={3}
                                />
                                <div className="flex justify-end mt-3">
                                    <Button size="sm" className="bg-gray-900 hover:bg-black text-white font-bold rounded-lg px-6">Save</Button>
                                </div>
                            </div>

                            <div className="bg-gray-50 border border-gray-200 p-6 rounded-2xl">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h3 className="font-bold text-gray-900 text-sm">Away Message</h3>
                                        <p className="text-xs text-gray-500 mt-1">Send when you're marked as away or outside business hours.</p>
                                    </div>
                                    <div className="w-12 h-6 bg-gray-300 rounded-full relative cursor-pointer">
                                        <div className="w-4 h-4 bg-white rounded-full absolute left-1 top-1 shadow-sm" />
                                    </div>
                                </div>
                                <textarea
                                    disabled
                                    defaultValue="We are currently away. We will get back to you during our business hours (Mon-Fri 9AM - 6PM)."
                                    className="w-full p-4 rounded-xl border border-gray-200 text-sm mt-2 bg-gray-100/50 text-gray-500"
                                    rows={2}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "import" && (
                    <Suspense fallback={null}>
                        <InstagramCatalogImporter />
                    </Suspense>
                )}

                {activeTab === "ads" && (
                    <div className="p-16 flex flex-col items-center justify-center text-center">
                        <div className="h-20 w-20 bg-indigo-50 rounded-3xl flex items-center justify-center text-indigo-600 mb-6 shadow-indigo-600/10 shadow-lg border border-indigo-100">
                            <Users className="h-8 w-8" />
                        </div>
                        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Lead Generation Ads</h2>
                        <p className="text-gray-500 max-w-md mt-3 mb-8">
                            Create Instagram & Facebook ads directly from your store catalog. Route traffic straight to your FairPrice storefront and manage leads here.
                        </p>
                        <Button className="h-12 px-8 rounded-xl bg-[#1877F2] hover:bg-[#166FE5] text-white font-bold shadow-lg shadow-[#1877F2]/20">
                            Create First Campaign
                        </Button>
                    </div>
                )}

                {activeTab === "settings" && (
                    <div className="p-8 max-w-2xl">
                        <h2 className="text-xl font-black text-gray-900 mb-6">Integration Status</h2>
                        <div className="bg-white border text-sm font-medium border-gray-200 rounded-2xl divide-y divide-gray-100 shadow-sm">
                            <div className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                                <span className="text-gray-600 font-bold">Instagram Account</span>
                                {igConnected
                                    ? <span className="text-emerald-600 font-bold flex items-center gap-1.5"><Check className="h-4 w-4" /> Connected</span>
                                    : <span className="text-gray-400 font-bold flex items-center gap-1.5"><XCircle className="h-4 w-4" /> Not connected</span>}
                            </div>
                            <div className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                                <span className="text-gray-600 font-bold">WhatsApp Business API</span>
                                {waConnected
                                    ? <span className="text-emerald-600 font-bold flex items-center gap-1.5"><Check className="h-4 w-4" /> Connected</span>
                                    : <span className="text-gray-400 font-bold flex items-center gap-1.5"><XCircle className="h-4 w-4" /> Not connected</span>}
                            </div>
                            <div className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                                <span className="text-gray-600 font-bold">Meta Business Portfolio</span>
                                <span className="text-gray-900">FairPrice Merchants LLC</span>
                            </div>
                            <div className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                                <span className="text-gray-600 font-bold">API Permissions</span>
                                <span className="text-indigo-600 cursor-pointer">View Grants</span>
                            </div>
                        </div>
                        <div className="mt-8 pt-8 border-t border-gray-100">
                            <Button variant="outline" className="text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700 font-bold h-12 px-6 rounded-xl">
                                Disconnect Meta Integration
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function MetaBusinessSuite() {
    return (
        <Suspense fallback={<div className="max-w-7xl mx-auto p-8 text-center text-gray-400 text-sm">Loading…</div>}>
            <MetaBusinessSuiteContent />
        </Suspense>
    );
}

