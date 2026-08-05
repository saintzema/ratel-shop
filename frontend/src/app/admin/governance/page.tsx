"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
    ShieldCheck,
    AlertTriangle,
    CheckCircle2,
    XCircle,
    Clock,
    MessageSquare,
    User,
    FileText,
    ExternalLink,
    ChevronRight,
    Search,
    Filter,
    Gavel,
    ShieldAlert,
    ShoppingBag,
    Plus
} from "lucide-react";
import { DataSyncService } from "@/lib/sync-store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

// PATCH /api/sellers/[id] requires an admin bearer token for status/verified/kyc_status.
function patchSeller(sellerId: string, body: Record<string, any>) {
    const token = typeof window !== "undefined" ? localStorage.getItem("fp_token") : null;
    return fetch(`/api/sellers/${sellerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(body),
    });
}

export default function GovernanceCenter() {
    const [kycs, setKycs] = useState<any[]>([]);
    const [complaints, setComplaints] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<"kyc" | "disputes">("kyc");

    // Approve/Reject a governance item — handles both KYC submissions and pending sellers.
    const approveItem = async (item: any) => {
        if (item._isSeller) {
            DataSyncService.updateSeller(item.seller_id, { status: "active", verified: true, kyc_status: "approved" });
            try { await patchSeller(item.seller_id, { status: "active", verified: true, kyc_status: "approved" }); } catch {}
        } else {
            DataSyncService.updateKYCStatus(item.id, "approved");
        }
        loadAll();
    };
    const rejectItem = async (item: any) => {
        if (item._isSeller) {
            DataSyncService.updateSeller(item.seller_id, { status: "frozen", kyc_status: "rejected" });
            try { await patchSeller(item.seller_id, { status: "frozen", kyc_status: "rejected" }); } catch {}
        } else {
            DataSyncService.updateKYCStatus(item.id, "rejected");
        }
        loadAll();
    };

    const loadAll = () => {
        // Local KYC submissions (legacy)
        const localKyc = DataSyncService.getKYCSubmissions();
        // Pending sellers from the DB become approval items (onboarding doesn't create
        // KYCSubmission rows, so this is the real seller-approval queue)
        fetch("/api/sellers?all=true")
            .then(r => r.ok ? r.json() : [])
            .then((sellers: any[]) => {
                const pendingSellers = (Array.isArray(sellers) ? sellers : [])
                    .filter((s: any) => (s.status || s.status) === "pending")
                    .map((s: any) => ({
                        id: `seller_${s.id}`,
                        _isSeller: true,
                        seller_id: s.id,
                        seller_name: s.business_name || s.businessName || "New Seller",
                        id_type: "Onboarding / KYC",
                        id_number: s.owner_email || s.ownerEmail || "—",
                        status: "pending",
                        created_at: s.created_at || s.createdAt || new Date().toISOString(),
                        document_url: s.cac_document_url || s.cacDocumentUrl || s.id_document_url || `/admin/users/${s.id}`,
                    }));
                // Merge, de-dupe by seller_id
                const seen = new Set(pendingSellers.map(p => p.seller_id));
                const merged = [...pendingSellers, ...localKyc.filter((k: any) => !seen.has(k.seller_id))];
                setKycs(merged);
            })
            .catch(() => setKycs(localKyc));
    };

    useEffect(() => {
        const load = () => {
            loadAll();

            // Mirror logic from Admin Dashboard: merge complaints + disputed/cancelled orders
            const rawComplaints = DataSyncService.getComplaints();
            const allOrders = DataSyncService.getOrders();
            const disputedOrders = allOrders
                .filter(o => o.escrow_status === "disputed" || (o.status as string) === "cancelled" || (o.status as string) === "disputed")
                .map(o => ({
                    id: `dispute_${o.id}`,
                    user_name: o.customer_name || o.customer_id,
                    seller_name: o.product?.seller_name || "Unknown Seller",
                    description: o.escrow_status === "disputed" ? `Dispute on order #${o.id.substring(0, 8)} — ${o.product?.name}` : `Cancelled order #${o.id.substring(0, 8)} — ${o.product?.name}`,
                    status: "open",
                    created_at: o.updated_at || o.created_at,
                    order_id: o.id,
                    type: "order_dispute"
                }));
                
            const mergedComplaints = [...rawComplaints, ...disputedOrders.filter((d: any) => !rawComplaints.some(c => c.id === d.id))];
            setComplaints(mergedComplaints);
        };
        load();
        window.addEventListener("storage", load);
        return () => window.removeEventListener("storage", load);
    }, []);
    const pendingKyc = kycs.filter(k => k.status === "pending").sort((a, b) => new Date(b.submitted_at || 0).getTime() - new Date(a.submitted_at || 0).getTime());
    const activeDisputes = complaints.filter(c => c.status !== "resolved").sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

    const [msgModal, setMsgModal] = useState<{ open: boolean; caseId: string; userName: string }>({ open: false, caseId: "", userName: "" });
    const [logsModal, setLogsModal] = useState<{ open: boolean; complaint: any }>({ open: false, complaint: null });
    const [composeText, setComposeText] = useState("");

    const handleSendMessage = () => {
        if (!composeText.trim()) return;
        DataSyncService.addSupportMessage({
            user_name: "Admin",
            user_email: "admin@globalstores.shop",
            subject: `Re: Case #${msgModal.caseId} — Message to ${msgModal.userName}`,
            message: composeText,
            source: "contact_form",
        });
        setComposeText("");
        setMsgModal({ open: false, caseId: "", userName: "" });
    };

    return (
        <>
            <div className="space-y-10">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <h2 className="text-3xl font-black text-gray-900 tracking-tight">Governance Center</h2>
                        <p className="text-sm text-gray-500 font-bold uppercase tracking-wider mt-1">Platform trust, safety & dispute resolution</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="bg-white p-1.5 rounded-2xl border border-gray-100 flex gap-1 shadow-sm">
                            <button
                                onClick={() => setActiveTab("kyc")}
                                className={cn(
                                    "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2",
                                    activeTab === "kyc"
                                        ? "bg-indigo-600 text-white shadow-lg"
                                        : "text-gray-400 hover:text-gray-600"
                                )}
                            >
                                <ShieldCheck className="h-4 w-4" /> KYC Reviews
                                {pendingKyc.length > 0 && (
                                    <span className={cn(
                                        "px-1.5 py-0.5 rounded-full text-[9px] font-black",
                                        activeTab === "kyc" ? "bg-white/20" : "bg-indigo-100 text-indigo-600"
                                    )}>
                                        {pendingKyc.length}
                                    </span>
                                )}
                            </button>
                            <button
                                onClick={() => setActiveTab("disputes")}
                                className={cn(
                                    "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2",
                                    activeTab === "disputes"
                                        ? "bg-rose-600 text-white shadow-lg"
                                        : "text-gray-400 hover:text-gray-600"
                                )}
                            >
                                <Gavel className="h-4 w-4" /> Disputes
                                {activeDisputes.length > 0 && (
                                    <span className={cn(
                                        "px-1.5 py-0.5 rounded-full text-[9px] font-black",
                                        activeTab === "disputes" ? "bg-white/20" : "bg-rose-100 text-rose-600"
                                    )}>
                                        {activeDisputes.length}
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>


                {activeTab === "kyc" ? (
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-gray-100 bg-gray-50/50">
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Seller Details</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Verification Info</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status / Date</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {kycs.map((kyc) => (
                                        <tr key={kyc.id} className="hover:bg-gray-50/30 transition-colors group">
                                            <td className="px-6 py-5 align-middle">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-lg border border-indigo-100 shrink-0">
                                                        {kyc.seller_name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <Link href={`/admin/users/${kyc.seller_id}`} className="font-bold text-gray-900 text-sm hover:text-indigo-600 hover:underline">{kyc.seller_name}</Link>
                                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5"><Link href={`/admin/users/${kyc.seller_id}`} className="hover:text-indigo-500">Seller ID: {kyc.seller_id}</Link></p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 align-middle">
                                                <div className="flex items-center gap-2">
                                                    <FileText className="h-4 w-4 text-gray-400" />
                                                    <div>
                                                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{kyc.id_type}</p>
                                                        <p className="text-sm font-bold text-gray-900">{kyc.id_number}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 align-middle">
                                                <div className="flex flex-col items-start gap-1">
                                                    <span className={cn(
                                                        "text-[9px] font-black uppercase px-2 py-0.5 rounded-full inline-flex items-center gap-1",
                                                        kyc.status === "pending" ? "bg-amber-100 text-amber-600" :
                                                            kyc.status === "approved" ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
                                                    )}>
                                                        {kyc.status === "pending" && <Clock className="h-3 w-3" />}
                                                        {kyc.status === "approved" && <CheckCircle2 className="h-3 w-3" />}
                                                        {kyc.status === "rejected" && <XCircle className="h-3 w-3" />}
                                                        {kyc.status}
                                                    </span>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                                        {new Date(kyc.created_at).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 align-middle text-right">
                                                <div className="flex items-center justify-end gap-2 transition-opacity">
                                                    <Button variant="outline" size="sm" className="h-8 px-3 rounded-lg border-gray-200 font-bold text-[10px] uppercase tracking-widest hover:bg-gray-50 flex items-center gap-1.5" onClick={() => { const u = kyc._isSeller ? `/admin/users/${kyc.seller_id}` : kyc.document_url; if (u) window.open(u, kyc._isSeller ? '_self' : '_blank'); }}>
                                                        <ExternalLink className="h-3 w-3" /> {kyc._isSeller ? "Review" : "View Doc"}
                                                    </Button>
                                                    {kyc.status === "pending" && (
                                                        <>
                                                            <Button
                                                                onClick={() => approveItem(kyc)}
                                                                size="sm"
                                                                className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] uppercase tracking-widest"
                                                            >
                                                                Approve
                                                            </Button>
                                                            <Button
                                                                onClick={() => rejectItem(kyc)}
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-8 px-3 rounded-lg text-rose-600 hover:bg-rose-50 font-bold text-[10px] uppercase tracking-widest"
                                                            >
                                                                Reject
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6">
                        {complaints.length === 0 ? (
                            <div className="bg-white rounded-[32px] p-20 text-center border border-gray-100 shadow-sm">
                                <div className="h-20 w-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <ShieldCheck className="h-10 w-10 text-emerald-500" />
                                </div>
                                <h3 className="text-xl font-black text-gray-900">Clean Slate!</h3>
                                <p className="text-sm text-gray-500 font-bold uppercase tracking-wider mt-2">No active disputes reported on the platform</p>
                            </div>
                        ) : (
                            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-gray-100 bg-gray-50/50">
                                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Case & Details</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Reporter / Seller</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Violation Type</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {complaints.map((c) => (
                                                <tr key={c.id} className="hover:bg-gray-50/30 transition-colors group">
                                                    <td className="px-6 py-5 align-middle">
                                                        <div className="flex flex-col gap-1.5 max-w-sm">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] font-black text-rose-600 uppercase tracking-[0.2em]">#{c.id}</span>
                                                                <span className={cn(
                                                                    "text-[9px] font-black uppercase px-2 py-0.5 rounded-full inline-flex items-center gap-1",
                                                                    c.status === "open" ? "bg-rose-100 text-rose-700" :
                                                                        c.status === "investigating" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                                                                )}>
                                                                    {c.status}
                                                                </span>
                                                            </div>
                                                            <p className="text-sm font-bold text-gray-900 line-clamp-2">{c.description}</p>
                                                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">Order Ref: #{c.order_id?.toUpperCase() || c.id}</p>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 align-middle">
                                                        <div className="space-y-3">
                                                            <div>
                                                                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest flex items-center gap-1">
                                                                    <MessageSquare className="h-3 w-3" /> Reporter
                                                                </p>
                                                                <Link href={`/admin/users/${c.user_id || c.user_name || c.buyer_id}`} className="text-xs font-bold text-gray-900 mt-0.5 hover:text-indigo-600 hover:underline block">{c.user_name || c.buyer_name || 'Buyer'}</Link>
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest flex items-center gap-1">
                                                                    <User className="h-3 w-3" /> Target
                                                                </p>
                                                                <Link href={`/admin/users/${c.seller_id || c.seller_name}`} className="text-xs font-bold text-gray-900 mt-0.5 hover:text-indigo-600 hover:underline block">{c.seller_name || 'Seller'}</Link>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 align-top">
                                                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 text-gray-700 rounded-lg text-[10px] font-black uppercase tracking-widest border border-gray-200 mt-1">
                                                            <ShieldAlert className="h-3 w-3 text-rose-500" /> {c.reason ? c.reason.replace(/_/g, ' ') : c.type || 'Platform Dispute'}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 align-middle text-right">
                                                        <div className="flex flex-col items-end gap-2 transition-opacity">
                                                            <div className="flex gap-1.5">
                                                                <Link href="/admin/escrow?filter=disputed" className="h-8 w-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors" title="View Escrow">
                                                                    <ExternalLink className="h-3.5 w-3.5 text-gray-500" />
                                                                </Link>
                                                                <button onClick={() => setMsgModal({ open: true, caseId: c.id, userName: c.user_name })} className="h-8 w-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-blue-50 transition-colors" title="Message Buyer">
                                                                    <MessageSquare className="h-3.5 w-3.5 text-blue-500" />
                                                                </button>
                                                                {c.status !== "resolved" && (
                                                                    <>
                                                                        <button
                                                                            onClick={() => { DataSyncService.updateComplaintStatus(c.id, "investigating"); setComplaints(DataSyncService.getComplaints()); }}
                                                                            className="h-8 w-8 flex items-center justify-center rounded-lg bg-indigo-600 hover:bg-indigo-700 transition-colors"
                                                                            title="Investigate"
                                                                        >
                                                                            <Search className="h-3.5 w-3.5 text-white" />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => { DataSyncService.updateComplaintStatus(c.id, "resolved"); setComplaints(DataSyncService.getComplaints()); }}
                                                                            className="h-8 w-8 flex items-center justify-center rounded-lg bg-emerald-600 hover:bg-emerald-700 transition-colors"
                                                                            title="Resolve"
                                                                        >
                                                                            <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                                                                        </button>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Compose Message Modal */}
            <Dialog open={msgModal.open} onOpenChange={(open) => setMsgModal(prev => ({ ...prev, open }))}>
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-black">Message Buyer — {msgModal.userName}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <p className="text-xs text-gray-500">Regarding Case #{msgModal.caseId}</p>
                        <textarea
                            value={composeText}
                            onChange={e => setComposeText(e.target.value)}
                            placeholder="Type your message to the buyer..."
                            className="w-full h-32 px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setMsgModal({ open: false, caseId: "", userName: "" })}>Cancel</Button>
                        <Button onClick={handleSendMessage} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold">Send Message</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Case Logs Modal */}
            <Dialog open={logsModal.open} onOpenChange={(open) => setLogsModal(prev => ({ ...prev, open }))}>
                <DialogContent className="sm:max-w-[560px]">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-black">Case Logs — #{logsModal.complaint?.id}</DialogTitle>
                    </DialogHeader>
                    {logsModal.complaint && (
                        <div className="space-y-4 py-4 max-h-[400px] overflow-y-auto">
                            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</p>
                                    <p className="text-sm font-bold text-gray-900 mt-0.5">{logsModal.complaint.status}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Reporter</p>
                                    <p className="text-sm font-bold text-gray-900 mt-0.5">{logsModal.complaint.user_name}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Seller</p>
                                    <p className="text-sm font-bold text-gray-900 mt-0.5">{logsModal.complaint.seller_name}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Violation Type</p>
                                    <p className="text-sm font-bold text-gray-900 mt-0.5">{logsModal.complaint.type?.replace('_', ' ')}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Description</p>
                                    <p className="text-sm text-gray-700 mt-0.5">{logsModal.complaint.description}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Order Reference</p>
                                    <p className="text-sm font-bold text-gray-900 mt-0.5">#{logsModal.complaint.order_id?.toUpperCase()}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
