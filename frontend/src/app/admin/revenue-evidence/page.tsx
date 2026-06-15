"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import {
    Plus, Trash2, Printer, RefreshCw, DollarSign,
    ShoppingBag, Banknote, TrendingUp, FileText, X,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface OfflineTxn {
    id: string;
    amount: number;
    description: string;
    buyerName: string;
    paymentMethod: string;
    bankReference?: string;
    evidenceNote?: string;
    transactionDate: string;
}

interface Order {
    id: string;
    amount: number;
    status: string;
    paymentMethod: string;
    isDirectPayment: boolean;
    createdAt: string;
    customerName?: string;
    sellerName?: string;
    product?: { name: string };
}

interface Summary {
    orders: { list: Order[]; total: number; count: number };
    offline: { list: OfflineTxn[]; total: number; count: number };
    combined: { total: number; count: number; usd: number };
    monthly: Record<string, { orders: number; offline: number }>;
    generatedAt: string;
}

const fmt = (n: number) => `₦${n.toLocaleString("en-NG", { minimumFractionDigits: 0 })}`;
const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-NG", { day: "2-digit", month: "short", year: "numeric" });

const METHOD_LABELS: Record<string, string> = {
    bank_transfer: "Bank Transfer",
    cash: "Cash",
    ussd: "USSD",
    pos: "POS Terminal",
    paystack: "Paystack",
};

