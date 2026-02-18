"use client";

import { useState, useEffect } from "react";
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
    ArrowUpRight,
    Gavel,
    ShieldAlert,
    ShoppingBag
} from "lucide-react";
import { DemoStore } from "@/lib/demo-store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function GovernanceCenter() {
    const [kycs, setKycs] = useState<any[]>([]);
    const [complaints, setComplaints] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<"kyc" | "disputes">("kyc");

    useEffect(() => {
        const load = () => {
            setKycs(DemoStore.getKYCSubmissions());
            setComplaints(DemoStore.getComplaints());
        };
        load();
        window.addEventListener("storage", load);
        return () => window.removeEventListener("storage", load);
    }, []);

    const pendingKyc = kycs.filter(k => k.status === "pending");
    const activeDisputes = complaints.filter(c => c.status !== "resolved");

    return (
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
                <div className="grid grid-cols-1 gap-6">
                    {kycs.map((kyc) => (
                        <div key={kyc.id} className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm transition-all hover:shadow-xl hover:shadow-indigo-500/5 group">
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                                <div className="flex items-center gap-6">
                                    <div className="h-16 w-16 rounded-[24px] bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-2xl border border-indigo-100">
                                        {kyc.seller_name.charAt(0)}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            <h4 className="font-black text-gray-900 text-xl tracking-tight">{kyc.seller_name}</h4>
                                            <span className={cn(
                                                "text-[9px] font-black uppercase px-2 py-0.5 rounded-full",
                                                kyc.status === "pending" ? "bg-amber-100 text-amber-600" :
                                                    kyc.status === "approved" ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
                                            )}>
                                                {kyc.status}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                                            <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest flex items-center gap-1.5">
                                                <User className="h-3 w-3" /> Seller ID: {kyc.seller_id}
                                            </p>
                                            <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest flex items-center gap-1.5">
                                                <FileText className="h-3 w-3" /> {kyc.id_type.toUpperCase()}: {kyc.id_number}
                                            </p>
                                            <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest flex items-center gap-1.5">
                                                <Clock className="h-3 w-3" /> Submitted: {new Date(kyc.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <Button variant="outline" className="h-12 px-6 rounded-2xl border-gray-200 font-black text-xs uppercase tracking-widest hover:bg-gray-50 flex items-center gap-2">
                                        <ExternalLink className="h-4 w-4" /> View Documents
                                    </Button>

                                    {kyc.status === "pending" && (
                                        <>
                                            <Button
                                                onClick={() => DemoStore.updateKYCStatus(kyc.id, "approved")}
                                                className="h-12 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-500/20"
                                            >
                                                Approve
                                            </Button>
                                            <Button
                                                onClick={() => DemoStore.updateKYCStatus(kyc.id, "rejected")}
                                                variant="ghost"
                                                className="h-12 px-6 rounded-2xl text-rose-600 hover:bg-rose-50 font-black text-xs uppercase tracking-widest"
                                            >
                                                Reject
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
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
                        complaints.map((c) => (
                            <div key={c.id} className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden flex flex-col lg:flex-row group transition-all hover:shadow-xl hover:shadow-rose-500/5">
                                <div className={cn(
                                    "w-3 lg:w-4 flex-shrink-0",
                                    c.status === "open" ? "bg-rose-500" : c.status === "investigating" ? "bg-amber-500" : "bg-emerald-500"
                                )} />
                                <div className="flex-1 p-8">
                                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-8 mb-6">
                                        <div>
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className="text-[10px] font-black text-rose-600 uppercase tracking-[0.2em]">Dispute #{c.id}</span>
                                                <span className={cn(
                                                    "text-[10px] font-black uppercase px-2 py-0.5 rounded-full",
                                                    c.status === "open" ? "bg-rose-50 text-rose-600" :
                                                        c.status === "investigating" ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"
                                                )}>
                                                    {c.status}
                                                </span>
                                            </div>
                                            <h3 className="text-xl font-black text-gray-900 tracking-tight">{c.description}</h3>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Case Reporter</p>
                                            <p className="text-sm font-bold text-gray-900">{c.user_name}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 p-6 bg-gray-50/50 rounded-2xl border border-gray-100">
                                        <div>
                                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                                <ShieldAlert className="h-3 w-3" /> Violation Type
                                            </p>
                                            <p className="text-sm font-black text-rose-600 capitalize">{c.type.replace('_', ' ')}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                                <ShoppingBag className="h-3 w-3" /> Linked Order
                                            </p>
                                            <p className="text-sm font-black text-gray-900">#{c.order_id.toUpperCase()}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                                <User className="h-3 w-3" /> Target Seller
                                            </p>
                                            <p className="text-sm font-black text-gray-900">{c.seller_name}</p>
                                        </div>
                                    </div>

                                    <div className="mt-8 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Button variant="outline" size="sm" className="h-9 px-4 rounded-xl border-gray-200 font-bold text-[11px] uppercase tracking-wider">
                                                View Full Logs
                                            </Button>
                                            <Button variant="outline" size="sm" className="h-9 px-4 rounded-xl border-gray-200 font-bold text-[11px] uppercase tracking-wider">
                                                Message Buyer
                                            </Button>
                                        </div>

                                        {c.status !== "resolved" && (
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    onClick={() => DemoStore.updateComplaintStatus(c.id, "investigating")}
                                                    className="h-10 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-500/20"
                                                >
                                                    Mark Investigating
                                                </Button>
                                                <Button
                                                    onClick={() => DemoStore.updateComplaintStatus(c.id, "resolved")}
                                                    className="h-10 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-500/20"
                                                >
                                                    Resolve Case
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Platform Trust Banner */}
            <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg">
                        <ShieldCheck className="h-6 w-6" />
                    </div>
                    <div>
                        <h4 className="font-black text-gray-900 tracking-tight">Manual Escrow Override</h4>
                        <p className="text-xs text-gray-400 font-bold uppercase mt-0.5">Authorized Admins only • Action is recorded for audit</p>
                    </div>
                </div>
                <Button className="h-12 px-8 bg-black text-white font-black uppercase tracking-widest text-[10px] rounded-2xl">
                    Open Escrow Controls
                </Button>
            </div>
        </div>
    );
}
