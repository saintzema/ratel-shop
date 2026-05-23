"use client";

import { useState, useEffect } from "react";
import { 
    CreditCard, 
    User, 
    FileText, 
    CheckCircle, 
    Clock, 
    AlertCircle, 
    ExternalLink, 
    Search,
    Filter,
    ArrowRight,
    Building2,
    Briefcase,
    ShieldCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { format } from "date-fns";

export default function AdminFinancingDashboard() {
    const [applications, setApplications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState("all");

    useEffect(() => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('fp_token') : null;
        fetch(`/api/admin/financing?status=${filterStatus}&q=${encodeURIComponent(searchTerm)}`, {
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            }
        })
            .then(r => r.json())
            .then(d => { if (d.success) setApplications(d.applications || []); })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [filterStatus]);

    const filtered = applications.filter(app => {
        const matchesSearch = app.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             (app.businessName?.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesStatus = filterStatus === "all" || app.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case "approved": return "bg-emerald-100 text-emerald-700 border-emerald-200";
            case "rejected": return "bg-rose-100 text-rose-700 border-rose-200";
            case "under_review": return "bg-amber-100 text-amber-700 border-amber-200";
            default: return "bg-gray-100 text-gray-700 border-gray-200";
        }
    };

    return (
        <div className="max-w-7xl mx-auto p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
                <div className="flex items-center gap-5">
                    <div className="h-16 w-16 bg-indigo-600 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-indigo-200">
                        <CreditCard className="h-8 w-8" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Financing Pipeline</h1>
                        <p className="text-gray-500 font-medium mt-1">Manage BNPL applications and credit risk assessments.</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="bg-gray-50 p-1 rounded-2xl flex border border-gray-100">
                        {["all", "pending", "approved"].map((s) => (
                            <button
                                key={s}
                                onClick={() => setFilterStatus(s)}
                                className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${filterStatus === s ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: "Active Applications", value: "24", icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
                    { label: "Total Approved", value: "₦142.5M", icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50" },
                    { label: "Pending Review", value: "8", icon: AlertCircle, color: "text-rose-600", bg: "bg-rose-50" },
                    { label: "Risk Score Avg", value: "72/100", icon: ShieldCheck, color: "text-indigo-600", bg: "bg-indigo-50" },
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
                        <div className={`h-12 w-12 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center shrink-0`}>
                            <stat.icon className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{stat.label}</p>
                            <p className="text-xl font-black text-gray-900">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Content */}
            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by name, business or ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-11 pr-4 h-12 bg-white rounded-2xl border border-gray-200 text-sm font-medium focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Applicant</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Details</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Documents</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Status</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={5} className="px-8 py-10 h-24 bg-gray-50/20" />
                                    </tr>
                                ))
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-8 py-20 text-center text-gray-400 font-medium">No applications found matching your criteria.</td>
                                </tr>
                            ) : filtered.map((app) => (
                                <tr key={app.id} className="hover:bg-gray-50/50 transition-colors group">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-black shadow-sm border border-indigo-100 group-hover:scale-110 transition-transform">
                                                {app.customerName.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                                                    {app.customerName}
                                                    {app.type === 'business' && <Building2 className="h-3 w-3 text-amber-500" />}
                                                </p>
                                                <p className="text-xs text-gray-500 font-medium">{app.phoneNumber}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div>
                                            <p className="text-sm font-black text-gray-900">₦{app.loanAmount.toLocaleString()}</p>
                                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">{app.tenureMonths} Months Tenure</p>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex flex-wrap gap-2">
                                            {app.documents.cac && <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-100 rounded-lg font-bold text-[9px] px-2 py-0.5">CAC</Badge>}
                                            {app.documents.bankStatement && <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-100 rounded-lg font-bold text-[9px] px-2 py-0.5">BANK</Badge>}
                                            {!app.documents.financials && app.type === 'business' && <Badge variant="outline" className="bg-rose-50 text-rose-600 border-rose-100 rounded-lg font-bold text-[9px] px-2 py-0.5">MISSING AUDIT</Badge>}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <Badge className={`rounded-xl border font-black text-[10px] px-4 py-1.5 shadow-sm ${getStatusColor(app.status)}`}>
                                            {app.status.replace('_', ' ').toUpperCase()}
                                        </Badge>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-2">
                                            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-white hover:shadow-md transition-all">
                                                <FileText className="h-4 w-4 text-gray-500" />
                                            </Button>
                                            <Link href={`/admin/financing/${app.id}`}>
                                                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-white hover:shadow-md transition-all text-indigo-600">
                                                    <ExternalLink className="h-4 w-4" />
                                                </Button>
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
