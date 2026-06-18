"use client";

import { useState, useEffect } from "react";
import { Search, Filter, MoreVertical, CheckCircle2, XCircle, Clock, Wallet, ArrowUpRight } from "lucide-react";
import { DataSyncService } from "@/lib/sync-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Pagination } from "@/components/ui/Pagination";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

export default function PayoutRequestsDirectory() {
    const [searchTerm, setSearchTerm] = useState("");
    const [view, setView] = useState<"all" | "processing" | "completed">("all");
    const [payouts, setPayouts] = useState<any[]>([]);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(25);

    // Override State
    const [selectedPayout, setSelectedPayout] = useState<any>(null);
    const [overrideAmount, setOverrideAmount] = useState<string>("");
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        const loadLocal = () => {
            setPayouts(DataSyncService.getPayouts().sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
        };

        // AUTHORITATIVE: fetch all payouts from the DB (admin scope). The local cache alone
        // misses payouts created on other devices / by sellers.
        const loadFromDB = async () => {
            try {
                const token = typeof window !== "undefined" ? localStorage.getItem("fp_token") : null;
                const res = await fetch("/api/payouts", {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                });
                if (!res.ok) return;
                const data = await res.json();
                const dbPayouts: any[] = data?.payouts || [];
                if (!Array.isArray(dbPayouts)) return;

                const sellers = DataSyncService.getSellers();
                const mapped = dbPayouts.map((p: any) => {
                    const seller = sellers.find((s: any) => s.id === p.sellerId);
                    return {
                        id: p.id,
                        seller_id: p.sellerId,
                        seller_name: seller?.business_name || p.sellerName || p.sellerId,
                        amount: p.amount,
                        status: p.status,
                        bank_name: p.bankName,
                        account_number: p.accountNumber,
                        account_name: p.accountName,
                        order_ids: p.orderIds || [],
                        created_at: (p.createdAt ? new Date(p.createdAt).toISOString() : new Date().toISOString()),
                    };
                });
                // Merge with any local-only payouts not yet in DB
                const dbIds = new Set(mapped.map(m => m.id));
                const localOnly = DataSyncService.getPayouts().filter((p: any) => !dbIds.has(p.id));
                const merged = [...mapped, ...localOnly].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                setPayouts(merged);
            } catch {
                /* keep local */
            }
        };

        loadLocal();
        loadFromDB();
        const onUpdate = () => { loadLocal(); loadFromDB(); };
        window.addEventListener("storage", onUpdate);
        window.addEventListener("sync-store-update", onUpdate);
        return () => {
            window.removeEventListener("storage", onUpdate);
            window.removeEventListener("sync-store-update", onUpdate);
        };
    }, []);

    const filtered = payouts.filter(p => {
        const matchesSearch = p.seller_name.toLowerCase().includes(searchTerm.toLowerCase()) || p.id.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesView = view === "all" || p.status === view;
        return matchesSearch && matchesView;
    });

    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // Reset page when search or view changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, view]);

    const handleApprovePayout = async () => {
        if (!selectedPayout) return;
        setIsProcessing(true);
        try {
            const finalAmount = parseFloat(overrideAmount) || selectedPayout.amount;
            
            // Call API to trigger Paystack
            const token = typeof window !== "undefined" ? localStorage.getItem("fp_token") : null;
            const res = await fetch("/api/payouts", {
                method: "PATCH",
                headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                body: JSON.stringify({
                    id: selectedPayout.id,
                    status: "completed",
                    finalAmount: finalAmount
                })
            });
            
            const data = await res.json();
            if (data.success || res.status === 202) {
                // Update local state and sync store
                DataSyncService.updatePayoutStatus(selectedPayout.id, "completed", finalAmount);
                window.dispatchEvent(new Event("storage"));

                // Track admin payout approved
                if (typeof window !== "undefined" && (window as any).pendo) {
                    (window as any).pendo.track("admin_payout_approved", {
                        payout_id: selectedPayout.id,
                        seller_id: selectedPayout.seller_id || "",
                        amount: selectedPayout.amount,
                        override_amount: finalAmount !== selectedPayout.amount ? finalAmount : 0,
                    });
                }
            } else {
                alert(`Error processing payout: ${data.error}`);
            }
        } catch (e) {
            console.error("Payout error", e);
            alert("Network error processing payout");
        } finally {
            setIsProcessing(false);
            setSelectedPayout(null);
            setOverrideAmount("");
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight">Payout Requests</h2>
                    <p className="text-sm text-gray-500 font-bold uppercase tracking-wider mt-1">Review and disburse seller earnings</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="bg-white p-1.5 rounded-2xl border border-gray-100 flex gap-1 shadow-sm">
                        {(["all", "processing", "completed"] as const).map((v) => (
                            <button
                                key={v}
                                onClick={() => setView(v)}
                                className={cn(
                                    "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                                    view === v
                                        ? "bg-indigo-600 text-white shadow-lg"
                                        : "text-gray-400 hover:text-gray-600"
                                )}
                            >
                                {v}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1 shadow-sm">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                        placeholder="Search by seller name or payout ID..."
                        className="pl-12 h-14 bg-white border-gray-100 rounded-[20px] text-sm font-medium"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Button className="h-14 px-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[20px] font-black uppercase tracking-widest text-xs shadow-lg shadow-indigo-500/20">
                    <Filter className="mr-2 h-4 w-4" /> Filter
                </Button>
            </div>

            <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50/50">
                            <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Transaction</th>
                            <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Seller Info</th>
                            <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Destination</th>
                            <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Status</th>
                            <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {paginated.map((p) => (
                            <tr key={p.id} className="group hover:bg-gray-50/50 transition-colors">
                                <td className="px-8 py-6">
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "h-10 w-10 rounded-xl flex items-center justify-center font-black shadow-sm",
                                            p.status === "completed" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                                        )}>
                                            <Wallet className="h-4 w-4" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-black text-gray-900 text-sm">₦{p.amount.toLocaleString()}</span>
                                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{p.id} • {p.order_ids?.length || 0} Orders</span>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-6">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-gray-900 text-sm">{p.seller_name}</span>
                                        <span className="text-[10px] text-gray-400 font-bold tracking-widest uppercase">ID: {p.seller_id.toUpperCase()}</span>
                                    </div>
                                </td>
                                <td className="px-8 py-6">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-gray-900 text-sm">{p.bank}</span>
                                        <span className="text-[11px] text-gray-500 font-bold">{p.method} •••• {p.account_last4}</span>
                                    </div>
                                </td>
                                <td className="px-8 py-6">
                                    <div className="flex items-center gap-2">
                                        <span className={cn(
                                            "text-[9px] font-black uppercase px-2 py-1 rounded-full flex items-center gap-1",
                                            p.status === "completed" ? "bg-emerald-100 text-emerald-700" :
                                                p.status === "processing" ? "bg-amber-100 text-amber-700" :
                                                    "bg-rose-100 text-rose-700"
                                        )}>
                                            {p.status === "completed" && <CheckCircle2 className="h-3 w-3" />}
                                            {p.status === "processing" && <Clock className="h-3 w-3" />}
                                            {p.status}
                                        </span>
                                        <span className="text-[10px] font-bold text-gray-400 ml-2">
                                            {new Date(p.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-8 py-6 text-right">
                                    {p.status === "processing" ? (
                                        <div className="flex items-center justify-end gap-2 transition-opacity">
                                            <Button
                                                size="sm"
                                                className="h-8 rounded-xl bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-600 font-bold text-[10px] uppercase tracking-wider transition-all"
                                                onClick={() => {
                                                    setSelectedPayout(p);
                                                    setOverrideAmount(p.amount.toString());
                                                }}
                                            >
                                                <CheckCircle2 className="mr-1 h-3 w-3" /> Mark Paid
                                            </Button>
                                        </div>
                                    ) : (
                                        <Button size="icon" variant="ghost" className="h-10 w-10 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                                            <MoreVertical className="h-4 w-4 text-gray-400" />
                                        </Button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {filtered.length === 0 && (
                    <div className="py-20 text-center">
                        <div className="h-16 w-16 bg-gray-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
                            <Wallet className="h-8 w-8 text-gray-300" />
                        </div>
                        <h3 className="text-lg font-black text-gray-900 mt-1">No payout requests</h3>
                        <p className="text-sm text-gray-400 font-bold uppercase tracking-wider mt-1">Sellers have not requested cashouts matching this criteria</p>
                    </div>
                )}

                <Pagination 
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    itemsPerPage={itemsPerPage}
                    totalItems={filtered.length}
                    onItemsPerPageChange={(val) => { setItemsPerPage(val); setCurrentPage(1); }}
                    type="payouts"
                />
            </div>

            {/* Payout Approval Modal */}
            <Dialog open={!!selectedPayout} onOpenChange={(open) => !open && setSelectedPayout(null)}>
                <DialogContent className="sm:max-w-md bg-white rounded-3xl p-6">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black">Approve Payout</DialogTitle>
                        <DialogDescription className="text-gray-500 text-sm font-medium mt-1">
                            Review and override the final disbursement amount before triggering the Paystack transfer.
                        </DialogDescription>
                    </DialogHeader>
                    
                    {selectedPayout && (
                        <div className="space-y-4 my-4">
                            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                                <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Seller</div>
                                <div className="font-black text-gray-900">{selectedPayout.seller_name}</div>
                                <div className="text-xs text-gray-500 mt-0.5">{selectedPayout.bank} • {selectedPayout.account_last4}</div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Calculated Amount</label>
                                <div className="font-black text-gray-400">₦{selectedPayout.amount.toLocaleString()}</div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-900 uppercase tracking-widest">Final Disbursed Amount (Override)</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-gray-400">₦</span>
                                    <Input
                                        type="number"
                                        className="pl-8 h-12 bg-white border-gray-200 rounded-xl font-black text-lg"
                                        value={overrideAmount}
                                        onChange={(e) => setOverrideAmount(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="flex gap-2 sm:justify-between mt-4">
                        <Button 
                            variant="ghost" 
                            className="rounded-xl font-bold uppercase tracking-wider text-xs"
                            onClick={() => setSelectedPayout(null)}
                            disabled={isProcessing}
                        >
                            Cancel
                        </Button>
                        <Button 
                            className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold uppercase tracking-wider text-xs"
                            onClick={handleApprovePayout}
                            disabled={isProcessing}
                        >
                            {isProcessing ? "Processing..." : "Confirm & Transfer"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
