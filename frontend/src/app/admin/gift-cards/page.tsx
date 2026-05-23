"use client";

import { useEffect, useState, useCallback } from "react";
import {
    Gift, Plus, Copy, CheckCircle2, Trash2, Calendar, Hash,
    Loader2, RefreshCw, Eye, Users, BadgePercent, Search,
    ChevronDown, Send, Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogDescription } from "@/components/ui/dialog";
import { GiftCardVisual } from "@/components/ui/GiftCardVisual";
import { cn } from "@/lib/utils";

interface GiftCard {
    id: string;
    code: string;
    value: number;
    type: string;
    usageLimit: number | null;
    usageCount: number;
    status: string;
    expiry: string | null;
    createdAt: string;
    usages: { user: { id: string; name: string; whatsappNumber?: string } }[];
}

export default function AdminGiftCardsPage() {
    const [cards, setCards] = useState<GiftCard[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState("all");
    const [search, setSearch] = useState("");
    const [copied, setCopied] = useState<string | null>(null);
    const [previewCard, setPreviewCard] = useState<GiftCard | null>(null);
    const [isIssueOpen, setIsIssueOpen] = useState(false);
    const [issueForm, setIssueForm] = useState({
        count: "1",
        amount: "2000",
        usageLimit: "1",
        expiry: "",
    });
    const [issuing, setIssuing] = useState(false);
    const [lastIssued, setLastIssued] = useState<{ code: string; phone?: string }[]>([]);

    const authHeaders = (): Record<string, string> => {
        const token = typeof window !== "undefined" ? localStorage.getItem("fp_token") : null;
        const h: Record<string, string> = { "Content-Type": "application/json" };
        if (token) h["Authorization"] = `Bearer ${token}`;
        return h;
    };

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/gift-cards?status=${statusFilter}`, { headers: authHeaders() });
            if (res.ok) setCards(await res.json());
        } finally {
            setLoading(false);
        }
    }, [statusFilter]);

    useEffect(() => { load(); }, [load]);

    const handleCopy = (code: string) => {
        navigator.clipboard.writeText(code).then(() => {
            setCopied(code);
            setTimeout(() => setCopied(null), 2000);
        });
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Deactivate this gift card?")) return;
        const res = await fetch(`/api/discounts/${id}`, { method: "DELETE", headers: authHeaders() });
        if (res.ok) load();
    };

    const handleIssue = async () => {
        setIssuing(true);
        try {
            const res = await fetch("/api/admin/gift-cards", {
                method: "POST",
                headers: authHeaders(),
                body: JSON.stringify({
                    count: parseInt(issueForm.count) || 1,
                    amount: parseFloat(issueForm.amount) || 2000,
                    usageLimit: parseInt(issueForm.usageLimit) || 1,
                    expiry: issueForm.expiry || null,
                }),
            });
            const data = await res.json();
            if (data.success) {
                setLastIssued(data.created);
                setIsIssueOpen(false);
                load();
            }
        } finally {
            setIssuing(false);
        }
    };

    const downloadCodes = () => {
        const csv = ["Code,Amount,Status,Expiry,Redeemed By"]
            .concat(
                cards.map(c =>
                    `${c.code},₦${c.value},${c.status},${c.expiry ? new Date(c.expiry).toLocaleDateString() : "No expiry"},${c.usages[0]?.user.name ?? ""}`
                )
            )
            .join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `fairprice-gift-cards-${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const filtered = cards.filter(c =>
        !search || c.code.toLowerCase().includes(search.toLowerCase())
    );

    const stats = {
        total: cards.length,
        active: cards.filter(c => c.status === "active" && c.usageCount === 0).length,
        redeemed: cards.filter(c => c.usageCount > 0).length,
        totalValue: cards.reduce((s, c) => s + (c.usageCount === 0 ? c.value : 0), 0),
    };

    return (
        <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6 pb-24">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Gift className="h-4 w-4 text-emerald-500" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">FairPrice Store</span>
                    </div>
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight">Gift Cards</h1>
                    <p className="text-sm text-gray-500 font-medium">Issue ₦2,000 welcome gift cards to new customers</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={downloadCodes} className="rounded-xl gap-1.5 font-bold text-xs h-9">
                        <Download className="h-3.5 w-3.5" /> Export CSV
                    </Button>
                    <Button variant="outline" size="icon" onClick={load} className="rounded-xl h-9 w-9">
                        <RefreshCw className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                        onClick={() => { setLastIssued([]); setIsIssueOpen(true); }}
                        className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs h-9 px-4 gap-1.5 shadow-lg shadow-emerald-100"
                    >
                        <Plus className="h-3.5 w-3.5" /> Issue Gift Cards
                    </Button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: "Total Issued", value: stats.total, icon: Gift, color: "text-emerald-600 bg-emerald-50" },
                    { label: "Unused", value: stats.active, icon: BadgePercent, color: "text-indigo-600 bg-indigo-50" },
                    { label: "Redeemed", value: stats.redeemed, icon: CheckCircle2, color: "text-amber-600 bg-amber-50" },
                    { label: "Pending Value", value: `₦${stats.totalValue.toLocaleString()}`, icon: Hash, color: "text-blue-600 bg-blue-50" },
                ].map(s => (
                    <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                        <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center mb-3", s.color)}>
                            <s.icon className="h-4 w-4" />
                        </div>
                        <div className="text-2xl font-black text-gray-900">{s.value}</div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mt-0.5">{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Last issued success bar */}
            {lastIssued.length > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
                    <div className="flex-1">
                        <p className="text-sm font-black text-emerald-900">{lastIssued.length} gift card{lastIssued.length > 1 ? "s" : ""} issued successfully</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {lastIssued.slice(0, 8).map(c => (
                                <button
                                    key={c.code}
                                    onClick={() => handleCopy(c.code)}
                                    className="px-3 py-1 bg-white border border-emerald-200 rounded-lg font-mono text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-colors flex items-center gap-1"
                                >
                                    {c.code}
                                    {copied === c.code ? <CheckCircle2 className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3 text-gray-400" />}
                                </button>
                            ))}
                            {lastIssued.length > 8 && <span className="text-xs text-emerald-600 font-bold self-center">+{lastIssued.length - 8} more</span>}
                        </div>
                    </div>
                    <button onClick={() => setLastIssued([])} className="text-emerald-500 hover:text-emerald-700 text-lg leading-none">×</button>
                </div>
            )}

            {/* Filters + Search */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="Search by code..."
                        className="pl-9 h-10 rounded-xl border-gray-200 bg-white font-medium"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex gap-1.5">
                    {["all", "active", "expired"].map(s => (
                        <button
                            key={s}
                            onClick={() => setStatusFilter(s)}
                            className={cn(
                                "px-3 h-10 rounded-xl text-xs font-black uppercase tracking-wide transition-colors",
                                statusFilter === s ? "bg-gray-900 text-white" : "bg-white border border-gray-200 text-gray-500 hover:border-gray-300"
                            )}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            </div>

            {/* Cards Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="h-8 w-8 animate-spin text-gray-300" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="py-20 text-center">
                        <Gift className="h-12 w-12 text-gray-200 mx-auto mb-3" />
                        <p className="text-sm font-black text-gray-400">No gift cards yet</p>
                        <p className="text-xs text-gray-400 mt-1">Issue your first batch above</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50/50">
                                    <th className="px-5 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-wider">Code</th>
                                    <th className="px-5 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-wider">Value</th>
                                    <th className="px-5 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-wider">Status</th>
                                    <th className="px-5 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-wider">Redeemed By</th>
                                    <th className="px-5 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-wider">Expiry</th>
                                    <th className="px-5 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filtered.map(card => {
                                    const isRedeemed = card.usageCount >= (card.usageLimit ?? 1);
                                    const isExpired = card.expiry ? new Date(card.expiry) < new Date() : false;
                                    return (
                                        <tr key={card.id} className="hover:bg-gray-50/60 transition-colors group">
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-sm font-black text-gray-900 tracking-wider">{card.code}</span>
                                                    <button
                                                        onClick={() => handleCopy(card.code)}
                                                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-gray-100"
                                                    >
                                                        {copied === card.code
                                                            ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                                            : <Copy className="h-3.5 w-3.5 text-gray-400" />
                                                        }
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className="text-sm font-black text-gray-900">₦{card.value.toLocaleString()}</span>
                                            </td>
                                            <td className="px-5 py-4">
                                                <Badge
                                                    variant="outline"
                                                    className={cn(
                                                        "text-[10px] font-black uppercase tracking-wide rounded-full px-2.5",
                                                        isRedeemed ? "bg-emerald-50 border-emerald-200 text-emerald-700" :
                                                            isExpired ? "bg-gray-100 border-gray-200 text-gray-500" :
                                                                "bg-amber-50 border-amber-200 text-amber-700"
                                                    )}
                                                >
                                                    {isRedeemed ? "Redeemed" : isExpired ? "Expired" : "Active"}
                                                </Badge>
                                            </td>
                                            <td className="px-5 py-4">
                                                {card.usages[0] ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-7 w-7 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-black text-emerald-700">
                                                            {card.usages[0].user.name.charAt(0)}
                                                        </div>
                                                        <span className="text-xs font-bold text-gray-700">{card.usages[0].user.name}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-gray-400">—</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className="text-xs text-gray-500 font-medium">
                                                    {card.expiry ? new Date(card.expiry).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }) : "No expiry"}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => setPreviewCard(card)}
                                                        className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                                                        title="Preview card"
                                                    >
                                                        <Eye className="h-3.5 w-3.5 text-gray-400" />
                                                    </button>
                                                    {!isRedeemed && (
                                                        <button
                                                            onClick={() => handleDelete(card.id)}
                                                            className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                                                            title="Deactivate"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5 text-red-400" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Preview Dialog */}
            <Dialog open={!!previewCard} onOpenChange={() => setPreviewCard(null)}>
                <DialogContent className="max-w-md rounded-3xl p-6 bg-white border-none shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-base font-black text-gray-900">Gift Card Preview</DialogTitle>
                        <DialogDescription className="text-xs text-gray-500">Visual representation of the issued card</DialogDescription>
                    </DialogHeader>
                    {previewCard && (
                        <div className="mt-2">
                            <GiftCardVisual
                                code={previewCard.code}
                                amount={previewCard.value}
                                expiresAt={previewCard.expiry}
                            />
                            <div className="mt-4 flex gap-2">
                                <button
                                    onClick={() => handleCopy(previewCard.code)}
                                    className="flex-1 h-10 rounded-xl bg-gray-900 text-white font-black text-xs flex items-center justify-center gap-2"
                                >
                                    {copied === previewCard.code ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                    {copied === previewCard.code ? "Copied!" : "Copy Code"}
                                </button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Issue Dialog */}
            <Dialog open={isIssueOpen} onOpenChange={setIsIssueOpen}>
                <DialogContent className="max-w-lg rounded-3xl p-0 bg-white border-none shadow-2xl overflow-hidden">
                    <div className="p-6 border-b border-gray-100">
                        <DialogTitle className="text-xl font-black text-gray-900 tracking-tight">Issue Gift Cards</DialogTitle>
                        <DialogDescription className="text-xs text-gray-500 mt-0.5">
                            Generate unique ₦2,000 welcome codes for new customers
                        </DialogDescription>
                    </div>

                    <div className="p-6 space-y-5">
                        {/* Preview */}
                        <GiftCardVisual
                            amount={parseFloat(issueForm.amount) || 2000}
                            expiresAt={issueForm.expiry || null}
                            preview
                        />

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-wider text-gray-400">Amount (₦)</Label>
                                <Input
                                    value={issueForm.amount}
                                    onChange={e => setIssueForm(p => ({ ...p, amount: e.target.value }))}
                                    className="h-10 rounded-xl font-black"
                                    placeholder="2000"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-wider text-gray-400">Quantity</Label>
                                <Input
                                    value={issueForm.count}
                                    onChange={e => setIssueForm(p => ({ ...p, count: e.target.value }))}
                                    className="h-10 rounded-xl font-black"
                                    placeholder="1"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-wider text-gray-400">Uses per code</Label>
                                <Input
                                    value={issueForm.usageLimit}
                                    onChange={e => setIssueForm(p => ({ ...p, usageLimit: e.target.value }))}
                                    className="h-10 rounded-xl font-black"
                                    placeholder="1"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-wider text-gray-400">Expires (optional)</Label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                                    <Input
                                        type="date"
                                        className="h-10 pl-9 rounded-xl font-medium"
                                        onChange={e => setIssueForm(p => ({ ...p, expiry: e.target.value }))}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                className="flex-1 h-11 rounded-xl font-black text-xs"
                                onClick={() => setIsIssueOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                className="flex-1 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs gap-2 shadow-lg shadow-emerald-100"
                                onClick={handleIssue}
                                disabled={issuing}
                            >
                                {issuing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gift className="h-4 w-4" />}
                                {issuing ? "Issuing..." : `Issue ${issueForm.count || 1} Card${parseInt(issueForm.count) > 1 ? "s" : ""}`}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
