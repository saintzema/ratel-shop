"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { FinancingFlow } from "@/components/financing/FinancingFlow";

/**
 * Resume a saved financing draft.
 * URL: /financing/resume?id=<applicationId>
 */
export default function ResumeFinancingPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const applicationId = searchParams.get("id");

    const [draft, setDraft] = useState<any>(null);
    const [product, setProduct] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (!applicationId) {
            router.replace("/");
            return;
        }
        (async () => {
            try {
                const res = await fetch(`/api/financing/draft?id=${applicationId}`);
                if (!res.ok) throw new Error("Draft not found");
                const data = await res.json();
                setDraft(data.draft);
                setProduct(data.product);
                setIsOpen(true);
            } catch (e: any) {
                setError(e.message || "Could not load application");
            } finally {
                setLoading(false);
            }
        })();
    }, [applicationId, router]);

    return (
        <>
            <Navbar />
            <main className="min-h-screen flex items-center justify-center bg-gray-50">
                {loading && (
                    <div className="flex flex-col items-center gap-3 text-gray-400">
                        <Loader2 className="h-8 w-8 animate-spin" />
                        <p className="text-sm">Loading your application…</p>
                    </div>
                )}
                {error && (
                    <div className="text-center">
                        <p className="text-red-500 font-bold mb-2">{error}</p>
                        <button onClick={() => router.push("/")} className="text-sm text-indigo-600 hover:underline">
                            Return to Home
                        </button>
                    </div>
                )}
                {!loading && !error && product && draft && (
                    <FinancingFlow
                        product={product}
                        isOpen={isOpen}
                        onClose={() => router.push("/")}
                        applicationId={applicationId!}
                        initialStep={draft.currentStep ?? 1}
                        initialData={{
                            applicantType: draft.applicationType,
                            contract: draft.contractType
                                ? {
                                    contractType: draft.contractType,
                                    tenure: draft.tenureMonths,
                                    monthlyPayment: draft.monthlyRepayment,
                                    depositAmount: draft.depositAmount,
                                    interestRate: draft.interestRate?.toString() ?? "36% p.a.",
                                    fundedAmount: draft.loanAmount,
                                }
                                : null,
                        }}
                    />
                )}
            </main>
        </>
    );
}
