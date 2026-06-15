"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    ArrowLeft, Building2, User, FileText, CheckCircle2, Clock,
    XCircle, MessageSquare, Download, Send, Loader2, RefreshCw,
    BadgeCheck, AlertTriangle, ChevronDown, PenLine, Phone, Mail,
    Shield, CreditCard, Calendar, Package, Eye, EyeOff, Copy, Check as CheckIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { format } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Director {
    id: string;
    name: string;
    title: string;
    idType: string;
    idNumber: string;
    bvn: string;
    signatureDataUrl: string | null;
}

interface FinancingApplication {
    id: string;
    type: string;
    status: string;
    customerName: string;
    email: string;
    businessName: string | null;
    phoneNumber: string | null;
    loanAmount: number;
    tenureMonths: number;
    monthlyRepayment: number;
    depositAmount: number;
    interestRate: number;
    applicationType: string | null;
    contractType: string | null;
    signatureDataUrl: string | null;
    companyRegistrationNumber: string | null;
    companyLogoBase64: string | null;
    directorsJson: string | null;
    boardResolutionDataUrl: string | null;
    adminNotes: string | null;
    createdAt: string;
    updatedAt: string;
    // Document URLs
    cacDocumentUrl: string | null;
    auditedFinancialsUrl: string | null;
    bankStatementUrl: string | null;
    payslipsUrl: string[];
    documentsJson: string | null;
    product: { name: string; imageUrl: string; price: number; category: string } | null;
    user: { id: string; name: string; email: string; phone: string | null; whatsappNumber: string | null; createdAt: string } | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    pending:      { label: "Pending",      color: "bg-gray-100 text-gray-700 border-gray-200",   icon: Clock },
    under_review: { label: "Under Review", color: "bg-amber-100 text-amber-700 border-amber-200", icon: RefreshCw },
    approved:     { label: "Approved",     color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
    rejected:     { label: "Rejected",     color: "bg-rose-100 text-rose-700 border-rose-200",   icon: XCircle },
};

function Pill({ status }: { status: string }) {
    const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
    const Icon = cfg.icon;
    return (
        <Badge className={`rounded-xl border font-black text-[10px] px-3 py-1 flex items-center gap-1 w-fit ${cfg.color}`}>
            <Icon className="h-3 w-3" /> {cfg.label}
        </Badge>
    );
}

function InfoRow({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
    if (!value) return null;
    return (
        <div className="flex items-start gap-4 py-2 border-b border-gray-50 last:border-0">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 w-36 shrink-0 pt-0.5">{label}</span>
            <span className={`text-xs font-medium text-gray-800 ${mono ? 'font-mono' : ''}`}>{value}</span>
        </div>
    );
}

function SectionCard({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
    return (
        <div className="bg-white rounded-[1.5rem] border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-50 bg-gray-50/40">
                <Icon className="h-4 w-4 text-gray-400" />
                <h3 className="text-xs font-black uppercase tracking-widest text-gray-600">{title}</h3>
            </div>
            <div className="p-6">{children}</div>
        </div>
    );
}

// ─── Document viewer: renders a file URL or base64 ───────────────────────────
function DocChip({ label, url }: { label: string; url: string | null | undefined }) {
    if (!url) return (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-gray-200 bg-gray-50">
            <FileText className="h-3.5 w-3.5 text-gray-300" />
            <span className="text-[10px] font-bold text-gray-300">{label} — Not uploaded</span>
        </div>
    );
    return (
        <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            download={label}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 transition-colors group"
        >
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            <span className="text-[10px] font-bold text-emerald-700 flex-1">{label}</span>
            <Download className="h-3 w-3 text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        </a>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminFinancingDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const [app, setApp] = useState<FinancingApplication | null>(null);
    const [loading, setLoading] = useState(true);
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const [message, setMessage] = useState("");
    const [sending, setSending] = useState(false);
    const [sentOk, setSentOk] = useState(false);
    const [adminNotesDraft, setAdminNotesDraft] = useState("");
    const [savingNotes, setSavingNotes] = useState(false);
    const [bvnVisible, setBvnVisible] = useState<Record<number, boolean>>({});
    const [bvnCopied, setBvnCopied] = useState<Record<number, boolean>>({});

    const revealBvn = (idx: number) => setBvnVisible(p => ({ ...p, [idx]: !p[idx] }));
    const copyBvn = (idx: number, bvn: string) => {
        navigator.clipboard.writeText(bvn).then(() => {
            setBvnCopied(p => ({ ...p, [idx]: true }));
            setTimeout(() => setBvnCopied(p => ({ ...p, [idx]: false })), 2000);
        });
    };
    const token = typeof window !== "undefined" ? localStorage.getItem("fp_token") : null;

    const authHeaders = () => ({
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    });

    useEffect(() => {
        if (!id) return;
        setLoading(true);
        fetch(`/api/admin/financing/${id}`, { headers: authHeaders() })
            .then(r => r.json())
            .then(d => {
                if (d.success) { setApp(d.application); setAdminNotesDraft(d.application.adminNotes || ""); }
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [id]);

    const updateStatus = async (newStatus: string) => {
        if (!app) return;
        setUpdatingStatus(true);
        const res = await fetch(`/api/admin/financing/${id}`, {
            method: "PATCH",
            headers: authHeaders(),
            body: JSON.stringify({ status: newStatus }),
        });
        const d = await res.json();
        if (d.success) setApp(prev => prev ? { ...prev, status: newStatus } : prev);
        setUpdatingStatus(false);
    };

    const saveNotes = async () => {
        setSavingNotes(true);
        await fetch(`/api/admin/financing/${id}`, {
            method: "PATCH",
            headers: authHeaders(),
            body: JSON.stringify({ adminNotes: adminNotesDraft }),
        });
        setSavingNotes(false);
    };

    const sendMessage = async () => {
        if (!message.trim()) return;
        setSending(true);
        await fetch(`/api/admin/financing/${id}/message`, {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify({ message }),
        });
        setMessage("");
        setSentOk(true);
        setSending(false);
        setTimeout(() => setSentOk(false), 3000);
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
    );

    if (!app) return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-4">
            <AlertTriangle className="h-10 w-10 text-amber-400" />
            <p className="text-sm font-bold text-gray-500">Application not found</p>
            <Link href="/admin/financing"><Button variant="outline" size="sm">Back to list</Button></Link>
        </div>
    );

    const directors: Director[] = app.directorsJson ? JSON.parse(app.directorsJson) : [];
    const isBusiness = app.type === "business";
    const fmt = (n: number) => new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(n);

    return (
        <div className="max-w-5xl mx-auto p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Back + header */}
            <div className="flex items-center gap-4">
                <button onClick={() => router.push("/admin/financing")} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
                    <ArrowLeft className="h-4 w-4 text-gray-500" />
                </button>
                <div className="flex-1">
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                        {isBusiness ? app.businessName || app.customerName : app.customerName}
                    </h1>
                    <p className="text-xs text-gray-400 font-medium mt-0.5">Application #{app.id} · Submitted {format(new Date(app.createdAt), "d MMM yyyy, HH:mm")}</p>
                </div>
                <Pill status={app.status} />
            </div>

            {/* Status actions */}
            <div className="flex items-center gap-2 flex-wrap">
                {["pending", "under_review", "approved", "rejected"].map(s => (
                    <button
                        key={s}
                        onClick={() => updateStatus(s)}
                        disabled={updatingStatus || app.status === s}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all disabled:opacity-40 ${
                            app.status === s
                                ? "bg-indigo-600 text-white border-indigo-600"
                                : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600"
                        }`}
                    >
                        {updatingStatus && app.status !== s ? <Loader2 className="h-3 w-3 animate-spin inline mr-1" /> : null}
                        {s.replace("_", " ")}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left column — applicant + loan details */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Financing terms */}
                    <SectionCard title="Financing Terms" icon={CreditCard}>
                        <div className="grid grid-cols-2 gap-x-8">
                            <InfoRow label="Loan Amount" value={fmt(app.loanAmount)} />
                            <InfoRow label="Deposit" value={fmt(app.depositAmount)} />
                            <InfoRow label="Monthly" value={fmt(app.monthlyRepayment)} />
                            <InfoRow label="Tenure" value={`${app.tenureMonths} months`} />
                            <InfoRow label="Interest" value={String(app.interestRate) + "%"} />
                            <InfoRow label="Contract" value={app.contractType?.replace("_", " ") || "—"} />
                            <InfoRow label="Type" value={app.applicationType?.replace("_", " ") || "—"} />
                        </div>
                    </SectionCard>

                    {/* Product */}
                    {app.product && (
                        <SectionCard title="Product" icon={Package}>
                            <div className="flex items-center gap-4">
                                {app.product.imageUrl && (
                                    <img src={app.product.imageUrl} alt={app.product.name} className="h-14 w-14 rounded-xl object-cover border border-gray-100" />
                                )}
                                <div>
                                    <p className="text-sm font-black text-gray-900">{app.product.name}</p>
                                    <p className="text-xs text-gray-500 mt-0.5">{app.product.category} · {fmt(app.product.price)}</p>
                                </div>
                            </div>
                        </SectionCard>
                    )}

                    {/* Applicant info */}
                    <SectionCard title="Applicant" icon={isBusiness ? Building2 : User}>
                        <InfoRow label="Name" value={app.customerName} />
                        <InfoRow label="Email" value={app.email} />
                        <InfoRow label="Phone" value={app.phoneNumber || app.user?.phone} />
                        <InfoRow label="WhatsApp" value={app.user?.whatsappNumber} mono />
                        {isBusiness && <>
                            <InfoRow label="Business" value={app.businessName} />
                            <InfoRow label="RC Number" value={app.companyRegistrationNumber} mono />
                        </>}
                        {app.user?.createdAt && <InfoRow label="Member since" value={format(new Date(app.user.createdAt), "d MMM yyyy")} />}
                    </SectionCard>

                    {/* Directors (business) */}
                    {isBusiness && directors.length > 0 && (
                        <SectionCard title="Directors" icon={Shield}>
                            <div className="space-y-4">
                                {app.companyLogoBase64 && (
                                    <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100 mb-2">
                                        <img src={app.companyLogoBase64} alt="Company Logo" className="h-10 w-auto max-w-[100px] object-contain" />
                                        <span className="text-[10px] font-bold text-gray-500">Company Letterhead Logo</span>
                                    </div>
                                )}
                                {directors.map((d, i) => (
                                    <div key={d.id} className="p-4 rounded-xl border border-gray-100 bg-gray-50">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <p className="text-sm font-black text-gray-900">{d.name}</p>
                                                <p className="text-[10px] font-bold text-gray-500 mt-0.5">{d.title}</p>
                                                <p className="text-[10px] text-gray-400 mt-1">{d.idType}: <span className="font-mono">{d.idNumber}</span></p>
                                                {d.bvn && (
                                                    <div className="flex items-center gap-1.5 mt-1">
                                                        <span className="text-[10px] text-gray-400">BVN:</span>
                                                        <span className="text-[10px] font-mono text-gray-700 tracking-wider select-all">
                                                            {bvnVisible[i] ? d.bvn : ('•'.repeat(7) + d.bvn.slice(-4))}
                                                        </span>
                                                        <button
                                                            onClick={() => revealBvn(i)}
                                                            className="p-0.5 rounded text-gray-400 hover:text-indigo-600 transition-colors"
                                                            title={bvnVisible[i] ? 'Hide' : 'Reveal BVN'}
                                                        >
                                                            {bvnVisible[i] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                                        </button>
                                                        {bvnVisible[i] && (
                                                            <button
                                                                onClick={() => copyBvn(i, d.bvn)}
                                                                className="p-0.5 rounded text-gray-400 hover:text-emerald-600 transition-colors"
                                                                title="Copy BVN"
                                                            >
                                                                {bvnCopied[i] ? <CheckIcon className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            {d.signatureDataUrl && (
                                                <div className="text-right">
                                                    <p className="text-[9px] font-bold text-gray-400 mb-1">Signature</p>
                                                    <img src={d.signatureDataUrl} alt={`${d.name} signature`} className="h-10 border border-gray-200 rounded-lg bg-white" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </SectionCard>
                    )}

                    {/* Applicant signature */}
                    {app.signatureDataUrl && (
                        <SectionCard title="Applicant Signature" icon={PenLine}>
                            <img src={app.signatureDataUrl} alt="Applicant signature" className="max-h-20 border border-gray-200 rounded-xl bg-white p-2" />
                        </SectionCard>
                    )}

                    {/* Documents */}
                    <SectionCard title="Documents" icon={FileText}>
                        <div className="space-y-2">
                            <DocChip label="CAC Documents" url={app.cacDocumentUrl} />
                            <DocChip label="Audited Financials" url={app.auditedFinancialsUrl} />
                            <DocChip label="Bank Statement" url={app.bankStatementUrl} />
                            {(app.payslipsUrl || []).map((url, i) => (
                                <DocChip key={i} label={`Payslip ${i + 1}`} url={url} />
                            ))}
                            {app.boardResolutionDataUrl && (
                                <DocChip label="Board Resolution" url={app.boardResolutionDataUrl} />
                            )}
                        </div>

                        {/* If docs are only metadata (no uploaded URLs yet) show from documentsJson */}
                        {app.documentsJson && (
                            <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-100">
                                <p className="text-[10px] font-bold text-amber-600 mb-1">
                                    ⚠️ Documents submitted via form — not yet uploaded to storage.
                                </p>
                                <p className="text-[10px] text-amber-500">
                                    The applicant submitted document metadata. File upload to cloud storage is pending.
                                </p>
                            </div>
                        )}
                    </SectionCard>
                </div>

                {/* Right column — messaging + admin notes */}
                <div className="space-y-6">
                    {/* Send message */}
                    <SectionCard title="Message Applicant" icon={MessageSquare}>
                        <p className="text-[10px] text-gray-400 mb-3 leading-relaxed">
                            Sent via notification bell, inbox chat, and email simultaneously.
                        </p>
                        <textarea
                            value={message}
                            onChange={e => setMessage(e.target.value)}
                            placeholder="e.g. We need your latest payslip to proceed with your application..."
                            rows={4}
                            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs font-medium text-gray-800 placeholder-gray-300 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 resize-none"
                        />
                        <Button
                            onClick={sendMessage}
                            disabled={sending || !message.trim()}
                            className="w-full mt-2 h-9 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold disabled:opacity-50"
                        >
                            {sending
                                ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Sending…</>
                                : sentOk
                                    ? <><CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Sent!</>
                                    : <><Send className="h-3.5 w-3.5 mr-1.5" /> Send Message</>
                            }
                        </Button>
                    </SectionCard>

                    {/* Quick contact links */}
                    <SectionCard title="Quick Contact" icon={Phone}>
                        <div className="space-y-2">
                            {(app.email || app.user?.email) && (
                                <a
                                    href={`mailto:${app.email || app.user?.email}?subject=Your FairPrice Financing Application`}
                                    className="flex items-center gap-2 p-2.5 rounded-xl hover:bg-gray-50 border border-gray-100 transition-colors"
                                >
                                    <Mail className="h-3.5 w-3.5 text-gray-400" />
                                    <span className="text-[10px] font-bold text-gray-600 truncate">{app.email || app.user?.email}</span>
                                </a>
                            )}
                            {(app.phoneNumber || app.user?.phone) && (
                                <a
                                    href={`tel:${app.phoneNumber || app.user?.phone}`}
                                    className="flex items-center gap-2 p-2.5 rounded-xl hover:bg-gray-50 border border-gray-100 transition-colors"
                                >
                                    <Phone className="h-3.5 w-3.5 text-gray-400" />
                                    <span className="text-[10px] font-bold text-gray-600">{app.phoneNumber || app.user?.phone}</span>
                                </a>
                            )}
                            {app.user?.whatsappNumber && (
                                <a
                                    href={`https://wa.me/${app.user.whatsappNumber.replace(/\D/g, "")}?text=Hi ${encodeURIComponent(app.customerName || '')}, regarding your FairPrice financing application`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 p-2.5 rounded-xl hover:bg-green-50 border border-gray-100 transition-colors"
                                >
                                    <span className="text-sm shrink-0">💬</span>
                                    <span className="text-[10px] font-bold text-gray-600">WhatsApp</span>
                                </a>
                            )}
                        </div>
                    </SectionCard>

                    {/* Admin notes */}
                    <SectionCard title="Admin Notes" icon={FileText}>
                        <textarea
                            value={adminNotesDraft}
                            onChange={e => setAdminNotesDraft(e.target.value)}
                            placeholder="Internal notes — not visible to customer..."
                            rows={6}
                            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs font-medium text-gray-800 placeholder-gray-300 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 resize-none"
                        />
                        <Button
                            onClick={saveNotes}
                            disabled={savingNotes}
                            variant="outline"
                            className="w-full mt-2 h-8 text-xs font-bold rounded-xl"
                        >
                            {savingNotes ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                            Save Notes
                        </Button>
                    </SectionCard>
                </div>
            </div>
        </div>
    );
}
