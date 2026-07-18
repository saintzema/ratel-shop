"use client";

import { useState, useEffect, useCallback } from "react";
import {
    MessageSquare,
    RefreshCcw,
    Search,
    Clock,
    Send,
    Inbox,
    ShieldCheck,
    AlertCircle,
    Upload,
    Users,
    CheckCircle2,
    XCircle,
    Loader2,
    ChevronLeft,
    ChevronRight,
    Store
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { visibleInterval } from "@/lib/client-poll";

interface Interaction {
    id: string;
    phoneNumber: string;
    messageText: string;
    direction: "inbound" | "outbound";
    type: string;
    metadata: any;
    createdAt: string;
}

interface Contact {
    phoneNumber: string;
    displayName: string | null;
    logoUrl: string | null;
    storeUrl: string | null;
    sellerId: string | null;
    messageCount: number;
    lastMessage: string;
    lastMessageAt: string;
    lastDirection: "inbound" | "outbound";
}

export default function AdminWhatsAppLogs() {
    const [activeTab, setActiveTab] = useState<'monitor' | 'import'>('monitor');
    const [filter, setFilter] = useState("");
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

    // ── Contact list state ──
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [contactsLoading, setContactsLoading] = useState(true);
    const [contactsCursor, setContactsCursor] = useState<string | null>(null);
    const [totalContacts, setTotalContacts] = useState(0);

    // ── Selected thread state ──
    const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
    const [thread, setThread] = useState<Interaction[]>([]);
    const [threadLoading, setThreadLoading] = useState(false);
    const [threadCursor, setThreadCursor] = useState<string | null>(null);

    // ── Bulk import state ──
    const [importText, setImportText] = useState("");
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState<{ created: number; skipped: number; errors: number; total: number } | null>(null);

    const token = typeof window !== 'undefined' ? localStorage.getItem('fp_token') : null;
    const authHeaders = () => ({ 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) });

    const detectNumbers = (text: string): number => {
        const regex = /(?:\+?234|0)[7-9][01]\d{8}/g;
        return (text.replace(/[\s\-]/g, '').match(regex) || []).length;
    };

    const handleBulkImport = async () => {
        if (!importText.trim()) return;
        setImporting(true);
        setImportResult(null);
        try {
            const res = await fetch('/api/admin/whatsapp/bulk-import', {
                method: 'POST',
                headers: authHeaders(),
                body: JSON.stringify({ rawText: importText }),
            });
            const d = await res.json();
            if (d.success) setImportResult(d.summary);
            else alert(d.error || 'Import failed');
        } catch (e) { console.error(e); }
        setImporting(false);
    };

    // Fetches the first page of contacts (used on load + on the 10s poll).
    const fetchContacts = useCallback(async () => {
        setContactsLoading(true);
        try {
            const res = await fetch("/api/admin/whatsapp/interactions?view=contacts&limit=50", { headers: authHeaders() });
            if (res.ok) {
                const data = await res.json();
                setContacts(data.contacts || []);
                setContactsCursor(data.nextCursor || null);
                setTotalContacts(data.totalContacts || 0);
                setLastUpdated(new Date());
            }
        } catch (error) {
            console.error("Failed to fetch WhatsApp contacts:", error);
        } finally {
            setContactsLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    const loadMoreContacts = async () => {
        if (!contactsCursor) return;
        setContactsLoading(true);
        try {
            const res = await fetch(`/api/admin/whatsapp/interactions?view=contacts&limit=50&cursor=${encodeURIComponent(contactsCursor)}`, { headers: authHeaders() });
            if (res.ok) {
                const data = await res.json();
                setContacts(prev => [...prev, ...(data.contacts || [])]);
                setContactsCursor(data.nextCursor || null);
            }
        } catch (error) {
            console.error("Failed to load more contacts:", error);
        } finally {
            setContactsLoading(false);
        }
    };

    const openThread = async (phone: string) => {
        setSelectedPhone(phone);
        setThread([]);
        setThreadCursor(null);
        setThreadLoading(true);
        try {
            const res = await fetch(`/api/admin/whatsapp/interactions?phoneNumber=${encodeURIComponent(phone)}&limit=50`, { headers: authHeaders() });
            if (res.ok) {
                const data = await res.json();
                setThread(data.interactions || []);
                setThreadCursor(data.nextCursor || null);
            }
        } catch (error) {
            console.error("Failed to load thread:", error);
        } finally {
            setThreadLoading(false);
        }
    };

    const loadMoreThread = async () => {
        if (!selectedPhone || !threadCursor) return;
        setThreadLoading(true);
        try {
            const res = await fetch(`/api/admin/whatsapp/interactions?phoneNumber=${encodeURIComponent(selectedPhone)}&limit=50&cursor=${encodeURIComponent(threadCursor)}`, { headers: authHeaders() });
            if (res.ok) {
                const data = await res.json();
                setThread(prev => [...prev, ...(data.interactions || [])]);
                setThreadCursor(data.nextCursor || null);
            }
        } catch (error) {
            console.error("Failed to load more thread messages:", error);
        } finally {
            setThreadLoading(false);
        }
    };

    useEffect(() => {
        fetchContacts();
        // visibleInterval pauses while the tab is hidden/backgrounded instead of
        // polling forever regardless of whether anyone's looking at the page.
        return visibleInterval(fetchContacts, 10000);
    }, [fetchContacts]);

    const filteredContacts = contacts.filter(c =>
        c.phoneNumber.includes(filter) ||
        (c.displayName && c.displayName.toLowerCase().includes(filter.toLowerCase())) ||
        c.lastMessage.toLowerCase().includes(filter.toLowerCase())
    );

    const selectedContact = contacts.find(c => c.phoneNumber === selectedPhone);

    return (
        <div className="max-w-7xl mx-auto p-6 space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                        <div className="h-10 w-10 bg-green-500 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/20">
                            <MessageSquare className="text-white h-6 w-6" />
                        </div>
                        WhatsApp
                    </h1>
                    <p className="text-gray-500 font-medium mt-1">
                        Contacts who've interacted with the FairPrice WhatsApp AI — click a contact to see the full conversation.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-right hidden md:block">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Last Sync</p>
                        <p className="text-xs font-bold text-gray-600">{lastUpdated.toLocaleTimeString()}</p>
                    </div>
                    <Button
                        onClick={fetchContacts}
                        variant="outline"
                        disabled={contactsLoading}
                        className="rounded-xl font-bold gap-2 border-gray-200 hover:bg-gray-50"
                    >
                        <RefreshCcw className={cn("h-4 w-4", contactsLoading && "animate-spin")} />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Tab switcher */}
            <div className="flex gap-2 bg-gray-100 p-1 rounded-2xl w-fit">
                {[{ key: 'monitor', label: 'Live Monitor', icon: MessageSquare }, { key: 'import', label: 'Bulk Import', icon: Users }].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => { setActiveTab(tab.key as typeof activeTab); setSelectedPhone(null); }}
                        className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-black transition-all ${activeTab === tab.key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <tab.icon className="h-3.5 w-3.5" /> {tab.label}
                    </button>
                ))}
            </div>

            {/* Bulk Import Panel */}
            {activeTab === 'import' && (
                <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-8 max-w-2xl">
                    <h2 className="text-xl font-black text-gray-900 mb-1">Bulk Import WhatsApp Numbers</h2>
                    <p className="text-sm text-gray-500 mb-6">
                        Paste <strong>anything</strong> — clean numbers, raw WhatsApp chat exports, contact lists, or mixed text.
                        The system automatically extracts all Nigerian numbers (08xx, 07xx, 09xx, +234, 234 formats).
                        Numbers already in the system are skipped automatically.
                    </p>

                    <textarea
                        value={importText}
                        onChange={e => setImportText(e.target.value)}
                        placeholder={"Paste anything here — raw WhatsApp chat, contact list, or just numbers:\n\n08032931803\n+2347060497527\n[12/05/2024, 09:14:22] Emeka Obi: Hello I want to buy...\n0803 456 7890\n..."}
                        rows={12}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 text-xs font-mono text-gray-800 placeholder-gray-300 focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-50 resize-y"
                    />

                    <div className="flex items-center gap-3 mt-4">
                        <Button
                            onClick={handleBulkImport}
                            disabled={importing || !importText.trim()}
                            className="h-10 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold px-6 gap-2 disabled:opacity-50"
                        >
                            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                            {importing ? 'Importing…' : 'Import Numbers'}
                        </Button>
                        {importText && (
                            <span className="text-xs text-gray-400">
                                {detectNumbers(importText)} Nigerian numbers detected
                            </span>
                        )}
                    </div>

                    {importResult && (
                        <div className="mt-5 p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-2">
                            <p className="text-xs font-black text-gray-600 uppercase tracking-widest mb-3">Import Result</p>
                            <div className="grid grid-cols-3 gap-3">
                                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-center">
                                    <CheckCircle2 className="h-5 w-5 text-emerald-500 mx-auto mb-1" />
                                    <p className="text-xl font-black text-emerald-700">{importResult.created}</p>
                                    <p className="text-[10px] font-bold text-emerald-500">Created</p>
                                </div>
                                <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 text-center">
                                    <Users className="h-5 w-5 text-amber-500 mx-auto mb-1" />
                                    <p className="text-xl font-black text-amber-700">{importResult.skipped}</p>
                                    <p className="text-[10px] font-bold text-amber-500">Already Exist</p>
                                </div>
                                <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-center">
                                    <XCircle className="h-5 w-5 text-rose-400 mx-auto mb-1" />
                                    <p className="text-xl font-black text-rose-600">{importResult.errors}</p>
                                    <p className="text-[10px] font-bold text-rose-400">Errors</p>
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 text-center pt-1">
                                {importResult.created} new users imported out of {importResult.total} numbers submitted.
                                {importResult.created > 0 && ' They can now log in via WhatsApp or set a password on first visit.'}
                            </p>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'monitor' && <>
            {/* Dashboard Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm">
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Active Contacts</p>
                    <p className="text-3xl font-black text-indigo-600">{totalContacts}</p>
                </div>
                <div className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm">
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Loaded This Page</p>
                    <p className="text-3xl font-black text-gray-900">{contacts.length}</p>
                </div>
            </div>

            {!selectedPhone ? (
                <>
                    {/* Search & Filter */}
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search phone number, store/user name, or message content..."
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-green-500/10 shadow-sm transition-all"
                        />
                    </div>

                    {/* Contact List */}
                    <div className="bg-white rounded-[32px] border border-gray-100 shadow-xl overflow-hidden divide-y divide-gray-50">
                        {filteredContacts.length === 0 ? (
                            <div className="px-6 py-20 text-center">
                                <div className="flex flex-col items-center gap-3 text-gray-400">
                                    <Inbox className="h-12 w-12 opacity-20" />
                                    <p className="font-bold">No contacts found</p>
                                </div>
                            </div>
                        ) : (
                            filteredContacts.map((c) => (
                                <button
                                    key={c.phoneNumber}
                                    onClick={() => openThread(c.phoneNumber)}
                                    className="w-full flex items-center gap-4 px-6 py-4 hover:bg-gray-50/70 transition-colors text-left"
                                >
                                    <div className="h-11 w-11 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden shrink-0">
                                        {c.logoUrl ? (
                                            <img src={c.logoUrl} alt={c.displayName || c.phoneNumber} className="w-full h-full object-cover" />
                                        ) : c.storeUrl ? (
                                            <Store className="h-5 w-5 text-gray-400" />
                                        ) : (
                                            <span className="text-sm font-black text-gray-400">{(c.displayName || c.phoneNumber)[0]}</span>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-black text-gray-900">{c.displayName || "Unregistered Number"}</span>
                                            {c.messageCount > 1 && (
                                                <Badge variant="outline" className="text-[10px] font-bold px-1.5 py-0 border-gray-200 text-gray-500">
                                                    {c.messageCount}
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-[11px] font-bold text-gray-400">{c.phoneNumber}</p>
                                        <p className="text-xs text-gray-600 mt-0.5 line-clamp-1">
                                            {c.lastDirection === "outbound" ? "🤖 " : ""}{c.lastMessage}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className="text-[11px] font-bold text-gray-400">
                                            {new Date(c.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        <ChevronRight className="h-4 w-4 text-gray-300" />
                                    </div>
                                </button>
                            ))
                        )}
                    </div>

                    {contactsCursor && (
                        <div className="flex justify-center">
                            <Button onClick={loadMoreContacts} disabled={contactsLoading} variant="outline" className="rounded-xl font-bold gap-2">
                                {contactsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                Load More Contacts
                            </Button>
                        </div>
                    )}
                </>
            ) : (
                <>
                    {/* Thread View */}
                    <div className="flex items-center gap-3">
                        <Button onClick={() => setSelectedPhone(null)} variant="outline" className="rounded-xl font-bold gap-2">
                            <ChevronLeft className="h-4 w-4" /> Back to Contacts
                        </Button>
                        <div>
                            <p className="text-sm font-black text-gray-900">{selectedContact?.displayName || "Unregistered Number"}</p>
                            <p className="text-xs font-bold text-gray-400">{selectedPhone}</p>
                        </div>
                    </div>

                    <div className="bg-white rounded-[32px] border border-gray-100 shadow-xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50/50 border-b border-gray-100">
                                        <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Time</th>
                                        <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Direction</th>
                                        <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Message</th>
                                        <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Context</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {thread.length === 0 && !threadLoading ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-20 text-center">
                                                <div className="flex flex-col items-center gap-3 text-gray-400">
                                                    <Inbox className="h-12 w-12 opacity-20" />
                                                    <p className="font-bold">No messages found</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        thread.map((log) => (
                                            <tr key={log.id} className="hover:bg-gray-50/50 transition-colors group">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-2 text-gray-500 font-medium text-sm">
                                                        <Clock className="h-3.5 w-3.5" />
                                                        {new Date(log.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
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

                    {threadCursor && (
                        <div className="flex justify-center">
                            <Button onClick={loadMoreThread} disabled={threadLoading} variant="outline" className="rounded-xl font-bold gap-2">
                                {threadLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                Load More Messages
                            </Button>
                        </div>
                    )}
                </>
            )}

            {/* Legend/Help */}
            <div className="flex items-center gap-6 p-6 bg-indigo-50/50 rounded-[24px] border border-indigo-100/50">
                <div className="h-10 w-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 shrink-0">
                    <AlertCircle className="h-5 w-5" />
                </div>
                <div>
                    <p className="text-sm font-black text-indigo-900">Admin Guidance</p>
                    <p className="text-xs text-indigo-700 font-medium mt-0.5 leading-relaxed">
                        This dashboard monitors the <span className="font-bold">WhatsApp Business Webhook</span>, grouped by contact.
                        Click a contact to see their full conversation. Logs older than 90 days are cleaned up automatically.
                    </p>
                </div>
            </div>
            </>}
        </div>
    );
}
