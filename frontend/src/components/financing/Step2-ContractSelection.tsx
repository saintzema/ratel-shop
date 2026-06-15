"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { calculateFinancing, isVehicle } from "@/lib/financing-utils";
import type { ApplicantType } from "./Step1-ApplicantType";

export interface ContractSelection {
    contractType: 'long_term' | 'short_term';
    tenure: number;
    monthlyPayment: number;
    depositAmount: number;
    interestRate: string;
    fundedAmount: number;
}

interface Props {
    product: { id: string; name: string; price: number; category?: string };
    applicantType: ApplicantType;
    initialContract?: ContractSelection;
    onNext: (contract: ContractSelection) => void;
    onBack: () => void;
}

const CONTRACT_OPTIONS = [
    {
        value: 'long_term' as const,
        label: 'Long Term',
        rate: '36% p.a.',
        desc: 'Standard plan — up to 48 months, ideal for large purchases',
    },
    {
        value: 'short_term' as const,
        label: 'Short Term',
        rate: '11% (6m) / 20% (12m) flat',
        desc: 'Quick payoff — 6 or 12 months, lower overall cost',
    },
];

const TENURE_OPTIONS: Record<'long_term' | 'short_term', number[]> = {
    long_term: [6, 12, 18, 24, 36, 48],
    short_term: [6, 12],
};

export function Step2ContractSelection({ product, applicantType, initialContract, onNext, onBack }: Props) {
    const isCar = isVehicle(product);
    const defaultTenures = isCar ? [12, 24, 36, 48] : TENURE_OPTIONS;

    const [contractType, setContractType] = useState<'long_term' | 'short_term'>(
        initialContract?.contractType ?? 'long_term'
    );
    const [tenure, setTenure] = useState(
        initialContract?.tenure ?? (isCar ? 48 : 12)
    );

    const terms = calculateFinancing(product.price, applicantType === 'salary_earner' ? 'individual' : 'business', tenure, isCar);

    const interestRate = contractType === 'short_term'
        ? (tenure <= 6 ? '11% flat' : '20% flat')
        : '36% p.a.';

    // For short_term, recalculate with flat rate
    let monthlyPayment = terms.monthlyRepayment;
    if (contractType === 'short_term') {
        const deposit = product.price * 0.20;
        const funded = product.price - deposit;
        const flatRate = tenure <= 6 ? 0.11 : 0.20;
        monthlyPayment = Math.round((funded * (1 + flatRate)) / tenure);
    }

    // Short-term is always 6 or 12 months regardless of product type.
    // Long-term cars get an extended tenure range.
    const tenureList = contractType === 'short_term'
        ? TENURE_OPTIONS.short_term
        : (isCar ? [12, 24, 36, 48] : TENURE_OPTIONS.long_term);

    const handleNext = () => {
        onNext({
            contractType,
            tenure,
            monthlyPayment,
            depositAmount: terms.securityDeposit,
            interestRate,
            fundedAmount: product.price - terms.securityDeposit,
        });
    };

    return (
        <div className="flex flex-col h-full">
            <div className="mb-6">
                <h2 className="text-xl font-black text-gray-900 tracking-tight">Choose your plan</h2>
                <p className="text-gray-500 text-sm mt-1">Select a contract type and repayment tenure.</p>
            </div>

            {/* Contract type selector */}
            <div className="grid grid-cols-1 gap-3 mb-5">
                {CONTRACT_OPTIONS.map(opt => (
                    <button
                        key={opt.value}
                        onClick={() => {
                            setContractType(opt.value);
                            // Snap tenure to the first valid option for the new contract type
                            const validTenures = opt.value === 'short_term'
                                ? TENURE_OPTIONS.short_term
                                : (isCar ? [12, 24, 36, 48] : TENURE_OPTIONS.long_term);
                            if (!validTenures.includes(tenure)) setTenure(validTenures[0]);
                        }}
                        className={`p-4 rounded-2xl border-2 transition-all text-left ${contractType === opt.value ? 'border-indigo-600 bg-indigo-50/50' : 'border-gray-100 hover:border-gray-200'}`}
                    >
                        <div className="flex items-center justify-between mb-1">
                            <span className={`text-sm font-black ${contractType === opt.value ? 'text-indigo-700' : 'text-gray-900'}`}>{opt.label}</span>
                            <Badge variant="outline" className={`text-[10px] font-bold ${contractType === opt.value ? 'border-indigo-300 text-indigo-600' : 'text-gray-400'}`}>
                                {opt.rate}
                            </Badge>
                        </div>
                        <p className="text-[11px] text-gray-500">{opt.desc}</p>
                    </button>
                ))}
            </div>

            {/* Tenure selector */}
            <div className="mb-5">
                <label className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2 block">
                    Repayment Tenure
                </label>
                <div className="flex flex-wrap gap-2">
                    {tenureList.map(t => (
                        <button
                            key={t}
                            onClick={() => setTenure(t)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${tenure === t ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-300'}`}
                        >
                            {t}m
                        </button>
                    ))}
                </div>
            </div>

            {/* Calculated breakdown */}
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 mb-5">
                <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Payment Breakdown</h4>
                <div className="space-y-2.5">
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Asset Value</span>
                        <span className="text-sm font-bold text-gray-900">₦{product.price.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Deposit (20%)</span>
                        <span className="text-sm font-bold text-amber-600">₦{Math.round(terms.securityDeposit).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Funded Amount</span>
                        <span className="text-sm font-bold text-gray-900">₦{Math.round(product.price - terms.securityDeposit).toLocaleString()}</span>
                    </div>
                    <div className="border-t border-gray-200 pt-2 flex justify-between items-center">
                        <span className="text-sm font-black text-gray-900">Monthly Payment</span>
                        <span className="text-lg font-black text-indigo-600">₦{Math.round(monthlyPayment).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">Interest Rate</span>
                        <Badge variant="outline" className="text-[10px] font-bold text-indigo-600 border-indigo-200">{interestRate}</Badge>
                    </div>
                </div>
            </div>

            <div className="mt-auto">
                <Button
                    onClick={handleNext}
                    className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md shadow-indigo-100"
                >
                    Continue to Documents
                </Button>
            </div>
        </div>
    );
}
