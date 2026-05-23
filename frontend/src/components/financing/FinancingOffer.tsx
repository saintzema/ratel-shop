"use client";

import { useState, useEffect, useRef } from "react";
import { CreditCard, ChevronRight, Zap, Banknote, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { calculateFinancing, getFinancingThreshold, isVehicle } from "@/lib/financing-utils";
import { FinancingFlow, type FlowData } from "./FinancingFlow";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

interface FinancingOfferProps {
    product: {
        id: string;
        name: string;
        price: number;
        category?: string;
    };
}

export function FinancingOffer({ product }: FinancingOfferProps) {
    const { user } = useAuth();
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [tenure, setTenure] = useState(isVehicle(product) ? 48 : 12);
    const [draftStep, setDraftStep] = useState<number>(1);
    const [draftData, setDraftData] = useState<Partial<FlowData> | undefined>(undefined);
    const [draftAppId, setDraftAppId] = useState<string | undefined>(undefined);
    const loadedRef = useRef(false);

    // Load any existing draft for this product when user is logged in
    useEffect(() => {
        if (!user || loadedRef.current) return;
        loadedRef.current = true;
        const token = typeof window !== 'undefined' ? localStorage.getItem('fp_token') : null;
        if (!token) return;

        // Search for a draft by product
        fetch(`/api/financing/save-progress?productId=${product.id}`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(r => r.ok ? r.json() : null)
            .then((d) => {
                if (d?.applicationId) {
                    setDraftAppId(d.applicationId);
                    setDraftStep(d.currentStep ?? 1);
                    // Restore applicantType and contract (File objects can't be restored)
                    setDraftData({
                        applicantType: d.applicantType ?? null,
                        contract: d.contract ?? null,
                        documents: {},
                        signature: null,
                    });
                }
            })
            .catch(() => { /* ignore */ });
    }, [user, product.id]);

    const handleApplyClick = () => {
        if (!user) {
            // Save intent and redirect to login
            if (typeof window !== 'undefined') {
                sessionStorage.setItem('fp_financing_intent', JSON.stringify({ productId: product.id, returnPath: window.location.pathname }));
            }
            router.push(`/login?redirect=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname : '/')}`);
            return;
        }
        setIsOpen(true);
    };

    const threshold = getFinancingThreshold();
    if (product.price < threshold) return null;

    const isCar = isVehicle(product);
    const terms = calculateFinancing(product.price, 'individual', tenure, isCar);

    return (
        <>
            <div className="bg-gradient-to-br from-indigo-50 via-white to-indigo-50/30 rounded-3xl border border-indigo-100 p-5 shadow-sm relative overflow-hidden group transition-all hover:shadow-md">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Banknote className="h-16 w-16 text-indigo-600" />
                </div>

                <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                        <CreditCard className="h-5 w-5" />
                    </div>
                    <div>
                        <h4 className="text-sm font-black text-gray-900 tracking-tight">FairPrice Financing</h4>
                        <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest flex items-center gap-1">
                            <Zap className="h-3 w-3 fill-current" /> Pay Small Small
                        </p>
                    </div>
                </div>

                <div className="space-y-3 mb-5 relative z-10">
                    <div className="flex justify-between items-end">
                        <span className="text-xs font-medium text-gray-500">Monthly Payment</span>
                        <span className="text-lg font-black text-gray-900">₦{Math.round(terms.monthlyRepayment).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-end">
                        <span className="text-xs font-medium text-gray-500">Deposit ({isCar ? '15%' : '20%'})</span>
                        <span className="text-sm font-bold text-gray-700">₦{Math.round(terms.securityDeposit).toLocaleString()}</span>
                    </div>
                    {isCar && (
                        <div className="flex justify-between items-center pt-2">
                            <span className="text-xs font-medium text-gray-500">Duration</span>
                            <select
                                value={tenure}
                                onChange={(e) => setTenure(Number(e.target.value))}
                                className="text-xs font-bold bg-white border border-gray-200 rounded-lg px-2 py-1 outline-none text-indigo-700"
                            >
                                <option value={12}>1 Year (12 months)</option>
                                <option value={24}>2 Years (24 months)</option>
                                <option value={36}>3 Years (36 months)</option>
                                <option value={48}>4 Years (48 months)</option>
                            </select>
                        </div>
                    )}
                </div>

                <Button
                    onClick={handleApplyClick}
                    className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md shadow-indigo-100 group"
                >
                    {!user && <Lock className="h-3.5 w-3.5 mr-1.5 opacity-70" />}
                    {draftStep > 1 ? 'Continue Application' : 'Apply Now'}
                    <ChevronRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>

                {draftStep > 1 && (
                    <p className="text-[9px] text-center text-indigo-500 font-bold mt-2">
                        Draft saved — step {draftStep} of 4
                    </p>
                )}
                {!draftStep || draftStep === 1 ? (
                    <p className="text-[9px] text-center text-gray-400 font-bold mt-3 uppercase tracking-tighter">
                        {user ? 'Apply Now to Get Product Delivered After Approval' : 'Sign in to apply for financing'}
                    </p>
                ) : null}
            </div>

            <FinancingFlow
                product={product}
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                applicationId={draftAppId}
                initialStep={draftStep}
                initialData={draftData}
            />
        </>
    );
}
