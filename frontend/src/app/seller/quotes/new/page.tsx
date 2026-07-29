"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Loader2, Plus, Trash2, FileText } from "lucide-react";
import { formatPrice } from "@/lib/utils";

interface LineItem {
    description: string;
    qty: number;
    unitPrice: number;
}

export default function NewQuotePage() {
    const router = useRouter();
    const [ask, setAsk] = useState("");
    const [generating, setGenerating] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [aiNotes, setAiNotes] = useState<string | null>(null);

    const [title, setTitle] = useState("");
    const [clientName, setClientName] = useState("");
    const [clientContact, setClientContact] = useState("");
    const [items, setItems] = useState<LineItem[]>([]);
    const [depositRequired, setDepositRequired] = useState(false);
    const [depositAmount, setDepositAmount] = useState("");

    const authHeaders = (): HeadersInit => {
        const token = typeof window !== "undefined" ? localStorage.getItem("fp_token") : null;
        return token ? { Authorization: `Bearer ${token}` } : {};
    };

    const total = items.reduce((sum, i) => sum + i.qty * i.unitPrice, 0);

    const generate = async () => {
        if (!ask.trim()) return;
        setGenerating(true);
        setError(null);
        try {
            const res = await fetch("/api/seller/quotes/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json", ...authHeaders() },
                body: JSON.stringify({ request: ask }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || "Couldn't draft a quote from that.");
                return;
            }
            setTitle(data.title);
            setItems(data.items);
            setAiNotes(data.notes || null);
        } catch {
            setError("Couldn't reach the AI service — check your connection and try again.");
        } finally {
            setGenerating(false);
        }
    };

    const updateItem = (idx: number, patch: Partial<LineItem>) => {
        setItems(prev => prev.map((it, i) => i === idx ? { ...it, ...patch } : it));
    };
    const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));
    const addItem = () => setItems(prev => [...prev, { description: "", qty: 1, unitPrice: 0 }]);

    const save = async () => {
        if (!title.trim() || !clientName.trim() || items.length === 0) {
            setError("Add a title, client name, and at least one line item.");
            return;
        }
        setSaving(true);
        setError(null);
        try {
            const res = await fetch("/api/seller/quotes", {
                method: "POST",
                headers: { "Content-Type": "application/json", ...authHeaders() },
                body: JSON.stringify({
                    title, clientName, clientContact, items,
                    depositRequired,
                    depositAmount: depositRequired ? Number(depositAmount) || 0 : undefined,
                    notes: aiNotes,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || "Couldn't save the quote.");
                return;
            }
            router.push(`/seller/quotes/${data.quote.id}`);
        } catch {
            setError("Couldn't reach the server — check your connection and try again.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
            <div className="max-w-3xl mx-auto py-6 sm:py-8 px-4 space-y-6 pb-24">
                <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-blue-600 to-indigo-800 p-6 sm:p-7 rounded-3xl text-white shadow-xl shadow-indigo-500/20">
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
                    <div className="relative flex items-center gap-3">
                        <div className="p-3 bg-white/15 rounded-2xl backdrop-blur-md border border-white/10">
                            <FileText className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-black tracking-tight">New Quote</h1>
                            <p className="text-indigo-100 text-xs sm:text-sm font-medium mt-0.5">Describe it in plain language — AI drafts the rest.</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-gray-100 shadow-sm p-5 sm:p-6 space-y-3">
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">What's this quote for?</label>
                    <Textarea
                        value={ask}
                        onChange={(e) => setAsk(e.target.value)}
                        placeholder='e.g. "quote for a 3.5KVA solar installation with workmanship" or "quote for importing a Xiaomi EV from China"'
                        className="min-h-[80px] rounded-2xl border-gray-200 bg-gray-50/60 focus:bg-white"
                    />
                    <motion.div whileTap={{ scale: 0.98 }}>
                        <Button
                            onClick={generate}
                            disabled={generating || !ask.trim()}
                            className="w-full h-11 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold shadow-md shadow-indigo-500/20"
                        >
                            {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                            Draft with AI
                        </Button>
                    </motion.div>
                    {aiNotes && <p className="text-xs text-amber-600 bg-amber-50 p-2.5 rounded-xl">⚠️ {aiNotes} — review every price below before sending.</p>}
                </div>

                {items.length > 0 && (
                    <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-gray-100 shadow-sm p-5 sm:p-6 space-y-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Quote Title</label>
                                <Input value={title} onChange={(e) => setTitle(e.target.value)} className="rounded-xl" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Client Name</label>
                                <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Who is this for?" className="rounded-xl" />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Client Phone / Email (optional)</label>
                            <Input value={clientContact} onChange={(e) => setClientContact(e.target.value)} className="rounded-xl" />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Line Items — edit any price</label>
                            {items.map((item, idx) => (
                                <div key={idx} className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center p-2.5 bg-gray-50/60 rounded-xl">
                                    <Input
                                        value={item.description}
                                        onChange={(e) => updateItem(idx, { description: e.target.value })}
                                        placeholder="Description"
                                        className="flex-1 rounded-lg bg-white text-sm"
                                    />
                                    <div className="flex gap-2">
                                        <Input
                                            type="number" min={1} value={item.qty}
                                            onChange={(e) => updateItem(idx, { qty: Math.max(1, Number(e.target.value) || 1) })}
                                            className="w-16 rounded-lg bg-white text-sm" title="Quantity"
                                        />
                                        <Input
                                            type="number" min={0} value={item.unitPrice}
                                            onChange={(e) => updateItem(idx, { unitPrice: Math.max(0, Number(e.target.value) || 0) })}
                                            className="w-32 rounded-lg bg-white text-sm" title="Unit Price (₦)"
                                        />
                                        <button onClick={() => removeItem(idx)} className="p-2 text-gray-400 hover:text-rose-500"><Trash2 className="h-4 w-4" /></button>
                                    </div>
                                </div>
                            ))}
                            <Button variant="outline" size="sm" onClick={addItem} className="rounded-xl text-xs font-bold">
                                <Plus className="h-3.5 w-3.5 mr-1" /> Add line item
                            </Button>
                        </div>

                        <div className="flex items-center justify-between text-base font-bold border-t border-gray-100 pt-4">
                            <span className="text-gray-500 text-sm">Total</span>
                            <span className="text-gray-900">{formatPrice(total)}</span>
                        </div>

                        <div className="space-y-2 border-t border-gray-100 pt-4">
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                <input type="checkbox" checked={depositRequired} onChange={(e) => setDepositRequired(e.target.checked)} className="rounded" />
                                Require a deposit before starting
                            </label>
                            {depositRequired && (
                                <Input
                                    type="number" min={0} max={total} value={depositAmount}
                                    onChange={(e) => setDepositAmount(e.target.value)}
                                    placeholder={`Deposit amount (of ${formatPrice(total)})`}
                                    className="rounded-xl"
                                />
                            )}
                        </div>

                        {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}

                        <Button
                            onClick={save}
                            disabled={saving}
                            className="w-full h-12 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-bold shadow-lg shadow-emerald-500/25"
                        >
                            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                            Create Quote
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
