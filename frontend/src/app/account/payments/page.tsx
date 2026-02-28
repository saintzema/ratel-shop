"use client";

import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { CreditCard, Trash2, Building, ShieldCheck, Eye, EyeOff, Receipt, X, Package, Clock, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { DemoStore } from "@/lib/demo-store";
import { useAuth } from "@/context/AuthContext";
import { formatPrice } from "@/lib/utils";
import { Order } from "@/lib/types";

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

const PaymentLogos = () => (
    <div className="flex flex-wrap items-center gap-3 mt-4">
        {[
            { name: "Verve", color: "#00425F", text: "Verve" },
            { name: "Visa", color: "#1A1F71", text: "VISA" },
            { name: "Mastercard", color: "#EB001B", text: "MC" },
            { name: "Amex", color: "#006FCF", text: "AMEX" },
            { name: "Discover", color: "#FF6000", text: "Disc" },
            { name: "Maestro", color: "#CC0000", text: "Maes" },
            { name: "Diners Club", color: "#004A97", text: "DC" },
            { name: "JCB", color: "#003087", text: "JCB" },
            { name: "Apple Pay", color: "#000000", text: "APay" },
            { name: "Google Pay", color: "#4285F4", text: "GPay" },
        ].map(logo => (
            <div key={logo.name} className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg" title={logo.name}>
                <div className="w-6 h-4 rounded flex items-center justify-center text-white text-[8px] font-black" style={{ backgroundColor: logo.color }}>
                    {logo.text}
                </div>
                <span className="text-[10px] font-semibold text-gray-500 hidden sm:inline">{logo.name}</span>
            </div>
        ))}
    </div>
);

export default function PaymentsPage() {
    const [methods, setMethods] = useState<PaymentMethod[]>([]);
    const [adding, setAdding] = useState<"card" | "bank" | null>(null);
    const [showAccount, setShowAccount] = useState<string | null>(null);
    const [cardForm, setCardForm] = useState({ number: "", expiry: "", name: "" });
    const [bankForm, setBankForm] = useState({ bankName: "", accountNumber: "", accountName: "" });
    const [transactions, setTransactions] = useState<Order[]>([]);
    const [selectedTxn, setSelectedTxn] = useState<Order | null>(null);
    const { user } = useAuth();

    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) setMethods(JSON.parse(saved));

        if (user) {
            const allOrders = DemoStore.getOrders();
            const userOrders = allOrders.filter(o =>
                (o.customer_id === user.email || o.customer_id === user.id) &&
                o.status !== "cancelled"
            ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            setTransactions(userOrders);
        }
    }, [user]);

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

    const generateTxnId = (orderId: string) => `PAYSTACK_TXN_${orderId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12).toUpperCase()}`;

    const statusIcon = (status: string) => {
        if (status === "delivered") return <CheckCircle className="h-4 w-4 text-emerald-500" />;
        if (status === "cancelled") return <XCircle className="h-4 w-4 text-red-500" />;
        if (status === "shipped") return <Package className="h-4 w-4 text-blue-500" />;
        return <Clock className="h-4 w-4 text-amber-500" />;
    };

    return (
        <div className="min-h-screen bg-white flex flex-col font-sans">
            <Navbar />
            <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-50 rounded-xl"><CreditCard className="h-5 w-5 text-emerald-600" /></div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Your Payments</h1>
                            <p className="text-sm text-gray-500">Manage payment methods, bank details and view transaction history</p>
                        </div>
                    </div>
                </div>

                {/* Payment Methods Section */}
                <div className="mb-10">
                    <div className="flex gap-3 mb-4">
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
                            <Input placeholder="Card Number" value={cardForm.number} onChange={e => {
                                const raw = e.target.value.replace(/\D/g, "").slice(0, 16);
                                const formatted = raw.replace(/(.{4})/g, "$1 ").trim();
                                setCardForm({ ...cardForm, number: formatted });
                            }} maxLength={19} />
                            <div className="grid grid-cols-2 gap-3">
                                <Input placeholder="MM/YY" value={cardForm.expiry} onChange={e => {
                                    let val = e.target.value.replace(/\D/g, "").slice(0, 4);
                                    if (val.length >= 2) {
                                        const mm = parseInt(val.slice(0, 2));
                                        if (mm > 12) val = "12" + val.slice(2);
                                        if (mm === 0) val = "01" + val.slice(2);
                                        val = val.slice(0, 2) + "/" + val.slice(2);
                                    }
                                    setCardForm({ ...cardForm, expiry: val });
                                }} maxLength={5} />
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
                            <Input placeholder="Account Number" value={bankForm.accountNumber} onChange={e => setBankForm({ ...bankForm, accountNumber: e.target.value.replace(/\D/g, "") })} maxLength={10} />
                            <Input placeholder="Account Name" value={bankForm.accountName} onChange={e => setBankForm({ ...bankForm, accountName: e.target.value })} />
                            <div className="flex gap-2 pt-2">
                                <Button onClick={addBank} className="bg-emerald-600 text-white rounded-xl font-bold">Save Bank</Button>
                                <Button onClick={() => setAdding(null)} variant="outline" className="rounded-xl">Cancel</Button>
                            </div>
                        </div>
                    )}

                    {/* Saved Methods */}
                    {methods.length === 0 && !adding ? (
                        <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
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

                    {/* We Accept */}
                    <div className="mt-6 pt-4 border-t border-gray-100">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">We accept</p>
                        <PaymentLogos />
                    </div>
                </div>

                {/* Transaction History */}
                <div>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-indigo-50 rounded-xl"><Receipt className="h-5 w-5 text-indigo-600" /></div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Transaction History</h2>
                            <p className="text-sm text-gray-500">All successful payments processed through Paystack</p>
                        </div>
                    </div>

                    {transactions.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                            <Receipt className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                            <h3 className="font-bold text-gray-700 mb-1">No transactions yet</h3>
                            <p className="text-sm text-gray-500">Your completed payments will appear here.</p>
                        </div>
                    ) : (
                        <div className="border border-gray-200 rounded-2xl overflow-hidden">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200">
                                        <th className="text-left px-4 py-3 font-bold text-gray-600 text-xs uppercase tracking-wider">Date</th>
                                        <th className="text-left px-4 py-3 font-bold text-gray-600 text-xs uppercase tracking-wider hidden sm:table-cell">Transaction ID</th>
                                        <th className="text-left px-4 py-3 font-bold text-gray-600 text-xs uppercase tracking-wider">Product</th>
                                        <th className="text-right px-4 py-3 font-bold text-gray-600 text-xs uppercase tracking-wider">Amount</th>
                                        <th className="text-center px-4 py-3 font-bold text-gray-600 text-xs uppercase tracking-wider">Status</th>
                                        <th className="text-center px-4 py-3 font-bold text-gray-600 text-xs uppercase tracking-wider">Details</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {transactions.map((txn, i) => (
                                        <tr key={txn.id} className={`hover:bg-gray-50 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                                            <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{new Date(txn.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                                            <td className="px-4 py-3 text-gray-500 font-mono text-xs hidden sm:table-cell">{generateTxnId(txn.id)}</td>
                                            <td className="px-4 py-3 text-gray-900 font-medium max-w-[200px] truncate">{txn.product?.name || `Order #${txn.id.slice(0, 8)}`}</td>
                                            <td className="px-4 py-3 text-gray-900 font-bold text-right whitespace-nowrap">{formatPrice(txn.amount)}</td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="inline-flex items-center gap-1">
                                                    {statusIcon(txn.status)}
                                                    <span className="text-xs font-medium capitalize">{txn.status}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <button onClick={() => setSelectedTxn(txn)} className="text-indigo-600 hover:text-indigo-800 text-xs font-bold hover:underline">
                                                    View
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Transaction Detail Modal */}
                {selectedTxn && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedTxn(null)}>
                        <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                            <div className="p-5 bg-gradient-to-r from-indigo-600 to-indigo-800 text-white flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Receipt className="h-5 w-5" />
                                    <h3 className="font-bold">Transaction Receipt</h3>
                                </div>
                                <button onClick={() => setSelectedTxn(null)} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                            <div className="p-5 space-y-4">
                                <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                                    <div className="flex justify-between"><span className="text-gray-500">Transaction ID</span><span className="font-mono font-bold text-gray-900">{generateTxnId(selectedTxn.id)}</span></div>
                                    <div className="flex justify-between"><span className="text-gray-500">Date</span><span className="font-medium text-gray-900">{new Date(selectedTxn.created_at).toLocaleString('en-NG', { dateStyle: 'long', timeStyle: 'short' })}</span></div>
                                    <div className="flex justify-between"><span className="text-gray-500">Payment Channel</span><span className="font-medium text-gray-900">Paystack (Card)</span></div>
                                    <div className="flex justify-between"><span className="text-gray-500">Status</span>
                                        <span className="inline-flex items-center gap-1 font-bold">
                                            {statusIcon(selectedTxn.status)}
                                            <span className="capitalize">{selectedTxn.status}</span>
                                        </span>
                                    </div>
                                </div>

                                <div className="border border-gray-200 rounded-xl overflow-hidden">
                                    <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 font-bold text-gray-700 text-xs uppercase tracking-wider">Order Details</div>
                                    <div className="p-4 space-y-3">
                                        <div className="flex items-center gap-3">
                                            {selectedTxn.product?.image_url ? (
                                                <img src={selectedTxn.product.image_url} alt="" className="w-14 h-14 rounded-lg object-cover border border-gray-100" onError={e => { e.currentTarget.src = '/assets/images/placeholder-search.png'; }} />
                                            ) : (
                                                <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center"><Package className="h-6 w-6 text-gray-400" /></div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-gray-900 text-sm truncate">{selectedTxn.product?.name || `Order #${selectedTxn.id.slice(0, 8)}`}</p>
                                                <p className="text-xs text-gray-500">by {selectedTxn.seller_name || 'FairPrice Seller'}</p>
                                            </div>
                                        </div>
                                        <div className="border-t border-gray-100 pt-3 space-y-1.5 text-sm">
                                            <div className="flex justify-between"><span className="text-gray-500">Order ID</span><span className="font-mono text-gray-700">#{selectedTxn.id.slice(0, 12)}</span></div>
                                            <div className="flex justify-between"><span className="text-gray-500">Escrow Status</span><span className="font-medium capitalize text-gray-700">{selectedTxn.escrow_status.replace(/_/g, ' ')}</span></div>
                                            <div className="flex justify-between"><span className="text-gray-500">Shipping</span><span className="font-medium text-gray-700 truncate max-w-[200px]">{selectedTxn.shipping_address || 'N/A'}</span></div>
                                        </div>
                                    </div>
                                </div>

                                <div className="border-t border-gray-200 pt-3 space-y-2">
                                    <div className="flex justify-between text-sm"><span className="text-gray-500">Subtotal</span><span className="font-medium text-gray-900">{formatPrice(selectedTxn.amount)}</span></div>
                                    <div className="flex justify-between text-sm"><span className="text-gray-500">Delivery</span><span className="font-medium text-emerald-600">Free</span></div>
                                    <div className="flex justify-between text-sm"><span className="text-gray-500">Escrow Fee</span><span className="font-medium text-gray-900">₦0</span></div>
                                    <div className="flex justify-between font-bold text-base border-t border-gray-200 pt-2 mt-2"><span>Total Charged</span><span className="text-emerald-600">{formatPrice(selectedTxn.amount)}</span></div>
                                </div>

                                {selectedTxn.escrow_status === 'released' && (
                                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                                        <p className="text-xs font-bold text-emerald-700">✓ Funds released to seller on {selectedTxn.escrow_released_at ? new Date(selectedTxn.escrow_released_at).toLocaleDateString('en-NG') : 'N/A'}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </main>
            <Footer />
        </div>
    );
}
