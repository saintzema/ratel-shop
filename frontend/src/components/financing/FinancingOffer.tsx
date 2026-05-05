"use client";

import { useState } from "react";
import { CreditCard, Sparkles, Building2, User, ChevronRight, CheckCircle2, ShieldCheck, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { calculateFinancing, FINANCING_CONSTANTS } from "@/lib/financing-utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

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
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [type, setType] = useState<'individual' | 'business'>('individual');
    const [isApplying, setIsApplying] = useState(false);
    
    const isCar = product.category?.toLowerCase().includes('car') || product.category?.toLowerCase().includes('vehicle');
    const terms = calculateFinancing(product.price, type, 12, isCar);

    const handleApply = async () => {
        setIsApplying(true);
        try {
            const res = await fetch("/api/financing/apply", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    productId: product.id,
                    type,
                    loanAmount: product.price,
                    tenureMonths: terms.tenureMonths,
                    monthlyRepayment: terms.monthlyRepayment,
                    interestRate: terms.interestRate.replace('% p.a.', '')
                })
            });
            const data = await res.json();
            if (data.success) {
                router.push(`/financing/success/${data.applicationId}`);
            } else {
                alert(data.error || "Application failed");
            }
        } catch (e) {
            alert("Something went wrong. Please try again.");
        } finally {
            setIsApplying(false);
        }
    };

    return (
        <>
            <div className="bg-gradient-to-br from-indigo-50 via-white to-indigo-50/30 rounded-3xl border border-indigo-100 p-5 shadow-sm relative overflow-hidden group transition-all hover:shadow-md">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Sparkles className="h-12 w-12 text-indigo-600" />
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

                <div className="space-y-3 mb-5">
                    <div className="flex justify-between items-end">
                        <span className="text-xs font-medium text-gray-500">Monthly Payment</span>
                        <span className="text-lg font-black text-gray-900">₦{terms.monthlyRepayment.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-end">
                        <span className="text-xs font-medium text-gray-500">Deposit (20%)</span>
                        <span className="text-sm font-bold text-gray-700">₦{terms.securityDeposit.toLocaleString()}</span>
                    </div>
                </div>

                <Button 
                    onClick={() => setIsOpen(true)}
                    className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md shadow-indigo-100 group"
                >
                    Apply Now <ChevronRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>

                <p className="text-[9px] text-center text-gray-400 font-bold mt-3 uppercase tracking-tighter">
                    Powered by Altpower & Carbon Finance
                </p>
            </div>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="max-w-2xl p-0 overflow-hidden bg-white rounded-[2rem] border-none shadow-2xl">
                    <div className="flex flex-col md:flex-row h-[600px]">
                        {/* Sidebar */}
                        <div className="w-full md:w-72 bg-gray-900 p-8 text-white flex flex-col justify-between relative overflow-hidden">
                            <div className="absolute top-0 right-0 h-40 w-40 bg-indigo-500/10 blur-3xl rounded-full" />
                            
                            <div className="relative z-10">
                                <div className="h-12 w-12 bg-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-indigo-900/20">
                                    <ShieldCheck className="h-6 w-6" />
                                </div>
                                <h3 className="text-2xl font-black tracking-tight leading-tight mb-4">Instant Credit Decision</h3>
                                <p className="text-gray-400 text-sm font-medium leading-relaxed">Get pre-approved in under 2 minutes using our AI trust scoring engine.</p>
                            </div>

                            <div className="relative z-10 space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 bg-white/5 rounded-lg flex items-center justify-center">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                    </div>
                                    <span className="text-xs font-bold text-gray-300">Flexible Repayments</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 bg-white/5 rounded-lg flex items-center justify-center">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                    </div>
                                    <span className="text-xs font-bold text-gray-300">No Hidden Charges</span>
                                </div>
                            </div>
                        </div>

                        {/* Form Area */}
                        <div className="flex-1 p-8 overflow-y-auto">
                            <div className="mb-8">
                                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Financing Details</h2>
                                <p className="text-gray-500 text-sm font-medium">Select your applicant type to see requirements.</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-8">
                                <button 
                                    onClick={() => setType('individual')}
                                    className={`p-4 rounded-2xl border-2 transition-all text-left ${type === 'individual' ? 'border-indigo-600 bg-indigo-50/50 shadow-sm' : 'border-gray-100 hover:border-gray-200'}`}
                                >
                                    <User className={`h-6 w-6 mb-2 ${type === 'individual' ? 'text-indigo-600' : 'text-gray-400'}`} />
                                    <p className={`text-sm font-black ${type === 'individual' ? 'text-indigo-600' : 'text-gray-900'}`}>Individual</p>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Salary Earner</p>
                                </button>
                                <button 
                                    onClick={() => setType('business')}
                                    className={`p-4 rounded-2xl border-2 transition-all text-left ${type === 'business' ? 'border-indigo-600 bg-indigo-50/50 shadow-sm' : 'border-gray-100 hover:border-gray-200'}`}
                                >
                                    <Building2 className={`h-6 w-6 mb-2 ${type === 'business' ? 'text-indigo-600' : 'text-gray-400'}`} />
                                    <p className={`text-sm font-black ${type === 'business' ? 'text-indigo-600' : 'text-gray-900'}`}>Business</p>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Owner / CAC</p>
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                                    <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4">Calculated Terms</h4>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-medium text-gray-600">Monthly Pay</span>
                                            <span className="text-lg font-black text-gray-900">₦{terms.monthlyRepayment.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-medium text-gray-600">Duration</span>
                                            <span className="text-sm font-bold text-gray-900">{terms.tenureMonths} Months</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-medium text-gray-600">Interest Rate</span>
                                            <Badge variant="outline" className="text-[10px] font-black text-indigo-600 border-indigo-200">{terms.interestRate}</Badge>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4">Next Steps</h4>
                                    <div className="space-y-3">
                                        <div className="flex gap-3">
                                            <div className="h-6 w-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-black shrink-0">1</div>
                                            <p className="text-xs font-medium text-gray-600">Clicking 'Continue' will link your FairPrice account.</p>
                                        </div>
                                        <div className="flex gap-3">
                                            <div className="h-6 w-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-black shrink-0">2</div>
                                            <p className="text-xs font-medium text-gray-600">Our financing partner will send an SMS verification.</p>
                                        </div>
                                        <div className="flex gap-3">
                                            <div className="h-6 w-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-black shrink-0">3</div>
                                            <p className="text-xs font-medium text-gray-600">Upload your bank statements to finalize approval.</p>
                                        </div>
                                    </div>
                                </div>

                                <Button 
                                    onClick={handleApply}
                                    disabled={isApplying}
                                    className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-lg shadow-xl shadow-indigo-100"
                                >
                                    {isApplying ? "Processing..." : "Continue to Verification"}
                                </Button>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
