"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ShieldCheck, CheckCircle2, ArrowLeft } from "lucide-react";

import { Step1ApplicantType, type ApplicantType } from "./Step1-ApplicantType";
import { Step2ContractSelection, type ContractSelection } from "./Step2-ContractSelection";
import { Step3DocumentUpload, type DocumentUploads, type SignatureData } from "./Step3-DocumentUpload";
import type { BoardResolutionData } from "./BoardResolutionGenerator";
import { Step4Review } from "./Step4-Review";

export interface FinancingFlowProps {
    product: {
        id: string;
        name: string;
        price: number;
        category?: string;
    };
    isOpen: boolean;
    onClose: () => void;
    /** Resume from a saved draft */
    applicationId?: string;
    initialStep?: number;
    initialData?: Partial<FlowData>;
}

export interface FlowData {
    applicantType: ApplicantType | null;
    contract: ContractSelection | null;
    documents: DocumentUploads;
    signature: SignatureData;
    boardResolution?: BoardResolutionData;
}

const STEPS = ["Applicant", "Contract", "Documents", "Review"];

export function FinancingFlow({ product, isOpen, onClose, applicationId, initialStep = 1, initialData }: FinancingFlowProps) {
    const router = useRouter();
    const [step, setStep] = useState(initialStep);
    const [flowData, setFlowData] = useState<FlowData>({
        applicantType: initialData?.applicantType ?? null,
        contract: initialData?.contract ?? null,
        documents: initialData?.documents ?? {},
        signature: null,
    });

    const getAuthHeaders = (): Record<string, string> => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('fp_token') : null;
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        return headers;
    };

    const saveProgress = useCallback(async (data: Partial<FlowData>, currentStep: number) => {
        try {
            await fetch('/api/financing/save-progress', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    productId: product.id,
                    applicantType: data.applicantType,
                    contract: data.contract,
                    documents: data.documents,
                    currentStep,
                    applicationId,
                }),
            });
        } catch { /* fail silently — save is best-effort */ }
    }, [product.id, applicationId]);

    const handleStep1 = useCallback((applicantType: ApplicantType) => {
        const updated = { ...flowData, applicantType };
        setFlowData(updated);
        setStep(2);
    }, [flowData]);

    const handleStep2 = useCallback((contract: ContractSelection) => {
        const updated = { ...flowData, contract };
        setFlowData(updated);
        setStep(3);
    }, [flowData]);

    const handleStep3 = useCallback((documents: DocumentUploads, signature: SignatureData, boardResolution?: BoardResolutionData) => {
        const updated = { ...flowData, documents, signature, boardResolution };
        setFlowData(updated);
        saveProgress(updated, 4);
        setStep(4);
    }, [flowData, saveProgress]);

    const handleSaveProgress = useCallback(async (documents: DocumentUploads) => {
        const updated = { ...flowData, documents };
        setFlowData(updated);
        await saveProgress(updated, 3);
    }, [flowData, saveProgress]);

    const handleSubmit = useCallback(async () => {
        if (!flowData.applicantType || !flowData.contract) return;
        try {
            const res = await fetch('/api/financing/apply', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    productId: product.id,
                    productName: product.name,
                    type: flowData.applicantType === 'salary_earner' ? 'individual' : 'business',
                    applicationType: flowData.applicantType,
                    contractType: flowData.contract.contractType,
                    loanAmount: product.price,
                    tenureMonths: flowData.contract.tenure,
                    monthlyRepayment: flowData.contract.monthlyPayment,
                    depositAmount: flowData.contract.depositAmount,
                    interestRate: flowData.contract.interestRate,
                    signatureDataUrl: flowData.signature,
                    // Business owner extras
                    companyName: flowData.boardResolution?.companyName,
                    companyRegistrationNumber: flowData.boardResolution?.registrationNumber,
                    companyLogoBase64: flowData.boardResolution?.companyLogoBase64,
                    directorsJson: flowData.boardResolution?.directors ? JSON.stringify(flowData.boardResolution.directors) : undefined,
                    source: 'web',
                }),
            });
            const data = await res.json();
            if (data.success) {
                router.push(`/financing/success/${data.applicationId}`);
            } else {
                alert(data.error || "Application failed. Please try again.");
            }
        } catch {
            alert("Something went wrong. Please try again.");
        }
    }, [flowData, product, router]);

    const renderStep = () => {
        switch (step) {
            case 1:
                return <Step1ApplicantType onNext={handleStep1} />;
            case 2:
                return (
                    <Step2ContractSelection
                        product={product}
                        applicantType={flowData.applicantType!}
                        initialContract={flowData.contract ?? undefined}
                        onNext={handleStep2}
                        onBack={() => setStep(1)}
                    />
                );
            case 3:
                return (
                    <Step3DocumentUpload
                        applicantType={flowData.applicantType!}
                        initialDocuments={flowData.documents}
                        productName={product.name}
                        loanAmount={product.price}
                        tenureMonths={flowData.contract?.tenure ?? 12}
                        onNext={handleStep3}
                        onBack={() => setStep(2)}
                        onSaveProgress={handleSaveProgress}
                    />
                );
            case 4:
                return (
                    <Step4Review
                        product={product}
                        flowData={flowData}
                        onSubmit={handleSubmit}
                        onBack={() => setStep(3)}
                        onClose={onClose}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
            <DialogContent className="max-w-2xl p-0 overflow-hidden bg-white rounded-[2rem] border-none shadow-2xl">
                <DialogTitle className="sr-only">Financing Application</DialogTitle>
                <div className="flex flex-col md:flex-row h-[600px]">
                    {/* Sidebar */}
                    <div className="w-full md:w-64 bg-gray-900 p-6 text-white flex flex-col justify-between relative overflow-hidden shrink-0">
                        <div className="absolute top-0 right-0 h-40 w-40 bg-indigo-500/10 blur-3xl rounded-full" />
                        <div className="relative z-10">
                            <div className="h-10 w-10 bg-indigo-600 rounded-xl flex items-center justify-center mb-4 shadow-xl shadow-indigo-900/20">
                                <ShieldCheck className="h-5 w-5" />
                            </div>
                            <h3 className="text-lg font-black tracking-tight leading-tight mb-2">FairPrice Financing</h3>
                            <p className="text-gray-400 text-xs font-medium leading-relaxed">Fast credit decision. Get approved and get your product delivered.</p>

                            {/* Step progress */}
                            <div className="mt-6 space-y-2">
                                {STEPS.map((label, idx) => {
                                    const stepNum = idx + 1;
                                    const isActive = step === stepNum;
                                    const isDone = step > stepNum;
                                    return (
                                        <div key={label} className="flex items-center gap-2">
                                            <div className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-black transition-colors ${isDone ? 'bg-emerald-500' : isActive ? 'bg-indigo-500' : 'bg-white/10'}`}>
                                                {isDone ? <CheckCircle2 className="h-3 w-3" /> : stepNum}
                                            </div>
                                            <span className={`text-xs font-bold transition-colors ${isActive ? 'text-white' : isDone ? 'text-emerald-400' : 'text-gray-500'}`}>{label}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="relative z-10 space-y-3 mt-4">
                            <div className="flex items-center gap-2">
                                <div className="h-7 w-7 bg-white/5 rounded-lg flex items-center justify-center">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                </div>
                                <span className="text-[11px] font-bold text-gray-300">Flexible Repayments</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="h-7 w-7 bg-white/5 rounded-lg flex items-center justify-center">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                </div>
                                <span className="text-[11px] font-bold text-gray-300">No Hidden Charges</span>
                            </div>
                        </div>
                    </div>

                    {/* Form area */}
                    <div className="flex-1 p-6 overflow-y-auto">
                        {step > 1 && (
                            <button
                                onClick={() => setStep(s => s - 1)}
                                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-4 transition-colors"
                            >
                                <ArrowLeft className="h-3.5 w-3.5" /> Back
                            </button>
                        )}
                        {renderStep()}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
