"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, ShoppingCart, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { FlowData } from "./FinancingFlow";

interface Props {
    product: { id: string; name: string; price: number; category?: string };
    flowData: FlowData;
    onSubmit: () => Promise<void>;
    onBack: () => void;
    onClose: () => void;
}

const APPLICANT_LABELS: Record<string, string> = {
    salary_earner: 'Salary Earner',
    business_owner: 'Business Owner',
};

const CONTRACT_LABELS: Record<string, string> = {
    long_term: 'Long Term (36% p.a.)',
    short_term: 'Short Term (Flat Rate)',
};

export function Step4Review({ product, flowData, onSubmit, onBack, onClose }: Props) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { applicantType, contract } = flowData;
    const docCount = Object.values(flowData.documents).filter(Boolean).length;

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            await onSubmit();
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!contract) return null;

    return (
        <div className="flex flex-col h-full">
            <div className="mb-5">
                <h2 className="text-xl font-black text-gray-900 tracking-tight">Review Application</h2>
                <p className="text-gray-500 text-sm mt-1">Confirm all details before submitting.</p>
            </div>

            {/* Product summary */}
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 mb-4">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Product</h4>
                <p className="text-sm font-bold text-gray-900 line-clamp-2">{product.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">₦{product.price.toLocaleString()}</p>
            </div>

            {/* Application details */}
            <div className="bg-indigo-50/60 rounded-2xl p-4 border border-indigo-100 mb-4 space-y-2.5">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Financing Terms</h4>
                <Row label="Applicant Type" value={APPLICANT_LABELS[applicantType!] ?? applicantType ?? '—'} />
                <Row label="Contract" value={CONTRACT_LABELS[contract.contractType] ?? contract.contractType} />
                <Row label="Tenure" value={`${contract.tenure} months`} />
                <Row label="Interest Rate">
                    <Badge variant="outline" className="text-[10px] font-bold text-indigo-600 border-indigo-200">
                        {contract.interestRate}
                    </Badge>
                </Row>
                <div className="border-t border-indigo-100 pt-2.5 space-y-2">
                    <Row label="Deposit (Pay Today)" value={`₦${Math.round(contract.depositAmount).toLocaleString()}`} valueClass="text-amber-600 font-black" />
                    <Row label="Funded Amount" value={`₦${Math.round(contract.fundedAmount).toLocaleString()}`} />
                    <Row label="Monthly Repayment" value={`₦${Math.round(contract.monthlyPayment).toLocaleString()}`} valueClass="text-indigo-700 font-black text-base" />
                </div>
            </div>

            {/* Document + signature summary */}
            <div className="space-y-2 mb-5">
                <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span className="text-xs font-bold text-emerald-700">{docCount} document{docCount !== 1 ? 's' : ''} uploaded</span>
                </div>
                {flowData.signature && (
                    <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                        <span className="text-xs font-bold text-emerald-700">Signature captured</span>
                        <img src={flowData.signature} alt="Signature" className="h-8 ml-auto border border-gray-100 rounded bg-white" />
                    </div>
                )}
            </div>

            <div className="mt-auto space-y-2">
                <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md shadow-indigo-100"
                >
                    {isSubmitting
                        ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Submitting…</>
                        : <><ShoppingCart className="h-4 w-4 mr-2" /> Submit Application · Pay ₦{Math.round(contract.depositAmount).toLocaleString()}</>
                    }
                </Button>
                <Button
                    variant="ghost"
                    onClick={onClose}
                    className="w-full h-10 text-gray-400 hover:text-gray-600 text-xs"
                >
                    <X className="h-3.5 w-3.5 mr-1" /> Continue Shopping
                </Button>
            </div>
        </div>
    );
}

function Row({
    label,
    value,
    valueClass = 'text-gray-900 font-bold',
    children,
}: {
    label: string;
    value?: string;
    valueClass?: string;
    children?: React.ReactNode;
}) {
    return (
        <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">{label}</span>
            {children ?? <span className={`text-sm ${valueClass}`}>{value}</span>}
        </div>
    );
}
