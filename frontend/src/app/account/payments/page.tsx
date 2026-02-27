"use client";

import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { CreditCard, Plus, Trash2, Building, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";

interface PaymentMethod {
    id: string;
    type: "card" | "bank";
    label: string;
    last4: string;
    bankName?: string;
    accountName?: string;
    accountNumber?: string;
    expiry?: string;
    isDefault: boolean;
}

const STORAGE_KEY = "fp_payment_methods";

export default function PaymentsPage() {
    const [methods, setMethods] = useState<PaymentMethod[]>([]);
    const [adding, setAdding] = useState<"card" | "bank" | null>(null);
    const [showAccount, setShowAccount] = useState<string | null>(null);
    const [cardForm, setCardForm] = useState({ number: "", expiry: "", name: "" });
    const [bankForm, setBankForm] = useState({ bankName: "", accountNumber: "", accountName: "" });

    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) setMethods(JSON.parse(saved));
    }, []);

    const persist = (updated: PaymentMethod[]) => {
        setMethods(updated);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    };

    const addCard = () => {
        if (!cardForm.number || !cardForm.expiry || !cardForm.name) return;
        const last4 = cardForm.number.replace(/\s/g, "").slice(-4);
        const newCard: PaymentMethod = {
            id: `pm_${Date.now()}`, type: "card", label: `Card ending in ${last4}`, last4,
            expiry: cardForm.expiry, isDefault: methods.length === 0
        };
        persist([...methods, newCard]);
        setCardForm({ number: "", expiry: "", name: "" });
        setAdding(null);
    };

    const addBank = () => {
        if (!bankForm.bankName || !bankForm.accountNumber || !bankForm.accountName) return;
        const last4 = bankForm.accountNumber.slice(-4);
        const newBank: PaymentMethod = {
            id: `pm_${Date.now()}`, type: "bank", label: `${bankForm.bankName} ****${last4}`, last4,
            bankName: bankForm.bankName, accountName: bankForm.accountName, accountNumber: bankForm.accountNumber,
            isDefault: methods.length === 0
        };
        persist([...methods, newBank]);
        setBankForm({ bankName: "", accountNumber: "", accountName: "" });
        setAdding(null);
    };

    const remove = (id: string) => {
        const updated = methods.filter(m => m.id !== id);
        if (updated.length > 0 && !updated.some(m => m.isDefault)) updated[0].isDefault = true;
        persist(updated);
    };

    const setDefault = (id: string) => persist(methods.map(m => ({ ...m, isDefault: m.id === id })));

    const BANKS = ["Access Bank", "Zenith Bank", "GTBank", "First Bank", "UBA", "Fidelity Bank", "Union Bank", "Stanbic IBTC", "Sterling Bank", "Wema Bank", "Ecobank", "Keystone Bank", "FCMB", "Polaris Bank", "Jaiz Bank", "Kuda MFB", "Opay", "Palmpay", "Moniepoint"];

    return (
        <div className="min-h-screen bg-white flex flex-col font-sans">
            <Navbar />
            <main className="flex-1 container mx-auto px-4 py-8 max-w-3xl">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-50 rounded-xl"><CreditCard className="h-5 w-5 text-emerald-600" /></div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Your Payments</h1>
                            <p className="text-sm text-gray-500">Manage payment methods and bank details for refunds</p>
                        </div>
                    </div>
                </div>

                {/* Add Buttons */}
                <div className="flex gap-3 mb-6">
                    <Button onClick={() => setAdding("card")} className="bg-black text-white rounded-xl font-semibold">
                        <CreditCard className="h-4 w-4 mr-1" /> Add Card
                    </Button>
                    <Button onClick={() => setAdding("bank")} variant="outline" className="rounded-xl font-semibold border-emerald-500 text-emerald-700 hover:bg-emerald-50">
                        <Building className="h-4 w-4 mr-1" /> Add Bank (for refunds)
                    </Button>
                </div>

                {/* Add Card Form */}
                {adding === "card" && (
                    <div className="mb-6 p-5 border-2 border-dashed border-blue-300 rounded-2xl bg-blue-50/50 space-y-3">
                        <h3 className="font-bold text-gray-900">Add Debit/Credit Card</h3>
                        <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 p-2 rounded-lg">
                            <ShieldCheck className="h-4 w-4" /> Your card details are stored securely and encrypted
                        </div>
                        <Input placeholder="Card Number" value={cardForm.number} onChange={e => setCardForm({ ...cardForm, number: e.target.value })} maxLength={19} />
                        <div className="grid grid-cols-2 gap-3">
                            <Input placeholder="MM/YY" value={cardForm.expiry} onChange={e => setCardForm({ ...cardForm, expiry: e.target.value })} maxLength={5} />
                            <Input placeholder="Cardholder Name" value={cardForm.name} onChange={e => setCardForm({ ...cardForm, name: e.target.value })} />
                        </div>
                        <div className="flex gap-2 pt-2">
                            <Button onClick={addCard} className="bg-blue-600 text-white rounded-xl font-bold">Save Card</Button>
                            <Button onClick={() => setAdding(null)} variant="outline" className="rounded-xl">Cancel</Button>
                        </div>
                    </div>
                )}

                {/* Add Bank Form */}
                {adding === "bank" && (
                    <div className="mb-6 p-5 border-2 border-dashed border-emerald-300 rounded-2xl bg-emerald-50/50 space-y-3">
                        <h3 className="font-bold text-gray-900">Add Bank Account (for refunds)</h3>
                        <p className="text-xs text-gray-500">In case of returns or cancellations, refunds will be sent to this bank account.</p>
                        <select className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm bg-white" value={bankForm.bankName} onChange={e => setBankForm({ ...bankForm, bankName: e.target.value })}>
                            <option value="">Select Bank</option>
                            {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                        <Input placeholder="Account Number" value={bankForm.accountNumber} onChange={e => setBankForm({ ...bankForm, accountNumber: e.target.value })} maxLength={10} />
                        <Input placeholder="Account Name" value={bankForm.accountName} onChange={e => setBankForm({ ...bankForm, accountName: e.target.value })} />
                        <div className="flex gap-2 pt-2">
                            <Button onClick={addBank} className="bg-emerald-600 text-white rounded-xl font-bold">Save Bank</Button>
                            <Button onClick={() => setAdding(null)} variant="outline" className="rounded-xl">Cancel</Button>
                        </div>
                    </div>
                )}

                {/* Saved Methods */}
                {methods.length === 0 && !adding ? (
                    <div className="text-center py-16 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                        <CreditCard className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                        <h3 className="font-bold text-gray-700 mb-1">No payment methods saved</h3>
                        <p className="text-sm text-gray-500">Add a card for quick checkout or bank details for refunds.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {methods.map(m => (
                            <div key={m.id} className={`p-4 rounded-2xl border-2 transition-all ${m.isDefault ? "border-emerald-500 bg-emerald-50/30" : "border-gray-200 hover:border-gray-300"}`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${m.type === "card" ? "bg-blue-100" : "bg-emerald-100"}`}>
                                            {m.type === "card" ? <CreditCard className="h-5 w-5 text-blue-600" /> : <Building className="h-5 w-5 text-emerald-600" />}
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900 text-sm">{m.label}</p>
                                            {m.type === "card" && m.expiry && <p className="text-xs text-gray-500">Expires {m.expiry}</p>}
                                            {m.type === "bank" && (
                                                <div className="flex items-center gap-1">
                                                    <p className="text-xs text-gray-500">
                                                        {m.accountName} · {showAccount === m.id ? m.accountNumber : `****${m.last4}`}
                                                    </p>
                                                    <button onClick={() => setShowAccount(showAccount === m.id ? null : m.id)} className="text-gray-400 hover:text-gray-600">
                                                        {showAccount === m.id ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                                    </button>
                                                </div>
                                            )}
                                            {m.isDefault && <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">DEFAULT</span>}
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        {!m.isDefault && <button onClick={() => setDefault(m.id)} className="text-xs text-emerald-600 hover:underline px-2 py-1">Set Default</button>}
                                        <button onClick={() => remove(m.id)} className="p-1 text-gray-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
            <Footer />
        </div>
    );
}
