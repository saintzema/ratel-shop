"use client";

import { useState } from "react";
import { User, Building2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

export type ApplicantType = 'salary_earner' | 'business_owner';

interface Props {
    onNext: (type: ApplicantType) => void;
}

export function Step1ApplicantType({ onNext }: Props) {
    const [type, setType] = useState<ApplicantType | null>(null);
    const [isPensioner, setIsPensioner] = useState(false);

    return (
        <div className="flex flex-col h-full">
            <div className="mb-6">
                <h2 className="text-xl font-black text-gray-900 tracking-tight">Who is applying?</h2>
                <p className="text-gray-500 text-sm mt-1">Select your applicant type to see the required documents.</p>
            </div>

            <div className="grid grid-cols-1 gap-3 mb-6">
                <button
                    onClick={() => setType('salary_earner')}
                    className={`p-4 rounded-2xl border-2 transition-all text-left ${type === 'salary_earner' ? 'border-indigo-600 bg-indigo-50/50 shadow-sm' : 'border-gray-100 hover:border-gray-200'}`}
                >
                    <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${type === 'salary_earner' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                            <User className="h-5 w-5" />
                        </div>
                        <div>
                            <p className={`text-sm font-black ${type === 'salary_earner' ? 'text-indigo-600' : 'text-gray-900'}`}>Salary Earner</p>
                            <p className="text-[11px] text-gray-500 mt-0.5">3–6 months payslip + bank statement required</p>
                        </div>
                    </div>
                </button>

                <button
                    onClick={() => setType('business_owner')}
                    className={`p-4 rounded-2xl border-2 transition-all text-left ${type === 'business_owner' ? 'border-indigo-600 bg-indigo-50/50 shadow-sm' : 'border-gray-100 hover:border-gray-200'}`}
                >
                    <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${type === 'business_owner' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                            <Building2 className="h-5 w-5" />
                        </div>
                        <div>
                            <p className={`text-sm font-black ${type === 'business_owner' ? 'text-indigo-600' : 'text-gray-900'}`}>Business Owner</p>
                            <p className="text-[11px] text-gray-500 mt-0.5">CAC + 1–2 years audited financials required</p>
                        </div>
                    </div>
                </button>
            </div>

            <div className="flex items-center gap-2 mb-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
                <Checkbox
                    id="pensioner"
                    checked={isPensioner}
                    onCheckedChange={(v) => setIsPensioner(!!v)}
                />
                <label htmlFor="pensioner" className="text-sm font-medium text-gray-700 cursor-pointer">
                    I am a pensioner / retiree
                </label>
            </div>

            {isPensioner && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl mb-4">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-xs font-medium text-amber-700">
                        Pensioners are not eligible for this financing facility. Please contact our support team for alternative options.
                    </p>
                </div>
            )}

            <div className="mt-auto">
                <Button
                    onClick={() => type && onNext(type)}
                    disabled={!type || isPensioner}
                    className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md shadow-indigo-100"
                >
                    Continue
                </Button>
            </div>
        </div>
    );
}