// ── Empty form state ──────────────────────────────────────────────────────────
const EMPTY_FORM = {
    amount: "",
    description: "",
    buyerName: "",
    paymentMethod: "bank_transfer",
    bankReference: "",
    evidenceNote: "",
    transactionDate: new Date().toISOString().slice(0, 10),
};

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function RevenueEvidencePage() {
    const { user } = useAuth();
    const router = useRouter();
    const [summary, setSummary] = useState<Summary | null>(null);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [tab, setTab] = useState<"offline" | "orders">("offline");
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const token = typeof window !== "undefined" ? localStorage.getItem("fp_token") : null;

    const load = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/revenue-summary", {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) setSummary(await res.json());
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user && (user as any).role !== "admin") router.replace("/");
        load();
    }, [user]);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch("/api/admin/offline-transactions", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify(form),
            });
            if (res.ok) {
                setForm(EMPTY_FORM);
                setShowForm(false);
                await load();
            } else {
                const err = await res.json();
                alert(err.error || "Failed to save");
            }
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Remove this transaction from evidence?")) return;
        setDeletingId(id);
        try {
            await fetch(`/api/admin/offline-transactions/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            await load();
        } finally {
            setDeletingId(null);
        }
    };

    const printReport = () => window.print();

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
        </div>
    );

    const s = summary!;
    const months = Object.entries(s.monthly).sort(([a], [b]) => b.localeCompare(a)).slice(0, 6);

    return (
        <>
            {/* ── Print-only title ── */}
            <div className="hidden print:block mb-6">
                <h1 className="text-2xl font-black">FairPrice.ng — Revenue Evidence Report</h1>
                <p className="text-sm text-gray-500">Generated: {fmtDate(s.generatedAt)} · Prepared for XPRIZE submission</p>
                <hr className="mt-4" />
            </div>

            <div className="max-w-5xl mx-auto px-4 py-6 print:px-0 print:py-0">

                {/* ── Header ── */}
                <div className="flex items-center justify-between mb-6 print:hidden">
                    <div>
                        <h1 className="text-xl font-black text-gray-900">Revenue Evidence</h1>
                        <p className="text-sm text-gray-400">Log offline payments + export a printable evidence report</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-gray-500 text-sm hover:bg-gray-50">
                            <RefreshCw className="w-4 h-4" /> Refresh
                        </button>
                        <button onClick={printReport} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-800">
                            <Printer className="w-4 h-4" /> Print / Export PDF
                        </button>
                        <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700">
                            <Plus className="w-4 h-4" /> Log Payment
                        </button>
                    </div>
                </div>

                {/* ── Stats cards ── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    {[
                        { icon: TrendingUp,   label: "Grand Total",       value: fmt(s.combined.total),   sub: `≈ $${s.combined.usd.toLocaleString()} USD`, color: "text-emerald-600 bg-emerald-50" },
                        { icon: ShoppingBag,  label: "Platform Orders",   value: fmt(s.orders.total),     sub: `${s.orders.count} orders`,          color: "text-blue-600 bg-blue-50" },
                        { icon: Banknote,     label: "Offline / Bank",    value: fmt(s.offline.total),    sub: `${s.offline.count} transactions`,   color: "text-violet-600 bg-violet-50" },
                        { icon: DollarSign,   label: "USD Equivalent",    value: `$${s.combined.usd.toLocaleString()}`, sub: "@ ₦1,620 / $1",    color: "text-orange-600 bg-orange-50" },
                    ].map(({ icon: Icon, label, value, sub, color }) => (
                        <div key={label} className="border border-gray-100 rounded-2xl p-4 bg-white shadow-sm">
                            <div className={`inline-flex items-center justify-center w-9 h-9 rounded-xl ${color} mb-3`}>
                                <Icon className="w-4 h-4" />
                            </div>
                            <div className="text-lg font-black text-gray-900">{value}</div>
                            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-0.5">{label}</div>
                            <div className="text-[10px] text-gray-400 mt-0.5">{sub}</div>
                        </div>
                    ))}
                </div>

                {/* ── Monthly breakdown ── */}
                {months.length > 0 && (
                    <div className="border border-gray-100 rounded-2xl p-5 bg-white shadow-sm mb-6">
                        <h2 className="text-sm font-black text-gray-500 uppercase tracking-wider mb-4">Monthly Revenue</h2>
                        <div className="space-y-3">
                            {months.map(([month, data]) => {
                                const total = data.orders + data.offline;
                                const maxVal = Math.max(...months.map(([, d]) => d.orders + d.offline), 1);
                                return (
                                    <div key={month} className="flex items-center gap-4">
                                        <span className="text-xs font-bold text-gray-400 w-16 flex-shrink-0">{month}</span>
                                        <div className="flex-1 flex items-center gap-2">
                                            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(total / maxVal) * 100}%` }} />
                                            </div>
                                            <span className="text-xs font-bold text-gray-700 w-28 text-right">{fmt(total)}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ── Tabs ── */}
                <div className="flex border-b border-gray-200 mb-4 print:hidden">
                    {(["offline", "orders"] as const).map(t => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            className={`px-5 py-2.5 text-sm font-bold border-b-2 transition-colors ${tab === t ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-400 hover:text-gray-600"}`}
                        >
                            {t === "offline" ? `Offline / Bank (${s.offline.count})` : `Platform Orders (${s.orders.count})`}
                        </button>
                    ))}
                </div>

                {/* ── Offline transactions table ── */}
                <div className={tab === "offline" ? "" : "hidden print:block"}>
                    <h2 className="hidden print:block text-base font-black mb-3 mt-6">Offline / Bank Transfer Payments</h2>
                    {s.offline.list.length === 0 ? (
                        <div className="text-center py-14 border border-dashed border-gray-200 rounded-2xl">
                            <FileText className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                            <p className="text-gray-400 font-bold text-sm">No offline payments logged yet</p>
                            <p className="text-gray-300 text-xs mt-1">Click "Log Payment" to add bank transfer records</p>
                        </div>
                    ) : (
                        <div className="border border-gray-100 rounded-2xl overflow-hidden bg-white shadow-sm">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-100 bg-gray-50">
                                        <th className="text-left px-4 py-3 text-xs font-black text-gray-400 uppercase tracking-wider">Date</th>
                                        <th className="text-left px-4 py-3 text-xs font-black text-gray-400 uppercase tracking-wider">Description</th>
                                        <th className="text-left px-4 py-3 text-xs font-black text-gray-400 uppercase tracking-wider">Buyer</th>
                                        <th className="text-left px-4 py-3 text-xs font-black text-gray-400 uppercase tracking-wider">Method</th>
                                        <th className="text-left px-4 py-3 text-xs font-black text-gray-400 uppercase tracking-wider">Ref</th>
                                        <th className="text-right px-4 py-3 text-xs font-black text-gray-400 uppercase tracking-wider">Amount</th>
                                        <th className="px-4 py-3 print:hidden" />
                                    </tr>
                                </thead>
                                <tbody>
                                    {s.offline.list.map((txn, i) => (
                                        <tr key={txn.id} className={`border-b border-gray-50 ${i % 2 === 0 ? "" : "bg-gray-50/50"}`}>
                                            <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtDate(txn.transactionDate)}</td>
                                            <td className="px-4 py-3 text-gray-900 font-medium max-w-[200px]">
                                                <div className="truncate">{txn.description}</div>
                                                {txn.evidenceNote && <div className="text-[10px] text-gray-400 mt-0.5 truncate">{txn.evidenceNote}</div>}
                                            </td>
                                            <td className="px-4 py-3 text-gray-600">{txn.buyerName}</td>
                                            <td className="px-4 py-3">
                                                <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-gray-100 text-gray-500 uppercase">
                                                    {METHOD_LABELS[txn.paymentMethod] || txn.paymentMethod}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-gray-400 font-mono text-xs">{txn.bankReference || "—"}</td>
                                            <td className="px-4 py-3 text-right font-black text-gray-900">{fmt(txn.amount)}</td>
                                            <td className="px-4 py-3 print:hidden">
                                                <button
                                                    onClick={() => handleDelete(txn.id)}
                                                    disabled={deletingId === txn.id}
                                                    className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="border-t-2 border-gray-200 bg-gray-50">
                                        <td colSpan={5} className="px-4 py-3 text-sm font-black text-gray-600">Total Offline Revenue</td>
                                        <td className="px-4 py-3 text-right font-black text-gray-900">{fmt(s.offline.total)}</td>
                                        <td className="print:hidden" />
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}
                </div>

                {/* ── Platform orders table ── */}
                <div className={tab === "orders" ? "" : "hidden print:block"}>
                    <h2 className="hidden print:block text-base font-black mb-3 mt-8">Platform Orders (Paystack + Escrow)</h2>
                    {s.orders.list.length === 0 ? (
                        <div className="text-center py-14 border border-dashed border-gray-200 rounded-2xl">
                            <ShoppingBag className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                            <p className="text-gray-400 font-bold text-sm">No platform orders yet</p>
                        </div>
                    ) : (
                        <div className="border border-gray-100 rounded-2xl overflow-hidden bg-white shadow-sm">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-100 bg-gray-50">
                                        <th className="text-left px-4 py-3 text-xs font-black text-gray-400 uppercase tracking-wider">Date</th>
                                        <th className="text-left px-4 py-3 text-xs font-black text-gray-400 uppercase tracking-wider">Product</th>
                                        <th className="text-left px-4 py-3 text-xs font-black text-gray-400 uppercase tracking-wider">Customer</th>
                                        <th className="text-left px-4 py-3 text-xs font-black text-gray-400 uppercase tracking-wider">Status</th>
                                        <th className="text-left px-4 py-3 text-xs font-black text-gray-400 uppercase tracking-wider">Method</th>
                                        <th className="text-right px-4 py-3 text-xs font-black text-gray-400 uppercase tracking-wider">Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {s.orders.list.map((order, i) => (
                                        <tr key={order.id} className={`border-b border-gray-50 ${i % 2 === 0 ? "" : "bg-gray-50/50"}`}>
                                            <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtDate(order.createdAt)}</td>
                                            <td className="px-4 py-3 text-gray-900 font-medium max-w-[180px]">
                                                <div className="truncate">{order.product?.name || "—"}</div>
                                            </td>
                                            <td className="px-4 py-3 text-gray-600">{order.customerName || "—"}</td>
                                            <td className="px-4 py-3">
                                                <span className={`text-[10px] font-bold px-2 py-1 rounded-lg uppercase ${
                                                    order.status === "delivered" ? "bg-emerald-100 text-emerald-600" :
                                                    order.status === "cancelled" ? "bg-red-100 text-red-500" :
                                                    "bg-amber-100 text-amber-600"
                                                }`}>
                                                    {order.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-gray-100 text-gray-500 uppercase">
                                                    {order.isDirectPayment ? "Direct" : METHOD_LABELS[order.paymentMethod] || order.paymentMethod}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right font-black text-gray-900">{fmt(order.amount)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="border-t-2 border-gray-200 bg-gray-50">
                                        <td colSpan={5} className="px-4 py-3 text-sm font-black text-gray-600">Total Platform Revenue</td>
                                        <td className="px-4 py-3 text-right font-black text-gray-900">{fmt(s.orders.total)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}
                </div>

                {/* ── Print footer ── */}
                <div className="hidden print:block mt-8 pt-4 border-t text-xs text-gray-400">
                    <p><strong>Grand Total Revenue:</strong> {summary && fmt(summary.combined.total)} (≈ ${summary?.combined.usd.toLocaleString()} USD at ₦1,620/$1)</p>
                    <p className="mt-1">This report covers all revenue generated by FairPrice.ng — both platform (Paystack escrow) and direct offline payments.</p>
                    <p className="mt-1">Prepared for Build with Gemini XPRIZE submission · fairprice.ng</p>
                </div>
            </div>

            {/* ── Add offline payment modal ── */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-gray-200">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                            <h2 className="font-black text-gray-900">Log Offline Payment</h2>
                            <button onClick={() => setShowForm(false)} className="p-1.5 hover:bg-gray-100 rounded-full">
                                <X className="w-4 h-4 text-gray-400" />
                            </button>
                        </div>
                        <form onSubmit={handleAdd} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Amount (₦) *</label>
                                    <input
                                        type="number" required min="1" step="0.01"
                                        value={form.amount}
                                        onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                                        placeholder="50000"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Date Received *</label>
                                    <input
                                        type="date" required
                                        value={form.transactionDate}
                                        onChange={e => setForm(f => ({ ...f, transactionDate: e.target.value }))}
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">What was sold *</label>
                                <input
                                    type="text" required
                                    value={form.description}
                                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                                    placeholder="iPhone 15 Pro Max 256GB — Natural Titanium"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Buyer Name *</label>
                                    <input
                                        type="text" required
                                        value={form.buyerName}
                                        onChange={e => setForm(f => ({ ...f, buyerName: e.target.value }))}
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                                        placeholder="Adunola Fashola"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Payment Method</label>
                                    <select
                                        value={form.paymentMethod}
                                        onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))}
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 bg-white"
                                    >
                                        <option value="bank_transfer">Bank Transfer</option>
                                        <option value="cash">Cash</option>
                                        <option value="ussd">USSD</option>
                                        <option value="pos">POS Terminal</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Bank Reference / Receipt No.</label>
                                <input
                                    type="text"
                                    value={form.bankReference}
                                    onChange={e => setForm(f => ({ ...f, bankReference: e.target.value }))}
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                                    placeholder="FBN/2026/06/TRF123456789"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Evidence Note (for judges)</label>
                                <textarea
                                    rows={2}
                                    value={form.evidenceNote}
                                    onChange={e => setForm(f => ({ ...f, evidenceNote: e.target.value }))}
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 resize-none"
                                    placeholder="Buyer found product via FairPrice AI price check, negotiated on WhatsApp, paid to company account"
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button" onClick={() => setShowForm(false)}
                                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-500 text-sm font-bold hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit" disabled={saving}
                                    className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 disabled:opacity-50"
                                >
                                    {saving ? "Saving…" : "Add to Evidence"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
