"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, FileText, Upload, ChevronRight, ArrowLeft, ShieldCheck, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

export default function FinancingSuccessPage() {
    const { id } = useParams();
    const router = useRouter();
    const [uploading, setUploading] = useState<string | null>(null);
    const [completedDocs, setCompletedDocs] = useState<string[]>(["technicalForm"]);

    const docs = [
        { id: "technicalForm", name: "Technical/Solar Audit Form", icon: <ShieldCheck className="h-5 w-5" />, desc: "Auto-generated from your application.", isGenerated: true },
        { id: "bankStatementUrl", name: "6 Months Bank Statement", icon: <FileText className="h-5 w-5" />, desc: "Must be in PDF format and recent.", isGenerated: false },
        { id: "cacDocumentUrl", name: "CAC Documents", icon: <ShieldCheck className="h-5 w-5" />, desc: "Registration certificates (Business only).", isGenerated: false },
        { id: "vendorInvoiceUrl", name: "Vendor Proforma Invoice", icon: <FileText className="h-5 w-5" />, desc: "The official quote for the item.", isGenerated: false },
    ];

    const handleUpload = async (docType: string) => {
        setUploading(docType);
        // Simulate upload for demo purposes
        setTimeout(() => {
            setCompletedDocs(prev => [...prev, docType]);
            setUploading(null);
        }, 1500);
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4">
            <div className="max-w-2xl w-full">
                {/* Success Header */}
                <div className="bg-white rounded-[2.5rem] p-10 shadow-xl shadow-indigo-100/50 border border-indigo-50 text-center mb-8 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-purple-500" />
                    
                    <div className="h-20 w-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                    </div>
                    
                    <h1 className="text-3xl font-black text-gray-900 mb-3 tracking-tight">Application Received!</h1>
                    <p className="text-gray-500 font-medium mb-2">Reference ID: <span className="text-indigo-600 font-bold">#{id?.toString().substring(0, 8).toUpperCase()}</span></p>
                    
                    <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-700 px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider border border-amber-100">
                        <Clock className="h-3 w-3" /> Status: Pending Documents
                    </div>
                </div>

                {/* Document Section */}
                <div className="bg-white rounded-[2.5rem] p-10 shadow-xl shadow-indigo-100/50 border border-indigo-50">
                    <div className="mb-8">
                        <h2 className="text-xl font-black text-gray-900 tracking-tight">Required Documents</h2>
                        <p className="text-gray-500 text-sm font-medium">To finalize your ₦5,000,000 credit line, please upload the following:</p>
                    </div>

                    <div className="space-y-4">
                        {docs.map((doc) => (
                            <div key={doc.id} className={`group p-5 rounded-2xl border-2 transition-all flex items-center gap-4 ${completedDocs.includes(doc.id) ? 'border-emerald-100 bg-emerald-50/30' : 'border-gray-50 bg-gray-50/50 hover:border-indigo-100 hover:bg-white'}`}>
                                <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${completedDocs.includes(doc.id) ? 'bg-emerald-500 text-white' : 'bg-white text-gray-400 group-hover:text-indigo-600 shadow-sm'}`}>
                                    {completedDocs.includes(doc.id) ? <CheckCircle2 className="h-6 w-6" /> : doc.icon}
                                </div>
                                
                                <div className="flex-1">
                                    <h4 className={`text-sm font-black ${completedDocs.includes(doc.id) ? 'text-emerald-900' : 'text-gray-900'}`}>{doc.name}</h4>
                                    <p className="text-xs text-gray-500 font-medium">{doc.desc}</p>
                                </div>

                                {completedDocs.includes(doc.id) ? (
                                    <div className="flex flex-col items-end gap-2">
                                        <Badge variant="outline" className="bg-white border-emerald-200 text-emerald-600 font-black text-[10px]">COMPLETED</Badge>
                                        {(doc as any).isGenerated && (
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                className="h-8 text-[10px] font-bold text-indigo-600 hover:text-indigo-700 p-0"
                                                onClick={() => window.open(`/api/financing/download/${id}/${doc.id}`, '_blank')}
                                            >
                                                <Download className="h-3 w-3 mr-1" /> View Copy
                                            </Button>
                                        )}
                                    </div>
                                ) : (
                                    <Button 
                                        size="sm" 
                                        onClick={() => handleUpload(doc.id)}
                                        disabled={uploading === doc.id}
                                        className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-10 px-5 shadow-lg shadow-indigo-100"
                                    >
                                        {uploading === doc.id ? "..." : <Upload className="h-4 w-4" />}
                                    </Button>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="mt-10 pt-8 border-t border-gray-100 flex flex-col gap-4">
                        <Button 
                            className="w-full h-14 bg-gray-900 hover:bg-black text-white rounded-2xl font-black text-lg shadow-xl shadow-gray-200"
                            onClick={() => router.push('/dashboard')}
                        >
                            Go to My Dashboard
                        </Button>
                        <Link href="/" className="text-center text-sm font-bold text-gray-400 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2">
                            <ArrowLeft className="h-4 w-4" /> Back to Marketplace
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
