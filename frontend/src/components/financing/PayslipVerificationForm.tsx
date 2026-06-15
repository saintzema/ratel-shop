"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, CheckCircle2, FileText, Landmark, UserCircle } from "lucide-react";

interface PayslipVerificationFormProps {
    onBack: () => void;
    onComplete: (data: any) => void;
}

export function PayslipVerificationForm({ onBack, onComplete }: PayslipVerificationFormProps) {
    const [formData, setFormData] = useState({
        employerName: "",
        jobTitle: "",
        monthlyNetSalary: "",
        bankName: "",
        accountNumber: "",
        bvn: "",
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onComplete(formData);
    };

    return (
        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex items-center gap-4 mb-8">
                <button 
                    onClick={onBack}
                    className="h-10 w-10 rounded-full border border-gray-100 flex items-center justify-center hover:bg-gray-50 transition-colors"
                >
                    <ArrowLeft className="h-5 w-5 text-gray-500" />
                </button>
                <div>
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">Payslip Verification</h2>
                    <p className="text-gray-500 text-sm font-medium">Verify your income for instant approval.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="bg-indigo-50/50 rounded-2xl p-6 border border-indigo-100 mb-6">
                    <div className="flex items-center gap-3 mb-4">
                        <UserCircle className="h-5 w-5 text-indigo-600" />
                        <h3 className="text-sm font-black text-indigo-900 uppercase tracking-wider">Employment Information</h3>
                    </div>
                    
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="employerName" className="text-xs font-bold text-gray-500 uppercase ml-1">Employer Name</Label>
                            <Input 
                                id="employerName"
                                placeholder="e.g. Google Nigeria"
                                required
                                className="h-12 bg-white rounded-xl border-gray-200 focus:ring-2 focus:ring-indigo-600 font-medium"
                                value={formData.employerName}
                                onChange={(e) => setFormData({ ...formData, employerName: e.target.value })}
                            />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="jobTitle" className="text-xs font-bold text-gray-500 uppercase ml-1">Job Title</Label>
                                <Input 
                                    id="jobTitle"
                                    placeholder="e.g. Manager"
                                    required
                                    className="h-12 bg-white rounded-xl border-gray-200 focus:ring-2 focus:ring-indigo-600 font-medium"
                                    value={formData.jobTitle}
                                    onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="monthlyNetSalary" className="text-xs font-bold text-gray-500 uppercase ml-1">Net Monthly Salary (₦)</Label>
                                <Input 
                                    id="monthlyNetSalary"
                                    type="number"
                                    placeholder="0.00"
                                    required
                                    className="h-12 bg-white rounded-xl border-gray-200 focus:ring-2 focus:ring-indigo-600 font-black"
                                    value={formData.monthlyNetSalary}
                                    onChange={(e) => setFormData({ ...formData, monthlyNetSalary: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-emerald-50/50 rounded-2xl p-6 border border-emerald-100 mb-8">
                    <div className="flex items-center gap-3 mb-4">
                        <Landmark className="h-5 w-5 text-emerald-600" />
                        <h3 className="text-sm font-black text-emerald-900 uppercase tracking-wider">Banking Details</h3>
                    </div>
                    
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="bankName" className="text-xs font-bold text-gray-500 uppercase ml-1">Bank Name</Label>
                            <Input 
                                id="bankName"
                                placeholder="e.g. Zenith Bank"
                                required
                                className="h-12 bg-white rounded-xl border-gray-200 focus:ring-2 focus:ring-emerald-600 font-medium"
                                value={formData.bankName}
                                onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                            />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="accountNumber" className="text-xs font-bold text-gray-500 uppercase ml-1">Account Number</Label>
                                <Input 
                                    id="accountNumber"
                                    placeholder="10 Digits"
                                    maxLength={10}
                                    required
                                    className="h-12 bg-white rounded-xl border-gray-200 focus:ring-2 focus:ring-emerald-600 font-black tracking-widest"
                                    value={formData.accountNumber}
                                    onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="bvn" className="text-xs font-bold text-gray-500 uppercase ml-1">BVN (Optional)</Label>
                                <Input 
                                    id="bvn"
                                    placeholder="11 Digits"
                                    maxLength={11}
                                    className="h-12 bg-white rounded-xl border-gray-200 focus:ring-2 focus:ring-emerald-600 font-black tracking-widest"
                                    value={formData.bvn}
                                    onChange={(e) => setFormData({ ...formData, bvn: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <CheckCircle2 className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
                    <p className="text-[10px] font-bold text-gray-500 leading-relaxed uppercase tracking-tight">
                        I authorize FairPrice Marketplace to verify my employment status and income for the purpose of this financing application.
                    </p>
                </div>

                <Button 
                    type="submit"
                    className="w-full h-14 bg-gray-900 hover:bg-black text-white rounded-2xl font-black text-lg shadow-xl"
                >
                    Generate Verification <FileText className="h-5 w-5 ml-2" />
                </Button>
            </form>
        </div>
    );
}
